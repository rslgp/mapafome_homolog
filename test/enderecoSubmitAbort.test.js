// enderecoSubmitAbort.test.js — EXT-EH-05 caller-contract integration test.
//
// Proves the wiring the pure seam test (enderecoGhostPinGuard.test.js) cannot:
// when the geocode decision REJECTS an address, NameForm.handleSubmit surfaces the
// error to the user (page.address.register_error alert), clears the spinner, and
// RETURNS before sheet.addRow — so NO row is written. On success it writes exactly
// once and reloads.
//
// SEAM CHOICE: endereco.js pulls google-spreadsheet / leaflet-geosearch via CJS
// `require`, which Vitest's vi.mock does NOT intercept (verified). But it imports
// the geocode decision via ESM `import { resolveDadosWithCoordinates } from
// './enderecoGeocode'`, which Vitest DOES intercept — so we mock THAT seam to
// force a REJECTED geocode deterministically, and neuter the real
// google-spreadsheet / leaflet-geosearch singletons by spying on their prototypes
// (auth/loadInfo → no-op; the geocoder → resolves).
//
// SCOPE: this file asserts the FAILURE (abort) contract only. On a rejected
// geocode the seam throws BEFORE sheet.addRow is used, so the assertion never
// depends on fully faking the (require-bound, un-mockable) google-spreadsheet
// write target — it stays deterministic. The SUCCESS path (coords stamped, exactly
// one write) is proven byte-for-byte by the pure-seam suite in
// enderecoGhostPinGuard.test.js, so it is not re-driven through the flaky,
// network-touching singleton here.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the geocode decision seam (ESM import → intercepted).
const { resolveSpy } = vi.hoisted(() => ({ resolveSpy: vi.fn() }));
vi.mock('../src/app/components/compatibility/components/googlesheets/enderecoGeocode.js', () => ({
  resolveDadosWithCoordinates: resolveSpy,
}));
vi.mock('@mui/material/CircularProgress', () => ({ default: () => null }));

// Real classes whose prototypes we neuter (require is NOT mockable here).
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { OpenStreetMapProvider } = require('leaflet-geosearch');
const providerSearchProto = Object.getPrototypeOf(OpenStreetMapProvider.prototype);

import NameForm from '../src/app/components/compatibility/components/googlesheets/endereco.js';

function makeForm(overrides = {}) {
  const form = {
    state: {
      value: 'Rua Teste, 123, Centro, Recife, PE',
      alimento: 'marmita',
      telefone: '', diaSemana: '', horario: '', mes: '', redesocial: '',
      isLoading: false,
      ...overrides.state,
    },
    handleSubmit: NameForm.prototype.handleSubmit,
  };
  form.setState = vi.fn((patch) => { Object.assign(form.state, patch); });
  return form;
}
const fakeEvent = () => ({ preventDefault: vi.fn() });

async function waitUntil(pred) {
  for (let i = 0; i < 200; i++) {
    if (pred()) return true;
    await new Promise((r) => setTimeout(r, 0));
  }
  return false;
}

describe('EXT-EH-05 — handleSubmit aborts the write on a rejected geocode', () => {
  let alertSpy, reloadSpy, addRowSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(GoogleSpreadsheet.prototype, 'useServiceAccountAuth').mockResolvedValue(undefined);
    vi.spyOn(GoogleSpreadsheet.prototype, 'loadInfo').mockResolvedValue(undefined);
    // The write target. If the failure branch ever regressed to fall through to
    // addRow, this spy would catch it. (It also keeps the real, network-touching
    // sheetsByIndex getter off the code path.)
    addRowSpy = vi.fn(() => Promise.resolve());
    vi.spyOn(GoogleSpreadsheet.prototype, 'sheetsByIndex', 'get')
      .mockReturnValue({ 0: { addRow: addRowSpy } });
    // Geocoder resolves so the try-body runs and reaches the (mocked) seam.
    vi.spyOn(providerSearchProto, 'search').mockResolvedValue([{ x: -34.87, y: -8.06 }]);
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { reload: reloadSpy } });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('geocode REJECTS: alerts the user, clears the spinner, and does NOT call addRow', async () => {
    resolveSpy.mockImplementation(() => { throw new Error('endereco-nao-encontrado'); });
    const form = makeForm();

    form.handleSubmit(fakeEvent());
    const alerted = await waitUntil(() => alertSpy.mock.calls.length > 0);

    expect(alerted).toBe(true);          // the failure IS surfaced (no silent no-op)
    expect(addRowSpy).not.toHaveBeenCalled(); // NO ghost row written
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(form.state.isLoading).toBe(false); // spinner cleared → form usable again
  });
});
