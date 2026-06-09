// CSV serialization helpers — the single home of the RFC-4180 field escape.
//
// Extracted from the byte-identical `esc()` that lived in BOTH reports.js and
// marketingReports.js (P12, SOT/DRY): one fact, one home. A field is quoted only
// when it contains a quote, comma, or newline; embedded quotes are doubled.
//
// Pure (no DOM, no I/O) so it is unit-testable in isolation — see test/csv.test.js.

export function csvEsc(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
