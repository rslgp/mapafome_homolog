// geofenceDecision.js - the PURE combined publish-allow decision for the location
// geofence. One small, fully unit-testable function so neither App.js nor the pure
// predicate (countries.js) grows the branching logic.
//
// WHY THIS EXISTS (the composition seam, between the resolvers and App.js):
// Two resolvers SUPPLY country codes - createPhysicalCountryResolver (GPS) and
// createIpCountryResolver (IP). countries.js SUPPLIES the pure inside-a-country
// predicate. The DECISION that combines them is its own concern, and putting it in a
// pure function keeps:
//   • countries.js pure (no flag/network - isInsideCountry stays a geometry predicate);
//   • App.js thin (it AWAITS the two resolvers, then calls this one boolean);
//   • the rule itself directly testable without React, the store, or the network.
//
// THE RULE (the user's locked decision - STRICT AND, fail-CLOSED):
// A mark is allowed ONLY when EVERY one of these holds:
//   1. the GPS-physical country is KNOWN (non-null),
//   2. the IP-derived country is KNOWN (non-null),
//   3. the two countries are EQUAL,
//   4. the pin's coords fall INSIDE that country (the pure isInsideCountry predicate).
// If the two disagree (VPN / coarse IP), or EITHER signal is unknown / unavailable /
// errored (null), the mark is BLOCKED. This is intentionally STRICTER than the
// reverse-geocode offshore guard, which fails OPEN: here a null fails CLOSED.
//
// IP-FLAG OFF FALLBACK (independent toggle): when ipEnabled is false the IP signal is
// not part of the rule at all - the decision collapses to EXACTLY today's GPS-only
// path: allowed iff the physical country is known AND the pin is inside it. So with
// the IP flag OFF this helper returns the same verdict the old physical-only
// resolver.allows(coords) did, and the caller never even resolves the IP country.

import { isInsideCountry } from './countries';

// decidePublishAllowed({ physical, ip, coords, ipEnabled, isInside }) → boolean.
//   physical  = GPS-physical country (lowercase alpha-2) or null/undefined if unknown.
//   ip        = IP-derived country (lowercase alpha-2) or null/undefined if unknown.
//   coords    = the clicked mark's [lat, lng].
//   ipEnabled = is the IP sub-check ON? (IP_GEOFENCE_ENABLED) When false, ip is ignored
//               and the rule is the GPS-only path (byte-identical to today's geofence).
//   isInside  = injectable inside-country predicate (defaults to the real
//               isInsideCountry); lets a test drive the geometry leg without bounds.
// Fail-CLOSED: any missing/disagreeing signal returns false.
export function decidePublishAllowed(args = {}) {
  const { physical, ip, coords, ipEnabled } = args;
  const isInside = args.isInside || isInsideCountry;

  // (1) GPS-physical country must be known - same strict block as the existing
  // location geofence. Unknown physical → block, whether or not IP is enabled.
  if (!physical) return false;

  // The binding country is the GPS-physical country. The pin must sit inside it.
  if (!isInside(coords, physical)) return false;

  // (4)→ already checked the pin is inside the physical country above. If the IP
  // sub-check is OFF we are done: this is exactly today's GPS-only verdict.
  if (!ipEnabled) return true;

  // IP sub-check ON: the IP country must be KNOWN and EQUAL to the physical country.
  // Unknown IP (null) → block (fail-CLOSED). Disagreement (VPN / coarse IP) → block.
  if (!ip) return false;
  if (ip !== physical) return false;

  return true;
}
