// Tests for the pure normalizeTelefoneInput() extracted from
// App.handleChangeTelefone (P10). These lock in the exact behavior of the
// original method's pure core so the extraction is provably behavior-preserving:
//   - the raw-length > 15 early-return signal (tooLong)
//   - non-digit stripping
//   - the B15 country-code strip (only at 12/13 digits starting with "55")
//   - isValidBr (10 or 11 digits)

import { describe, it, expect } from 'vitest';
import { normalizeTelefoneInput } from '../src/app/components/compatibility/domain/telefoneInput.js';

describe('normalizeTelefoneInput', () => {
    it('signals tooLong when the RAW value exceeds 15 chars (no other fields)', () => {
        // 16 chars of formatting — original method early-returned with no state change.
        expect(normalizeTelefoneInput('1234567890123456')).toEqual({ tooLong: true });
    });

    it('allows a raw value of exactly 15 chars (boundary is > 15, not >= 15)', () => {
        // "(83) 99999-8888" is 15 chars → not tooLong; strips to 11 digits.
        const r = normalizeTelefoneInput('(83) 99999-8888');
        expect(r.tooLong).toBe(false);
        expect(r.digits).toBe('83999998888');
        expect(r.isValidBr).toBe(true);
    });

    it('strips every non-digit character', () => {
        const r = normalizeTelefoneInput('(83) 3221-4455');
        expect(r.digits).toBe('8332214455');
        expect(r.isValidBr).toBe(true); // 10 digits → landline + DDD
    });

    it('marks an 11-digit mobile as valid', () => {
        const r = normalizeTelefoneInput('83999998888');
        expect(r).toEqual({ tooLong: false, digits: '83999998888', isValidBr: true });
    });

    it('marks a 10-digit landline as valid', () => {
        const r = normalizeTelefoneInput('8332214455');
        expect(r).toEqual({ tooLong: false, digits: '8332214455', isValidBr: true });
    });

    it('B15: strips a 13-digit "+55" mobile down to 11 digits', () => {
        // "+5583999998888" → 13 digits starting 55 → "83999998888".
        const r = normalizeTelefoneInput('+5583999998888');
        expect(r.digits).toBe('83999998888');
        expect(r.isValidBr).toBe(true);
    });

    it('B15: strips a 12-digit "+55" landline down to 10 digits', () => {
        // "558332214455" → 12 digits starting 55 → "8332214455".
        const r = normalizeTelefoneInput('558332214455');
        expect(r.digits).toBe('8332214455');
        expect(r.isValidBr).toBe(true);
    });

    it('does NOT strip "55" when the digit count is not exactly 12 or 13', () => {
        // 11 digits starting with 55 is a legitimate mobile (DDD 55) — must NOT strip.
        const r = normalizeTelefoneInput('55988887777');
        expect(r.digits).toBe('55988887777');
        expect(r.isValidBr).toBe(true);
    });

    it('does NOT strip when 12/13 digits do not start with "55"', () => {
        const r = normalizeTelefoneInput('118332214455'); // 12 digits, starts "11"
        expect(r.digits).toBe('118332214455');
        expect(r.isValidBr).toBe(false); // 12 digits → not a 10/11 BR number
    });

    it('reports in-progress (short) input as not valid but still editable', () => {
        const r = normalizeTelefoneInput('8399');
        expect(r).toEqual({ tooLong: false, digits: '8399', isValidBr: false });
    });

    it('reports an empty string as zero digits, not valid', () => {
        const r = normalizeTelefoneInput('');
        expect(r).toEqual({ tooLong: false, digits: '', isValidBr: false });
    });

    it('reports an all-formatting string as zero digits', () => {
        const r = normalizeTelefoneInput('() -');
        expect(r).toEqual({ tooLong: false, digits: '', isValidBr: false });
    });
});
