// i18n.assinar.test.js — MILESTONE P18 verification: the /assinar (Asaas
// recurring-support) page is fully internationalised and pt-BR/es reach parity.
//
// The page hardcoded every pt-BR string and never called t(). This suite is the
// machine-checkable proof that:
//   • every `assinar.*` key in pt-BR exists in es and vice-versa (1:1 parity);
//   • no `assinar.*` value is an empty string in either locale;
//   • t() resolves the active locale for a representative sample;
//   • page.js no longer carries the previously-hardcoded pt-BR copy (it routes
//     through t() now), so a locale switch actually reaches the page.
//
// Mirrors the parity discipline of i18n.test.js, scoped to the assinar.* prefix.

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { t, setLocale, localeKeys } from
  '../src/app/components/compatibility/components/ux/strings.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, '..', 'src', 'app', 'assinar', 'page.js');

const PREFIX = 'assinar.';
const assinarKeys = (locale) => localeKeys(locale).filter((k) => k.startsWith(PREFIX));

// pt-BR is the default; reset after each test so order is irrelevant and no test
// leaks a locale into the next (module-level currentLocale is shared).
beforeEach(() => { setLocale('pt-BR'); });
afterEach(() => { setLocale('pt-BR'); });

describe('assinar.* dictionary — pt-BR/es parity', () => {
  it('exposes the exact same assinar.* key set in both locales (no orphans)', () => {
    const pt = assinarKeys('pt-BR');
    const es = assinarKeys('es');
    expect(es).toEqual(pt); // both sorted; deep-equal proves 1:1 parity
  });

  it('actually has assinar.* keys (guards against an empty filter passing)', () => {
    expect(assinarKeys('pt-BR').length).toBeGreaterThan(0);
  });

  it('has no empty-string value for any assinar.* key in either locale', () => {
    for (const locale of ['pt-BR', 'es']) {
      setLocale(locale);
      for (const key of assinarKeys(locale)) {
        const value = t(key);
        expect(value, `${locale} / ${key} is empty`).toBeTypeOf('string');
        expect(value.trim().length, `${locale} / ${key} is blank`).toBeGreaterThan(0);
        // A missing key falls back to the key itself; that would mean a hole.
        expect(value, `${locale} / ${key} resolved to the key (missing)`).not.toBe(key);
      }
    }
  });
});

describe('assinar.* — locale resolution sample', () => {
  it('pt-BR resolves the original copy', () => {
    expect(t('assinar.title')).toBe('Apoie o MAPA FOME');
    expect(t('assinar.cta.submitting')).toBe('Processando…');
    expect(t('assinar.rail.pix.label')).toBe('Pix');
  });

  it('es resolves the Spanish copy', () => {
    setLocale('es');
    expect(t('assinar.title')).toBe('Apoya MAPA FOME');
    expect(t('assinar.cta.submitting')).toBe('Procesando…');
    expect(t('assinar.rail.cartao.label')).toBe('Tarjeta de crédito');
  });

  it('the {value} placeholder survives in both locales (page interpolates it)', () => {
    expect(t('assinar.cta.support')).toContain('{value}');
    setLocale('es');
    expect(t('assinar.cta.support')).toContain('{value}');
  });
});

describe('page.js — wired through t(), no hardcoded pt-BR copy left', () => {
  const src = readFileSync(PAGE, 'utf8');

  it('subscribes to locale changes and reads strings via t()', () => {
    expect(src).toContain('useLocale()');
    expect(src).toContain("t('assinar.title')");
    expect(src).toContain("t('assinar.note')");
  });

  it('no longer inlines the previously-hardcoded headline/sub/note copy', () => {
    expect(src).not.toContain('Apoie o MAPA FOME<');
    expect(src).not.toContain('Uma contribuição mensal ajuda a manter o mapa no ar');
    expect(src).not.toContain('Pagamento processado pela Asaas. Você pode cancelar quando quiser.');
  });
});
