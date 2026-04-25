// Characterization tests for sponsors.js — protects the date-parsing,
// expiry, and reach-targeting logic that drives the carousel + B11 fix.

import { describe, it, expect } from 'vitest';
import { parseDate, isActiveNow, isInsideReach } from '../src/app/components/compatibility/components/ux/sponsors.js';

describe('parseDate', () => {
    it('accepts ISO YYYY-MM-DD', () => {
        expect(Number.isFinite(parseDate('2026-02-17'))).toBe(true);
    });
    it('accepts MM-DD-YYYY (US contract dates)', () => {
        expect(Number.isFinite(parseDate('02-17-2026'))).toBe(true);
    });
    it('accepts DD/MM/YYYY (BR contract dates)', () => {
        expect(Number.isFinite(parseDate('17/02/2026'))).toBe(true);
    });
    it('returns NaN for missing or malformed input (fail-open)', () => {
        expect(parseDate(undefined)).toBeNaN();
        expect(parseDate(null)).toBeNaN();
        expect(parseDate('not-a-date')).toBeNaN();
        expect(parseDate('2026-13-99')).toBeNaN();
    });
});

describe('isActiveNow', () => {
    const t = (iso) => new Date(iso).getTime();
    it('treats missing dates as evergreen', () => {
        expect(isActiveNow({})).toBe(true);
    });
    it('returns false before startsAt', () => {
        expect(isActiveNow({ startsAt: '2026-12-31' }, t('2026-01-01T00:00:00Z'))).toBe(false);
    });
    it('returns true within window', () => {
        expect(isActiveNow({ startsAt: '2026-01-01', expiresAt: '2026-12-31' }, t('2026-06-15T00:00:00Z'))).toBe(true);
    });
    it('returns false after expiresAt end-of-day', () => {
        expect(isActiveNow({ expiresAt: '2026-01-01' }, t('2026-01-02T12:00:00Z'))).toBe(false);
    });
});

describe('isInsideReach', () => {
    it('returns false when sponsor has no center/radius', () => {
        expect(isInsideReach({}, [-7.1, -34.8])).toBe(false);
    });
    it('returns false when user has no coords', () => {
        expect(isInsideReach({ center: [-7.1, -34.8], radiusKm: 5 }, null)).toBe(false);
    });
    it('returns true when user is within radius', () => {
        expect(isInsideReach({ center: [-7.1, -34.8], radiusKm: 5 }, [-7.10001, -34.80001])).toBe(true);
    });
    it('returns false when user is far outside', () => {
        expect(isInsideReach({ center: [-7.1, -34.8], radiusKm: 5 }, [-23.5, -46.6])).toBe(false);
    });
});
