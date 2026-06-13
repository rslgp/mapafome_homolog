// countriesForLocale.test.js — INTL M3.5 (I18N-1): the flag picker's country
// list follows the active UI locale.
//
// COUNTRY_NAMES is pt-BR only and COUNTRIES sorts with localeCompare(...,'pt-BR'),
// so an `es` user read a Portuguese list sorted for Portuguese. M3.5 adds
// countriesForLocale(locale): names via Intl.DisplayNames in the active language,
// with the curated pt-BR map as fallback, memoized per locale tag.
//
// These tests pin the four properties M3.5 promises:
//   • pt-BR reads EXACTLY as today (dark-ship: === the COUNTRIES singleton);
//   • es DIFFERS (Germany = "Alemania"), and the sort respects the es locale;
//   • a missing Intl.DisplayNames falls back to the curated pt-BR map;
//   • the result is memoized per locale (same array back) and switching locale
//     returns the OTHER locale's list (the resolver layer of the recompute fix).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  COUNTRIES,
  countriesForLocale,
  __resetCountriesForLocaleCache,
} from '../src/app/components/compatibility/components/countries.js';
import { getLocale, setLocale } from
  '../src/app/components/compatibility/components/ux/strings.js';

describe('countriesForLocale — pt-BR (dark-ship invariant)', () => {
  beforeEach(() => __resetCountriesForLocaleCache());

  it('matches today exactly: pt-BR is the COUNTRIES singleton (same array)', () => {
    // The default-locale path must be byte-for-byte what shipped before M3.5.
    expect(countriesForLocale('pt-BR')).toBe(COUNTRIES);
  });

  it('renders the curated pt-BR names (Germany = "Alemanha"), not CLDR variants', () => {
    const ptbr = countriesForLocale('pt-BR');
    const byCode = (c) => ptbr.find((x) => x.code === c);
    expect(byCode('de').name).toBe('Alemanha');
    expect(byCode('us').name).toBe('Estados Unidos');
    expect(byCode('es').name).toBe('Espanha');
    // A code where Intl.DisplayNames(pt-BR) DIVERGES from the curated map: the
    // curated SOT must win so the default picker is unchanged.
    expect(byCode('nl').name).toBe('Holanda'); // not "Países Baixos"
    expect(byCode('va').name).toBe('Vaticano'); // not "Cidade do Vaticano"
  });

  it('treats any pt-* tag as the curated locale', () => {
    const ptpt = countriesForLocale('pt-PT');
    expect(ptpt.find((c) => c.code === 'de').name).toBe('Alemanha');
  });
});

describe('countriesForLocale — es (locale-aware names + sort)', () => {
  beforeEach(() => __resetCountriesForLocaleCache());

  it('renders names in Spanish (Germany = "Alemania"), differing from pt-BR', () => {
    const es = countriesForLocale('es');
    const ptbr = countriesForLocale('pt-BR');
    const esDe = es.find((c) => c.code === 'de').name;
    const ptDe = ptbr.find((c) => c.code === 'de').name;
    expect(esDe).toBe('Alemania');
    expect(ptDe).toBe('Alemanha');
    expect(esDe).not.toBe(ptDe);
    expect(es.find((c) => c.code === 'es').name).toBe('España');
  });

  it('keeps the same codes and flags as pt-BR (only names/order localize)', () => {
    const es = countriesForLocale('es');
    const ptbr = countriesForLocale('pt-BR');
    expect(es.length).toBe(ptbr.length);
    expect(new Set(es.map((c) => c.code))).toEqual(new Set(ptbr.map((c) => c.code)));
    expect(es.find((c) => c.code === 'br').flag).toBe('🇧🇷');
  });

  it('sorts by the es locale, not pt-BR', () => {
    const es = countriesForLocale('es');
    const names = es.map((c) => c.name);
    const sortedEs = [...names].sort((a, b) => a.localeCompare(b, 'es'));
    expect(names).toEqual(sortedEs);
  });
});

describe('countriesForLocale — fallback when Intl.DisplayNames is unavailable', () => {
  let original;
  beforeEach(() => {
    original = Intl.DisplayNames;
    // Simulate a runtime without the API (no polyfill is bundled, see M3.5).
    Intl.DisplayNames = undefined;
    __resetCountriesForLocaleCache();
  });
  afterEach(() => {
    Intl.DisplayNames = original;
    __resetCountriesForLocaleCache();
  });

  it('falls back to the curated pt-BR map for a non-pt locale, never throwing', () => {
    const es = countriesForLocale('es');
    // No DisplayNames → curated names (pt-BR) are used as the fallback.
    expect(es.find((c) => c.code === 'de').name).toBe('Alemanha');
    expect(es.find((c) => c.code === 'us').name).toBe('Estados Unidos');
    // The list is still complete and renderable.
    expect(es.length).toBe(COUNTRIES.length);
  });
});

describe('countriesForLocale — memoization + recompute on locale change', () => {
  beforeEach(() => __resetCountriesForLocaleCache());

  it('memoizes per locale tag (repeat call returns the SAME array)', () => {
    const first = countriesForLocale('es');
    const second = countriesForLocale('es');
    expect(second).toBe(first); // built once, not per call
  });

  it('returns a DIFFERENT array for a different locale (no stale reuse)', () => {
    const es = countriesForLocale('es');
    const ptbr = countriesForLocale('pt-BR');
    expect(ptbr).not.toBe(es);
    expect(ptbr.find((c) => c.code === 'de').name).toBe('Alemanha');
    expect(es.find((c) => c.code === 'de').name).toBe('Alemania');
  });

  it('with no arg, follows getLocale() — switching locale re-labels the list', () => {
    // Default locale is pt-BR (engine DEFAULT_LOCALE); the no-arg call tracks it.
    expect(getLocale()).toBe('pt-BR');
    expect(countriesForLocale().find((c) => c.code === 'de').name).toBe('Alemanha');

    setLocale('es'); // user switches the UI language
    try {
      expect(getLocale()).toBe('es');
      // The no-arg resolver now returns the es list — the data layer of the
      // CountryFlagControl stale-list fix (the control re-invokes this on the
      // mdf-locale-change event setLocale dispatches).
      expect(countriesForLocale().find((c) => c.code === 'de').name).toBe('Alemania');
    } finally {
      setLocale('pt-BR'); // restore the shared module-level locale for other tests
    }
  });
});
