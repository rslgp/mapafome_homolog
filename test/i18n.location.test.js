// i18n.location.test.js — LOC-LANG verification for the location-derived UI
// language wiring (engine.js resolveLocaleFromCountry + useLocationLocale):
//   • resolveLocaleFromCountry() is the PURE country->SUPPORTED-locale map:
//     Lusophone -> pt-BR, Hispanophone -> es, everything else -> en-US, and a
//     falsy/blank input -> null ("no signal").
//   • useLocationLocale() runs in a MOUNT-EFFECT (R12), auto-requests geolocation,
//     reverse-geocodes via the INJECTED geocoder, and applies the resolved locale
//     through setLocale ONLY when there is no stored mdf_locale.
//   • DARK-SHIP INVARIANT: a stored/manual choice ALWAYS wins — the effect never
//     overrides it (checked before the request AND re-checked at apply time).
//   • ANY failure (denied geolocation, reverse-geocode null, no geolocation API)
//     leaves the locale on its default — no throw.
//
// Harness mirrors i18n.init.test.js: control the environment FIRST (mock
// navigator.geolocation + localStorage), then import the engine fresh under the
// mock with vi.resetModules() so the real init/effect code runs against it.

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

const ENGINE = '../src/app/components/compatibility/components/ux/i18n/engine.js';

// A getCurrentPosition stub that calls back with a fixed coord (success) or invokes
// the error callback (failure), depending on `mode`. jsdom has no geolocation, so
// we define navigator.geolocation with a configurable descriptor and restore after.
function stubGeolocation(mode, coords) {
  const geolocation = {
    getCurrentPosition: (onSuccess, onError) => {
      if (mode === 'success') onSuccess({ coords: { latitude: coords[0], longitude: coords[1] } });
      else if (mode === 'error') onError({ code: 1, message: 'denied' });
      // mode 'missing' is handled by deleting geolocation entirely (see below)
    },
  };
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation });
}

function removeGeolocation() {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
}

// A reverse-geocoder stub resolving to a fixed country code (or null), matching
// reverseGeocodeCountry's contract (Promise<alpha2|null>, never throws).
function geocoderResolving(code) {
  return () => Promise.resolve(code);
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('lang');
  // The engine anchors its active-locale SOT on globalThis.__MDF_I18N__ (its
  // module-duplication fix), so vi.resetModules() — which clears the MODULE cache
  // but NOT globalThis — does NOT reset the locale between tests. Without this, a
  // prior test that resolved en-US (e.g. the Paris/France fix) leaves
  // __MDF_I18N__.locale = 'en-US', and the engine's correct production init guard
  // ("no stored value -> keep the existing in-memory pick, don't clobber it") then
  // inherits that stale en-US on the next fresh import. Clear the global SOT here so
  // each test's resetModules() + import re-resolves DEFAULT_LOCALE from a clean slate,
  // exactly as it already clears localStorage and <html lang>.
  delete globalThis.__MDF_I18N__;
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete globalThis.__MDF_I18N__;
});

describe('resolveLocaleFromCountry() — pure country -> SUPPORTED locale (LOC-LANG)', () => {
  it('maps Lusophone countries to pt-BR', async () => {
    const { resolveLocaleFromCountry } = await import(ENGINE);
    for (const cc of ['br', 'pt', 'ao', 'mz', 'cv', 'gw', 'st', 'tl', 'gq']) {
      expect(resolveLocaleFromCountry(cc), cc).toBe('pt-BR');
    }
    expect(resolveLocaleFromCountry('BR')).toBe('pt-BR'); // case-insensitive
    expect(resolveLocaleFromCountry('  pt ')).toBe('pt-BR'); // trimmed
  });

  it('maps Hispanophone countries to es', async () => {
    const { resolveLocaleFromCountry } = await import(ENGINE);
    for (const cc of ['es', 'ar', 'mx', 'co', 'cl', 'pe', 've', 'ec', 'gt', 'cu',
      'bo', 'do', 'hn', 'py', 'sv', 'ni', 'cr', 'pa', 'uy', 'pr']) {
      expect(resolveLocaleFromCountry(cc), cc).toBe('es');
    }
  });

  it('maps every other (known-or-unknown) country to en-US', async () => {
    const { resolveLocaleFromCountry } = await import(ENGINE);
    expect(resolveLocaleFromCountry('us')).toBe('en-US');
    expect(resolveLocaleFromCountry('fr')).toBe('en-US');
    expect(resolveLocaleFromCountry('de')).toBe('en-US');
    expect(resolveLocaleFromCountry('jp')).toBe('en-US');
    expect(resolveLocaleFromCountry('zz')).toBe('en-US'); // unknown but non-blank
  });

  it('returns null for a falsy/blank input ("no signal")', async () => {
    const { resolveLocaleFromCountry } = await import(ENGINE);
    expect(resolveLocaleFromCountry(null)).toBeNull();
    expect(resolveLocaleFromCountry(undefined)).toBeNull();
    expect(resolveLocaleFromCountry('')).toBeNull();
    expect(resolveLocaleFromCountry('   ')).toBeNull();
    expect(resolveLocaleFromCountry(123)).toBeNull(); // non-string
  });
});

describe('useLocationLocale() — mount-effect, applies a location locale (LOC-LANG)', () => {
  it('importing the engine does NOT flip the locale (no module-load detect)', async () => {
    stubGeolocation('success', [48.85, 2.35]); // Paris -> would resolve en-US
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);
    expect(m.getLocale()).toBe('pt-BR'); // default until a component mounts the effect
  });

  it('on mount with no stored locale + a Hispanophone fix, sets es and writes <html lang>', async () => {
    stubGeolocation('success', [-34.6, -58.4]); // Buenos Aires
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);
    expect(m.getLocale()).toBe('pt-BR'); // pre-mount: still default

    function Host() { m.useLocationLocale(geocoderResolving('ar')); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
    expect(window.localStorage.getItem('mdf_locale')).toBe('es');
  });

  it('a Lusophone fix maps to pt-BR (and a non-pt device still lands pt-BR via location)', async () => {
    stubGeolocation('success', [38.7, -9.1]); // Lisbon
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);

    function Host() { m.useLocationLocale(geocoderResolving('pt')); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('pt-BR');
    expect(document.documentElement.getAttribute('lang')).toBe('pt-BR');
  });

  it('an "everything else" fix maps to en-US', async () => {
    stubGeolocation('success', [48.85, 2.35]); // Paris -> en-US fallback
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);

    function Host() { m.useLocationLocale(geocoderResolving('fr')); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('en-US');
    expect(document.documentElement.getAttribute('lang')).toBe('en-US');
  });

  it('DARK-SHIP: a STORED choice wins — the effect never overrides it', async () => {
    // Device is in Argentina (would resolve es), but the user already chose pt-BR.
    stubGeolocation('success', [-34.6, -58.4]);
    window.localStorage.clear();
    window.localStorage.setItem('mdf_locale', 'pt-BR');
    vi.resetModules();
    const m = await import(ENGINE);
    expect(m.getLocale()).toBe('pt-BR'); // module-load read of the stored choice

    function Host() { m.useLocationLocale(geocoderResolving('ar')); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('pt-BR'); // NOT es — stored choice wins
    expect(window.localStorage.getItem('mdf_locale')).toBe('pt-BR');
  });

  it('DARK-SHIP: a stored en-US also wins over a Lusophone fix', async () => {
    stubGeolocation('success', [-23.5, -46.6]); // Sao Paulo -> would resolve pt-BR
    window.localStorage.clear();
    window.localStorage.setItem('mdf_locale', 'en-US');
    vi.resetModules();
    const m = await import(ENGINE);

    function Host() { m.useLocationLocale(geocoderResolving('br')); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('en-US'); // stored manual choice wins
  });

  it('a reverse-geocode MISS (null country) leaves the default, no throw', async () => {
    stubGeolocation('success', [0, -30]); // open ocean
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);

    function Host() { m.useLocationLocale(geocoderResolving(null)); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('pt-BR'); // unchanged
    expect(window.localStorage.getItem('mdf_locale')).toBeNull(); // nothing persisted
  });

  it('a DENIED/timeout geolocation leaves the default, no throw', async () => {
    stubGeolocation('error');
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);

    function Host() { m.useLocationLocale(geocoderResolving('ar')); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('pt-BR'); // unchanged
    expect(window.localStorage.getItem('mdf_locale')).toBeNull();
  });

  it('no geolocation API available is a safe no-op', async () => {
    removeGeolocation();
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);

    function Host() { m.useLocationLocale(geocoderResolving('ar')); return null; }
    await act(async () => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('pt-BR');
  });
});
