// countryBrand.test.js — INTL per-country BRAND ADAPTATION layer.
//
// Proves the data module (countryBrand.js) and the header gate:
//   • getCountryBrand('br') → canonical MAPA FOME wordmark + a real tagline KEY +
//     the flag badge (Brazil keeps the global identity; only the layer adapts).
//   • getCountryBrand(<unknown/garbage>) → the GLOBAL FALLBACK, NEVER throws
//     (mirrors getCountry's normalize+fallback discipline).
//   • a non-launch country (no brand entry) falls back to the global identity.
//   • resolveHeaderBrand is the dark-ship GATE: flag OFF → null (the header then
//     renders today's JSX byte-identically); flag ON → the descriptor. Tested at
//     the gate function, NOT a Leaflet mount, and independent of the ambient
//     INTL_ENABLED value so the local flag flip never flakes this suite.
//   • the accent TODO seam: every country's accent is null until the color
//     specialist fills a real hue, so an unfilled hue can never break the build.
//   • the br tagline KEY resolves in the pt-BR dictionary (the i18n wiring is real,
//     not a dangling key) and stays a per-country localized line.

import { describe, it, expect, afterEach } from 'vitest';

import {
  getCountryBrand,
  resolveHeaderBrand,
  CANONICAL_WORDMARK,
  ACCENT_TODO,
} from '../src/app/components/compatibility/components/countryBrand.js';
import { t, setLocale } from
  '../src/app/components/compatibility/components/ux/strings.js';

afterEach(() => { setLocale('pt-BR'); }); // shared module-level locale; restore

describe('getCountryBrand — Brazil (the launch brand entry)', () => {
  it('keeps the canonical MAPA FOME wordmark (identity is global, like Coke)', () => {
    const br = getCountryBrand('br');
    expect(br.code).toBe('br');
    expect(br.wordmark).toBe(CANONICAL_WORDMARK);
    expect(br.wordmark).toBe('MAPA FOME');
    // Canonical → the Header falls back to the existing t('page.header.wordmark')
    // string SOT instead of duplicating it.
    expect(br.isCanonicalWordmark).toBe(true);
  });

  it('carries a real tagline KEY (not an inline string) and the flag badge', () => {
    const br = getCountryBrand('br');
    expect(typeof br.taglineKey).toBe('string');
    expect(br.taglineKey).toBe('page.brand.tagline.br');
    expect(br.showFlagBadge).toBe(true);
  });

  it('normalizes a messy code (case / whitespace) to the same Brazil brand', () => {
    expect(getCountryBrand(' BR ').taglineKey).toBe('page.brand.tagline.br');
  });

  it('the br tagline KEY resolves to a real localized pt-BR line (i18n wired)', () => {
    setLocale('pt-BR');
    const line = t(getCountryBrand('br').taglineKey);
    expect(line).not.toBe('page.brand.tagline.br'); // not the key echoed back (dead key)
    expect(line).toContain('fome'); // a real Brazilian tagline
  });
});

describe('getCountryBrand — global fallback (every non-launch / unknown code)', () => {
  it('an UNKNOWN/garbage code returns the global fallback and NEVER throws', () => {
    for (const bad of ['zz', 'brazil', '', '   ', null, undefined, 123, {}]) {
      expect(() => getCountryBrand(bad)).not.toThrow();
      const b = getCountryBrand(bad);
      expect(b.wordmark).toBe(CANONICAL_WORDMARK);
      expect(b.isCanonicalWordmark).toBe(true);
      expect(b.taglineKey).toBeNull();   // no country tagline
      expect(b.accent).toBeNull();       // no accent override → base --mdf-brand
      expect(b.showFlagBadge).toBe(false);
      expect(b.code).toBeNull();
    }
  });

  it('a VALID but non-launch country (no brand entry) falls back to the global id', () => {
    // 'pt' is a real country code with no brand entry → global identity, not a
    // Portugal-specific brand. (Languages, not countries, carry the localized copy.)
    const pt = getCountryBrand('pt');
    expect(pt.wordmark).toBe(CANONICAL_WORDMARK);
    expect(pt.taglineKey).toBeNull();
    expect(pt.accent).toBeNull();
    expect(pt.showFlagBadge).toBe(false);
  });

  it('the global fallback object is frozen (a consumer cannot mutate shared state)', () => {
    const a = getCountryBrand('zz');
    expect(Object.isFrozen(a)).toBe(true);
  });
});

describe('countryBrand — the accent TODO seam (color specialist owns hues)', () => {
  it('a FILLED hue surfaces as that hue; the raw sentinel NEVER leaks', () => {
    // Brazil's accent has been filled by the color specialist with a real,
    // AA-checked warm-red (#C8102E), so the descriptor surfaces that hue verbatim
    // for the Header's --mdf-brand override.
    const br = getCountryBrand('br');
    expect(br.accent).toMatch(/^#[0-9a-fA-F]{6}$/); // a real CSS hex, not the sentinel
    expect(br.accent).not.toBe(ACCENT_TODO);

    // The descriptor NEVER leaks the sentinel to the Header — an UNFILLED accent is
    // normalized to null (= "apply no --mdf-brand override"), so the base brand
    // (#D64545) shows through and the build is never broken by a missing hue. The
    // sentinel constant still exists as the documented "not chosen yet" marker;
    // no descriptor ever returns it (filled => real hex, unfilled => null).
    expect(ACCENT_TODO).toBe('TODO_COLOR_SPECIALIST');
    expect(getCountryBrand('br').accent).not.toBe(ACCENT_TODO);
    // A non-brand country falls back to the global descriptor whose accent is null.
    expect(getCountryBrand('us').accent).toBeNull();
  });
});

describe('resolveHeaderBrand — the dark-ship gate (flag OFF ⇒ byte-identical)', () => {
  it('returns null when the flag is OFF (Header then renders today\'s JSX exactly)', () => {
    // Independent of the ambient INTL_ENABLED: the gate takes the flag explicitly.
    expect(resolveHeaderBrand(false, 'br')).toBeNull();
    expect(resolveHeaderBrand(false, 'pt')).toBeNull();
    expect(resolveHeaderBrand(false, 'zz')).toBeNull();
    expect(resolveHeaderBrand(false, undefined)).toBeNull();
  });

  it('returns the brand descriptor when the flag is ON', () => {
    const on = resolveHeaderBrand(true, 'br');
    expect(on).not.toBeNull();
    expect(on.taglineKey).toBe('page.brand.tagline.br');
    // ON + unknown code still yields a renderable fallback, never null/throw.
    expect(resolveHeaderBrand(true, 'zz').wordmark).toBe(CANONICAL_WORDMARK);
  });
});
