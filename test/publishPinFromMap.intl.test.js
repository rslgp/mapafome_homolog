// publishPinFromMap.intl.test.js — INTL M5 (MISS-2) WIRING test.
//
// Proves publishPinFromMap (appPinActions.js) ACTUALLY calls trackPublishIntl
// with the resolved country, the in_selected_bbox computed from the SAME pure
// predicate (isInsideCountry), and the offshore-heuristic verdict — i.e. the
// event is really emitted on publish, not just defined. intlAnalytics + the
// sheets client are mocked so the contract is asserted without a network/sheet.
//
// Separate from intlAnalytics.test.js because THIS file MOCKS intlAnalytics
// (to spy on the emitter), which cannot coexist with importing the real helper.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockTrackPublishIntl, mockTrackModerationIntl } = vi.hoisted(() => ({
  mockTrackPublishIntl: vi.fn(),
  mockTrackModerationIntl: vi.fn(),
}));
vi.mock('../src/app/components/compatibility/components/ux/intlAnalytics.js', () => ({
  trackPublishIntl: mockTrackPublishIntl,
  trackModerationIntl: mockTrackModerationIntl,
}));

const { mockAddRow, mockGetSheet } = vi.hoisted(() => {
  const addRow = vi.fn(async (row) => row);
  return {
    mockAddRow: addRow,
    mockGetSheet: vi.fn(async () => ({
      addRow,
      // publishPinFromMap does not call these, but writePinToSheets' lastModified
      // stamp would; harmless to provide.
      loadCells: vi.fn(async () => {}),
      getCell: vi.fn(() => ({ value: null })),
      saveUpdatedCells: vi.fn(async () => {}),
    })),
  };
});
vi.mock('../src/app/components/compatibility/components/googlesheets/sheetsClient.js', () => ({
  getSheet: mockGetSheet,
}));

import { publishPinFromMap } from
  '../src/app/components/compatibility/appPinActions.js';

function makeSelf() {
  return {
    state: {
      alimento: 'MoradorRua', diaSemana: '', horario: '', mes: '',
      redesocial: '', telefoneEncryptado: '',
    },
  };
}
function makeEnv() {
  return {
    criarRow: vi.fn((dadosRow) => ({ Dados: JSON.stringify({ ...dadosRow }) })),
  };
}

// SP_BR inside Brazil's rect2; LISBON_PT inside Portugal's box (countries.js).
const SP_BR = [-23.55, -46.63];
const LISBON_PT = [38.72, -9.13];

describe('publishPinFromMap — REALLY emits publish_intl (wiring)', () => {
  beforeEach(() => {
    mockTrackPublishIntl.mockClear();
    mockAddRow.mockClear();
    mockGetSheet.mockClear();
    // window.location.reload runs at the end; stub it so jsdom does not complain.
    // The event must fire BEFORE this runs.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
  });

  it("OFF path: no guard, activeCountry 'br' → publish_intl{country:'br', in_selected_bbox:true, offshore_heuristic:'not_run'}", async () => {
    const deps = {
      envVariables: makeEnv(),
      activeCountry: () => 'br',
      // offshoreGuard ABSENT — the dark-ship / OFF deps.
    };
    await publishPinFromMap(makeSelf(), deps, SP_BR);

    expect(mockTrackPublishIntl).toHaveBeenCalledTimes(1);
    const arg = mockTrackPublishIntl.mock.calls[0][0];
    expect(arg.country).toBe('br');
    expect(arg.inSelectedBbox).toBe(true); // SP is inside BR
    expect(arg.offshoreHeuristic).toBe('not_run');
    // The write actually happened before the event.
    expect(mockAddRow).toHaveBeenCalledTimes(1);
  });

  it("ON path: offshore guard resolves → offshore_heuristic 'passed' + the marked-in country", async () => {
    const offshoreGuard = vi.fn(async () => { /* resolves = allow */ });
    const deps = {
      envVariables: makeEnv(),
      activeCountry: () => 'pt',
      offshoreGuard,
    };
    await publishPinFromMap(makeSelf(), deps, LISBON_PT);

    expect(offshoreGuard).toHaveBeenCalledWith(LISBON_PT);
    const arg = mockTrackPublishIntl.mock.calls[0][0];
    expect(arg.country).toBe('pt');
    expect(arg.inSelectedBbox).toBe(true); // Lisbon is inside PT
    expect(arg.offshoreHeuristic).toBe('passed');
  });

  it('a CONFIDENT offshore mismatch throws BEFORE publish → no event, no write', async () => {
    const offshoreGuard = vi.fn(async () => {
      const err = new Error('out_of_bounds');
      err.reason = 'out_of_bounds';
      throw err;
    });
    const deps = {
      envVariables: makeEnv(),
      activeCountry: () => 'pt',
      offshoreGuard,
    };
    await expect(publishPinFromMap(makeSelf(), deps, [0, 0])).rejects.toThrow('out_of_bounds');
    expect(mockTrackPublishIntl).not.toHaveBeenCalled();
    expect(mockAddRow).not.toHaveBeenCalled();
  });

  it("absent activeCountry accessor (legacy caller) defaults to 'br' (OFF behavior)", async () => {
    const deps = { envVariables: makeEnv() }; // no activeCountry, no guard
    await publishPinFromMap(makeSelf(), deps, SP_BR);
    expect(mockTrackPublishIntl.mock.calls[0][0].country).toBe('br');
  });
});
