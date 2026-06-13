// countryFlagControl.dom.test.js — INTL: the flag control's open/close/pick
// behavior on the real DOM (jsdom). Repro + regression guard for the close (X)
// button not dismissing the panel.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFlagDom,
  wireFlagControl,
} from '../src/app/components/compatibility/components/CountryFlagControl.js';
import { __resetCountryStoreForTests, COUNTRY_STORAGE_KEY } from
  '../src/app/components/compatibility/components/countryStore.js';
import { __resetCountriesForLocaleCache } from
  '../src/app/components/compatibility/components/countries.js';
import { setLocale } from
  '../src/app/components/compatibility/components/ux/strings.js';

// A minimal map stub: the control only calls getContainer / fitBounds / setZoom
// / getZoom. None affect the open/close logic under test.
function makeMapStub() {
  return {
    getContainer: () => document.body,
    fitBounds: vi.fn(),
    setZoom: vi.fn(),
    getZoom: () => 5,
  };
}

function clickReal(el) {
  // Drive the full native press sequence the control listens for: pointerdown
  // (the outside-click watcher), pointerup + click (the button activation, which
  // de-dupes the pair). PointerEvent may be unavailable in jsdom; fall back to
  // MouseEvent, which the handlers also accept.
  const PE = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent;
  el.dispatchEvent(new PE('pointerdown', { bubbles: true }));
  el.dispatchEvent(new PE('pointerup', { bubbles: true }));
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

describe('CountryFlagControl DOM — open/close', () => {
  let dom;
  let cleanup;

  beforeEach(() => {
    __resetCountryStoreForTests();
    try { window.localStorage.removeItem(COUNTRY_STORAGE_KEY); } catch (_e) { /* noop */ }
    dom = createFlagDom();
    document.body.appendChild(dom.wrap);
    cleanup = wireFlagControl(makeMapStub(), dom);
  });

  it('opens the panel when the trigger is clicked', () => {
    expect(dom.panel.hidden).toBe(true);
    clickReal(dom.button);
    expect(dom.panel.hidden).toBe(false);
  });

  it('closes the panel when the close (X) button is clicked', () => {
    clickReal(dom.button);
    expect(dom.panel.hidden).toBe(false);
    clickReal(dom.closeBtn);
    expect(dom.panel.hidden).toBe(true); // <-- the reported bug
  });

  it('closes the panel when the inner X glyph (span) is clicked', () => {
    clickReal(dom.button);
    const glyph = dom.closeBtn.querySelector('span');
    expect(glyph).toBeTruthy();
    clickReal(glyph);
    expect(dom.panel.hidden).toBe(true);
  });

  it('closes the panel on Escape from inside the panel', () => {
    clickReal(dom.button);
    dom.panel.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dom.panel.hidden).toBe(true);
  });

  it('closes the panel on an outside click', () => {
    clickReal(dom.button);
    const PE = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent;
    document.body.dispatchEvent(new PE('pointerdown', { bubbles: true }));
    expect(dom.panel.hidden).toBe(true);
  });

  it('the pointerup+click de-dupe does not block re-opening on a later press', async () => {
    clickReal(dom.button);          // open
    expect(dom.panel.hidden).toBe(false);
    clickReal(dom.closeBtn);        // close
    expect(dom.panel.hidden).toBe(true);
    await new Promise((r) => setTimeout(r, 1)); // let the de-dupe flag release
    clickReal(dom.button);          // open again
    expect(dom.panel.hidden).toBe(false);
  });
});

// M3.5 (I18N-1): the picker renders in the active UI locale and re-labels +
// re-sorts when the language changes. The stale-list bug: COUNTRIES was read once
// at onAdd and the list never subscribed to a locale change, so an es user kept
// seeing the pt-BR list. wireFlagControl now builds from countriesForLocale and
// subscribes to 'mdf-locale-change'.
describe('CountryFlagControl DOM — locale-aware list', () => {
  let dom;
  let cleanup;

  const nameForCode = (code) => {
    const opt = dom.list.querySelector('button[data-code="' + code + '"]');
    return opt ? opt.querySelector('.mdf-flag__name').textContent : null;
  };

  beforeEach(() => {
    __resetCountryStoreForTests();
    __resetCountriesForLocaleCache();
    try { window.localStorage.removeItem(COUNTRY_STORAGE_KEY); } catch (_e) { /* noop */ }
    setLocale('pt-BR'); // start from the default locale
    dom = createFlagDom();
    document.body.appendChild(dom.wrap);
    cleanup = wireFlagControl(makeMapStub(), dom);
  });

  afterEach(() => {
    if (cleanup) cleanup();
    setLocale('pt-BR'); // restore the shared module-level locale
    __resetCountriesForLocaleCache();
  });

  it('renders option names in pt-BR by default (Germany = "Alemanha")', () => {
    expect(nameForCode('de')).toBe('Alemanha');
  });

  it('rebuilds the list in the new language on mdf-locale-change (Germany = "Alemania")', () => {
    expect(nameForCode('de')).toBe('Alemanha');
    setLocale('es'); // dispatches 'mdf-locale-change' -> the control rebuilds
    expect(nameForCode('de')).toBe('Alemania');
    // Same code set, just re-labelled (and re-sorted): brazil is still present.
    expect(nameForCode('br')).toBeTruthy();
  });

  it('re-labels the trigger button on a locale change', () => {
    const btnName = () => dom.button.querySelector('.mdf-flag__name').textContent;
    expect(btnName()).toBe('Brasil'); // default country br, pt-BR locale
    setLocale('es');
    expect(btnName()).toBe('Brasil'); // 'br' in es is also "Brasil"
    expect(dom.button.getAttribute('aria-label')).toContain('Brasil');
  });

  it('preserves the filter text across a locale rebuild', () => {
    clickReal(dom.button);            // open the panel
    dom.input.value = 'alema';
    dom.input.dispatchEvent(new window.Event('input', { bubbles: true }));
    // Germany visible under the pt-BR filter, others hidden.
    expect(dom.list.querySelector('button[data-code="de"]').closest('li').hidden).toBe(false);
    setLocale('es');                  // rebuild keeps input.value = 'alema'
    // After rebuild the filter is re-applied: "Alemania" still matches "alema".
    expect(dom.list.querySelector('button[data-code="de"]').closest('li').hidden).toBe(false);
    expect(nameForCode('de')).toBe('Alemania');
  });

  it('drops the mdf-locale-change listener on teardown (no rebuild after cleanup)', () => {
    cleanup();
    cleanup = null;
    const before = nameForCode('de'); // last rendered name
    setLocale('es'); // no listener now -> list must NOT rebuild
    expect(nameForCode('de')).toBe(before);
  });
});
