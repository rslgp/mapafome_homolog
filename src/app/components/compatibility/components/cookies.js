// Native cookie helpers — SOT for the cookie subset this app uses.
//
// Replaces the `universal-cookie` package with the platform document.cookie API
// (v5 § dependency_injection.stable_vs_volatile + § KISS). Only get/set/remove
// were ever used, all client-side.
//
// Compatibility notes:
//   - Values are URI-encoded on write / decoded on read, matching the `cookie`
//     library that universal-cookie wrapped, so cookies written by the old code
//     (e.g. the "pontosAvaliados" list) round-trip unchanged.
//   - universal-cookie's get() ran JSON.parse on the value, so get('mdf_tour_done')
//     returned the NUMBER 1 and `=== '1'` was always false (the tour re-showed
//     every visit). These helpers return the raw string, restoring the intended
//     once-only behavior of hasSeenTour().

export function getCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) return undefined;
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return undefined;
}

export function setCookie(name, value, options = {}) {
  if (typeof document === 'undefined') return;
  let str = `${name}=${encodeURIComponent(value)}`;
  str += `; path=${options.path ?? '/'}`;
  if (options.expires instanceof Date) str += `; expires=${options.expires.toUTCString()}`;
  if (typeof options.maxAge === 'number') str += `; max-age=${options.maxAge}`;
  if (options.sameSite) str += `; samesite=${options.sameSite}`;
  if (options.secure) str += '; secure';
  document.cookie = str;
}

export function removeCookie(name, options = {}) {
  // Expire in the past + max-age 0 — same delete strategy universal-cookie used.
  setCookie(name, '', { ...options, expires: new Date(0), maxAge: 0 });
}
