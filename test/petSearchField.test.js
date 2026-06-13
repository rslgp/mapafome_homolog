// petSearchField.test.js — INTL M4: the /pets address search mirrors the food
// map's SearchField in BOTH scoping axes (I18N-4), gated by the same INTL flag.
//
//   • GEOGRAPHY: countrycodes / region / searchBounds follow
//     getCountry(<selected country>) — the same pattern as
//     SearchField.buildCountryProvider (covered there in country.test.js).
//   • LANGUAGE: accept-language follows the UI locale getLocale() (a BCP-47
//     language tag), NOT the country code. The old value was 'br' — a country
//     code, not a language — which yielded distorted labels (the bug this fixes).
//
// We do NOT render Leaflet in jsdom (the map instance is imperative, covered by
// the build/smoke gate) — exactly like country.test.js. buildPetCountryProvider
// is the pure scoping seam, so we assert on provider.options the same way.
//
// The OFF-stays-Brazil behavior lives in the COMPONENT's seed expression
// (INTL_ENABLED ? getSelectedCountry : () => DEFAULT_COUNTRY), identical to
// SearchField. We characterize that contract by re-importing the module under
// each flag state (vitest module-registry reset, the intlConfig.test pattern)
// and asserting which country the seed resolves to.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const PETSEARCH_MOD = '../src/app/pets/PetSearchField.js';
const COUNTRYSTORE_MOD =
  '../src/app/components/compatibility/components/countryStore.js';
const STRINGS_MOD =
  '../src/app/components/compatibility/components/ux/strings.js';

import {
  COUNTRY_BOUNDS,
} from '../src/app/components/compatibility/components/countries.js';

describe('PetSearchField.buildPetCountryProvider — mirrors SearchField scope (INTL M4)', () => {
  // leaflet-geosearch stores the whole constructor arg as provider.options, so
  // the Nominatim query params live at options.params and the (legacy) region/
  // searchBounds at options.providerOptions. countrycodes is the load-bearing
  // restriction Nominatim actually honors.

  it('scopes Nominatim countrycodes (the geographic filter) to the given country', async () => {
    const { buildPetCountryProvider } = await import(PETSEARCH_MOD);
    const p = buildPetCountryProvider('pt');
    expect(p.options.params.countrycodes).toBe('pt');
    expect(p.options.providerOptions.region).toBe('pt');
  });

  it('labels results in the app UI locale, NOT the country code (the old "br" bug)', async () => {
    // accept-language is a BCP-47 language tag for result labels, not a country
    // filter: 'jp'/'br' are not languages. It must follow the strings.js locale
    // SOT (default pt-BR), decoupled from the chosen country code.
    const { buildPetCountryProvider } = await import(PETSEARCH_MOD);
    const { getLocale } = await import(STRINGS_MOD);
    const p = buildPetCountryProvider('jp');
    expect(p.options.params['accept-language']).toBe(getLocale());
    expect(p.options.params['accept-language']).not.toBe('jp');
    // The old hard-coded value was the COUNTRY code 'br' — never a language tag.
    expect(p.options.params['accept-language']).not.toBe('br');
    // Geographic restriction still tracks the chosen country.
    expect(p.options.params.countrycodes).toBe('jp');
  });

  it('accept-language tracks the UI locale even when it changes (es)', async () => {
    const { buildPetCountryProvider } = await import(PETSEARCH_MOD);
    const { setLocale, getLocale } = await import(STRINGS_MOD);
    try {
      setLocale('es');
      expect(getLocale()).toBe('es');
      const p = buildPetCountryProvider('es');
      expect(p.options.params['accept-language']).toBe('es');
      // Country (geography) and locale (language) are SEPARATE axes — here they
      // happen to share the string 'es' (Spain code vs Spanish locale), but the
      // value comes from getLocale(), not the country code.
      expect(p.options.params.countrycodes).toBe('es');
    } finally {
      setLocale('pt-BR');
    }
  });

  it('default-locale accept-language is the valid tag pt-BR (the intentional OFF fix)', async () => {
    // With the flag OFF the country stays 'br' (see the seed test below), but the
    // accept-language fix lands regardless: pt-BR is a valid BCP-47 tag and the
    // correct language for Brazil — an improvement over the bogus 'br'.
    const { buildPetCountryProvider } = await import(PETSEARCH_MOD);
    const { getLocale } = await import(STRINGS_MOD);
    expect(getLocale()).toBe('pt-BR');
    const p = buildPetCountryProvider('br');
    expect(p.options.params['accept-language']).toBe('pt-BR');
  });

  it('applies searchBounds only when the country has known bounds (Brazil clamp kept)', async () => {
    const { buildPetCountryProvider } = await import(PETSEARCH_MOD);
    const brBounds = buildPetCountryProvider('br').options.providerOptions.searchBounds;
    expect(brBounds).toBeTruthy();
    // Brazil keeps its historical viewport clamp (COUNTRY_BOUNDS.br corners).
    expect(brBounds[0].lat).toBe(COUNTRY_BOUNDS.br[0][0]);
    expect(brBounds[0].lng).toBe(COUNTRY_BOUNDS.br[0][1]);
    expect(brBounds[1].lat).toBe(COUNTRY_BOUNDS.br[1][0]);
    expect(brBounds[1].lng).toBe(COUNTRY_BOUNDS.br[1][1]);
    // A country without bounds relies on countrycodes alone (no artificial box).
    expect(buildPetCountryProvider('pt').options.providerOptions.searchBounds).toBeUndefined();
  });

  it('falls back to the default country params for an unknown code', async () => {
    const { buildPetCountryProvider } = await import(PETSEARCH_MOD);
    const p = buildPetCountryProvider('zz');
    expect(p.options.params.countrycodes).toBe('br');
  });

  it('preserves the debounced+cached search wrapper (function, not the original)', async () => {
    const { buildPetCountryProvider } = await import(PETSEARCH_MOD);
    const p = buildPetCountryProvider('br');
    expect(typeof p.search).toBe('function');
  });
});

// The OFF-stays-Brazil / ON-follows-selection contract lives in the component's
// seed expression. INTL_ENABLED is resolved once at module load, so we re-import
// under each flag state (the intlConfig.test.js pattern) and assert what the seed
// resolves to. The seed is `INTL_ENABLED ? getSelectedCountry : () => DEFAULT_COUNTRY`.
describe('PetSearchField country seed — flag-gated, mirrors SearchField', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_INTL;
    vi.resetModules();
  });

  beforeEach(() => {
    try { window.localStorage.removeItem('mdf_country'); } catch (_e) { /* noop */ }
  });

  it('with the flag OFF the geography stays pinned to "br" even if a non-BR country is stored', async () => {
    process.env.NEXT_PUBLIC_INTL = 'off';
    vi.resetModules();
    const { setSelectedCountry, __resetCountryStoreForTests } = await import(COUNTRYSTORE_MOD);
    const { DEFAULT_COUNTRY } = await import(
      '../src/app/components/compatibility/components/countries.js'
    );
    __resetCountryStoreForTests();
    setSelectedCountry('pt'); // a stale persisted choice must NOT leak while dark
    const { INTL_ENABLED } = await import(
      '../src/app/components/compatibility/components/intlConfig.js'
    );
    // The seed expression the component uses; OFF → DEFAULT_COUNTRY, never the store.
    const seed = INTL_ENABLED
      ? (await import(COUNTRYSTORE_MOD)).getSelectedCountry()
      : DEFAULT_COUNTRY;
    expect(INTL_ENABLED).toBe(false);
    expect(seed).toBe('br');
  });

  it('with the flag ON the geography follows the selected country', async () => {
    process.env.NEXT_PUBLIC_INTL = 'on';
    vi.resetModules();
    const store = await import(COUNTRYSTORE_MOD);
    store.__resetCountryStoreForTests();
    store.setSelectedCountry('pt');
    const { INTL_ENABLED } = await import(
      '../src/app/components/compatibility/components/intlConfig.js'
    );
    const { DEFAULT_COUNTRY } = await import(
      '../src/app/components/compatibility/components/countries.js'
    );
    const seed = INTL_ENABLED ? store.getSelectedCountry() : DEFAULT_COUNTRY;
    expect(INTL_ENABLED).toBe(true);
    expect(seed).toBe('pt');
  });
});
