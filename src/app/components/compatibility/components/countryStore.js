// INTL-2 — selected-country store for the flag-driven geocoder scope.
//
// Single source of truth for "which country is the address search scoped to".
// Backed by localStorage (key `mdf_country`) so the choice survives reloads,
// with a tiny pub/sub so the flag control and SearchField both react when it
// changes — without lifting state up through react-leaflet, which owns the map
// instance imperatively.
//
// SSR-safe: every window/localStorage touch is guarded. During Next's static
// export there is no window, so reads fall back to the default and writes are
// no-ops. The value is also cached in-module so a getter never depends on
// localStorage being readable (private-mode / quota / disabled storage).

import { DEFAULT_COUNTRY, normalizeCountryCode } from './countries';

export const COUNTRY_STORAGE_KEY = 'mdf_country';

const hasWindow = () => typeof window !== 'undefined';

// In-module cache. Seeded lazily from localStorage on first read so we never
// throw if storage is unavailable (the try/catch swallows SecurityError etc.).
let current = null;
const listeners = new Set();

function readFromStorage() {
  if (!hasWindow()) return DEFAULT_COUNTRY;
  try {
    const raw = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
    return normalizeCountryCode(raw) || DEFAULT_COUNTRY;
  } catch (_e) {
    // Storage blocked (private mode, disabled cookies): fall back, don't crash.
    return DEFAULT_COUNTRY;
  }
}

// getSelectedCountry() -> a valid lowercase 2-letter code, always renderable.
export function getSelectedCountry() {
  if (current === null) current = readFromStorage();
  return current;
}

// setSelectedCountry(code): validates, persists, and notifies subscribers.
// An invalid code is ignored (returns the unchanged current value) so a bad
// caller can never push the store into an unrenderable state.
export function setSelectedCountry(code) {
  const cc = normalizeCountryCode(code);
  if (!cc) return getSelectedCountry();
  const prev = getSelectedCountry();
  current = cc;
  if (hasWindow()) {
    try {
      window.localStorage.setItem(COUNTRY_STORAGE_KEY, cc);
    } catch (_e) {
      // Persist failed (quota / blocked): the in-module value still updated, so
      // the session reflects the choice; it just won't survive a reload.
    }
  }
  if (cc !== prev) {
    for (const fn of listeners) {
      try { fn(cc); } catch (_e) { /* a faulty listener never breaks the others */ }
    }
  }
  return cc;
}

// subscribe(fn): fn(code) runs on every change. Returns an unsubscribe fn.
export function subscribe(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Test seam: reset in-module state (does not touch localStorage). Used by unit
// tests to isolate cases; harmless in production (never called there).
export function __resetCountryStoreForTests() {
  current = null;
  listeners.clear();
}
