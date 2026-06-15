// geofencePublishGuard.js — the SHARED binding-country resolution for EVERY publish funnel.
//
// WHY THIS MODULE EXISTS (extracted from App.js): three independent publish funnels must
// enforce the SAME rule — the map-click ("Confirmar ponto"), the report-sheet flow
// (handlePublishFromSheet), and the legacy address form (mylocation.handleSubmit). Keeping
// the resolution inline in App.js duplicated it and pushed App.js over its LOC fitness
// budget (FF1). This module is the ONE place that turns the two live resolvers into a single
// {eligible, country, status} verdict, so:
//   • App.js stays thin (it AWAITS this and applies the geometry leg per funnel);
//   • the binding logic is unit-testable WITHOUT React/the store/the network (both resolvers
//     and the device coords are INJECTED);
//   • every funnel reads the identical verdict — they cannot drift.
//
// It imports ONLY the pure geofenceEligibility (the agreement SOT). No countryStore, no flag,
// no React: the caller checks the location flag before calling, so this is never reached on
// the dark-ship OFF path.
//
// THE PHYSICAL COUNTRY IS RESOLVED ONLY FROM THE DEVICE COORDS — never from a clicked pin
// (that was a latent bug: reverse-geocoding the pin binds to where the user CLICKED, not
// where they ARE). A cached null (a single transient startup-lookup failure) is force-retried
// so a one-time network blip does not brick publishing for the whole session.

import { geofenceEligibility, isClickAllowed } from './geofenceDecision';
import { isInsideCountry } from './countries';
import { peekGeofenceEligibility } from './geofenceEvents';
import { t } from './ux/strings';

// isDeviceCoords(c) — true only for a real [lat, lng] number pair. envVariables.currentLocation
// seeds to [] and fills on the first GPS fix, so an empty/garbage value must NOT be geocoded.
function isDeviceCoords(c) {
  return Array.isArray(c) && c.length === 2
    && typeof c[0] === 'number' && typeof c[1] === 'number';
}

// _resolveSignals({ physicalResolver, ipResolver, deviceCoords }) → Promise<{ physical, ip, ipEnabled }>
// The SHARED signal-resolution step both publish gates depend on:
//   • resolveGeofenceBinding (the UX/status verdict — picks ONE binding country); and
//   • checkClickAllowed (the per-PIN independent-veto allow decision).
// It is the ONE place that turns the two live resolvers + the device coords into the raw
// {physical, ip, ipEnabled} signal triple, so the two gates can never drift on HOW a signal is
// resolved (warm peek → force-retry a cached null → DEVICE coords only, NEVER the clicked pin).
//   physicalResolver = the GPS physical-country resolver (peek()/resolve(coords, opts)); REQUIRED.
//   ipResolver       = the IP-country resolver (peek()/resolve(opts)) or null when the IP flag is OFF.
//   deviceCoords     = the user's DEVICE coords (envVariables.currentLocation), or anything
//                      non-coord when no fix yet.
async function _resolveSignals({ physicalResolver, ipResolver, deviceCoords } = {}) {
  // PHYSICAL leg: warm cache first; one-shot resolve from DEVICE coords only when present. A
  // cached null (resolved-but-unknown from a transient failure) is re-tried with { force }.
  let physical = physicalResolver.peek();
  const dev = isDeviceCoords(deviceCoords) ? deviceCoords : null;
  if ((physical === undefined || physical === null) && dev) {
    try {
      physical = await physicalResolver.resolve(dev, physical === null ? { force: true } : undefined);
    } catch (_e) {
      physical = null; // network/parse failure → unknown → IP fallback / block
    }
  }

  // IP leg (only when the resolver was constructed = both flags ON). Warm cache first;
  // one-shot resolve if a click beat the warm-up; a cached null is force-retried.
  const ipEnabled = !!ipResolver;
  let ipCountry = null;
  if (ipEnabled) {
    ipCountry = ipResolver.peek();
    if (ipCountry === undefined || ipCountry === null) {
      try {
        ipCountry = await ipResolver.resolve(ipCountry === null ? { force: true } : undefined);
      } catch (_e) {
        ipCountry = null;
      }
    }
  }

  return { physical: physical || null, ip: ipCountry || null, ipEnabled };
}

// resolveGeofenceBinding({ physicalResolver, ipResolver, deviceCoords }) → Promise<verdict>
//   physicalResolver = the GPS physical-country resolver (peek()/resolve(coords, opts)); REQUIRED.
//   ipResolver       = the IP-country resolver (peek()/resolve(opts)) or null when the IP flag is OFF.
//   deviceCoords     = the user's DEVICE coords (envVariables.currentLocation), or anything
//                      non-coord when no fix yet.
// Returns the geofenceEligibility() verdict ({ eligible, country, status }). NO geometry — the
// caller applies the pin check separately (today: checkClickAllowed's per-signal veto). This is
// STILL the UX gate's authority (show/hide the publish triggers) + the block-message status, so it
// stays even though the per-PIN allow now runs through checkClickAllowed.
export async function resolveGeofenceBinding(args = {}) {
  const { physical, ip, ipEnabled } = await _resolveSignals(args);
  return geofenceEligibility({ physical, ip, ipEnabled });
}

// checkClickAllowed({ physicalResolver, ipResolver, deviceCoords, pin }) → Promise<{ allowed, status, physical, ip }>
// The per-PIN PUBLISH gate for the ASYNC funnels (map-click + report-sheet). It resolves BOTH
// signal countries the SAME way resolveGeofenceBinding does (shared _resolveSignals: warm peek →
// force-retry a cached null → DEVICE coords only, NEVER the clicked pin), then applies the
// INDEPENDENT-VETO rule (isClickAllowed): the pin must be inside EVERY known, enabled signal's
// country. This is STRICTER than resolveGeofenceBinding's single-binding check — e.g. a GPS=br /
// IP=us disagreement vetoes every pin instead of resolving to one 'mismatch' country — but the
// AGREE case (GPS===IP, today's 'ok') is identical.
//   `allowed` = isClickAllowed({ pin, physical, ip, ipEnabled }).
//   `status`  = the resolveBindingCountry status for the SAME signals, so the caller maps the block
//               copy via geofenceBlockMessage(status) and the 'mismatch' vs need_location notice is
//               unchanged. (We re-derive it from geofenceEligibility on the resolved signals.)
//   `physical` / `ip` = the resolved signal countries (for the Pais stamp / downstream override).
export async function checkClickAllowed({ physicalResolver, ipResolver, deviceCoords, pin } = {}) {
  const { physical, ip, ipEnabled } = await _resolveSignals({ physicalResolver, ipResolver, deviceCoords });
  const { status } = geofenceEligibility({ physical, ip, ipEnabled });
  const allowed = isClickAllowed({ pin, physical, ip, ipEnabled });
  return { allowed, status, physical, ip };
}

// geofenceBlockMessage(status) → the localized notice for a blocked publish. A 'mismatch'
// (GPS and IP disagree — VPN / coarse IP) means location IS on, so the "turn on location"
// copy would mislead; every other block (unknown signals, or a pin outside the binding
// country) uses the need_location copy. One mapping, reused by all three funnels.
export function geofenceBlockMessage(status) {
  return status === 'mismatch'
    ? t('page.geofence.country_mismatch')
    : t('page.geofence.need_location');
}

// checkSyncBindingForPin(coords) → { allowed, country, message } — SYNCHRONOUS publish gate
// for funnels that are NOT React components and cannot await the resolvers (e.g. the legacy
// address-form write in mylocation.js). It reads the LAST BROADCAST eligibility verdict
// (peekGeofenceEligibility — the SAME verdict App.js last dispatched after the GPS/IP signals
// settled) and applies the geometry leg against the verified binding country. `allowed` is
// true only when there is a binding country AND the pin sits inside it; `message` is the
// localized notice to show on a block ('mismatch' → country_mismatch, else need_location).
// `country` is the verified binding country (for the Pais stamp) when allowed. Callers gate
// this behind the location flag, so OFF (no broadcast → undefined verdict) never reaches here.
//
// INDEPENDENT-VETO EQUIVALENCE (why this single-country check IS the per-signal veto here):
// The async funnels run the stricter isClickAllowed veto (checkClickAllowed) over BOTH raw
// signals, but this sync funnel only has the broadcast verdict's ONE binding country. That is
// faithful — NOT a gap — because in EVERY status where a binding country exists, all KNOWN
// governing signals AGREE on it (see resolveBindingCountry): 'ok' (IP off → GPS is the only
// signal; or IP on with physical===ip → both signals ARE that country) and 'ok_ip_fallback'
// (GPS unknown → IP is the only signal). In each case the set of known signals' countries is
// {binding}, so "inside the binding country" == "inside EVERY known signal" == the veto. The
// veto only DIVERGES from single-binding when signals DISAGREE (GPS=br/IP=us) or one is unknown
// while the other binds — but those resolve to a NULL binding country ('mismatch'/'ip_unknown'/
// 'no_location'), which this function already blocks. So checkSyncBindingForPin needs no change.
export function checkSyncBindingForPin(coords) {
  const elig = peekGeofenceEligibility();
  const country = elig && elig.country;
  if (country && isInsideCountry(coords, country)) {
    return { allowed: true, country, message: null };
  }
  return { allowed: false, country: null, message: geofenceBlockMessage(elig && elig.status) };
}
