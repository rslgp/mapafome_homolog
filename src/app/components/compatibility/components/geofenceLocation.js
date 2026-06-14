// geofenceLocation.js — LOCATION-BOUND geofence: resolve the user's PHYSICAL country
// (GPS reverse-geocoded ISO alpha-2) and decide whether a pin is allowed there.
//
// WHY THIS MODULE EXISTS (the composition seam, mirroring geofence.js):
// The pure predicate (isInsideCountry, countries.js) must stay free of the geocoder,
// and App.js (the composition root) must not grow ad-hoc network/caching code inline.
// This module is the ONE place that ties the existing reverse-geocoder
// (reverseGeocodeCountry) to a per-session cache, so:
//   • countries.js / geofence.js never import the geolocation/geocoder (DI: the pure
//     predicate stays pure; the consumer decides whether to even resolve a country);
//   • App.js INJECTS this resolver down the same way it injects activeCountry /
//     offshoreGuard, instead of duplicating the cache or the geocoder.
// It imports ONLY reverseGeocodeCountry (the SAME Nominatim guard the publish path
// already uses — no second geocoder) and the pure isInsideCountry. No countryStore,
// no flag, no React: the flag gate lives in geofenceConfig.js and the caller checks
// it before constructing this resolver, so this module is dead code when OFF.
//
// CACHING DESIGN (why a per-session cache, not a per-click network call):
// A map click is SYNCHRONOUS but the reverse-geocode is async/network. A user does
// not teleport between countries mid-session, so the physical country is resolved
// ONCE (kick-started from App.js's getCurrentPosition success, then memoized) and the
// click handler reads the cached code synchronously. We only RE-RESOLVE when the
// device coords move a LARGE distance (RESOLVE_MOVE_KM) from where we last resolved —
// a cheap coarse degree-delta check, no haversine dependency pulled into this seam.
// A first mark before resolution completes awaits a one-shot resolve (and caches it),
// so the very first click is correct even if it precedes the background resolve.
//
// FAIL-SAFE / STRICT FALLBACK (the locked decision): when the physical country is
// UNKNOWN (geolocation denied / no GPS / reverse-geocode failed or offline), the
// resolver returns null and the caller BLOCKS the mark with a localized message.
// This is the STRICT option the user chose, and it only takes effect when the flag is
// ON — geofenceConfig defaults OFF, so this code never runs on the dark-ship path.

import { reverseGeocodeCountry } from './reverseGeocodeGuard';
import { isInsideCountry } from './countries';

// Re-resolve the physical country only when the device has moved at least this far
// from the coords we last resolved against. ~150 km in latitude (and roughly the same
// at the equator in longitude) comfortably exceeds intra-country/-metro movement while
// catching a genuine country change. A coarse degree threshold (≈1.35 deg) is used
// instead of a haversine import — this is a "did the user effectively relocate" gate,
// not a precise distance, so degree precision is intentionally enough and keeps this
// seam free of a geometry dependency.
const RESOLVE_MOVE_DEG = 1.35;

// createPhysicalCountryResolver(opts) — build the per-session resolver. opts.geocode
// is injectable for tests (defaults to the real reverseGeocodeCountry). Returns:
//   • resolve(coords)  → Promise<alpha2|null>: reverse-geocode + cache the result for
//                        these coords; reuse the cache while the device stays put.
//   • peek()           → alpha2|null|undefined: the cached code WITHOUT awaiting
//                        (undefined = never resolved yet; null = resolved-but-unknown).
//   • allows(markCoords)→ boolean: is markCoords inside the cached physical country?
//                        false when the physical country is unknown (strict fallback).
export function createPhysicalCountryResolver(opts = {}) {
  const geocode = opts.geocode || reverseGeocodeCountry;

  let cachedCode;          // undefined = never resolved; null = resolved, unknown
  let resolvedAtCoords = null; // [lat, lng] the cachedCode was resolved for
  let inFlight = null;     // de-dupe concurrent resolves

  function movedFar(coords) {
    if (!resolvedAtCoords || !Array.isArray(coords) || coords.length < 2) return true;
    const dLat = Math.abs(coords[0] - resolvedAtCoords[0]);
    const dLng = Math.abs(coords[1] - resolvedAtCoords[1]);
    return dLat >= RESOLVE_MOVE_DEG || dLng >= RESOLVE_MOVE_DEG;
  }

  async function resolve(coords) {
    // Reuse the cached code while the user has not effectively relocated.
    if (cachedCode !== undefined && !movedFar(coords)) return cachedCode;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      // reverseGeocodeCountry returns alpha2 on land, null on ocean/network/throttle.
      // We store whatever it returns; null becomes the strict "unknown" verdict.
      const code = await geocode(coords);
      cachedCode = code || null;
      resolvedAtCoords = Array.isArray(coords) && coords.length >= 2
        ? [coords[0], coords[1]]
        : resolvedAtCoords;
      inFlight = null;
      return cachedCode;
    })();
    return inFlight;
  }

  function peek() {
    return cachedCode;
  }

  function allows(markCoords) {
    if (!cachedCode) return false; // unknown physical country → strict block
    return isInsideCountry(markCoords, cachedCode);
  }

  return { resolve, peek, allows };
}
