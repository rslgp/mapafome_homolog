// CSV serialization helpers — the single home of the RFC-4180 field escape.
//
// Extracted from the byte-identical `esc()` that lived in BOTH reports.js and
// marketingReports.js (P12, SOT/DRY): one fact, one home. A field is quoted only
// when it contains a quote, comma, or newline; embedded quotes are doubled.
//
// Formula-injection guard (CWE-1236 / OWASP CSV Injection): a cell whose text
// begins with `=`, `+`, `-`, or `@` is interpreted as a formula by Excel /
// Google Sheets / LibreOffice when the exported CSV is opened, so an attacker
// can smuggle `=HYPERLINK(...)` / `=cmd|...` through any reporter-controlled
// field. We neutralize it by prefixing a single apostrophe, which those apps
// strip on display while forcing the cell to be treated as literal text. The
// guard runs BEFORE the RFC-4180 quote decision (it operates on the raw value),
// so a guarded value that also contains a comma/quote/newline is still quoted
// correctly (e.g. `=a,b` -> `'=a,b` -> `"'=a,b"`).
//
// Pure (no DOM, no I/O) so it is unit-testable in isolation — see test/csv.test.js.

export function csvEsc(v) {
  let s = String(v ?? '');
  // Formula-injection guard: force text interpretation for cells that would
  // otherwise be evaluated as a formula by a spreadsheet. Additive to, and
  // ordered before, the RFC-4180 quoting below.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
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
