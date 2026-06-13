// countryFlagControl.dom.test.js — INTL: the flag control's open/close/pick
// behavior on the real DOM (jsdom). Repro + regression guard for the close (X)
// button not dismissing the panel.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createFlagDom,
  wireFlagControl,
} from '../src/app/components/compatibility/components/CountryFlagControl.js';
import { __resetCountryStoreForTests, COUNTRY_STORAGE_KEY } from
  '../src/app/components/compatibility/components/countryStore.js';

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
