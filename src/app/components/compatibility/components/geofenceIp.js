// geofenceIp.js - IP-COUNTRY signal for the publish geofence: resolve the visitor's
// country from their IP address (a SECOND, independent signal) so the publish gate
// can require the GPS-physical country and the IP country to AGREE.
//
// WHY THIS MODULE EXISTS (sibling of geofenceLocation.js, same composition seam):
// The existing location geofence binds a mark to the user's GPS-physical country
// (geofenceLocation.js). The user asked for a STRICTER rule: a mark is allowed only
// when BOTH the GPS-physical country AND the IP-derived country are the country the
// pin sits in. A VPN or a coarse IP that disagrees with the GPS fix must BLOCK. This
// module is the ONE place that resolves the IP country; like geofenceLocation it
// keeps the pure predicate (isInsideCountry, countries.js) and the composition root
// (App.js) free of ad-hoc network code:
//   • countries.js / geofence.js never import a fetcher (DI: the pure predicate stays
//     pure; the consumer decides whether to even resolve a country);
//   • App.js INJECTS this resolver the same way it injects the physical resolver,
//     instead of duplicating the fetch/cache inline.
// It imports ONLY the pure normalizeCountryCode (to coerce any API casing/synonym to
// the SAME lowercase ISO alpha-2 the GPS resolver returns via reverseGeocodeCountry).
// No countryStore, no flag, no React: the flag gate lives in geofenceConfig.js and
// the caller checks it before constructing this resolver, so this module is dead code
// when OFF.
//
// FAIL-CLOSED CONTRACT (the locked decision - DELIBERATELY UNLIKE reverseGeocodeGuard):
// reverseGeocodeGuard's offshore check FAILS OPEN (a network hiccup never costs a
// legit mark) because the bbox already gated the pin. This module is the opposite:
// the combined AND rule the caller enforces is fail-CLOSED, so a null here (network
// error / timeout / throttle / parse failure / no fetch / unknown country) is treated
// by the caller as "IP country unknown" → the mark is BLOCKED, never silently allowed.
// We therefore swallow EVERY error to null (we never throw) and let the caller's
// strict AND decide; "null = unknown = block" is the whole point.
//
// CACHING DESIGN (resolve ONCE per session): unlike the GPS fix, a visitor's IP
// country does not change as they pan the map, so there is no movement re-resolve.
// We resolve once, memoize, and de-dupe concurrent calls. A caller MAY force a fresh
// lookup via resolve({ force: true }) (e.g. a manual retry) - that is the only way to
// re-hit the network in a session.
//
// PRIVACY NOTE: this sends the visitor's IP to a third-party geolocation API and
// receives back ONLY a country code. No PII is requested, parsed, or stored - we read
// exactly one field (the ISO country code) and discard the rest of the response. The
// endpoint is INJECTABLE (opts.fetchIpCountry) so tests run with no network and a
// self-hoster can point at their own resolver. The default endpoint is a free,
// country-capable, HTTPS, no-key service.

import { normalizeCountryCode } from './countries';

// Default IP-geolocation endpoint. ipwho.is is free, key-less, HTTPS, CORS-enabled,
// and returns a small JSON object that includes `country_code` (ISO alpha-2, e.g.
// "BR"). We read ONLY that field. Swappable via opts.fetchIpCountry for tests or a
// self-hosted resolver. (Privacy: see the header - only a country code comes back.)
const DEFAULT_IP_ENDPOINT = 'https://ipwho.is/?fields=country_code,success';

// Per-request timeout. Short enough that a publish gate does not hang on a slow or
// dead endpoint; on timeout we resolve to null (→ the caller's strict block). The GPS
// guard uses 4000 ms; the IP lookup is a single tiny GET so a tighter budget is fine.
const DEFAULT_TIMEOUT_MS = 3500;

// defaultFetchIpCountry(opts) - the real network fetcher. Resolves the visitor's IP
// country as a lowercase ISO alpha-2 code, or null on ANY failure (no fetch, HTTP
// error, timeout/abort, bad JSON, missing field, unrecognized code). NEVER throws:
// every path that cannot produce a confident country yields null, which the caller
// reads as "unknown → block" (fail-CLOSED).
async function defaultFetchIpCountry(opts = {}) {
  const fetchImpl = opts.fetchImpl
    || (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl) return null; // no fetch in this runtime → unknown → block

  const url = opts.endpoint || DEFAULT_IP_ENDPOINT;
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null;
  if (controller) timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (timer) clearTimeout(timer);
    if (!res || !res.ok) return null; // HTTP error / 429 → unknown → block
    const data = await res.json();
    // ipwho.is shape: { success: true, country_code: 'BR', ... }. On failure it can
    // return { success: false } (still HTTP 200), which we treat as unknown. We read
    // ONLY country_code (privacy: nothing else is parsed or stored). Coerce to the
    // same lowercase alpha-2 the GPS resolver returns; an unknown/blank code → null.
    if (data && data.success === false) return null;
    const raw = data && data.country_code;
    return normalizeCountryCode(raw); // lowercase alpha-2, or null if unrecognized
  } catch (_e) {
    if (timer) clearTimeout(timer);
    return null; // network error / abort / bad JSON → unknown → block
  }
}

// createIpCountryResolver(opts) - build the per-session IP-country resolver. opts.
// fetchIpCountry is injectable for tests (defaults to defaultFetchIpCountry, which
// hits the real endpoint). Returns:
//   • resolve(o) → Promise<alpha2|null>: resolve+cache the IP country ONCE per
//                  session (concurrent calls share one in-flight promise). null =
//                  unknown (any failure). Pass { force: true } to bypass the cache.
//   • peek()     → alpha2|null|undefined: the cached code WITHOUT awaiting
//                  (undefined = never resolved yet; null = resolved-but-unknown).
// There is no allows() here: the IP signal alone does not decide a mark. The pure
// combined decision (physical AND ip AND inside-country) lives in geofenceDecision.js
// and is enforced by App.js; this module only SUPPLIES the IP country.
export function createIpCountryResolver(opts = {}) {
  const fetchIpCountry = opts.fetchIpCountry || defaultFetchIpCountry;

  let cachedCode;        // undefined = never resolved; null = resolved, unknown
  let inFlight = null;   // de-dupe concurrent resolves

  async function resolve(o = {}) {
    if (!o.force && cachedCode !== undefined) return cachedCode;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      let code = null;
      try {
        // fetchIpCountry yields alpha2 or null; it must not throw, but guard anyway
        // so a misbehaving injected fetcher still fails CLOSED (null) not loud.
        code = await fetchIpCountry();
      } catch (_e) {
        code = null;
      }
      cachedCode = code || null; // normalize undefined/'' → null (unknown)
      inFlight = null;
      return cachedCode;
    })();
    return inFlight;
  }

  function peek() {
    return cachedCode;
  }

  return { resolve, peek };
}
