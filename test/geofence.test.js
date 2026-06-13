// geofence.test.js — INTL milestone M1 unit tests.
//
// Covers the M1 publish-geofence seam introduced in §4.1–§4.3:
//   • isInsideCountry(coords, code) — the PURE country-aware predicate
//       (multi-rectangle OR, strict edges, Brazil bit-for-bit equivalence to the
//       legacy two-rectangle dentroLimites, a non-BR country, the no-bounds case)
//   • activeCountryFor(flag, store) — the thin resolver (OFF → 'br', ON → store)
//   • the ARCH-3 half-state invariant: with the flag ON but pre-M2 (Layer B still
//       BR-only), isInsideCountry(coords, 'br') must equal the legacy two-rect
//       result across the M0 grid points — so no one can flip the flag between
//       M1 and M2 and land in a "A accepts, B rejects" split.
//   • the SSR / no-injection default: variaveisAmbiente.dentroLimites with NOTHING
//       wired resolves to the Brazil branch.
//
// IMPORTANT: the equivalence check uses an INDEPENDENT legacy reference predicate
// (LEGACY_DENTRO_LIMITES below, a verbatim copy of the original two-rectangle
// body) rather than the new code, so "equal to the old predicate" is a real
// comparison, not a tautology. The M0 characterization net
// (geofence.characterization.test.js) is the load-bearing freeze; this file adds
// the M1 unit + half-state coverage on top of it.

import { describe, it, expect, beforeEach } from 'vitest';

import {
  isInsideCountry,
  COUNTRY_PUBLISH_BOUNDS,
} from '../src/app/components/compatibility/components/countries.js';
import { activeCountryFor } from
  '../src/app/components/compatibility/components/geofence.js';
import envVariables, { setActiveCountryResolver } from
  '../src/app/components/compatibility/components/variaveisAmbiente.js';

// ── Independent legacy reference: the ORIGINAL two-rectangle dentroLimites body,
//    copied verbatim from variaveisAmbiente.js:9-25 BEFORE the M1 refactor. Used
//    only to prove isInsideCountry(coords, 'br') reproduces it bit-for-bit.
function LEGACY_DENTRO_LIMITES(localizacao) {
  return (
    (localizacao[0] < 2.20 && localizacao[0] > -14.09 &&
      localizacao[1] > -52.42 && localizacao[1] < -34.32)
    || (
      localizacao[0] < -14.18 && localizacao[0] > -32.66 &&
      localizacao[1] > -55.55 && localizacao[1] < -38.06)
  );
}

describe('isInsideCountry — multi-rectangle OR shape (Brazil)', () => {
  it("represents Brazil as exactly TWO rectangles", () => {
    expect(Array.isArray(COUNTRY_PUBLISH_BOUNDS.br)).toBe(true);
    expect(COUNTRY_PUBLISH_BOUNDS.br).toHaveLength(2);
  });

  it('accepts a point in rect1 (northern band) and rect2 (lower-west)', () => {
    expect(isInsideCountry([0, -45], 'br')).toBe(true); // rect1
    expect(isInsideCountry([-25, -54], 'br')).toBe(true); // rect2 western reach
  });

  it("respects each rectangle's distinct reach (the OR is not a single box)", () => {
    expect(isInsideCountry([0, -54], 'br')).toBe(false); // rect1 stops east of -52.42
    expect(isInsideCountry([-25, -36], 'br')).toBe(false); // rect2 stops west of -38.06
  });

  it('rejects the inter-rectangle latitude seam (-14.18 .. -14.09)', () => {
    // The gap a naive single-box delegation would silently close.
    expect(isInsideCountry([-14.135, -45], 'br')).toBe(false);
    expect(isInsideCountry([-14.08, -45], 'br')).toBe(true); // just into rect1
    expect(isInsideCountry([-14.19, -45], 'br')).toBe(true); // just into rect2
  });
});

describe('isInsideCountry — strict-edge semantics (on-edge is OUT)', () => {
  const EPS = 1e-4;
  const RECTS = [
    { N: 2.20, S: -14.09, W: -52.42, E: -34.32, latMid: -6, lngMid: -43 },
    { N: -14.18, S: -32.66, W: -55.55, E: -38.06, latMid: -23, lngMid: -46 },
  ];
  for (const R of RECTS) {
    it(`rejects all four corners and on-edge points for rect [${R.N},${R.S}]`, () => {
      expect(isInsideCountry([R.N, R.W], 'br')).toBe(false);
      expect(isInsideCountry([R.N, R.E], 'br')).toBe(false);
      expect(isInsideCountry([R.S, R.W], 'br')).toBe(false);
      expect(isInsideCountry([R.S, R.E], 'br')).toBe(false);
      expect(isInsideCountry([R.N, R.lngMid], 'br')).toBe(false); // on N edge
      expect(isInsideCountry([R.latMid, R.W], 'br')).toBe(false); // on W edge
    });
    it(`accepts just-inside and rejects just-outside each edge for rect [${R.N},${R.S}]`, () => {
      expect(isInsideCountry([R.N - EPS, R.lngMid], 'br')).toBe(true);
      expect(isInsideCountry([R.latMid, R.W + EPS], 'br')).toBe(true);
      expect(isInsideCountry([R.N + EPS, R.lngMid], 'br')).toBe(false);
      expect(isInsideCountry([R.latMid, R.W - EPS], 'br')).toBe(false);
    });
  }
});

describe('isInsideCountry — Brazil bit-for-bit equivalence to the legacy predicate', () => {
  // Sweep the SAME coarse 1° grid the M0 net freezes (lat +4..-34, lng -57..-33)
  // plus the named §4.0 divergence/seam points, comparing isInsideCountry('br')
  // against the INDEPENDENT legacy two-rectangle reference. ANY single mismatch
  // means the Brazil bounds representation diverged from today (dark-ship broken).
  it('matches LEGACY_DENTRO_LIMITES across the full M0 grid (975 cells)', () => {
    const mismatches = [];
    let total = 0;
    for (let lat = 4; lat >= -34; lat -= 1) {
      for (let lng = -57; lng <= -33; lng += 1) {
        total += 1;
        const a = isInsideCountry([lat, lng], 'br');
        const b = LEGACY_DENTRO_LIMITES([lat, lng]);
        if (a !== b) mismatches.push(`[${lat}, ${lng}] new=${a} legacy=${b}`);
      }
    }
    expect(total).toBe(975);
    expect(mismatches).toEqual([]);
  });

  it('matches the legacy predicate at the §4.0 divergence + seam points', () => {
    const points = [
      [-33.7, -53.4], [-4.0, -58.0], [-9.0, -72.0], [0, 0],
      [-14.135, -45], [-14.10, -45], [-14.17, -45], [-14.08, -45], [-14.19, -45],
      [-7.1, -34.8], [-23.55, -46.63],
    ];
    for (const p of points) {
      expect(isInsideCountry(p, 'br')).toBe(LEGACY_DENTRO_LIMITES(p));
    }
  });
});

describe('isInsideCountry — non-BR country + no-bounds (D6 block)', () => {
  // UPDATED for M2 (§4.4/§5 M2a): the curated launch subset now gives pt/es a
  // publish shape, so Lisbon/Madrid are ACCEPTED. The D6 "no bounds → blocked"
  // case is now exercised by a real country still OUTSIDE the launch subset.
  it('accepts a point inside a curated launch country (M2 subset)', () => {
    expect(isInsideCountry([38.72, -9.14], 'pt')).toBe(true); // Lisbon (mainland PT)
    expect(isInsideCountry([40.42, -3.70], 'es')).toBe(true); // Madrid (mainland ES)
  });

  it('returns false for a known country NOT in the launch subset (D6 block)', () => {
    // Mexico is a real ISO country but has no publish shape in the M2 launch set
    // → blocked, never "allow without clamp". Same for Australia.
    expect(isInsideCountry([19.43, -99.13], 'mx')).toBe(false); // Mexico City
    expect(isInsideCountry([-33.87, 151.21], 'au')).toBe(false); // Sydney
  });

  it('is case/whitespace tolerant on the code (Postel: liberal input form)', () => {
    expect(isInsideCountry([0, -45], 'BR')).toBe(true);
    expect(isInsideCountry([0, -45], ' br ')).toBe(true);
  });

  it('rejects malformed coords and unknown codes without throwing', () => {
    expect(isInsideCountry(null, 'br')).toBe(false);
    expect(isInsideCountry([0], 'br')).toBe(false);
    expect(isInsideCountry([0, -45], 'zz')).toBe(false);
    expect(isInsideCountry([0, -45], null)).toBe(false);
  });
});

describe('activeCountryFor(flag, store)', () => {
  const store = { getSelectedCountry: () => 'es' };

  it('OFF → always Brazil (the dark-ship default, ignores the store)', () => {
    expect(activeCountryFor(false, store)).toBe('br');
    expect(activeCountryFor(undefined, store)).toBe('br');
  });

  it('ON → the store value', () => {
    expect(activeCountryFor(true, store)).toBe('es');
  });

  it('ON but no usable store → falls back to Brazil', () => {
    expect(activeCountryFor(true, null)).toBe('br');
    expect(activeCountryFor(true, {})).toBe('br');
    expect(activeCountryFor(true, { getSelectedCountry: () => '' })).toBe('br');
  });
});

describe('ARCH-3 half-state invariant (flag ON, pre-M2: A stays BR-coherent)', () => {
  // The guard against someone flipping the flag between M1 and M2: even with the
  // flag ON, the BR predicate (Layer A keyed on 'br') must equal the legacy
  // two-rectangle result, so it never disagrees with the still-BR-only Layer B.
  it("isInsideCountry(coords, 'br') == legacy across the M0 grid (flag-independent)", () => {
    const mismatches = [];
    for (let lat = 4; lat >= -34; lat -= 1) {
      for (let lng = -57; lng <= -33; lng += 1) {
        if (isInsideCountry([lat, lng], 'br') !== LEGACY_DENTRO_LIMITES([lat, lng])) {
          mismatches.push(`[${lat}, ${lng}]`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('variaveisAmbiente.dentroLimites — injected-resolver delegation', () => {
  beforeEach(() => {
    // Reset to the default (no wiring) so each case is isolated; the production
    // default resolves to 'br' (SSR / pre-bootstrap / unit-test posture).
    setActiveCountryResolver(null);
  });

  it('with NOTHING injected resolves to the Brazil branch (SSR / pre-bootstrap)', () => {
    expect(envVariables.dentroLimites([-23.55, -46.63])).toBe(true); // SP, in rect2
    expect(envVariables.dentroLimites([40.42, -3.70])).toBe(false); // Madrid, out
  });

  it('matches the legacy two-rectangle predicate across the M0 grid (default br)', () => {
    const mismatches = [];
    for (let lat = 4; lat >= -34; lat -= 1) {
      for (let lng = -57; lng <= -33; lng += 1) {
        if (envVariables.dentroLimites([lat, lng]) !== LEGACY_DENTRO_LIMITES([lat, lng])) {
          mismatches.push(`[${lat}, ${lng}]`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('an injected resolver routes the active country (proves the seam works)', () => {
    // Wire a resolver that pretends Spain is active. Madrid would still be false
    // (no ES publish bounds pre-M2), but a BR point now follows whatever the
    // resolver returns — here we prove a non-br code flows through.
    setActiveCountryResolver(() => 'pt');
    expect(envVariables.dentroLimites([-23.55, -46.63])).toBe(false); // SP no longer BR-gated
    setActiveCountryResolver(() => 'br');
    expect(envVariables.dentroLimites([-23.55, -46.63])).toBe(true);
  });
});
