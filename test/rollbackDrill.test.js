// rollbackDrill.test.js — INTL M5 (MISS-1) ROLLBACK DRILL confirmation.
//
// Rollback of an intl ship is a REBUILD with NEXT_PUBLIC_INTL=off + redeploy (the
// flag resolves at module load, not runtime — see scripts/rollback-drill.mjs).
// This test is the "confirm an international pin is REJECTED again" assertion of
// the drill, run in the vitest harness (the same resolver the M0 corpus uses). It
// pins the DARK-SHIP invariant: against the committed OFF source, the publish
// geofence is Brazil-only, so an international pin (Lisbon) is rejected and a
// Brazil pin (São Paulo) is accepted — byte-identical to pre-intl behavior.
//
// The geofence characterization corpus (test/geofence.characterization.test.js,
// M0) freezes the FULL OFF boundary; this file is the focused, human-legible
// rollback assertion the drill script invokes alongside the M0 corpus.

import { describe, it, expect } from 'vitest';

import envVariables from
  '../src/app/components/compatibility/components/variaveisAmbiente.js';
import { isInsideCountry } from
  '../src/app/components/compatibility/components/countries.js';
import { INTL_ENABLED } from
  '../src/app/components/compatibility/components/intlConfig.js';

// International pin (Lisbon, Portugal): inside PT's curated box but OUTSIDE the
// two Brazil rectangles. Brazil pin (São Paulo): inside BR's rect2.
const LISBON_PT = [38.72, -9.13];
const SP_BR = [-23.55, -46.63];

describe('INTL M5 rollback drill (MISS-1) — OFF artifact is Brazil-only', () => {
  it('the COMMITTED flag is OFF (DEV_DEFAULT=false; the dark-ship invariant)', () => {
    // The unit suite runs with NEXT_PUBLIC_INTL unset → INTL_ENABLED === DEV_DEFAULT.
    // If this ever reads true in committed source, the dark-ship was broken.
    expect(INTL_ENABLED).toBe(false);
  });

  it('the OFF publish geofence REJECTS an international pin (Lisbon)', () => {
    expect(envVariables.dentroLimites(LISBON_PT)).toBe(false);
  });

  it('the OFF publish geofence ACCEPTS a Brazil pin (São Paulo)', () => {
    expect(envVariables.dentroLimites(SP_BR)).toBe(true);
  });

  it("isInsideCountry(Lisbon,'br') === false and (São Paulo,'br') === true", () => {
    // dentroLimites delegates to this under the OFF resolver; assert the predicate
    // directly so a regression points at the exact layer.
    expect(isInsideCountry(LISBON_PT, 'br')).toBe(false);
    expect(isInsideCountry(SP_BR, 'br')).toBe(true);
  });
});
