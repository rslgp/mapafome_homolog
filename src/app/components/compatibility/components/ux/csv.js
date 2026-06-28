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

// Serialize a matrix of rows (the first row being the header) into an RFC-4180
// CSV string. Each cell is escaped via csvEsc, cells are comma-joined, rows are
// newline-joined. Extracted from the byte-identical
// `rows.map((r) => r.map(esc).join(',')).join('\n')` tail repeated by every
// toCsv* serializer in reports.js / marketingReports.js (SOT/DRY): one
// serialization rule, one home.
export function toCsv(rows) {
  return rows.map((r) => r.map(csvEsc).join(',')).join('\n');
}
