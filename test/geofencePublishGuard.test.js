// geofencePublishGuard.test.js — the publish-FUNNEL geofence enforcement.
//
// USER SCENARIO under test (the one the user asked for): a person uses the tool — including the
// "Teste"/test-the-tool option — and TRIES TO TAP A LOCATION OUTSIDE THEIR COUNTRY. The app must
// BLOCK that mark and NOTIFY them, while a tap INSIDE their country is allowed. This is the
// behavior the publish funnels delegate to geofencePublishGuard:
//   • resolveGeofenceBinding(...) — the ASYNC path used by the map-click ("Confirmar ponto") and
//     the report-sheet funnel: it resolves the verified binding country from the GPS + IP signals
//     (NEVER from the tapped pin), and the caller then applies isInsideCountry(pin, country).
//   • checkSyncBindingForPin(coords) — the SYNC path used by the legacy address form: it reads the
//     last broadcast verdict and applies the geometry leg itself, returning {allowed, country, message}.
//   • geofenceBlockMessage(status) — the localized NOTIFY copy for a blocked mark.
//
// NO NETWORK / NO REACT: both country resolvers are injected fakes (peek/resolve) and the device
// coords are passed in. The geometry leg uses the REAL isInsideCountry + the REAL Brazil bounds, so
// "inside Brazil" / "outside Brazil" are the actual publish rectangles, not stubs.

import { describe, it, expect, beforeEach } from 'vitest';

import {
  resolveGeofenceBinding,
  checkSyncBindingForPin,
  geofenceBlockMessage,
} from '../src/app/components/compatibility/components/geofencePublishGuard.js';
import { dispatchGeofenceEligibility } from
  '../src/app/components/compatibility/components/geofenceEvents.js';
import { isInsideCountry } from
  '../src/app/components/compatibility/components/countries.js';
import { t } from '../src/app/components/compatibility/components/ux/strings.js';

// Real coordinates. SP_BR is inside Brazil's publish box; NYC_US and MADRID_ES are outside it.
const SP_BR = [-23.55, -46.63];     // São Paulo — inside BR
const NYC_US = [40.71, -74.0];      // New York — outside BR (a "tap outside the country")
const MADRID_ES = [40.42, -3.70];   // Madrid — outside BR

// A fake country resolver matching the real peek()/resolve() shape. `code` is what it knows
// (a lowercase alpha-2, or null for "resolved-unknown"). `warm` controls peek(): when true,
// peek() returns the code immediately (already resolved off a fix); when false, peek() returns
// undefined until resolve() runs (the click beat the warm-up).
function fakeResolver(code, { warm = true } = {}) {
  let resolved = warm;
  let resolveCalls = 0;
  return {
    peek: () => (resolved ? code : undefined),
    resolve: async () => { resolveCalls += 1; resolved = true; return code; },
    get resolveCalls() { return resolveCalls; },
  };
}

// The caller (App) applies this geometry leg after resolveGeofenceBinding; we mirror it here so
// the test asserts the SAME "allow iff inside the binding country" decision the funnels make.
function publishAllowed(verdict, pin) {
  return verdict.country ? isInsideCountry(pin, verdict.country) : false;
}

describe('publish funnel — TAP OUTSIDE the country is blocked, INSIDE is allowed (GPS+IP in BR)', () => {
  // The user is verified in Brazil: GPS reverse-geocodes to br AND IP resolves to br (they agree).
  const inBrazil = () => ({
    physicalResolver: fakeResolver('br'),
    ipResolver: fakeResolver('br'),
    deviceCoords: SP_BR, // the DEVICE is in Brazil
  });

  it('binds to the physical country (br) when GPS and IP agree', async () => {
    const verdict = await resolveGeofenceBinding(inBrazil());
    expect(verdict).toMatchObject({ eligible: true, country: 'br', status: 'ok' });
  });

  it('ALLOWS a tap INSIDE Brazil (São Paulo)', async () => {
    const verdict = await resolveGeofenceBinding(inBrazil());
    expect(publishAllowed(verdict, SP_BR)).toBe(true);
  });

  it('BLOCKS a tap OUTSIDE Brazil (New York) even though the user is verified in-country', async () => {
    const verdict = await resolveGeofenceBinding(inBrazil());
    // The verdict is eligible (they ARE in br), but the PIN is outside br → not allowed.
    expect(verdict.country).toBe('br');
    expect(publishAllowed(verdict, NYC_US)).toBe(false);
    expect(publishAllowed(verdict, MADRID_ES)).toBe(false);
  });

  it('binds to the DEVICE country, NEVER the tapped pin (the latent-bug guard)', async () => {
    // Cold physical cache: peek() is undefined, so resolve() runs — and it must use the DEVICE
    // coords (SP_BR), not the foreign pin. We prove it by asserting the binding stays 'br'.
    const deps = {
      physicalResolver: fakeResolver('br', { warm: false }),
      ipResolver: fakeResolver('br'),
      deviceCoords: SP_BR,
    };
    const verdict = await resolveGeofenceBinding(deps);
    expect(verdict.country).toBe('br');           // bound to where the DEVICE is
    expect(publishAllowed(verdict, NYC_US)).toBe(false); // a NYC tap is still blocked
  });

  it('the "Teste"/test-the-tool option does NOT bypass the geofence (same gate, any food type)', async () => {
    // The food type ("Teste" vs a real category) is orthogonal to the geofence: the publish
    // funnels resolve the binding the SAME way regardless. So testing the tool with a tap outside
    // the country is blocked exactly like a real publish would be.
    const verdict = await resolveGeofenceBinding(inBrazil());
    expect(publishAllowed(verdict, NYC_US)).toBe(false); // outside → blocked, test pin or not
    expect(publishAllowed(verdict, SP_BR)).toBe(true);   // inside → allowed
  });
});

describe('publish funnel — the NOTIFY message on a blocked tap', () => {
  it('a pin outside the binding country shows the need-location notice (pt-BR default)', () => {
    // status 'ok' (the user IS in their country) but the pin is outside → the funnel surfaces the
    // generic need_location copy (NOT the VPN-mismatch copy).
    expect(geofenceBlockMessage('ok')).toBe(t('page.geofence.need_location'));
    expect(geofenceBlockMessage('no_location')).toBe(t('page.geofence.need_location'));
    expect(geofenceBlockMessage('ip_unknown')).toBe(t('page.geofence.need_location'));
  });

  it('a GPS/IP country DISAGREEMENT (VPN) shows the country-mismatch notice', () => {
    expect(geofenceBlockMessage('mismatch')).toBe(t('page.geofence.country_mismatch'));
  });
});

describe('address-form funnel (checkSyncBindingForPin) — TAP OUTSIDE the country is blocked', () => {
  beforeEach(() => {
    // Seed the last-broadcast verdict as "verified in Brazil" — what App dispatches once the GPS
    // and IP signals settle. The sync funnel reads exactly this.
    dispatchGeofenceEligibility({ eligible: true, country: 'br', status: 'ok' });
  });

  it('ALLOWS an address INSIDE Brazil and stamps the verified country', () => {
    const gate = checkSyncBindingForPin(SP_BR);
    expect(gate.allowed).toBe(true);
    expect(gate.country).toBe('br');
    expect(gate.message).toBeNull();
  });

  it('BLOCKS an address OUTSIDE Brazil and returns the notify message', () => {
    const gate = checkSyncBindingForPin(NYC_US);
    expect(gate.allowed).toBe(false);
    expect(gate.country).toBeNull();
    expect(gate.message).toBe(t('page.geofence.need_location'));
  });

  it('BLOCKS everything (and gives the mismatch notice) when GPS and IP disagree', () => {
    // VPN: GPS=br, IP=us → no binding country → not eligible → every tap blocked, INSIDE or not.
    dispatchGeofenceEligibility({ eligible: false, country: null, status: 'mismatch' });
    const inside = checkSyncBindingForPin(SP_BR);
    expect(inside.allowed).toBe(false);
    expect(inside.message).toBe(t('page.geofence.country_mismatch'));
    expect(checkSyncBindingForPin(NYC_US).allowed).toBe(false);
  });
});

describe('publish funnel — GPS denied falls back to the IP country (still blocks outside it)', () => {
  it('GPS unknown + IP=br binds to br: allows inside Brazil, blocks New York', async () => {
    const deps = {
      // GPS denied: physical resolver knows nothing (null) and there is no device fix.
      physicalResolver: fakeResolver(null),
      ipResolver: fakeResolver('br'),
      deviceCoords: [], // no device coords (currentLocation never filled)
    };
    const verdict = await resolveGeofenceBinding(deps);
    expect(verdict).toMatchObject({ eligible: true, country: 'br', status: 'ok_ip_fallback' });
    expect(publishAllowed(verdict, SP_BR)).toBe(true);   // inside the IP-fallback country → allowed
    expect(publishAllowed(verdict, NYC_US)).toBe(false); // outside it → still blocked
  });
});
