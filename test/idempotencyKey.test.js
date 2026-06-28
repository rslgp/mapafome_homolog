// Characterization of the shared publish idempotency key (SOT extracted from the
// byte-identical generators in ReportSheet.js and PetReportSheet.js).
//
// The key must be a non-empty string and unique per call so a retry/double-tap
// produces a fresh key only when intended (each call site calls it once per
// publish attempt). When crypto.randomUUID exists it is preferred; otherwise the
// timestamp+random fallback still yields distinct, non-empty keys.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { newIdempotencyKey } from '../src/app/components/compatibility/components/ux/idempotencyKey.js';

afterEach(() => { vi.restoreAllMocks(); });

describe('newIdempotencyKey', () => {
  it('returns a non-empty string', () => {
    const k = newIdempotencyKey();
    expect(typeof k).toBe('string');
    expect(k.length).toBeGreaterThan(0);
  });

  it('returns a distinct value on successive calls', () => {
    const seen = new Set(Array.from({ length: 50 }, () => newIdempotencyKey()));
    expect(seen.size).toBe(50);
  });

  it('uses crypto.randomUUID when available', () => {
    const spy = vi.spyOn(crypto, 'randomUUID');
    const k = newIdempotencyKey();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(k).toBe(spy.mock.results[0].value);
  });

  it('falls back to a timestamp+random key when randomUUID is unavailable', () => {
    // Force the `typeof crypto.randomUUID === 'function'` check to take the
    // fallback branch by removing the function, then restore it.
    const orig = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const k = newIdempotencyKey();
      expect(typeof k).toBe('string');
      expect(k.length).toBeGreaterThan(0);
      expect(k).toMatch(/^\d+-[0-9a-f]+$/);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: orig, configurable: true });
    }
  });
});
