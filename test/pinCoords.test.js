// Tests for the pure coordsFromPin() extracted from App.js
// (handleClaimPin / persistPinPatch). These lock in the exact behavior of the
// original IIFE so the structural extraction is provably behavior-preserving:
// the mapCoords fast-path (incl. reference identity), the Coordinates JSON
// fallback, and the null result on missing / malformed / parse-error input.

import { describe, it, expect } from 'vitest';
import { coordsFromPin } from '../src/app/components/compatibility/domain/pinCoords.js';

describe('coordsFromPin', () => {
    it('returns mapCoords when it is a length-2 array', () => {
        const pin = { mapCoords: [-8.05, -34.9] };
        expect(coordsFromPin(pin)).toEqual([-8.05, -34.9]);
    });

    it('returns the SAME mapCoords array reference (callers rely on identity)', () => {
        const arr = [-8.05, -34.9];
        const pin = { mapCoords: arr };
        // join(',') / JSON.stringify at the call sites operate on this value;
        // the original IIFE returned the array itself, not a copy.
        expect(coordsFromPin(pin)).toBe(arr);
    });

    it('prefers mapCoords over Coordinates when both are present', () => {
        const pin = { mapCoords: [1, 2], Coordinates: '[9, 9]' };
        expect(coordsFromPin(pin)).toEqual([1, 2]);
    });

    it('ignores mapCoords when it is not exactly length 2', () => {
        expect(coordsFromPin({ mapCoords: [1, 2, 3], Coordinates: '[7, 8]' })).toEqual([7, 8]);
        expect(coordsFromPin({ mapCoords: [1], Coordinates: '[7, 8]' })).toEqual([7, 8]);
    });

    it('ignores mapCoords when it is not an array', () => {
        expect(coordsFromPin({ mapCoords: '1,2', Coordinates: '[7, 8]' })).toEqual([7, 8]);
    });

    it('falls back to parsing the Coordinates JSON string', () => {
        const pin = { Coordinates: '[-7.1, -34.8]' };
        expect(coordsFromPin(pin)).toEqual([-7.1, -34.8]);
    });

    it('returns whatever JSON.parse yields from Coordinates (no shape enforcement)', () => {
        // The original IIFE applied no validation to the parsed value; preserve that.
        expect(coordsFromPin({ Coordinates: '{"lat":1,"lng":2}' })).toEqual({ lat: 1, lng: 2 });
    });

    it('returns null when Coordinates is malformed JSON (parse throws → caught)', () => {
        expect(coordsFromPin({ Coordinates: 'not-json' })).toBeNull();
    });

    it('returns null when neither mapCoords nor Coordinates is present', () => {
        expect(coordsFromPin({})).toBeNull();
        expect(coordsFromPin({ DateISO: '2026-01-01' })).toBeNull();
    });

    it('returns null when Coordinates is an empty string (falsy → skipped)', () => {
        expect(coordsFromPin({ Coordinates: '' })).toBeNull();
    });

    // P10 — null-safety: coordsFromPin became a STRICT SUPERSET of the original
    // App.js IIFE so the ListView/PinDetailSheet sites (which guarded row?.…)
    // could adopt it without behavior change. A null/undefined record returns
    // null instead of throwing; every non-null case above is unchanged.
    it('returns null (does NOT throw) when the record is null', () => {
        expect(coordsFromPin(null)).toBeNull();
    });

    it('returns null (does NOT throw) when the record is undefined', () => {
        expect(coordsFromPin(undefined)).toBeNull();
    });
});
