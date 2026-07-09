// readRowResilience.test.js — EXT-READROW-01 (tier S)
//
// The hunger read path (appMainBootstrap.runMain) parses each sheet row's `Dados`
// and `Coordinates` JSON. The Google Sheet is COLLABORATIVELY edited, so any single
// row can carry a malformed/blank cell. Before EXT-READROW-01 the parse was an
// unguarded JSON.parse inside the row loop: one bad cell THREW, aborting the whole
// loop into the outer catch (loadError:true) and blanking the ENTIRE map for every
// visitor — instead of hiding just the one bad row.
//
// mapFoodRow is the pure per-row helper the loop now uses (mirrors the /pets
// resilience, petBlob.parsePetRow → null for a bad row): it mutates a GOOD row in
// place and returns true (keep), or returns false (skip) for a malformed row,
// WITHOUT throwing. These tests prove: (a) a good row is fully mapped, (b) a
// malformed Dados row is skipped, (c) a malformed Coordinates row is skipped, and
// (d) the batch shape runMain uses — rows.filter(mapFoodRow) — keeps every good row
// while dropping the bad ones, so one bad cell no longer zeroes the map.

import { describe, it, expect } from 'vitest';

import { mapFoodRow } from
  '../src/app/components/compatibility/appMainBootstrap.js';

// A minimal aes stub: decrypt() just tags the input so we can assert it ran. The
// real aes.decrypt is exercised elsewhere; here we only care that mapFoodRow calls
// it for a row that carries a Telefone, and that a decrypt throw is swallowed.
const aesOk = { decrypt: (s) => `dec(${s})` };
const aesThrows = { decrypt: () => { throw new Error('not hex'); } };

// Builds a sheet-row shape: the raw `Dados`/`Coordinates` string columns that
// getRows() returns, exactly as mapFoodRow receives them.
function makeRow({ dados, coordinates }) {
  const row = {};
  if (dados !== undefined) row.Dados = dados;
  if (coordinates !== undefined) row.Coordinates = coordinates;
  return row;
}

// A well-formed food row: Dados carries Coordinates (so mapCoords is set) and a
// Telefone (so the decrypt branch runs). Coordinates on the row column mirrors the
// blob (that is what runMain parses into mapCoords).
function goodRow(overrides = {}) {
  const coords = overrides.coords || [-23.55, -46.63];
  const dados = {
    Roaster: 'MoradorRua',
    City: 'sao-paulo',
    Coordinates: JSON.stringify(coords),
    Telefone: 'deadbeef',
    DateISO: '2026-07-09T00:00:00.000Z',
    ...overrides.dados,
  };
  return {
    Dados: JSON.stringify(dados),
    Coordinates: JSON.stringify(coords),
  };
}

describe('mapFoodRow — a GOOD row is fully mapped in place (no behavior change)', () => {
  it('spreads the Dados blob onto the row, parses mapCoords, decrypts Telefone', () => {
    const row = goodRow();
    const kept = mapFoodRow(row, aesOk);
    expect(kept).toBe(true);
    // Dados fields spread onto the row:
    expect(row.Roaster).toBe('MoradorRua');
    expect(row.City).toBe('sao-paulo');
    expect(row.DateISO).toBe('2026-07-09T00:00:00.000Z');
    // Coordinates parsed into mapCoords:
    expect(row.mapCoords).toEqual([-23.55, -46.63]);
    // Telefone decrypted via the injected aes:
    expect(row.Telefone).toBe('dec(deadbeef)');
  });

  it('swallows an aes.decrypt failure (non-hex phone) and still KEEPS the row', () => {
    const row = goodRow();
    const kept = mapFoodRow(row, aesThrows);
    expect(kept).toBe(true);
    expect(row.mapCoords).toEqual([-23.55, -46.63]);
    // Telefone left as-is because decrypt threw and is caught (pre-existing behavior).
    expect(row.Telefone).toBe('deadbeef');
  });

  it('keeps a row that has no Coordinates in its Dados (no mapCoords, still kept)', () => {
    const dados = JSON.stringify({ Roaster: 'MoradorRua', City: 'x' });
    const row = { Dados: dados };
    const kept = mapFoodRow(row, aesOk);
    expect(kept).toBe(true);
    expect(row.Roaster).toBe('MoradorRua');
    expect(row.mapCoords).toBeUndefined();
  });
});

describe('mapFoodRow — a MALFORMED row is SKIPPED, never thrown (EXT-READROW-01)', () => {
  it('returns false for a malformed Dados cell instead of throwing', () => {
    const row = makeRow({ dados: '{not valid json' });
    expect(() => mapFoodRow(row, aesOk)).not.toThrow();
    expect(mapFoodRow(makeRow({ dados: '{not valid json' }), aesOk)).toBe(false);
  });

  it('returns false for a blank / empty Dados cell instead of throwing', () => {
    expect(() => mapFoodRow(makeRow({ dados: '' }), aesOk)).not.toThrow();
    expect(mapFoodRow(makeRow({ dados: '' }), aesOk)).toBe(false);
  });

  it('returns false when Dados says there are Coordinates but the cell is unparseable', () => {
    // Dados.Coordinates is truthy (guards the parse), but the row's Coordinates
    // COLUMN is malformed — the old code threw here on the second JSON.parse.
    const dados = JSON.stringify({ Roaster: 'MoradorRua', Coordinates: 'x' });
    const row = { Dados: dados, Coordinates: '[not json' };
    expect(() => mapFoodRow(row, aesOk)).not.toThrow();
    expect(mapFoodRow({ Dados: dados, Coordinates: '[not json' }, aesOk)).toBe(false);
  });
});

describe('batch: rows.filter(mapFoodRow) — one bad row no longer zeroes the map', () => {
  // This is the exact shape runMain now uses: rows = rows.filter((x) => mapFoodRow(x, aes)).
  it('keeps ALL good rows and drops ONLY the malformed one', () => {
    const rows = [
      goodRow({ coords: [-23.55, -46.63], dados: { City: 'a' } }),
      makeRow({ dados: '{corrupt' }),                 // malformed Dados → dropped
      goodRow({ coords: [-22.9, -43.2], dados: { City: 'b' } }),
      { Dados: JSON.stringify({ City: 'c', Coordinates: 'x' }), Coordinates: 'nope' }, // bad Coordinates → dropped
      goodRow({ coords: [-30.0, -51.2], dados: { City: 'd' } }),
    ];

    const survivors = rows.filter((x) => mapFoodRow(x, aesOk));

    // 3 of 5 survive; the 2 malformed rows are skipped, not fatal.
    expect(survivors).toHaveLength(3);
    expect(survivors.map((r) => r.City)).toEqual(['a', 'b', 'd']);
    // The good rows are fully mapped (mapCoords present) — the map still renders.
    expect(survivors.every((r) => Array.isArray(r.mapCoords))).toBe(true);
  });

  it('a batch with a malformed row does NOT throw (the outer catch is never reached)', () => {
    const rows = [goodRow(), makeRow({ dados: 'garbage' }), goodRow()];
    expect(() => rows.filter((x) => mapFoodRow(x, aesOk))).not.toThrow();
    expect(rows.filter((x) => mapFoodRow(x, aesOk))).toHaveLength(2);
  });
});
