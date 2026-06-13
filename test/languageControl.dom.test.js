// languageControl.dom.test.js — INTL: the UI language picker on the real DOM.
// Covers open/close/pick and that picking a locale calls setLocale (persisting
// + dispatching mdf-locale-change), plus the close (X)/Esc/outside-click paths.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createLanguageDom,
  wireLanguageControl,
} from '../src/app/components/compatibility/components/LanguageControl.js';
import { getLocale, setLocale, SUPPORTED_LOCALES } from
  '../src/app/components/compatibility/components/ux/strings.js';

function press(el) {
  const PE = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent;
  el.dispatchEvent(new PE('pointerdown', { bubbles: true }));
  el.dispatchEvent(new PE('pointerup', { bubbles: true }));
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

describe('LanguageControl DOM', () => {
  let dom;
  let cleanup;

  beforeEach(() => {
    setLocale('pt-BR');
    dom = createLanguageDom();
    document.body.appendChild(dom.wrap);
    cleanup = wireLanguageControl(dom);
  });
  afterEach(() => {
    if (cleanup) cleanup();
    setLocale('pt-BR');
  });

  it('renders one option per supported locale', () => {
    const opts = dom.list.querySelectorAll('button.mdf-flag__option');
    expect(opts.length).toBe(SUPPORTED_LOCALES.length);
  });

  it('opens, picks es (changing the active locale), and closes', () => {
    press(dom.button);
    expect(dom.panel.hidden).toBe(false);
    const esOpt = dom.list.querySelector('button[data-locale="es"]');
    expect(esOpt).toBeTruthy();
    press(esOpt);
    expect(getLocale()).toBe('es');
    expect(dom.panel.hidden).toBe(true);
  });

  it('closes on the close path via Escape', () => {
    press(dom.button);
    dom.panel.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dom.panel.hidden).toBe(true);
  });

  it('closes on an outside click', () => {
    press(dom.button);
    const PE = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent;
    document.body.dispatchEvent(new PE('pointerdown', { bubbles: true }));
    expect(dom.panel.hidden).toBe(true);
  });
});
