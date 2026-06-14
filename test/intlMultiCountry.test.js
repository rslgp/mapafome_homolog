// intlMultiCountry.test.js — proves the publish geofence works for EVERY curated
// launch country, not just Brazil. This is the authoritative module-level proof
// that "marking points works in different countries": for each country in
// COUNTRY_PUBLISH_BOUNDS we assert a real in-country landmark is ACCEPTED and a
// known out-of-country / ocean point is REJECTED, through isInsideCountry — the
// exact predicate the publish gate (variaveisAmbiente.dentroLimites) calls.
//
// Complements geofence.test.js (which proves Brazil bit-for-bit + edge semantics);
// this one fans the check across the whole launch subset so adding/removing a
// country, or a bad bbox that swallows an ocean, fails loudly here.
import { describe, it, expect } from 'vitest';
import {
  isInsideCountry,
  COUNTRY_PUBLISH_BOUNDS,
} from '../src/app/components/compatibility/components/countries';

// One real, well-inside-the-mainland landmark per launch country, plus a point
// that must NOT be accepted for that country (another country's capital or open
// ocean). Coordinates are [lat, lng].
const LANDMARKS = {
  br: { name: 'São Paulo', inside: [-23.55, -46.63], outside: [40.42, -3.7] },
  pt: { name: 'Lisbon', inside: [38.72, -9.14], outside: [52.52, 13.405] },
  es: { name: 'Madrid', inside: [40.42, -3.7], outside: [-23.55, -46.63] },
  fr: { name: 'Paris', inside: [48.86, 2.35], outside: [35.0, -40.0] },
  de: { name: 'Berlin', inside: [52.52, 13.405], outside: [38.72, -9.14] },
  gb: { name: 'London', inside: [51.5074, -0.1278], outside: [48.86, 2.35] },
  ar: { name: 'Buenos Aires', inside: [-34.6, -58.38], outside: [40.42, -3.7] },
  uy: { name: 'Montevideo', inside: [-34.9, -56.16], outside: [-23.55, -46.63] },
  py: { name: 'Asunción', inside: [-25.28, -57.63], outside: [-34.6, -58.38] },
  cl: { name: 'Santiago', inside: [-33.45, -70.66], outside: [-34.6, -58.38] },
  co: { name: 'Bogotá', inside: [4.71, -74.07], outside: [-12.05, -77.04] },
  pe: { name: 'Lima', inside: [-12.05, -77.04], outside: [4.71, -74.07] },
  bo: { name: 'La Paz', inside: [-16.5, -68.15], outside: [-33.45, -70.66] },
  ca: { name: 'Toronto', inside: [43.65, -79.38], outside: [40.71, -74.01] },
  us: { name: 'Chicago', inside: [41.88, -87.63], outside: [40.42, -3.7] }, // contiguous lower-48 (Madrid ES is well outside the US bbox)
  it: { name: 'Rome', inside: [41.9, 12.5], outside: [48.86, 2.35] }, // mainland Italy (Paris FR outside)
};

describe('intl marking — every curated launch country accepts its own pins', () => {
  // Guard: the launch set should have grown well past Brazil-only (the whole
  // point of the feature). If someone reverts to br-only, this fails loudly.
  it('the publish-bounds set covers many countries, not just Brazil', () => {
    const codes = Object.keys(COUNTRY_PUBLISH_BOUNDS);
    expect(codes).toContain('br');
    expect(codes.length, 'expected a multi-country launch set').toBeGreaterThan(5);
  });

  // Every bounded country must have a landmark fixture here, or coverage silently
  // lags the data. This forces the fixture table to track COUNTRY_PUBLISH_BOUNDS.
  it('has a landmark fixture for every bounded country (no silent coverage gap)', () => {
    const bounded = Object.keys(COUNTRY_PUBLISH_BOUNDS).sort();
    const fixtured = Object.keys(LANDMARKS).sort();
    expect(fixtured).toEqual(bounded);
  });

  for (const [code, { name, inside, outside }] of Object.entries(LANDMARKS)) {
    it(`${code.toUpperCase()} (${name}): in-country ACCEPTED, outside REJECTED`, () => {
      expect(isInsideCountry(inside, code), `${name} should be inside ${code}`).toBe(true);
      expect(isInsideCountry(outside, code), `outside point should be rejected for ${code}`).toBe(
        false,
      );
    });
  }
});

describe('intl marking — a country with no publish shape is blocked (D6)', () => {
  for (const code of ['mx', 'au', 'jp', 'in', 'zz']) {
    it(`${code}: blocked when not in the launch subset`, () => {
      // A plausible in-country point for each; none should pass without bounds.
      const pts = {
        mx: [19.43, -99.13], // Mexico City
        au: [-33.87, 151.21], // Sydney
        jp: [35.68, 139.69], // Tokyo
        in: [28.61, 77.21], // New Delhi
        zz: [0, 0], // not a real country
      };
      expect(isInsideCountry(pts[code], code)).toBe(false);
    });
  }
});
