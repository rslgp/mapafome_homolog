// intlReadback.test.js — INTL milestone M2.5 unit tests (§4.6.1 / DEST-1).
//
// Covers the WRITE-back + READ-back data flow that stops non-BR marks from
// collapsing into the Brazil region view on the single shared sheet 0:
//   • WRITE: variaveisAmbiente.criarRow stamps Dados.Pais with the country the
//       mark was created in — resolved the SAME injected-resolver way M1 wired
//       dentroLimites (no countryStore import in the POJO). Flag OFF → 'br'.
//   • READ-BACK: appMainBootstrap.filterRowsByCountry / rowCountry attribute each
//       row by its stamped Pais, defaulting a MISSING Pais to 'br' (backward
//       compatibility for historical rows that predate the field), and scope the
//       rendered set to the active country.
//
// These are the focused tests the task + FIT-2 (§4.6.1 point 3) call for.

import { describe, it, expect, beforeEach } from 'vitest';

import envVariables, { setActiveCountryResolver } from
  '../src/app/components/compatibility/components/variaveisAmbiente.js';
import { rowCountry, filterRowsByCountry } from
  '../src/app/components/compatibility/appMainBootstrap.js';

// Minimal dadosRow the publish paths build (criarRow only reads these fields).
function makeDadosRow(overrides = {}) {
  return {
    alimento: 'MoradorRua',
    numero: '',
    endereco: '',
    coords: [-23.55, -46.63],
    telefone: '',
    diaSemana: '',
    horario: '',
    mes: '',
    redesocial: '',
    ...overrides,
  };
}

function paisOf(row) {
  return JSON.parse(row.Dados).Pais;
}

describe('criarRow — Pais stamp (WRITE-back, §4.6.1)', () => {
  beforeEach(() => {
    // Reset to the production default (no wiring) so each case is isolated; the
    // default resolver returns 'br' — i.e. the flag-OFF / SSR / pre-bootstrap
    // posture, where every row must be stamped Brazil.
    setActiveCountryResolver(null);
  });

  it('stamps Pais:"br" with NOTHING injected (flag OFF / dark-ship default)', () => {
    const row = envVariables.criarRow(makeDadosRow());
    expect(paisOf(row)).toBe('br');
  });

  it('stamps the country the injected resolver yields (INTL ON, non-BR session)', () => {
    // The composition root wires the resolver to activeCountryFor(flag, store);
    // here we simulate an ON session whose selected country is Spain.
    setActiveCountryResolver(() => 'es');
    const row = envVariables.criarRow(makeDadosRow());
    expect(paisOf(row)).toBe('es');
  });

  it('honors an explicit dadosRow.pais over the resolver (caller-passed code)', () => {
    setActiveCountryResolver(() => 'br');
    const row = envVariables.criarRow(makeDadosRow({ pais: 'pt' }));
    expect(paisOf(row)).toBe('pt');
  });

  it('keeps every other Dados field intact (additive — Pais is the only delta)', () => {
    setActiveCountryResolver(null);
    const dados = JSON.parse(envVariables.criarRow(makeDadosRow()).Dados);
    expect(dados.Roaster).toBe('MoradorRua');
    expect(dados.AlimentoEntregue).toBe(0);
    expect(dados.Avaliacao).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
    expect(dados.Coordinates).toBe(JSON.stringify([-23.55, -46.63]));
    expect(dados.Pais).toBe('br');
  });
});

describe('rowCountry — read-back default for a missing Pais (backward compat)', () => {
  it('defaults a row with NO Pais field to "br" (legacy historical row)', () => {
    expect(rowCountry({ DateISO: 'x' })).toBe('br'); // no Pais key at all
    expect(rowCountry({ Pais: undefined })).toBe('br');
    expect(rowCountry({ Pais: null })).toBe('br');
    expect(rowCountry({ Pais: '' })).toBe('br');
  });

  it('returns the stamped country when present', () => {
    expect(rowCountry({ Pais: 'br' })).toBe('br');
    expect(rowCountry({ Pais: 'es' })).toBe('es');
    expect(rowCountry({ Pais: 'pt' })).toBe('pt');
  });
});

describe('filterRowsByCountry — country-aware read-back (§4.6.1 point 2)', () => {
  // A representative mixed sheet: a legacy BR row (no Pais), a freshly-stamped BR
  // row, two non-BR rows, and a pet row that must always be dropped.
  const rows = [
    { id: 'legacy-br', kind: undefined },                 // no Pais → legacy BR
    { id: 'new-br', kind: undefined, Pais: 'br' },
    { id: 'es', kind: undefined, Pais: 'es' },
    { id: 'pt', kind: undefined, Pais: 'pt' },
    { id: 'pet', kind: 'pet', Pais: 'es' },               // pet → always dropped
  ];
  const ids = (out) => out.map((r) => r.id);

  it('BR session (also the flag-OFF case): legacy + BR-stamped rows, no foreign rows', () => {
    expect(ids(filterRowsByCountry(rows, 'br'))).toEqual(['legacy-br', 'new-br']);
  });

  it('defaulting the active country to "br" matches the BR session', () => {
    // flag-OFF resolves activeCountryFor → 'br'; an absent arg defaults the same.
    expect(ids(filterRowsByCountry(rows, undefined))).toEqual(['legacy-br', 'new-br']);
  });

  it('non-BR session: ONLY that country, BR rows do not bleed in', () => {
    expect(ids(filterRowsByCountry(rows, 'es'))).toEqual(['es']);
    expect(ids(filterRowsByCountry(rows, 'pt'))).toEqual(['pt']);
  });

  it('always drops pet rows regardless of country', () => {
    expect(filterRowsByCountry(rows, 'es').some((r) => r.kind === 'pet')).toBe(false);
    expect(filterRowsByCountry(rows, 'br').some((r) => r.kind === 'pet')).toBe(false);
  });

  it('never crashes on a row with no Dados-spread fields at all', () => {
    expect(() => filterRowsByCountry([{}], 'br')).not.toThrow();
    expect(filterRowsByCountry([{}], 'br')).toHaveLength(1); // {} → kind undefined, Pais → 'br'
  });
});

describe('end-to-end: a non-BR publish is attributed to its country on read-back', () => {
  beforeEach(() => setActiveCountryResolver(null));

  it('an ES-stamped write survives an ES read-back and is dropped from a BR view', () => {
    setActiveCountryResolver(() => 'es');
    const row = envVariables.criarRow(makeDadosRow());
    // Simulate the read-back: the Dados blob is spread onto the row object.
    const readRow = { ...JSON.parse(row.Dados), kind: undefined };
    expect(rowCountry(readRow)).toBe('es');
    expect(filterRowsByCountry([readRow], 'es')).toHaveLength(1);
    expect(filterRowsByCountry([readRow], 'br')).toHaveLength(0);
  });
});
