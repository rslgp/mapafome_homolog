// Pure coordinate extraction for a pin/row record.
//
// Extracted VERBATIM from App.js, where this exact IIFE was duplicated in
// handleClaimPin and persistPinPatch (DRY — v5 § Agile-PPP P2 needless_repetition).
// As of P10, the four near-identical per-file copies — ReporterMarkers.getCoords,
// ContextBar.extractCoords, ListView.coordsOf, PinDetailSheet.coordsOf — all import
// THIS function instead of re-declaring it (rule_of_three well past satisfied).
//
// PURE: a function of `pin` only — reads no `this`, no module/global state, no
// side effects. Behavior-preserving contract (must match the original IIFE
// exactly so callers see an identical value, including reference identity):
//   1. If pin.mapCoords is a length-2 array, return that SAME array reference.
//   2. Else if pin.Coordinates is truthy and parses as JSON, return the parsed
//      value (whatever JSON.parse yields — caller already relied on this).
//   3. Else (missing, falsy, or JSON.parse throws), return null.
//
// NULL-SAFE on the record itself: a null/undefined `pin` returns null rather
// than throwing. This is a STRICT SUPERSET of the original App.js IIFE — for
// every non-null record the output (and reference identity) is byte-identical;
// the only added behavior is null-in → null-out. No existing App.js caller
// passes a null pin, so no observable behavior changes there. The optional
// chaining matches what ListView/PinDetailSheet already relied on (they guarded
// `row?.mapCoords` / `row?.Coordinates`), and is a no-op superset for the
// non-optional-chaining callers (ReporterMarkers/ContextBar) since their rows
// are always real objects.

export function coordsFromPin(pin) {
    if (Array.isArray(pin?.mapCoords) && pin.mapCoords.length === 2) return pin.mapCoords;
    try { if (pin?.Coordinates) return JSON.parse(pin.Coordinates); } catch (_e) {}
    return null;
}
