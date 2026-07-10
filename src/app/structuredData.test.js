import { describe, it, expect } from 'vitest';
import { organizationLd, reportDatasetLd, SITE_URL, ogLocaleFor } from './structuredData';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './components/compatibility/components/ux/i18n/locales.js';

// SEO-03 — the JSON-LD builders are pure; assert the schema.org shape and that
// they serialize to valid JSON (what the <script> renders).

describe('organizationLd', () => {
  const org = organizationLd();

  it('is a schema.org NGO with the canonical url and logo', () => {
    expect(org['@context']).toBe('https://schema.org');
    expect(org['@type']).toBe('NGO');
    expect(org.name).toBe('MAPA FOME');
    expect(org.url).toBe(SITE_URL);
    expect(org.logo).toMatch(/^https:\/\/mapafome\.com\.br\/presskit\//);
  });

  it('serializes to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(org))).not.toThrow();
  });

  it('lists the supported UI languages', () => {
    expect(org.knowsLanguage).toContain('pt-BR');
    expect(org.knowsLanguage).toContain('de');
    expect(org.knowsLanguage.length).toBe(12);
  });
});

describe('reportDatasetLd', () => {
  const ds = reportDatasetLd({
    name: 'Test dataset',
    description: 'desc',
    path: '/relatorios',
  });

  it('is a free, published schema.org Dataset at the given path', () => {
    expect(ds['@type']).toBe('Dataset');
    expect(ds.name).toBe('Test dataset');
    expect(ds.url).toBe(`${SITE_URL}/relatorios`);
    expect(ds.isAccessibleForFree).toBe(true);
    expect(ds.creativeWorkStatus).toBe('Published');
  });

  it('names the NGO publisher and the anonymization technique', () => {
    expect(ds.publisher['@type']).toBe('NGO');
    expect(ds.publisher.name).toBe('MAPA FOME');
    expect(ds.measurementTechnique).toMatch(/anonimizada|k-anônimo/);
  });

  it('declares html/csv/json encodings (the report exports)', () => {
    expect(ds.encodingFormat).toEqual(
      expect.arrayContaining(['text/html', 'text/csv', 'application/json'])
    );
  });

  it('serializes to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(ds))).not.toThrow();
  });
});

// EXT-HREFLANG-01 — the Open Graph locale hints (og:locale + og:locale:alternate).
// The committable minimum of the international-SEO gap. These assert the shape Next
// serializes into <meta property="og:locale"> / <meta property="og:locale:alternate">,
// AND the honesty invariant: og:locale:alternate hints the languages OFFERED, but we
// emit NO per-URL hreflang alternate (that needs per-locale routes = human-gated).
describe('ogLocaleFor', () => {
  const og = ogLocaleFor();

  it('uses the prerendered default (pt-BR) as the primary og:locale, in OG form', () => {
    // Static export prerenders DEFAULT_LOCALE; OG wants language_TERRITORY.
    expect(DEFAULT_LOCALE).toBe('pt-BR');
    expect(og.locale).toBe('pt_BR');
  });

  it('lists an og:locale:alternate for EVERY other supported locale, in OG form', () => {
    // one alternate per non-primary supported locale, no more, no fewer
    expect(og.alternateLocale).toHaveLength(SUPPORTED_LOCALES.length - 1);
    // regionful tags carry an underscore, bare tags stay bare
    expect(og.alternateLocale).toContain('en_US'); // en-US -> en_US
    expect(og.alternateLocale).toContain('es');    // es (no region) stays 'es'
    expect(og.alternateLocale).toContain('ar');    // humanitarian-expansion locale present
    // the primary is never also listed as its own alternate
    expect(og.alternateLocale).not.toContain('pt_BR');
    expect(og.alternateLocale).not.toContain('pt-BR');
  });

  it('derives alternates from SUPPORTED_LOCALES (single source, no dup list)', () => {
    const expected = SUPPORTED_LOCALES
      .filter((l) => l !== DEFAULT_LOCALE)
      .map((l) => l.replace('-', '_'));
    expect(og.alternateLocale.sort()).toEqual(expected.sort());
  });

  it('accepts an explicit primary and excludes it from the alternates', () => {
    const esOg = ogLocaleFor('es');
    expect(esOg.locale).toBe('es');
    expect(esOg.alternateLocale).toContain('pt_BR');
    expect(esOg.alternateLocale).not.toContain('es');
    expect(esOg.alternateLocale).toHaveLength(SUPPORTED_LOCALES.length - 1);
  });

  it('emits ONLY OG locale hints — no per-URL hreflang / ?lang alternate (honesty invariant)', () => {
    // The client-only single-URL locale swap means real hreflang would be a
    // dishonest duplicate-content signal; ogLocaleFor must expose only the OG
    // locale keys and never leak a URL-bearing alternate.
    expect(Object.keys(og).sort()).toEqual(['alternateLocale', 'locale']);
    const serialized = JSON.stringify(og);
    expect(serialized).not.toMatch(/hreflang/i);
    expect(serialized).not.toMatch(/\?lang=/);
    expect(serialized).not.toMatch(/https?:\/\//); // no URLs in the OG-locale hint
  });
});
