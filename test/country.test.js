// country.test.js — INTL feature: flag-driven geocoder scope.
//
// Covers the three pure/near-pure units behind the flag selector:
//   • countries.js  — flag-emoji derivation, getCountry fallback, normalize, list
//   • countryStore  — default 'br', localStorage persistence, validation, pub/sub
//   • SearchField.buildCountryProvider — country drives Nominatim params/bounds
//
// The DOM control (CountryFlagControl) is a thin L.Control wrapper over these
// units; its logic (filter/pick/recenter) is exercised through them. We do not
// render Leaflet in jsdom here — the map instance is imperative and covered by
// the build/smoke gate.

import { describe, it, expect, beforeEach } from 'vitest';

import {
  flagEmoji,
  getCountry,
  normalizeCountryCode,
  COUNTRIES,
  COUNTRY_BOUNDS,
  DEFAULT_COUNTRY,
} from '../src/app/components/compatibility/components/countries.js';
import {
  getSelectedCountry,
  setSelectedCountry,
  subscribe,
  COUNTRY_STORAGE_KEY,
  __resetCountryStoreForTests,
} from '../src/app/components/compatibility/components/countryStore.js';
import { buildCountryProvider } from
  '../src/app/components/compatibility/components/SearchField.js';
import { getLocale } from
  '../src/app/components/compatibility/components/ux/strings.js';

describe('countries.flagEmoji', () => {
  it('derives the correct regional-indicator flag from a 2-letter code', () => {
    expect(flagEmoji('br')).toBe('🇧🇷');
    expect(flagEmoji('US')).toBe('🇺🇸'); // case-insensitive
    expect(flagEmoji('pt')).toBe('🇵🇹');
  });

  it('returns a globe (never blank) for invalid input', () => {
    expect(flagEmoji('')).toBe('🌐');
    expect(flagEmoji('xyz')).toBe('🌐');
    expect(flagEmoji(null)).toBe('🌐');
    expect(flagEmoji(123)).toBe('🌐');
  });
});

describe('countries.normalizeCountryCode', () => {
  it('lowercases and accepts known codes', () => {
    expect(normalizeCountryCode('BR')).toBe('br');
    expect(normalizeCountryCode(' pt ')).toBe('pt');
  });
  it('rejects unknown / malformed codes', () => {
    expect(normalizeCountryCode('zz')).toBeNull();
    expect(normalizeCountryCode('brazil')).toBeNull();
    expect(normalizeCountryCode(undefined)).toBeNull();
  });
});

describe('countries.getCountry', () => {
  it('returns code/name/flag/bounds for a known country', () => {
    const br = getCountry('br');
    expect(br.code).toBe('br');
    expect(br.name).toBe('Brasil');
    expect(br.flag).toBe('🇧🇷');
    expect(br.bounds).toEqual(COUNTRY_BOUNDS.br);
  });
  it('falls back to the default country for an unknown code', () => {
    const c = getCountry('zz');
    expect(c.code).toBe(DEFAULT_COUNTRY);
    expect(c.name).toBe('Brasil');
  });
  it('returns null bounds for a country without an explicit bounds entry', () => {
    expect(getCountry('pt').bounds).toBeNull();
  });
});

describe('countries.COUNTRIES list', () => {
  it('is sorted by pt-BR name and contains Brazil + a broad set', () => {
    expect(COUNTRIES.length).toBeGreaterThan(150);
    const names = COUNTRIES.map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(names).toEqual(sorted);
    expect(COUNTRIES.find((c) => c.code === 'br')).toBeTruthy();
    expect(COUNTRIES.find((c) => c.code === 'us')).toBeTruthy();
  });
  it('has no duplicate codes', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('every code yields a real flag (no globe fallback)', () => {
    for (const c of COUNTRIES) {
      expect(flagEmoji(c.code)).not.toBe('🌐');
    }
  });
});

describe('countryStore', () => {
  beforeEach(() => {
    __resetCountryStoreForTests();
    try { window.localStorage.removeItem(COUNTRY_STORAGE_KEY); } catch (_e) { /* noop */ }
  });

  it('defaults to Brazil when nothing is stored', () => {
    expect(getSelectedCountry()).toBe('br');
  });

  it('persists a valid choice to localStorage and reads it back', () => {
    setSelectedCountry('pt');
    expect(getSelectedCountry()).toBe('pt');
    expect(window.localStorage.getItem(COUNTRY_STORAGE_KEY)).toBe('pt');
    // A fresh in-module read (reset) re-hydrates from storage.
    __resetCountryStoreForTests();
    expect(getSelectedCountry()).toBe('pt');
  });

  it('ignores an invalid code (stays on the current value)', () => {
    setSelectedCountry('us');
    setSelectedCountry('zz');
    expect(getSelectedCountry()).toBe('us');
  });

  it('notifies subscribers only on an actual change', () => {
    const seen = [];
    const off = subscribe((code) => seen.push(code));
    setSelectedCountry('ar');
    setSelectedCountry('ar'); // same value — no second notification
    setSelectedCountry('cl');
    off();
    setSelectedCountry('us'); // after unsubscribe — not seen
    expect(seen).toEqual(['ar', 'cl']);
  });
});

describe('SearchField.buildCountryProvider', () => {
  // leaflet-geosearch stores the whole constructor arg as provider.options, so
  // the Nominatim query params live at options.params and the (legacy) region/
  // searchBounds at options.providerOptions. countrycodes is the load-bearing
  // restriction that Nominatim actually honors.
  it('scopes Nominatim countrycodes (the geographic filter) to the selected country', () => {
    const p = buildCountryProvider('pt');
    expect(p.options.params.countrycodes).toBe('pt');
    expect(p.options.providerOptions.region).toBe('pt');
  });

  it('labels results in the app UI locale, NOT the country code', () => {
    // accept-language is a BCP-47 language tag for result labels, not a country
    // filter: 'jp'/'us' are not languages. It must follow the strings.js locale
    // SOT (default pt-BR), decoupled from the chosen country code.
    const p = buildCountryProvider('jp');
    expect(p.options.params['accept-language']).toBe(getLocale());
    expect(p.options.params['accept-language']).not.toBe('jp');
    // Geographic restriction still tracks the chosen country.
    expect(p.options.params.countrycodes).toBe('jp');
  });

  it('applies searchBounds only when the country has known bounds', () => {
    expect(buildCountryProvider('br').options.providerOptions.searchBounds).toBeTruthy();
    expect(buildCountryProvider('pt').options.providerOptions.searchBounds).toBeUndefined();
  });

  it('falls back to the default country params for an unknown code', () => {
    const p = buildCountryProvider('zz');
    expect(p.options.params.countrycodes).toBe('br');
  });

  it('preserves the debounced+cached search wrapper (function, not the original)', () => {
    const p = buildCountryProvider('br');
    expect(typeof p.search).toBe('function');
  });
});
