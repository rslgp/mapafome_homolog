import { describe, it, expect } from 'vitest';
import {
  buildReport,
  toCsvCategoryMonth,
  toCsvVulnerability,
  toCsvGrowth,
} from '../src/app/components/compatibility/components/ux/reports.js';

// ─────────────────────────────────────────────────────────────────────────────
// Characterization tests for buildReport (reports.js).
//
// These pin the CURRENT behavior of the aggregate-report builder. The
// load-bearing invariant is the k>=5 LGPD anonymity rule (kAnonymize): any
// month-bucket inside a category/region with fewer than 5 pins must collapse
// into "outros" so a single reported person can never be re-identified by
// cross-referencing region + category + month. The prose comment at reports.js
// ~line 97 becomes an enforced forcing-function here.
//
// These tests assert what the code DOES today, not what we wish it did. If a
// future change moves the collapse threshold or stops excluding donor/initiative
// rows, these fail loudly.
// ─────────────────────────────────────────────────────────────────────────────

// A real row is a Google-Sheets record whose `Dados` column is a JSON string.
// Inside that blob, `Coordinates` is itself a JSON string of [lat, lng].
// This helper mirrors that exact two-level encoding.
function makeRow({ coords, ...fields }) {
  const d = { ...fields };
  if (coords !== undefined) d.Coordinates = JSON.stringify(coords);
  return { Dados: JSON.stringify(d) };
}

// Coordinate inside the Recife metro bbox (regionResolver -> 'pe-recife').
const RECIFE = [-8.05, -34.88];
// Fixed clock so monthKey()/age math is deterministic regardless of run date.
const NOW = Date.parse('2025-06-15T12:00:00Z');

// A reporter pin in a single category + single month, attended already so the
// age/alert math never interferes with the bucket-count assertions we care about.
function reporterPin(dateISO, category = 'comida') {
  return makeRow({
    coords: RECIFE,
    DateISO: dateISO,
    Categorias: [category],
    AlimentoEntregue: true,
  });
}

describe('buildReport — k>=5 LGPD anonymity (kAnonymize)', () => {
  it('collapses a month-bucket with fewer than 5 pins into "outros"', () => {
    // 4 pins, same category ("comida"), same month (2025-03) -> below k=5.
    const rows = Array.from({ length: 4 }, () => reporterPin('2025-03-10T09:00:00Z'));
    const report = buildReport(rows, { now: NOW });

    const comida = report.pontos_por_categoria_mes.comida;
    expect(comida).toBeDefined();
    // The real 2025-03 key is gone; its 4 pins are stashed under "outros".
    expect(comida['2025-03']).toBeUndefined();
    expect(comida.outros).toBe(4);
  });

  it('keeps a month-bucket with exactly 5 pins (at the k=5 threshold)', () => {
    // 5 pins, same category, same month -> meets k=5, survives unmasked.
    const rows = Array.from({ length: 5 }, () => reporterPin('2025-03-10T09:00:00Z'));
    const report = buildReport(rows, { now: NOW });

    const comida = report.pontos_por_categoria_mes.comida;
    expect(comida['2025-03']).toBe(5);
    expect(comida.outros).toBeUndefined();
  });

  it('applies the same sub-5 collapse to the per-region month series', () => {
    // 3 pins in pe-recife, same month -> region series collapses to "outros".
    const rows = Array.from({ length: 3 }, () => reporterPin('2025-04-01T09:00:00Z'));
    const report = buildReport(rows, { now: NOW });

    const region = report.pontos_por_regiao_mes['pe-recife'];
    expect(region).toBeDefined();
    expect(region['2025-04']).toBeUndefined();
    expect(region.outros).toBe(3);
  });

  it('aggregates several sub-5 months into a single "outros" total', () => {
    // 3 pins in 2025-01 + 2 pins in 2025-02 = 5 stashed, both below k=5.
    const rows = [
      ...Array.from({ length: 3 }, () => reporterPin('2025-01-05T09:00:00Z')),
      ...Array.from({ length: 2 }, () => reporterPin('2025-02-05T09:00:00Z')),
    ];
    const report = buildReport(rows, { now: NOW });

    const comida = report.pontos_por_categoria_mes.comida;
    expect(comida['2025-01']).toBeUndefined();
    expect(comida['2025-02']).toBeUndefined();
    expect(comida.outros).toBe(5);
  });
});

// A coordinate inside the São Paulo bbox (regionResolver -> a distinct region
// from RECIFE), so we can build a report with two regions at different counts.
const SAO_PAULO = [-23.55, -46.63];

function reporterPinAt(coords, dateISO, category = 'comida', attended = true) {
  return makeRow({ coords, DateISO: dateISO, Categorias: [category], AlimentoEntregue: attended });
}

describe('buildReport — k>=5 region k-anonymity (atendimento + vulnerabilidade)', () => {
  it('collapses a region with < 5 points out of atendimento_por_regiao into "outros"', () => {
    // Recife: 5 points (survives). São Paulo: 2 points (suppressed).
    const rows = [
      ...Array.from({ length: 5 }, () => reporterPinAt(RECIFE, '2025-05-02T09:00:00Z')),
      ...Array.from({ length: 2 }, () => reporterPinAt(SAO_PAULO, '2025-05-02T09:00:00Z')),
    ];
    const report = buildReport(rows, { now: NOW });
    const att = report.atendimento_por_regiao;

    // Recife survives with its exact count; no other region publishes a count.
    expect(att['pe-recife'].total).toBe(5);
    // The sub-5 region is gone; its 2 points are folded into 'outros'.
    const named = Object.keys(att).filter((k) => k !== 'outros');
    expect(named).toEqual(['pe-recife']);
    expect(att.outros).toBeDefined();
    expect(att.outros.total).toBe(2);
    expect(att.outros.atendidos).toBe(2);
    expect(att.outros.taxa_atendimento).toBe(1);
  });

  it('collapses a region with < 5 points out of vulnerabilidade_alimentar_por_regiao', () => {
    // Recife: 5 alimento_pronto (survives). São Paulo: 3 cesta_basica (suppressed).
    const rows = [
      ...Array.from({ length: 5 }, () =>
        makeRow({ coords: RECIFE, DateISO: '2025-05-02T09:00:00Z', Roaster: 'Alimento pronto' })),
      ...Array.from({ length: 3 }, () =>
        makeRow({ coords: SAO_PAULO, DateISO: '2025-05-02T09:00:00Z', Roaster: 'CestaBasica' })),
    ];
    const report = buildReport(rows, { now: NOW });
    const vul = report.vulnerabilidade_alimentar_por_regiao;

    expect(vul['pe-recife'].total).toBe(5);
    const named = Object.keys(vul).filter((k) => k !== 'outros');
    expect(named).toEqual(['pe-recife']);
    // The suppressed region's subtype counts are summed under 'outros'.
    expect(vul.outros).toBeDefined();
    expect(vul.outros.total).toBe(3);
    expect(vul.outros.cesta_basica).toBe(3);
    expect(vul.outros.alimento_pronto).toBe(0);
  });

  it('keeps a region at exactly k=5 unmasked in both region tables', () => {
    const rows = Array.from({ length: 5 }, () =>
      makeRow({ coords: SAO_PAULO, DateISO: '2025-05-02T09:00:00Z', Roaster: 'CestaBasica' }));
    const report = buildReport(rows, { now: NOW });
    // Exactly 5 -> region survives, no 'outros' bucket appears.
    expect(report.atendimento_por_regiao.outros).toBeUndefined();
    expect(report.vulnerabilidade_alimentar_por_regiao.outros).toBeUndefined();
    expect(Object.keys(report.atendimento_por_regiao)).toHaveLength(1);
  });
});

describe('buildReport — reporter-pin exclusion (isReporterPin)', () => {
  it('excludes donor/initiative rows that are not reporter pins', () => {
    const rows = [
      // 5 genuine reporter pins (Categorias non-empty) — counted.
      ...Array.from({ length: 5 }, () => reporterPin('2025-05-02T09:00:00Z')),
      // A donor row: no Categorias[], Roaster not in LEGACY_NEED_ROASTERS.
      makeRow({ coords: RECIFE, DateISO: '2025-05-02T09:00:00Z', Roaster: 'Doador' }),
      // An empty-Categorias row — also not a reporter pin.
      makeRow({ coords: RECIFE, DateISO: '2025-05-02T09:00:00Z', Categorias: [] }),
    ];
    const report = buildReport(rows, { now: NOW });

    // Only the 5 reporter pins are aggregated; the 2 non-reporter rows drop out.
    expect(report.meta.total_pontos_reportados).toBe(5);
    expect(report.resumo_executivo.total_pontos_reportados).toBe(5);
    expect(report.pontos_por_categoria_mes.comida['2025-05']).toBe(5);
  });

  it('treats unparseable Dados blobs as excluded (parseRow returns null)', () => {
    const rows = [
      { Dados: '{not valid json' },
      ...Array.from({ length: 5 }, () => reporterPin('2025-05-02T09:00:00Z')),
    ];
    const report = buildReport(rows, { now: NOW });
    expect(report.meta.total_pontos_reportados).toBe(5);
  });

  it('counts legacy Roaster rows (MoradorRua) as reporter pins', () => {
    // MoradorRua is in LEGACY_NEED_ROASTERS -> reporter pin even with no Categorias[].
    const rows = Array.from({ length: 5 }, () =>
      makeRow({ coords: RECIFE, DateISO: '2025-05-02T09:00:00Z', Roaster: 'MoradorRua' }),
    );
    const report = buildReport(rows, { now: NOW });
    expect(report.meta.total_pontos_reportados).toBe(5);
  });
});

describe('buildReport — legacy foodSubtype / categoriesOf mapping', () => {
  it("maps Roaster 'Alimento pronto' to the alimento_pronto category + subtype", () => {
    const rows = Array.from({ length: 5 }, () =>
      makeRow({ coords: RECIFE, DateISO: '2025-05-02T09:00:00Z', Roaster: 'Alimento pronto' }),
    );
    const report = buildReport(rows, { now: NOW });

    // categoriesOf -> ['alimento_pronto'] -> per-category month series.
    expect(report.pontos_por_categoria_mes.alimento_pronto['2025-05']).toBe(5);
    // foodSubtype -> 'alimento_pronto' -> vulnerability breakdown by region.
    const vul = report.vulnerabilidade_alimentar_por_regiao['pe-recife'];
    expect(vul.alimento_pronto).toBe(5);
    expect(vul.cesta_basica).toBe(0);
    expect(vul.comida_generico).toBe(0);
    expect(vul.total).toBe(5);
  });

  it("maps Roaster 'CestaBasica' to the cesta_basica category + subtype", () => {
    const rows = Array.from({ length: 5 }, () =>
      makeRow({ coords: RECIFE, DateISO: '2025-05-02T09:00:00Z', Roaster: 'CestaBasica' }),
    );
    const report = buildReport(rows, { now: NOW });

    expect(report.pontos_por_categoria_mes.cesta_basica['2025-05']).toBe(5);
    const vul = report.vulnerabilidade_alimentar_por_regiao['pe-recife'];
    expect(vul.cesta_basica).toBe(5);
    expect(vul.alimento_pronto).toBe(0);
  });

  it("maps Roaster 'MoradorRua' to the comida category and 'generico' subtype", () => {
    const rows = Array.from({ length: 5 }, () =>
      makeRow({ coords: RECIFE, DateISO: '2025-05-02T09:00:00Z', Roaster: 'MoradorRua' }),
    );
    const report = buildReport(rows, { now: NOW });

    // categoriesOf('MoradorRua') -> ['comida'].
    expect(report.pontos_por_categoria_mes.comida['2025-05']).toBe(5);
    // foodSubtype('MoradorRua') -> 'generico' -> comida_generico in the breakdown.
    const vul = report.vulnerabilidade_alimentar_por_regiao['pe-recife'];
    expect(vul.comida_generico).toBe(5);
    expect(vul.alimento_pronto).toBe(0);
    expect(vul.cesta_basica).toBe(0);
  });

  it('lets an explicit Categorias[] array override the Roaster fallback', () => {
    // Categorias present -> categoriesOf returns it verbatim, ignoring Roaster.
    const rows = Array.from({ length: 5 }, () =>
      makeRow({
        coords: RECIFE,
        DateISO: '2025-05-02T09:00:00Z',
        Roaster: 'CestaBasica',
        Categorias: ['agua'],
      }),
    );
    const report = buildReport(rows, { now: NOW });
    expect(report.pontos_por_categoria_mes.agua['2025-05']).toBe(5);
    expect(report.pontos_por_categoria_mes.cesta_basica).toBeUndefined();
  });
});

describe('buildReport — meta.nota_dignidade is always present', () => {
  it('emits the dignity/LGPD note for a populated report', () => {
    const rows = Array.from({ length: 5 }, () => reporterPin('2025-05-02T09:00:00Z'));
    const report = buildReport(rows, { now: NOW });
    expect(report.meta).toBeDefined();
    expect(typeof report.meta.nota_dignidade).toBe('string');
    expect(report.meta.nota_dignidade).toMatch(/outros/);
    expect(report.meta.nota_dignidade).toMatch(/reidentifica/i);
  });

  it('emits the dignity note even for empty input', () => {
    const report = buildReport([], { now: NOW });
    expect(report.meta.nota_dignidade).toMatch(/Nenhum dado pessoal/);
    expect(report.meta.total_pontos_reportados).toBe(0);
  });

  it('emits the dignity note even for non-array / garbage input', () => {
    const report = buildReport(null, { now: NOW });
    expect(typeof report.meta.nota_dignidade).toBe('string');
    expect(report.meta.nota_dignidade.length).toBeGreaterThan(0);
    expect(report.meta.total_pontos_reportados).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSV serializers — characterization after the shared toCsv() extraction (R-09).
// Locks the header + escaping + row-join contract end to end so the refactor to
// the ./csv toCsv() helper cannot silently change a public-interest CSV's bytes.
// ─────────────────────────────────────────────────────────────────────────────
describe('reports.js CSV serializers — toCsv() contract', () => {
  it('toCsvCategoryMonth: header + one row per category/month', () => {
    const csv = toCsvCategoryMonth({
      pontos_por_categoria_mes: { comida: { '2026-01': 3, '2026-02': 5 }, agua: { '2026-01': 1 } },
    });
    expect(csv).toBe('categoria,mes,pontos\ncomida,2026-01,3\ncomida,2026-02,5\nagua,2026-01,1');
  });

  it('toCsvCategoryMonth: header-only when the section is empty', () => {
    expect(toCsvCategoryMonth({})).toBe('categoria,mes,pontos');
  });

  it('toCsvGrowth: empty delta fields serialize to blank cells, not "null"', () => {
    const csv = toCsvGrowth({
      crescimento_mensal: [
        { mes: '2026-01', total: 10 },
        { mes: '2026-02', total: 14, delta: 4, delta_pct: 40 },
      ],
    });
    expect(csv).toBe('mes,total,delta,delta_pct\n2026-01,10,,\n2026-02,14,4,40');
  });

  it('toCsvVulnerability: full fixed-width row for one region', () => {
    const csv = toCsvVulnerability({
      vulnerabilidade_alimentar_por_regiao: {
        'Boa Vista': {
          alimento_pronto: 2, cesta_basica: 1, comida_generico: 0,
          total: 3, atendidos: 1, taxa_atendimento: 0.33,
        },
      },
    });
    expect(csv).toBe(
      'regiao,alimento_pronto,cesta_basica,comida_generico,total,atendidos,taxa_atendimento\n'
      + 'Boa Vista,2,1,0,3,1,0.33',
    );
  });
});
