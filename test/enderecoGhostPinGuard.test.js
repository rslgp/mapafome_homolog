// enderecoGhostPinGuard.test.js — EXT-EH-05 (tier S-) ghost-pin guard.
//
// BUG: endereco.js handleSubmit geocodes the typed address and, on SUCCESS,
// stamped Coordinates into row.Dados; on FAILURE it caught the error, alert()ed
// the user, and then FELL THROUGH to `await sheet.addRow(row)` OUTSIDE the
// try/catch — writing a "ghost" pin: a row with NO Coordinates that pollutes the
// map/data with an unlocatable point.
//
// FIX (two parts):
//   1. The geocode decision — "stamp Coordinates, or reject the address" — was
//      extracted from the fire-and-forget IIFE into the pure, directly-testable
//      resolveDadosWithCoordinates() seam (enderecoGeocode.js). It THROWS when the
//      geocoder returns no hit, exactly as the original inline block did.
//   2. handleSubmit's catch now surfaces the failure (the existing
//      page.address.register_error alert), clears the spinner, and RETURNS before
//      sheet.addRow — so a geocode failure writes NOTHING.
//
// This suite locks part 1 (the seam that carries the bug): on failure it throws
// (→ caller aborts the write + signals), on success it returns Dados carrying the
// geocoded Coordinates and mutates nothing else. Because the failure path now
// throws BEFORE any Coordinates are stamped, the caller can no longer reach
// addRow with an incomplete row.

import { describe, it, expect } from 'vitest';
import { resolveDadosWithCoordinates } from '../src/app/components/compatibility/components/googlesheets/enderecoGeocode.js';

// A representative Dados payload (shape produced by variaveisAmbiente.criarRow):
// a JSON string with NO Coordinates key yet.
const DADOS_NO_COORDS = JSON.stringify({
  Roaster: 'marmita',
  DateISO: '2026-07-09T00:00:00.000Z',
  AlimentoEntregue: 0,
  Avaliacao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
});

describe('EXT-EH-05 — resolveDadosWithCoordinates (geocode decision seam)', () => {
  describe('geocode FAILURE → throws (caller must NOT write a ghost pin)', () => {
    it('throws "endereco-nao-encontrado" on an empty result', () => {
      expect(() => resolveDadosWithCoordinates(DADOS_NO_COORDS, [])).toThrowError(
        'endereco-nao-encontrado',
      );
    });

    it('throws on a null/undefined result (defensive)', () => {
      expect(() => resolveDadosWithCoordinates(DADOS_NO_COORDS, null)).toThrow();
      expect(() => resolveDadosWithCoordinates(DADOS_NO_COORDS, undefined)).toThrow();
    });

    it('does NOT stamp any Coordinates on failure — nothing to write', () => {
      // The throw happens before Coordinates is set, so the caller (endereco.js)
      // never gets a Dados-with-no-Coordinates row to append. Prove that by
      // asserting the throw AND that the untouched input string is unchanged.
      const input = DADOS_NO_COORDS;
      expect(() => resolveDadosWithCoordinates(input, [])).toThrow();
      expect(JSON.parse(input)).not.toHaveProperty('Coordinates');
    });
  });

  describe('geocode SUCCESS → returns Dados stamped with Coordinates (path unchanged)', () => {
    it('stamps [y, x] as the Coordinates string, byte-for-byte as the old inline block', () => {
      // leaflet-geosearch results carry { x: lon, y: lat }; the original code used
      // [providerResult[0].y, providerResult[0].x] then JSON.stringify(...).replace(" ","").
      const result = [{ x: -34.87, y: -8.06, label: 'Recife' }];
      const out = resolveDadosWithCoordinates(DADOS_NO_COORDS, result);
      const dados = JSON.parse(out);
      expect(dados.Coordinates).toBe(JSON.stringify([-8.06, -34.87]).replace(' ', ''));
    });

    it('uses only the FIRST hit and preserves every other Dados field untouched', () => {
      const result = [
        { x: -34.87, y: -8.06 },
        { x: 1, y: 2 }, // ignored
      ];
      const out = resolveDadosWithCoordinates(DADOS_NO_COORDS, result);
      const dados = JSON.parse(out);
      expect(dados.Coordinates).toBe(JSON.stringify([-8.06, -34.87]).replace(' ', ''));
      // Non-coordinate fields are carried through verbatim.
      expect(dados.Roaster).toBe('marmita');
      expect(dados.AlimentoEntregue).toBe(0);
      expect(dados.Avaliacao).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
  });

  it('propagates a JSON.parse error for malformed Dados (caller catches → no write)', () => {
    // Malformed row.Dados also lands in the caller's catch, so it too aborts the
    // append rather than writing a broken row.
    expect(() => resolveDadosWithCoordinates('not-json', [{ x: 1, y: 2 }])).toThrow();
  });
});
