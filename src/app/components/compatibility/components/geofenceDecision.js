// geofenceDecision.js - the PURE combined publish-allow decision for the location
// geofence. Small, fully unit-testable functions so neither App.js nor the pure
// predicate (countries.js) grows the branching logic.
//
// WHY THIS EXISTS (the composition seam, between the resolvers and App.js):
// Two resolvers SUPPLY country codes - createPhysicalCountryResolver (GPS) and
// createIpCountryResolver (IP). countries.js SUPPLIES the pure inside-a-country
// predicate. The DECISION that combines them is its own concern, and putting it in
// pure functions keeps:
//   • countries.js pure (no flag/network - isInsideCountry stays a geometry predicate);
//   • App.js thin (it AWAITS the two resolvers, then calls this one boolean);
//   • the rule itself directly testable without React, the store, or the network.
//
// TWO LAYERS, SPLIT ON PURPOSE:
//   (A) resolveBindingCountry — answers ONLY "which country, if any, are we bound
//       to, and why?" (a {country, status} pair, geometry-free). This is the single
//       place the GPS-vs-IP agreement rule lives, so the UX gate (show/hide the
//       publish triggers) and the publish gate (decidePublishAllowed) read the SAME
//       verdict instead of re-deriving it. `status` is a machine-readable reason the
//       caller can map to a localized notice (e.g. 'mismatch' → country_mismatch).
//   (B) decidePublishAllowed — resolveBindingCountry PLUS the geometry leg: a mark
//       is allowed iff there IS a binding country AND the pin falls inside it.
//
// THE BINDING-COUNTRY RULE (the user's locked decisions):
// The country a mark is bound to is the PHYSICAL (GPS) country, and when the IP
// sub-check is ON the IP country must AGREE with it. Edge cases, all fail-CLOSED on
// a genuine conflict but with the one GPS-denied fallback the user asked for:
//   • IP flag OFF  → bind to the GPS-physical country (exactly today's GPS-only
//                    path); IP is not consulted at all.
//   • IP flag ON:
//       - physical KNOWN, ip KNOWN, physical === ip → bind to it ('ok').
//       - physical KNOWN, ip KNOWN, physical !== ip → BLOCK ('mismatch'): VPN /
//                    coarse IP disagreement, fail-CLOSED (no binding country).
//       - physical KNOWN, ip UNKNOWN                → BLOCK ('ip_unknown'): the IP
//                    leg fails CLOSED, preserved from the original strict-AND rule.
//       - physical UNKNOWN, ip KNOWN               → bind to the IP country
//                    ('ok_ip_fallback'): the GPS-denied/unknown fallback the user
//                    chose - if we cannot read GPS but the IP country is known, the
//                    IP country becomes the binding country.
//       - both UNKNOWN                              → BLOCK ('no_location').
//
// BEHAVIOR CHANGE vs the previous decidePublishAllowed (the ONE intended change):
// Previously a NULL/unknown physical ALWAYS blocked, even with the IP flag ON and a
// known IP country (the old code's `if (!physical) return false;` was the first
// gate). Now, when the IP flag is ON and physical is unknown/null but ip is known,
// the decision BINDS to ip and allows iff the pin is inside ip (status
// 'ok_ip_fallback'). Every OTHER verdict is byte-identical to before:
//   • IP flag OFF stays the exact GPS-only path (physical KNOWN && inside).
//   • physical KNOWN + ip disagreeing/unknown still BLOCKS (fail-CLOSED).
//   • both unknown still BLOCKS.

import { isInsideCountry } from './countries';

// resolveBindingCountry({ physical, ip, ipEnabled }) → { country, status }.
//   physical  = GPS-physical country (lowercase alpha-2) or null/undefined if unknown.
//   ip        = IP-derived country (lowercase alpha-2) or null/undefined if unknown.
//   ipEnabled = is the IP sub-check ON? (IP_GEOFENCE_ENABLED) When false, ip is
//               ignored entirely and the binding country is the GPS-physical one.
// Returns:
//   country = the lowercase alpha-2 code a mark is bound to, or null when no binding
//             country could be established (the mark must then be BLOCKED).
//   status  = a machine-readable reason for the verdict, for the caller to map to a
//             localized notice. One of:
//               'ok'             — physical (or physical===ip) is the binding country.
//               'ok_ip_fallback' — GPS unknown, bound to the known IP country.
//               'mismatch'       — physical and ip are both known but DISAGREE.
//               'ip_unknown'     — physical known but the IP leg failed (null ip).
//               'no_location'    — no usable signal (both unknown, or GPS-only off).
// PURE: no geometry, no network, no store - just the agreement rule.
export function resolveBindingCountry(args = {}) {
  const { physical, ip, ipEnabled } = args;

  // IP sub-check OFF: collapse to EXACTLY today's GPS-only path. The binding
  // country IS the physical country; ip is never consulted. Unknown physical →
  // no binding country (the same block the old physical-only resolver gave).
  if (!ipEnabled) {
    return physical
      ? { country: physical, status: 'ok' }
      : { country: null, status: 'no_location' };
  }

  // IP sub-check ON. Branch on which signals are known.
  if (physical) {
    // GPS-physical is known. The IP leg must AGREE (fail-CLOSED on conflict or a
    // missing IP, preserving the original strict-AND rule).
    if (!ip) return { country: null, status: 'ip_unknown' }; // IP leg failed → block
    if (ip !== physical) return { country: null, status: 'mismatch' }; // VPN / coarse IP
    return { country: physical, status: 'ok' };
  }

  // GPS-physical is UNKNOWN. The user's chosen fallback: if the IP country is known,
  // bind to it (GPS-denied/unavailable → trust the IP signal). If neither is known
  // there is nothing to bind to.
  if (ip) return { country: ip, status: 'ok_ip_fallback' };
  return { country: null, status: 'no_location' };
}

// geofenceEligibility({ physical, ip, ipEnabled }) → { eligible, country, status }.
// The UX-gate view of the SAME binding-country rule: resolveBindingCountry plus a
// boolean `eligible` = "is there a binding country at all?". The publish/edit
// triggers are SHOWN (and their handlers armed) iff eligible is true; otherwise they
// are hidden/disabled and `status` says why. This deliberately reuses
// resolveBindingCountry so the UX gate and the publish gate can never drift apart.
// Eligibility is country-only: it does NOT look at any pin coords (there is no pin
// yet when we decide whether to even show the controls).
export function geofenceEligibility(args = {}) {
  const { country, status } = resolveBindingCountry(args);
  return { eligible: country != null, country, status };
}

// decidePublishAllowed({ physical, ip, coords, ipEnabled, isInside }) → boolean.
//   physical  = GPS-physical country (lowercase alpha-2) or null/undefined if unknown.
//   ip        = IP-derived country (lowercase alpha-2) or null/undefined if unknown.
//   coords    = the clicked mark's [lat, lng].
//   ipEnabled = is the IP sub-check ON? (IP_GEOFENCE_ENABLED) When false, ip is ignored
//               and the rule is the GPS-only path (byte-identical to today's geofence,
//               EXCEPT the documented GPS-denied IP fallback when the flag is ON).
//   isInside  = injectable inside-country predicate (defaults to the real
//               isInsideCountry); lets a test drive the geometry leg without bounds.
// Delegates the "which country?" question to resolveBindingCountry, then adds the
// geometry leg. Fail-CLOSED: no binding country (null) → false; otherwise allowed
// iff the pin sits inside that binding country.
export function decidePublishAllowed(args = {}) {
  const { coords } = args;
  const isInside = args.isInside || isInsideCountry;

  const { country } = resolveBindingCountry(args);
  if (!country) return false;

  return isInside(coords, country);
}
