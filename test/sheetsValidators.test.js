// Tests for VM6 input barricade in sheetsClient.

import { describe, it, expect } from 'vitest';
import {
    SheetsValidationError,
    validateCoordinatePair,
    validateRating,
    validateTelefoneBR,
    validatePinPayload,
} from '../src/app/components/compatibility/components/googlesheets/sheetsClient.js';

describe('validateCoordinatePair', () => {
    it('accepts a valid Brazil coord', () => {
        expect(validateCoordinatePair([-7.1, -34.8])).toEqual([-7.1, -34.8]);
    });
    it('rejects non-array', () => {
        expect(() => validateCoordinatePair('foo')).toThrow(SheetsValidationError);
    });
    it('rejects NaN', () => {
        expect(() => validateCoordinatePair([NaN, -34.8])).toThrow(SheetsValidationError);
    });
    it('rejects coord outside BR bbox', () => {
        expect(() => validateCoordinatePair([0, 0])).toThrow(/outside Brazil bbox/);
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
        expect(() => validatePinPayload({ Coordinates: '[0,0]' })).toThrow(/outside Brazil/);
    });
});
