// reverseGeocodeGuard.js — INTL M4.5 offshore-integrity guard (DATA-3).
//
// WHY THIS EXISTS (INTERNATIONAL_PLAN §5 M4.5 / R1 / DATA-1):
// The per-country publish bbox (COUNTRY_PUBLISH_BOUNDS in countries.js) is a
// RECTANGLE, so it still admits a pin dropped in open ocean INSIDE that rectangle
// (e.g. 200 km off the French coast but inside FR's box). For the FOOD app there
// is NO Layer-B data barricade (DATA-1: only /pets calls validateCoordinatePair),
// so once the geofence loosens from the two Brazil rectangles to a country
// rectangle, the offshore-pin problem is the ONLY remaining integrity guard — not
// a refinement. This module is the cheap client-side guard the plan picked over
// point-in-polygon infra: at publish time it reverse-geocodes the pin via
// Nominatim (the SAME OpenStreetMap service the address search already uses — no
// new geocoding dependency) and rejects it when the reverse-geocoded country code
// does not match the country the user selected.
//
// HYGIENE, NOT SECURITY (INTERNATIONAL_PLAN §1 / §9 / R6): the .env bundles a full
// RSA private key (NEXT_PUBLIC_GOOGLE_PRIVATE_KEY), so EVERY client-side check —
// the whole geofence and this guard — is trivially bypassable by anyone with the
// bundle. This is a data-HYGIENE layer that reduces accidental garbage, not an
// access-control gate. Tightening or loosening it does not change the security
// posture at all.
//
// EXPECTED GARBAGE-RATE DELTA (the plan's "declare the delta" ask): this guard
// REDUCES, but does NOT eliminate, ocean/garbage pins. It catches the common case
// (a pin that Nominatim resolves to a clearly different country, or to no country
// because it landed in open sea — see the fail-open note below for that nuance).
// It does NOT catch: (a) pins inside the selected country's territorial waters or
// just offshore where Nominatim still attributes the nearest country; (b) pins
// when the network/Nominatim is unavailable (we FAIL OPEN — see below); (c) any
// adversary, since R6 makes all client validation bypassable. Net: best-effort
// hygiene, expected to remove the obvious cross-border / clearly-offshore noise,
// not a hard offshore filter.
//
// FAIL-OPEN CONTRACT (INTERNATIONAL_PLAN §5 M4.5 / §1): a network error, timeout,
// rate-limit, malformed response, or any thrown error NEVER blocks the publish.
// The bbox already gated the pin; this reverse-geocode is a best-effort extra
// layer, so a Nominatim hiccup must not cost a legitimate user their mark. Only a
// CONFIDENT, parsed country mismatch returns a block.
//
// RATE / COST (mirrors SearchField's withDebounceCache, B18): Nominatim's OSM
// policy is ~1 req/s/IP. This guard runs once per publish (not per keystroke), and
// we add a small in-memory result cache keyed by rounded coords so a retry of the
// same pin does not re-hit the network, plus a minimum-interval throttle that, if
// tripped, FAILS OPEN rather than queueing/blocking.

import { getLocale } from './ux/strings';
import { normalizeCountryCode } from './countries';

// The SAME Nominatim service leaflet-geosearch's OpenStreetMapProvider points at
// (its default searchUrl is `${NOMINATIM}/search`, reverseUrl `${NOMINATIM}/reverse`).
// We hit /reverse directly with fetch because the food publish path is plain
// imperative code (no Leaflet provider instance in scope) and leaflet-geosearch
// exposes no standalone reverse helper. No new dependency: same host, same policy.
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

// Default per-request timeout. Generous enough not to false-reject a slow network,
// short enough that a publish does not hang: on timeout we FAIL OPEN.
const DEFAULT_TIMEOUT_MS = 4000;

// ~1 req/s/IP Nominatim courtesy throttle. If a second guard call arrives inside
// this window we FAIL OPEN (return allow) instead of delaying the publish.
const MIN_INTERVAL_MS = 1000;

// Small in-memory cache of {key -> alpha2|null} so a retried publish of the same
// pin does not re-hit the network. Coords are rounded to ~1 km (3 decimals) for
// the key. Bounded to avoid unbounded growth in a long session.
const CACHE_LIMIT = 50;
const _cache = new Map();
let _lastRequestAt = 0;

function coordKey(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function cacheGet(key) {
  return _cache.has(key) ? _cache.get(key) : undefined;
}

function cacheSet(key, value) {
  if (_cache.size >= CACHE_LIMIT) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, value);
}

// Test seam only — reset the throttle + cache between cases. Never used in prod.
export function __resetReverseGeocodeGuardForTests() {
  _cache.clear();
  _lastRequestAt = 0;
}

// reverseGeocodeCountry(coords, opts) — resolve the alpha-2 country code Nominatim
// attributes to [lat, lng], or null if it cannot (open ocean returns no country;
// a network/parse failure also yields null). PURE of the flag/store: the caller
// decides whether to even call this. `fetchImpl` is injectable for tests.
async function reverseGeocodeCountry(coords, opts = {}) {
  const fetchImpl = opts.fetchImpl
    || (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl) return null; // no fetch available (odd runtime) → fail-open

  const lat = coords && coords[0];
  const lng = coords && coords[1];
  if (typeof lat !== 'number' || typeof lng !== 'number'
      || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const key = coordKey(lat, lng);
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  // ~1 req/s throttle: if we are inside the window, do NOT delay the publish —
  // fail open by returning null (treated as "could not determine" → allow).
  const now = (opts.now || Date.now)();
  if (now - _lastRequestAt < MIN_INTERVAL_MS) return null;
  _lastRequestAt = now;

  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '5', // country/region zoom — we only need address.country_code
    addressdetails: '1',
    // Result-label language follows the UI locale, mirroring SearchField's
    // accept-language axis (does not affect country_code, but keeps it consistent).
    'accept-language': getLocale(),
  });
  const url = `${NOMINATIM_REVERSE_URL}?${params.toString()}`;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  let timer = null;
  if (controller) timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (timer) clearTimeout(timer);
    if (!res || !res.ok) {
      cacheSet(key, null);
      return null; // HTTP error / 429 → fail-open
    }
    const data = await res.json();
    // Nominatim returns { address: { country_code: 'fr', ... } } for land, and an
    // { error: ... } (no address) for a point in open ocean.
    const raw = data && data.address && data.address.country_code;
    const code = normalizeCountryCode(raw);
    cacheSet(key, code);
    return code;
  } catch (_e) {
    if (timer) clearTimeout(timer);
    cacheSet(key, null); // network error / abort / bad JSON → fail-open
    return null;
  }
}

// assertPublishCountryMatches(coords, expectedCode, opts) — the guard the publish
// path calls. Reverse-geocodes the pin and THROWS Error('out_of_bounds') ONLY on a
// CONFIDENT country mismatch (Nominatim returned a real, normalized country code
// that differs from the selected country). Every other outcome RESOLVES (allow):
//   • reverse-geocode returned null  → could not determine (open ocean OR network
//                                       failure OR throttle) → FAIL OPEN, allow.
//   • reverse-geocode === expected    → match, allow.
//   • expectedCode falsy/unknown      → nothing to compare against, allow.
// Reusing the existing 'out_of_bounds' reason means App.js's existing publish
// .catch classifies it into the SAME localized outOfCountryMessage() surface with
// zero new error plumbing (INTERNATIONAL_PLAN App.js:402-409).
export async function assertPublishCountryMatches(coords, expectedCode, opts = {}) {
  const expected = normalizeCountryCode(expectedCode);
  if (!expected) return; // unknown/blank selected country → nothing to verify

  const geocoded = await reverseGeocodeCountry(coords, opts);
  if (!geocoded) return;            // fail-open (ocean / network / throttle)
  if (geocoded === expected) return; // confirmed match

  // Confident cross-country mismatch: reject with the reason App.js already maps
  // to the localized "fora do país selecionado" copy.
  const err = new Error('out_of_bounds');
  err.reason = 'out_of_bounds';
  err.geocodedCountry = geocoded;
  err.expectedCountry = expected;
  throw err;
}

// Exposed for direct unit testing of the resolver in isolation.
export { reverseGeocodeCountry };
