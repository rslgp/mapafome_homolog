import { describe, it, expect } from 'vitest';
import { organizationLd, reportDatasetLd, SITE_URL } from './structuredData';

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
