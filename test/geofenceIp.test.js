// geofenceIp.test.js - IP-COUNTRY geofence (the strict-AND, fail-CLOSED rule).
//
// Covers the new pieces of "allow a mark only when BOTH the GPS-physical country AND
// the IP-derived country are the country the pin is in":
//   • decidePublishAllowed(...) - the PURE combined decision: both known + equal +
//       inside → ALLOW; countries DISAGREE → BLOCK; IP unknown → BLOCK; GPS unknown →
//       BLOCK; equal+known but pin OUTSIDE the country box → BLOCK; IP flag OFF →
//       exactly the GPS-only path (no IP considered).
//   • createIpCountryResolver({fetchIpCountry}) - resolves the IP country ONCE per
//       session, memoizes, de-dupes concurrent calls, and FAILS CLOSED to null on any
//       fetcher failure/throw. No network: the fetcher is injected.
//   • IP_GEOFENCE_ENABLED - the separate dark-ship flag defaults OFF (byte-identical
//       dark-ship), independently of LOCATION_GEOFENCE_ENABLED.
//
// NO NETWORK anywhere: every IP lookup is an injected fake. The geometry leg reuses a
// stubbed isInside predicate so the decision cases do not depend on the real bounds.

import { describe, it, expect } from 'vitest';

import { decidePublishAllowed } from
  '../src/app/components/compatibility/components/geofenceDecision.js';
import { createIpCountryResolver } from
  '../src/app/components/compatibility/components/geofenceIp.js';
import { isInsideCountry } from
  '../src/app/components/compatibility/components/countries.js';
import { LOCATION_GEOFENCE_ENABLED, IP_GEOFENCE_ENABLED } from
  '../src/app/components/compatibility/components/geofenceConfig.js';

// A stubbed inside-country predicate so the decision cases test the AND logic, not the
// real rectangles: it returns true only for the exact sentinel coords [1, 1].
const stubInside = (coords) =>
  Array.isArray(coords) && coords[0] === 1 && coords[1] === 1;
const INSIDE = [1, 1];     // stubInside → true
const OUTSIDE = [9, 9];    // stubInside → false

describe('decidePublishAllowed - strict AND, fail-CLOSED (IP leg ON)', () => {
  const base = { ipEnabled: true, isInside: stubInside, coords: INSIDE };

  it('(a) both known + EQUAL + inside → ALLOW', () => {
    expect(decidePublishAllowed({ ...base, physical: 'br', ip: 'br' })).toBe(true);
  });

  it('(b) both known but DIFFERENT (VPN / coarse IP) → BLOCK', () => {
    expect(decidePublishAllowed({ ...base, physical: 'br', ip: 'us' })).toBe(false);
    expect(decidePublishAllowed({ ...base, physical: 'us', ip: 'br' })).toBe(false);
  });

  it('(c) IP unknown (null) → BLOCK (fail-CLOSED, NOT fail-open)', () => {
    expect(decidePublishAllowed({ ...base, physical: 'br', ip: null })).toBe(false);
    expect(decidePublishAllowed({ ...base, physical: 'br', ip: undefined })).toBe(false);
  });

  it('(d) GPS-physical unknown (null) → BLOCK', () => {
    expect(decidePublishAllowed({ ...base, physical: null, ip: 'br' })).toBe(false);
    expect(decidePublishAllowed({ ...base, physical: undefined, ip: 'br' })).toBe(false);
  });

  it('(e) both known + EQUAL but pin OUTSIDE the country box → BLOCK', () => {
    expect(decidePublishAllowed({ ...base, coords: OUTSIDE, physical: 'br', ip: 'br' }))
      .toBe(false);
  });

  it('both unknown → BLOCK', () => {
    expect(decidePublishAllowed({ ...base, physical: null, ip: null })).toBe(false);
  });
});

describe('decidePublishAllowed - (f) IP flag OFF = exactly the GPS-only path', () => {
  const gps = { ipEnabled: false, isInside: stubInside, coords: INSIDE };

  it('IP OFF: allowed iff physical KNOWN && inside - IP value is IGNORED', () => {
    // ip null/garbage must NOT matter when the IP leg is off.
    expect(decidePublishAllowed({ ...gps, physical: 'br', ip: null })).toBe(true);
    expect(decidePublishAllowed({ ...gps, physical: 'br', ip: 'us' })).toBe(true);
    expect(decidePublishAllowed({ ...gps, physical: 'br' })).toBe(true);
  });

  it('IP OFF: still blocks on unknown GPS or a pin outside the country', () => {
    expect(decidePublishAllowed({ ...gps, physical: null })).toBe(false);
    expect(decidePublishAllowed({ ...gps, coords: OUTSIDE, physical: 'br' })).toBe(false);
  });

  it('IP OFF verdict equals the legacy physical-only check (real isInsideCountry)', () => {
    // Sao Paulo is inside Brazil; Madrid is not in the BR box. With the IP leg off the
    // decision must match isInsideCountry(coords, physical) for a known physical.
    const sp = [-23.55, -46.63];
    const madrid = [40.42, -3.70];
    expect(decidePublishAllowed({ ipEnabled: false, physical: 'br', coords: sp }))
      .toBe(isInsideCountry(sp, 'br'));
    expect(decidePublishAllowed({ ipEnabled: false, physical: 'br', coords: madrid }))
      .toBe(isInsideCountry(madrid, 'br'));
  });
});

describe('createIpCountryResolver - DI, memoize, fail-CLOSED to null', () => {
  it('resolves the injected IP country (lowercased alpha-2) and peeks it', async () => {
    const r = createIpCountryResolver({ fetchIpCountry: async () => 'br' });
    expect(r.peek()).toBe(undefined); // never resolved yet
    expect(await r.resolve()).toBe('br');
    expect(r.peek()).toBe('br');      // resolved, cached
  });

  it('resolves ONCE per session: the fetcher is called a single time', async () => {
    let calls = 0;
    const r = createIpCountryResolver({
      fetchIpCountry: async () => { calls += 1; return 'pt'; },
    });
    await Promise.all([r.resolve(), r.resolve(), r.resolve()]); // concurrent → 1 call
    await r.resolve();                                          // cached → still 1
    expect(calls).toBe(1);
    expect(r.peek()).toBe('pt');
  });

  it('a null fetcher result → cached null (unknown → caller blocks)', async () => {
    const r = createIpCountryResolver({ fetchIpCountry: async () => null });
    expect(await r.resolve()).toBe(null);
    expect(r.peek()).toBe(null); // resolved-but-unknown (NOT undefined)
  });

  it('a THROWING fetcher fails CLOSED to null (never propagates the throw)', async () => {
    const r = createIpCountryResolver({
      fetchIpCountry: async () => { throw new Error('network down'); },
    });
    await expect(r.resolve()).resolves.toBe(null);
    expect(r.peek()).toBe(null);
  });

  it('{ force: true } bypasses the cache for a manual retry', async () => {
    let calls = 0;
    const r = createIpCountryResolver({
      fetchIpCountry: async () => { calls += 1; return calls === 1 ? null : 'br'; },
    });
    expect(await r.resolve()).toBe(null);            // first lookup unknown
    expect(await r.resolve()).toBe(null);            // cached, no new call
    expect(await r.resolve({ force: true })).toBe('br'); // forced retry succeeds
    expect(calls).toBe(2);
  });
});

describe('IP_GEOFENCE_ENABLED - separate dark-ship flag, default OFF', () => {
  it('defaults to false (byte-identical dark-ship; no IP API call ships)', () => {
    expect(IP_GEOFENCE_ENABLED).toBe(false);
  });

  it('the GPS location flag is also OFF by default (independent of the IP flag)', () => {
    expect(LOCATION_GEOFENCE_ENABLED).toBe(false);
  });
});
