// Tests for VM6 input barricade in sheetsClient.

import { describe, it, expect } from 'vitest';
import {
    SheetsValidationError,
    OUT_OF_COUNTRY_BBOX,
    validateCoordinatePair,
    validateRating,
    validateTelefoneBR,
    validatePinPayload,
} from '../src/app/components/compatibility/components/googlesheets/sheetsClient.js';

describe('validateCoordinatePair', () => {
    // INTL M2 (§4.4/§4.6): the barricade now routes through the publish geofence
    // SOT (isInsideCountry over countries.COUNTRY_PUBLISH_BOUNDS) instead of a
    // local BR_BBOX literal. `code` defaults to 'br'. INTL M3 (R4): the rejection
    // `reason` is now the STABLE CODE OUT_OF_COUNTRY_BBOX (country-neutral), no
    // longer the literal 'outside Brazil bbox' — the four consumers were renamed
    // together (grep) so the coupling is a code, not a string.
    it('accepts a valid Brazil coord (default code br)', () => {
        // João Pessoa-ish: inside Brazil rect1 of the two-rectangle publish shape.
        expect(validateCoordinatePair([-7.1, -34.8])).toEqual([-7.1, -34.8]);
    });
    it('rejects non-array', () => {
        expect(() => validateCoordinatePair('foo')).toThrow(SheetsValidationError);
    });
    it('rejects NaN', () => {
        expect(() => validateCoordinatePair([NaN, -34.8])).toThrow(SheetsValidationError);
    });
    it('rejects coord outside BR bbox', () => {
        expect(() => validateCoordinatePair([0, 0])).toThrow(new RegExp(OUT_OF_COUNTRY_BBOX));
    });
    it('PARSE-1: does NOT drop a legitimate ZERO component', () => {
        // [0, -45] has a 0 lat that is a REAL, in-Brazil coordinate (rect1). The
        // barricade must gate on Number.isFinite + isInsideCountry, never on
        // truthiness, so a 0 is accepted, not treated as missing/falsy.
        expect(validateCoordinatePair([0, -45])).toEqual([0, -45]);
    });
    it('threads an explicit country code (es accepts Madrid, br rejects it)', () => {
        // Madrid is inside Spain's launch box but outside Brazil — proves `code`
        // is honored, not hard-pinned to Brazil.
        expect(validateCoordinatePair([40.42, -3.70], 'Coordinates', 'es'))
            .toEqual([40.42, -3.70]);
        expect(() => validateCoordinatePair([40.42, -3.70], 'Coordinates', 'br'))
            .toThrow(new RegExp(OUT_OF_COUNTRY_BBOX));
    });
});

describe('validateRating', () => {
    it('accepts 1 through 5', () => {
        for (let i = 1; i <= 5; i++) expect(validateRating(i)).toBe(i);
    });
    it('rejects 0 and 6', () => {
        expect(() => validateRating(0)).toThrow(SheetsValidationError);
        expect(() => validateRating(6)).toThrow(SheetsValidationError);
    });
    it('rejects fractional', () => {
        expect(() => validateRating(3.5)).toThrow(SheetsValidationError);
    });
});

describe('validateTelefoneBR', () => {
    it('accepts 11-digit mobile', () => {
        expect(validateTelefoneBR('83999998888')).toBe('83999998888');
    });
    it('strips +55 prefix on 13 digits', () => {
        expect(validateTelefoneBR('+5583999998888')).toBe('83999998888');
    });
    it('rejects too short', () => {
        expect(() => validateTelefoneBR('123')).toThrow(SheetsValidationError);
    });
    it('rejects too long (after strip)', () => {
        expect(() => validateTelefoneBR('+1234567890123456')).toThrow(SheetsValidationError);
    });
});

describe('validatePinPayload', () => {
    it('accepts a minimal valid payload', () => {
        const payload = { Coordinates: '[-7.1,-34.8]', Categorias: ['comida'] };
        expect(validatePinPayload(payload)).toBe(payload);
    });
    it('rejects non-object', () => {
        expect(() => validatePinPayload(null)).toThrow(SheetsValidationError);
    });
    it('rejects payload with bad coords', () => {
        expect(() => validatePinPayload({ Coordinates: '[0,0]' })).toThrow(new RegExp(OUT_OF_COUNTRY_BBOX));
    });
    it('PARSE-1: a payload whose parsed coord has a 0 component is NOT dropped', () => {
        const payload = { Coordinates: '[0,-45]' };
        expect(validatePinPayload(payload)).toBe(payload);
    });
    it('threads code into the coordinate barricade', () => {
        const payload = { Coordinates: '[40.42,-3.70]' };
        // With code 'es' Madrid passes; with the default 'br' it would not.
        expect(validatePinPayload(payload, 'es')).toBe(payload);
        expect(() => validatePinPayload({ Coordinates: '[40.42,-3.70]' }))
            .toThrow(new RegExp(OUT_OF_COUNTRY_BBOX));
    });
});
