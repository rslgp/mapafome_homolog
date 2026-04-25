// VM10 — Telefone value object.
//
// Encapsulates BR phone normalization, validation, encryption-in-place,
// and wa.me deep-link generation. Replaces the scattered logic in
// App.handleChangeTelefone, PopupContent rendering, and the wa.me link
// builders.
//
// ADDITIVE — existing string telefones still work; consumers migrate
// at their own pace. Pair with bugfixes.yaml B15.

const BR_PHONE_LEN = new Set([10, 11]);

export class Telefone {
    constructor(digits) {
        if (typeof digits !== 'string') {
            throw new TypeError('Telefone: digits must be a string');
        }
        const stripped = digits.replace(/\D/g, '');
        const noCountry = stripped.startsWith('55') && stripped.length > 11
            ? stripped.slice(2)
            : stripped;
        if (!BR_PHONE_LEN.has(noCountry.length)) {
            throw new TypeError(`Telefone: expected 10 or 11 BR digits, got ${noCountry.length}`);
        }
        Object.defineProperty(this, 'digits', { value: noCountry, writable: false, enumerable: true });
        Object.freeze(this);
    }

    static tryParse(input) {
        try { return new Telefone(input); }
        catch (_e) { return null; }
    }

    isMobile() { return this.digits.length === 11; }
    ddd() { return this.digits.slice(0, 2); }
    body() { return this.digits.slice(2); }

    toString() { return this.digits; }
    toJSON() { return this.digits; }

    waMeUrl() { return `https://wa.me/55${this.digits}`; }

    formattedBR() {
        const ddd = this.ddd();
        const rest = this.body();
        if (this.isMobile()) {
            return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
        }
        return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
}
