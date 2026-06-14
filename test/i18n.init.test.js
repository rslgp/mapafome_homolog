// i18n.init.test.js — INTL M6.2/M6.4 verification for the en-US locale wiring:
//   • detectLocale() is the PURE browser-tag matcher (exact tag, then base lang,
//     then DEFAULT_LOCALE): en-* -> en-US, pt-* -> pt-BR, es-* -> es, unknown ->
//     pt-BR. Unit-tested directly (no DOM needed).
//   • Auto-detection runs in a MOUNT-EFFECT (useAutoDetectLocale), NOT at module
//     load (R12): importing the engine must NOT flip the locale off the default,
//     so the first render of a prerendered route (/assinar) still emits
//     DEFAULT_LOCALE and there is no hydration text-mismatch.
//   • A manual/stored choice always wins; the effect never re-detects over it.
//   • The <html lang> a11y write (R14, WCAG 3.1.1) lands on the resolved locale
//     in BOTH paths: the module-load init (the persisted choice) AND the
//     auto-detect mount-effect — proven by re-running init under a mocked
//     navigator/localStorage via vi.resetModules() + a fresh dynamic import.
//
// Why a SEPARATE file with resetModules: the single-import parity suite already
// ran the engine's module-load init at import time, so mutating navigator/
// localStorage afterward would not re-trigger it. This harness controls the
// environment FIRST, then imports the engine fresh, so the real init/effect code
// runs under the mock (a forcing function that exercises the real path, not a
// vacuous import-time snapshot).

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

const ENGINE = '../src/app/components/compatibility/components/ux/i18n/engine.js';

// Override navigator.languages/.language for one test. jsdom's navigator props
// are getters, so define them with configurable descriptors and restore after.
function stubNavigatorLanguages(languages, single) {
  Object.defineProperty(navigator, 'languages', { configurable: true, get: () => languages });
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => single ?? (languages && languages[0]) });
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('lang');
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  // Re-import path leaves module state per-import; nothing global to reset here.
});

describe('detectLocale() — pure browser-tag matcher (M6.2)', () => {
  it('matches an exact supported tag', async () => {
    const { detectLocale } = await import(ENGINE);
    expect(detectLocale(['en-US'])).toBe('en-US');
    expect(detectLocale(['pt-BR'])).toBe('pt-BR');
    expect(detectLocale(['es'])).toBe('es');
  });

  it('falls back to the base language: en-* -> en-US', async () => {
    const { detectLocale } = await import(ENGINE);
    expect(detectLocale(['en-GB'])).toBe('en-US');
    expect(detectLocale(['en'])).toBe('en-US');
    expect(detectLocale(['en-AU', 'fr-FR'])).toBe('en-US');
  });

  it('falls back to the base language: pt-* -> pt-BR, es-* -> es', async () => {
    const { detectLocale } = await import(ENGINE);
    expect(detectLocale(['pt-PT'])).toBe('pt-BR');
    expect(detectLocale(['pt'])).toBe('pt-BR');
    expect(detectLocale(['es-MX'])).toBe('es');
    // An EXACT supported tag ANYWHERE in the list beats a base-only match: the
    // exact pass runs across all tags before the base pass. Here 'en-US' (exact)
    // wins over 'es-AR' (base-only) even though es-AR is listed first.
    expect(detectLocale(['es-AR', 'en-US'])).toBe('en-US');
    // With NO exact tag, the base pass takes the first base-matchable tag.
    expect(detectLocale(['es-AR', 'fr-FR'])).toBe('es');
  });

  it('returns the DEFAULT_LOCALE (pt-BR) for an unknown / empty input', async () => {
    const { detectLocale } = await import(ENGINE);
    // 'ja'/'ko' are NOT supported (the seven are pt-BR/es/en-US/de/fr/ru/zh), so
    // they fall back to DEFAULT. (Formerly used 'fr-FR'/'de' as the unknown
    // examples; both are real locales since INTL M7.)
    expect(detectLocale(['ja-JP'])).toBe('pt-BR');
    expect(detectLocale(['ko', 'ja'])).toBe('pt-BR');
    expect(detectLocale([])).toBe('pt-BR');
    expect(detectLocale(undefined)).toBe('pt-BR');
    expect(detectLocale('ko-KR')).toBe('pt-BR'); // single-string form, unknown (zh is now supported)
  });

  it('prefers an exact tag over a base match earlier in the list', async () => {
    const { detectLocale } = await import(ENGINE);
    // 'pt' would base-match pt-BR, but 'es' is an exact supported tag later — the
    // exact pass runs first across ALL tags, so an exact match anywhere wins over
    // a base match. Here 'es' (exact) beats 'pt' (base).
    expect(detectLocale(['pt', 'es'])).toBe('es');
  });
});

describe('useAutoDetectLocale() — mount-effect, NOT module-load (R12)', () => {
  it('importing the engine does NOT flip the locale off the default (no module-load detect)', async () => {
    // Mock a non-pt browser BEFORE importing. If detection ran at module load,
    // getLocale() would be 'en-US' right after import. It must stay pt-BR until a
    // component mounts the effect.
    stubNavigatorLanguages(['en-US']);
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);
    expect(m.getLocale()).toBe('pt-BR'); // default — the effect has NOT run yet
  });

  it('on mount with no stored locale + navigator en-US, sets en-US and writes <html lang>', async () => {
    stubNavigatorLanguages(['en-US']);
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);
    expect(m.getLocale()).toBe('pt-BR'); // pre-mount: still default

    function Host() { m.useAutoDetectLocale(); return null; }
    act(() => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('en-US');
    expect(document.documentElement.getAttribute('lang')).toBe('en-US');
    // The choice persisted (routed through setLocale), so a reload would skip detect.
    expect(window.localStorage.getItem('mdf_locale')).toBe('en-US');
  });

  it('a STORED choice wins: the mount-effect does not re-detect over it', async () => {
    // Browser says en-US, but the user already chose es — es must stick.
    stubNavigatorLanguages(['en-US']);
    window.localStorage.clear();
    window.localStorage.setItem('mdf_locale', 'es');
    vi.resetModules();
    const m = await import(ENGINE);
    // Module-load init reads the stored 'es'.
    expect(m.getLocale()).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es'); // R14 init write

    function Host() { m.useAutoDetectLocale(); return null; }
    act(() => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('es'); // NOT en-US — stored choice wins
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });

  it('unknown browser language with no stored locale resolves to the default (pt-BR)', async () => {
    // 'ja-JP' is not a supported locale, so auto-detect falls back to default.
    // (Formerly 'fr-FR', which now resolves to the real 'fr' locale, INTL M7.)
    stubNavigatorLanguages(['ja-JP']);
    window.localStorage.clear();
    vi.resetModules();
    const m = await import(ENGINE);

    function Host() { m.useAutoDetectLocale(); return null; }
    act(() => { render(React.createElement(Host)); });

    expect(m.getLocale()).toBe('pt-BR');
    expect(document.documentElement.getAttribute('lang')).toBe('pt-BR');
  });
});

describe('applyDocumentLang / init — <html lang> a11y write (R14)', () => {
  it('module-load init writes <html lang> from a stored locale (es), not only on a manual pick', async () => {
    window.localStorage.clear();
    window.localStorage.setItem('mdf_locale', 'es');
    document.documentElement.removeAttribute('lang');
    vi.resetModules();
    const m = await import(ENGINE);
    // The init block ran on import under the stored 'es' and called applyDocumentLang.
    expect(m.getLocale()).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });

  it('applyDocumentLang sets <html lang> to en-US when active (all paths converge here)', async () => {
    const m = await import(ENGINE);
    m.applyDocumentLang('en-US');
    expect(document.documentElement.getAttribute('lang')).toBe('en-US');
  });
});
