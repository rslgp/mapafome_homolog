// Pure coordinate extraction for a pin/row record.
//
// Extracted VERBATIM from App.js, where this exact IIFE was duplicated in
// handleClaimPin and persistPinPatch (DRY — v5 § Agile-PPP P2 needless_repetition;
// rule_of_three already satisfied: two byte-identical copies in App.js plus
// near-identical mapCoords-only variants in ContextBar/ListView/PinDetailSheet/
// ReporterMarkers, which are intentionally left untouched here for scope/change
// isolation and could adopt this module in a separate reviewed pass).
//
// PURE: a function of `pin` only — reads no `this`, no module/global state, no
// side effects. Behavior-preserving contract (must match the original IIFE
// exactly so callers see an identical value, including reference identity):
//   1. If pin.mapCoords is a length-2 array, return that SAME array reference.
//   2. Else if pin.Coordinates is truthy and parses as JSON, return the parsed
//      value (whatever JSON.parse yields — caller already relied on this).
//   3. Else (missing, falsy, or JSON.parse throws), return null.

export function coordsFromPin(pin) {
    if (Array.isArray(pin.mapCoords) && pin.mapCoords.length === 2) return pin.mapCoords;
    try { if (pin.Coordinates) return JSON.parse(pin.Coordinates); } catch (_e) {}
    return null;
}
