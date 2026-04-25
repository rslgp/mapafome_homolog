// Tests for VM10 value objects.

import { describe, it, expect } from 'vitest';
import { Coordinates } from '../src/app/components/compatibility/domain/Coordinates.js';
import { Telefone } from '../src/app/components/compatibility/domain/Telefone.js';

describe('Coordinates', () => {
    it('constructs from numbers', () => {
        const c = new Coordinates(-7.1, -34.8);
        expect(c.lat).toBe(-7.1);
        expect(c.lng).toBe(-34.8);
    });
    it('rejects NaN', () => {
        expect(() => new Coordinates(NaN, -34.8)).toThrow(TypeError);
    });
    it('parses from JSON string', () => {
        const c = Coordinates.parse('[-7.1,-34.8]');
        expect(c.lat).toBe(-7.1);
    });
    it('isInsideBR true for João Pessoa, false for São Paulo-side ocean', () => {
        expect(new Coordinates(-7.1, -34.8).isInsideBR()).toBe(true);
        expect(new Coordinates(0, 0).isInsideBR()).toBe(false);
    });
    it('distanceKmTo Recife → João Pessoa is ~120km', () => {
        const recife = new Coordinates(-8.05, -34.9);
        const jp = new Coordinates(-7.1, -34.8);
        const km = recife.distanceKmTo(jp);
        expect(km).toBeGreaterThan(100);
        expect(km).toBeLessThan(140);
    });
    it('is frozen — cannot mutate', () => {
        const c = new Coordinates(1, 1);
        expect(() => { c.lat = 99; }).toThrow();
    });
    it('equals compares by value', () => {
        expect(new Coordinates(1, 2).equals(new Coordinates(1, 2))).toBe(true);
        expect(new Coordinates(1, 2).equals(new Coordinates(1, 3))).toBe(false);
    });
});

describe('Telefone', () => {
    it('accepts 11-digit mobile', () => {
        const t = new Telefone('83999998888');
        expect(t.isMobile()).toBe(true);
        expect(t.ddd()).toBe('83');
    });
    it('strips +55 country code', () => {
        const t = new Telefone('+5583999998888');
        expect(t.digits).toBe('83999998888');
    });
    it('formats as (DD) NNNNN-NNNN for mobile', () => {
        expect(new Telefone('83999998888').formattedBR()).toBe('(83) 99999-8888');
    });
    it('formats as (DD) NNNN-NNNN for landline', () => {
        expect(new Telefone('8332224444').formattedBR()).toBe('(83) 3222-4444');
    });
    it('builds correct wa.me URL', () => {
        expect(new Telefone('83999998888').waMeUrl()).toBe('https://wa.me/5583999998888');
    });
    it('tryParse returns null for invalid input', () => {
        expect(Telefone.tryParse('123')).toBeNull();
        expect(Telefone.tryParse('not-a-phone')).toBeNull();
    });
});
