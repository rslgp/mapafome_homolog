// geofenceVeto.test.js — the INDEPENDENT-VETO publish rule (RED spec, TDD step 1).
//
// THE LOCKED RULE (the user's decision: "each signal vetoes independently"):
// A map click / publish is ALLOWED ONLY IF the pin is inside EVERY enabled, KNOWN
// location signal's country. There are two signals — GPS-physical country and
// IP-derived country — and each is an independent GATE:
//   • IP known and pin OUTSIDE it           → BLOCK (veto by IP).
//   • GPS known and pin OUTSIDE it          → BLOCK (veto by location).
//   • BOTH known and pin outside either     → BLOCK (veto by either / by both).
//   • ALLOWED iff pin is inside the GPS country AND inside the IP country (both known).
//   • At least ONE signal must be KNOWN and must BIND the pin — NO signal known → BLOCK
//     (fail-CLOSED).
//   • IP flag OFF (ipEnabled=false): only the GPS signal governs — IP is NOT consulted.
//   • GPS unknown but IP known (ipEnabled): the IP signal ALONE governs (GPS-denied
//     fallback) — inside IP → allow.
//
// This is STRICTER than the single-binding rule in decidePublishAllowed: when GPS and
// IP both resolve to a KNOWN country they AGREE (same country), so inside-both ==
// inside-one and the agree case is unchanged. The veto framing makes each signal its
// own gate and is the behavior specified here.
//
// CONTRACT of the NOT-YET-IMPLEMENTED function this file specifies (it does NOT exist
// in geofenceDecision.js yet, so this suite MUST fail to run — that is the RED state):
//   isClickAllowed({ pin, physical, ip, ipEnabled, isInside }) → boolean
//     - pin       = [lat, lng].
//     - physical  = GPS-physical country (lowercase alpha-2) or null/undefined.
//     - ip        = IP-derived country (lowercase alpha-2) or null/undefined.
//     - ipEnabled = is the IP sub-check ON? When false, ip is IGNORED entirely.
//     - isInside  = optional injectable inside-country predicate (defaults to the real
//                   isInsideCountry); lets a test drive exact logic without bounds.
//     - returns true ONLY IF every enabled, KNOWN signal's country contains the pin,
//       AND at least one signal bound the pin.
//
// NO NETWORK / NO REACT: the real isInsideCountry + the REAL publish boxes give "inside
// the country" its real geometry; a stubbed isInside pins the exact AND/veto logic.

import { describe, it, expect } from 'vitest';

// isClickAllowed is the NEW export under test — intentionally not implemented yet, so
// this import resolves to `undefined` and every call below throws (RED).
import { isClickAllowed } from
  '../src/app/components/compatibility/components/geofenceDecision.js';
import { isInsideCountry } from
  '../src/app/components/compatibility/components/countries.js';

// ── REAL coordinates against the REAL publish boxes ──
const SP_BR = [-23.55, -46.63];    // São Paulo — INSIDE br, OUTSIDE us, OUTSIDE es.
const NYC_US = [40.71, -74.0];     // New York  — INSIDE us, OUTSIDE br, OUTSIDE es.
const MADRID_ES = [40.42, -3.70];  // Madrid    — INSIDE es, OUTSIDE br, OUTSIDE us.

// ── A stub predicate to pin the EXACT veto/AND logic, free of real rectangles ──
// Returns true only for the exact sentinel coords [1, 1], regardless of country code.
const stubInside = (coords) =>
  Array.isArray(coords) && coords[0] === 1 && coords[1] === 1;
const STUB_IN = [1, 1];   // stubInside → true for any country
const STUB_OUT = [9, 9];  // stubInside → false for any country

describe('isClickAllowed — (a) BLOCK BY IP ALONE (GPS unknown, IP governs via fallback)', () => {
  // Clause: "GPS unknown but IP known (ipEnabled): the IP signal alone governs."
  // So only the IP country's box may veto, and it does.
  it('ipEnabled, physical=null, ip=br, pin=NYC_US → false (veto by IP: outside br)', () => {
    expect(isClickAllowed({ pin: NYC_US, physical: null, ip: 'br', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
  });

  it('ipEnabled, physical=null, ip=br, pin=SP_BR → true (inside the IP country, GPS-denied fallback)', () => {
    expect(isClickAllowed({ pin: SP_BR, physical: null, ip: 'br', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(true);
  });

  it('the GPS-denied fallback also accepts undefined physical (treated as unknown)', () => {
    expect(isClickAllowed({ pin: SP_BR, physical: undefined, ip: 'br', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(true);
    expect(isClickAllowed({ pin: NYC_US, physical: undefined, ip: 'br', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
  });
});

describe('isClickAllowed — (b) BLOCK BY LOCATION ALONE (IP off, GPS governs)', () => {
  // Clause: "IP flag OFF (ipEnabled=false): only the GPS signal governs."
  it('ipEnabled=false, physical=br, pin=NYC_US → false (veto by location: outside br)', () => {
    expect(isClickAllowed({ pin: NYC_US, physical: 'br', ip: null, ipEnabled: false, isInside: isInsideCountry }))
      .toBe(false);
  });

  it('ipEnabled=false, physical=br, pin=SP_BR → true (inside the GPS country)', () => {
    expect(isClickAllowed({ pin: SP_BR, physical: 'br', ip: null, ipEnabled: false, isInside: isInsideCountry }))
      .toBe(true);
  });
});

describe('isClickAllowed — (c) BLOCK BY BOTH / EITHER (both known, ipEnabled)', () => {
  // Clause: "BOTH known and pin outside either (or both) → BLOCK."
  const base = { physical: 'br', ip: 'br', ipEnabled: true, isInside: isInsideCountry };

  it('both=br, pin=NYC_US → false (outside both br boxes — veto by either)', () => {
    expect(isClickAllowed({ ...base, pin: NYC_US })).toBe(false);
  });

  it('both=br, pin=SP_BR → true (inside both — the agree case, unchanged)', () => {
    expect(isClickAllowed({ ...base, pin: SP_BR })).toBe(true);
  });

  it('both=br, pin=MADRID_ES → false (agree-but-outside: Madrid is not in the br box)', () => {
    expect(isClickAllowed({ ...base, pin: MADRID_ES })).toBe(false);
  });
});

describe('isClickAllowed — (d) ALLOW ONLY INSIDE (the both-known set has ONE allow)', () => {
  // Clause: "ALLOWED iff the pin is inside the GPS country AND inside the IP country."
  // Across the both-known='br' set, the ONLY pin that is inside both is SP_BR.
  const base = { physical: 'br', ip: 'br', ipEnabled: true, isInside: isInsideCountry };

  it('pin=SP_BR is the ONLY allow; every foreign pin in the set is blocked', () => {
    expect(isClickAllowed({ ...base, pin: SP_BR })).toBe(true);   // inside both → allow
    expect(isClickAllowed({ ...base, pin: NYC_US })).toBe(false); // outside both → block
    expect(isClickAllowed({ ...base, pin: MADRID_ES })).toBe(false); // outside both → block
  });
});

describe('isClickAllowed — (e) FAIL-CLOSED (no signal known → BLOCK for ANY pin)', () => {
  // Clause: "At least one signal must be KNOWN and must BIND the pin — if NO signal is
  // known, BLOCK (fail-closed)."
  it('physical=null, ip=null, ipEnabled → false regardless of where the pin is', () => {
    expect(isClickAllowed({ pin: SP_BR, physical: null, ip: null, ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
    expect(isClickAllowed({ pin: NYC_US, physical: null, ip: null, ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
    expect(isClickAllowed({ pin: MADRID_ES, physical: null, ip: null, ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
  });

  it('also fail-closed via the stub: both unknown → false even at the stub-inside point', () => {
    expect(isClickAllowed({ pin: STUB_IN, physical: null, ip: null, ipEnabled: true, isInside: stubInside }))
      .toBe(false);
  });
});

describe('isClickAllowed — (f) DISAGREEMENT still BLOCKS (no pin can be inside both)', () => {
  // Clause: "BOTH known and pin outside either → BLOCK." When GPS=br and IP=us, a pin
  // cannot be inside both br AND us, so EVERY pin is vetoed by one signal or the other.
  it('physical=br, ip=us, pin=SP_BR → false (veto by the us signal: SP is outside us)', () => {
    expect(isClickAllowed({ pin: SP_BR, physical: 'br', ip: 'us', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
  });

  it('physical=br, ip=us, pin=NYC_US → false (veto by the br signal: NYC is outside br)', () => {
    expect(isClickAllowed({ pin: NYC_US, physical: 'br', ip: 'us', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
  });

  it('symmetric: physical=us, ip=br blocks both SP_BR and NYC_US too', () => {
    expect(isClickAllowed({ pin: SP_BR, physical: 'us', ip: 'br', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
    expect(isClickAllowed({ pin: NYC_US, physical: 'us', ip: 'br', ipEnabled: true, isInside: isInsideCountry }))
      .toBe(false);
  });
});

describe('isClickAllowed — (g) IP-OFF path: ip is IGNORED entirely; GPS governs alone', () => {
  // Clause: "IP flag OFF (ipEnabled=false): only the GPS signal governs (the IP signal
  // is not consulted)." The ip value — even a contradictory one — must not matter.
  it('ipEnabled=false, physical=br → SP_BR true / NYC_US false regardless of the ip value', () => {
    for (const ip of ['us', 'br', null, undefined, 'zz']) {
      expect(isClickAllowed({ pin: SP_BR, physical: 'br', ip, ipEnabled: false, isInside: isInsideCountry }))
        .toBe(true);
      expect(isClickAllowed({ pin: NYC_US, physical: 'br', ip, ipEnabled: false, isInside: isInsideCountry }))
        .toBe(false);
    }
  });

  it('ipEnabled=false, physical=null → false (no GPS signal to bind → fail-closed)', () => {
    expect(isClickAllowed({ pin: SP_BR, physical: null, ip: 'br', ipEnabled: false, isInside: isInsideCountry }))
      .toBe(false);
  });
});

describe('isClickAllowed — exact AND/veto logic via an injected stub predicate', () => {
  // These nail the pure combinator independent of any real rectangle: with both signals
  // KNOWN (ipEnabled), allow IFF the stub says the pin is inside (and since both bind the
  // SAME stub point, "inside both" collapses to the single stub-inside check).
  it('both known + stub-inside point → true; stub-outside point → false', () => {
    expect(isClickAllowed({ pin: STUB_IN, physical: 'br', ip: 'br', ipEnabled: true, isInside: stubInside }))
      .toBe(true);
    expect(isClickAllowed({ pin: STUB_OUT, physical: 'br', ip: 'br', ipEnabled: true, isInside: stubInside }))
      .toBe(false);
  });

  it('IP unknown while GPS known (ipEnabled) does NOT block by itself — GPS binds the pin', () => {
    // The IP signal is UNKNOWN (null), so it cannot veto; the GPS signal is known and
    // binds the pin. inside (stub) → allow.
    expect(isClickAllowed({ pin: STUB_IN, physical: 'br', ip: null, ipEnabled: true, isInside: stubInside }))
      .toBe(true);
    expect(isClickAllowed({ pin: STUB_OUT, physical: 'br', ip: null, ipEnabled: true, isInside: stubInside }))
      .toBe(false);
  });
});
