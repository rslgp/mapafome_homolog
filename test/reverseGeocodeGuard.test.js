// reverseGeocodeGuard.test.js — INTL milestone M4.5 (offshore-integrity guard, DATA-3).
//
// Covers the cheap client-side reverse-geocode guard (the plan's preferred minimal
// option over point-in-polygon infra) and the hand-tightened launch bboxes:
//
//   • assertPublishCountryMatches REJECTS a confident country mismatch (mock the
//     reverse-geocode to return a DIFFERENT country than selected).
//   • PASSES a match (reverse-geocode === selected country).
//   • FAILS OPEN on geocode error / timeout / HTTP error / open ocean / throttle —
//     the publish proceeds (no throw), because the bbox already gated it and this
//     is best-effort hygiene, not a hard gate (INTERNATIONAL_PLAN §1/§9/§5 M4.5).
//   • the tightened bboxes still ACCEPT a known on-land city in each launch
//     country (spot-check), and the seam stays case/whitespace tolerant.
//
// The guard hits the SAME Nominatim service the search uses (no new dependency);
// we inject a fake `fetchImpl` so these tests are deterministic, offline, fast.

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  assertPublishCountryMatches,
  reverseGeocodeCountry,
  __resetReverseGeocodeGuardForTests,
} from '../src/app/components/compatibility/components/reverseGeocodeGuard.js';
import { isInsideCountry } from
  '../src/app/components/compatibility/components/countries.js';

// A fake fetch that resolves to a Nominatim-shaped /reverse response with the
// given alpha-2 country_code (or no address, mimicking open ocean).
function okFetch(countryCode) {
  return vi.fn(async () => ({
    ok: true,
    json: async () =>
      countryCode == null
        ? { error: 'Unable to geocode' } // open ocean → no address
        : { address: { country_code: countryCode } },
  }));
}

beforeEach(() => {
  __resetReverseGeocodeGuardForTests();
});

describe('assertPublishCountryMatches — confident mismatch is REJECTED', () => {
  it('throws out_of_bounds when the pin reverse-geocodes to a different country', async () => {
    // Selected FR, but the pin is in Spain → reject.
    const fetchImpl = okFetch('es');
    await expect(
      assertPublishCountryMatches([40.42, -3.70], 'fr', { fetchImpl }),
    ).rejects.toThrow('out_of_bounds');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('attaches the geocoded + expected country to the error (for diagnostics)', async () => {
    const fetchImpl = okFetch('pt');
    let caught;
    try {
      await assertPublishCountryMatches([38.72, -9.14], 'es', { fetchImpl });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeTruthy();
    expect(caught.reason).toBe('out_of_bounds');
    expect(caught.geocodedCountry).toBe('pt');
    expect(caught.expectedCountry).toBe('es');
  });
});

describe('assertPublishCountryMatches — a match PASSES (resolves, no throw)', () => {
  it('resolves when the pin reverse-geocodes to the selected country', async () => {
    const fetchImpl = okFetch('fr');
    await expect(
      assertPublishCountryMatches([48.86, 2.35], 'fr', { fetchImpl }),
    ).resolves.toBeUndefined();
  });

  it('is case/whitespace tolerant on both the selected and geocoded codes', async () => {
    const fetchImpl = okFetch('FR'); // Nominatim sometimes returns upper-case
    await expect(
      assertPublishCountryMatches([48.86, 2.35], ' Fr ', { fetchImpl }),
    ).resolves.toBeUndefined();
  });
});

describe('assertPublishCountryMatches — FAIL OPEN (never block on a hiccup)', () => {
  it('open ocean (no country in the response) → ALLOW (cannot determine)', async () => {
    // The exact offshore case: a pin in open sea inside the country rectangle.
    // Nominatim returns no address; we cannot confidently reject, so fail open.
    const fetchImpl = okFetch(null);
    await expect(
      assertPublishCountryMatches([45.0, -2.0], 'fr', { fetchImpl }),
    ).resolves.toBeUndefined();
  });

  it('network error (fetch rejects) → ALLOW', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down'); });
    await expect(
      assertPublishCountryMatches([40.42, -3.70], 'fr', { fetchImpl }),
    ).resolves.toBeUndefined();
  });

  it('HTTP error / rate-limit (res.ok === false, e.g. 429) → ALLOW', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    await expect(
      assertPublishCountryMatches([40.42, -3.70], 'es', { fetchImpl }),
    ).resolves.toBeUndefined();
  });

  it('timeout (fetch never resolves, AbortController fires) → ALLOW', async () => {
    // fetchImpl hangs until aborted; with a tiny timeout the guard aborts and
    // fails open. We reject when the abort signal fires to mimic a real abort.
    const fetchImpl = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      if (init && init.signal) {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      }
    }));
    await expect(
      assertPublishCountryMatches([40.42, -3.70], 'es', { fetchImpl, timeoutMs: 5 }),
    ).resolves.toBeUndefined();
  });

  it('malformed JSON (json() throws) → ALLOW', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => { throw new Error('bad json'); } }));
    await expect(
      assertPublishCountryMatches([40.42, -3.70], 'es', { fetchImpl }),
    ).resolves.toBeUndefined();
  });

  it('no fetch available in the runtime → ALLOW (returns null, no throw)', async () => {
    // reverseGeocodeCountry with neither an injected fetch nor a global one.
    const orig = globalThis.fetch;
    try {
      globalThis.fetch = undefined;
      await expect(
        assertPublishCountryMatches([40.42, -3.70], 'es', {}),
      ).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('an unknown / blank selected country → ALLOW (nothing to compare against)', async () => {
    const fetchImpl = okFetch('fr');
    await expect(
      assertPublishCountryMatches([48.86, 2.35], 'zz', { fetchImpl }),
    ).resolves.toBeUndefined();
    await expect(
      assertPublishCountryMatches([48.86, 2.35], '', { fetchImpl }),
    ).resolves.toBeUndefined();
    // No network call when there is nothing to verify.
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('reverseGeocodeCountry — throttle + cache (~1 req/s, fail-open)', () => {
  it('a second call inside the ~1s window FAILS OPEN (returns null, no 2nd fetch)', async () => {
    const fetchImpl = okFetch('fr');
    let clock = 1_000_000;
    const now = () => clock;
    // 1st call goes out.
    const a = await reverseGeocodeCountry([48.86, 2.35], { fetchImpl, now });
    expect(a).toBe('fr');
    // 2nd call for a DIFFERENT pin within the window → null (throttled, allow).
    clock += 200; // still inside MIN_INTERVAL_MS
    const b = await reverseGeocodeCountry([41.90, 12.50], { fetchImpl, now });
    expect(b).toBe(null);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('caches a resolved pin so a retry does not re-hit the network', async () => {
    const fetchImpl = okFetch('es');
    let clock = 2_000_000;
    const now = () => clock;
    const first = await reverseGeocodeCountry([40.42, -3.70], { fetchImpl, now });
    expect(first).toBe('es');
    // Same pin again, even much later — served from cache, no 2nd request.
    clock += 10_000;
    const second = await reverseGeocodeCountry([40.42, -3.70], { fetchImpl, now });
    expect(second).toBe('es');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('rejects malformed coords without a network call (returns null)', async () => {
    const fetchImpl = okFetch('fr');
    expect(await reverseGeocodeCountry(null, { fetchImpl })).toBe(null);
    expect(await reverseGeocodeCountry([NaN, 1], { fetchImpl })).toBe(null);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

// ── Hand-tightened launch bboxes (M4.5 task 1) — still accept on-land cities ──
//
// The point of tightening is to admit LESS ocean while STILL accepting every
// launch country's real territory. Spot-check a known on-land city in each so a
// future over-tightening that clips the mainland fails here.
describe('tightened COUNTRY_PUBLISH_BOUNDS still accept a known on-land city', () => {
  const CITIES = [
    ['pt', [38.72, -9.14], 'Lisbon'],
    ['pt', [41.15, -8.61], 'Porto'],
    ['es', [40.42, -3.70], 'Madrid'],
    ['es', [41.39, 2.17], 'Barcelona'],
    ['es', [43.36, -8.41], 'A Coruña (NW Atlantic corner)'],
    ['fr', [48.86, 2.35], 'Paris'],
    ['fr', [48.39, -4.49], 'Brest (Brittany W tip)'],
    ['fr', [43.70, 7.27], 'Nice (Côte d\'Azur)'],
    ['de', [52.52, 13.40], 'Berlin'],
    ['de', [54.79, 9.43], 'Flensburg (far N, near the Sylt coast)'],
    ['it', [41.90, 12.50], 'Rome (mainland)'],
    ['it', [45.46, 9.19], 'Milan (mainland N)'],
    ['it', [38.12, 13.36], 'Palermo (Sicily)'],
    ['it', [39.22, 9.12], 'Cagliari (Sardinia)'],
    ['gb', [51.51, -0.13], 'London'],
    ['gb', [54.60, -5.93], 'Belfast (NI)'],
    ['gb', [55.86, -4.25], 'Glasgow'],
    ['ar', [-34.60, -58.38], 'Buenos Aires'],
    ['uy', [-34.90, -56.16], 'Montevideo'],
    ['py', [-25.30, -57.63], 'Asunción'],
    ['cl', [-33.45, -70.67], 'Santiago'],
    ['co', [4.71, -74.07], 'Bogotá'],
    ['pe', [-12.05, -77.04], 'Lima'],
    ['bo', [-16.50, -68.15], 'La Paz'],
    ['ca', [45.42, -75.70], 'Ottawa'],
    ['ca', [49.28, -123.12], 'Vancouver'],
    ['us', [40.71, -74.01], 'New York'],
    ['us', [34.05, -118.24], 'Los Angeles'],
    ['us', [47.61, -122.33], 'Seattle (Pacific NW)'],
  ];
  for (const [code, coords, label] of CITIES) {
    it(`${code.toUpperCase()} accepts ${label}`, () => {
      expect(isInsideCountry(coords, code)).toBe(true);
    });
  }
});

// Documents the RESIDUAL the bbox cannot fix (and why the reverse-geocode guard
// exists): a pin in open sea but INSIDE the country rectangle still passes the
// bbox. This is the gap M4.5's guard reduces — NOT a regression, an honest note.
describe('residual: an offshore pin inside the rectangle STILL passes the bbox', () => {
  it('a pin in the Bay of Biscay inside FR\'s rectangle is bbox-accepted (guard catches it)', () => {
    // [45, -2.5] is open sea well off the French Atlantic coast, but inside the
    // FR rectangle (lat 41.35..51.10, lng -5.15..9.66). The bbox alone cannot
    // reject it; the reverse-geocode guard is the layer that does.
    expect(isInsideCountry([45.0, -2.5], 'fr')).toBe(true);
  });
});
