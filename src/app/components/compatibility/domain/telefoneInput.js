// Pure normalization for the LIVE telefone <input> (App.handleChangeTelefone).
//
// Extracted from App.handleChangeTelefone (P10). PURE: a function of the raw
// input string only — no `this`, no module/global state, no side effects
// (the aes.encrypt() + setState() stay in the method, driven by this result).
//
// Behavior-preserving contract — must match the original method byte-for-byte:
//   1. If the RAW value (before stripping) is longer than 15 chars, the method
//      returned early with NO state change. We signal that with { tooLong: true }
//      and no other fields, so the caller can early-return identically.
//   2. Strip every non-digit: rawValue.replace(/[^0-9]/g, '').
//   3. B15 country-code strip: if the digit string is exactly 12 or 13 digits
//      AND starts with "55", drop the leading "55" (so "+5583999998888" →
//      "83999998888"). Any other length is left untouched (in-progress input).
//   4. isValidBr = digits.length === 10 || digits.length === 11 (BR landline or
//      mobile, both already including the 2-digit DDD).
//
// WHY NOT reuse domain/Telefone.js here: the Telefone value object THROWS on any
// non-10/11-digit string and strips "55" under a different rule (length > 11).
// This input handler must NOT throw mid-typing — it returns the partial digits
// plus an isValidBr flag so the field stays editable while the user types. The
// two contracts are genuinely different; reusing Telefone would regress live
// typing. Telefone remains the right tool for a COMPLETED, validated number.

export function normalizeTelefoneInput(rawValue) {
    if (rawValue.length > 15) return { tooLong: true };

    let digits = rawValue.replace(/[^0-9]/g, '');
    if (digits.length === 12 && digits.startsWith('55')) {
        digits = digits.slice(2);
    } else if (digits.length === 13 && digits.startsWith('55')) {
        digits = digits.slice(2);
    }

    const isValidBr = digits.length === 10 || digits.length === 11;
    return { tooLong: false, digits, isValidBr };
}
