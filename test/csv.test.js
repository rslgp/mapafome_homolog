// Characterization of the shared CSV field escape (P12).
//
// Pins the RFC-4180 rule the two report exporters (reports.js toCsv*, and
// marketingReports.js toCsvCampanhas) depend on after the byte-identical `esc()`
// dup was collapsed into one home (ux/csv.js). A field is quoted ONLY when it
// holds a quote, comma, or newline; embedded quotes are doubled; null/undefined
// serialize to the empty string (so a missing cell never leaks "null"/"undefined"
// into a public-interest CSV).

import { describe, it, expect } from 'vitest';
import { csvEsc, toCsv } from '../src/app/components/compatibility/components/ux/csv.js';

describe('csvEsc', () => {
  it('passes plain values through unquoted', () => {
    expect(csvEsc('joao')).toBe('joao');
    expect(csvEsc('alimento pronto')).toBe('alimento pronto');
    expect(csvEsc('2026-06')).toBe('2026-06');
  });

  it('coerces null and undefined to the empty string', () => {
    expect(csvEsc(null)).toBe('');
    expect(csvEsc(undefined)).toBe('');
  });

  it('coerces numbers and booleans via String(), including 0 and false', () => {
    expect(csvEsc(0)).toBe('0');
    expect(csvEsc(42)).toBe('42');
    expect(csvEsc(false)).toBe('false');
  });

  it('quotes a value containing a comma', () => {
    expect(csvEsc('a,b')).toBe('"a,b"');
  });

  it('quotes a value containing a newline', () => {
    expect(csvEsc('line1\nline2')).toBe('"line1\nline2"');
  });

  it('quotes and doubles an embedded double-quote', () => {
    expect(csvEsc('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvEsc('"')).toBe('""""');
  });

  it('quotes when a quote and comma co-occur', () => {
    expect(csvEsc('a,"b"')).toBe('"a,""b"""');
  });

  it('does not quote a lone single-quote or other punctuation', () => {
    expect(csvEsc("O'Brien")).toBe("O'Brien");
    expect(csvEsc('a;b|c')).toBe('a;b|c');
  });
});

// CWE-1236 / OWASP "CSV Injection": a cell that starts with =, +, -, or @ is
// evaluated as a formula when the exported CSV opens in Excel / Google Sheets /
// LibreOffice. csvEsc prefixes a single apostrophe so the cell is forced to
// literal text, and the guard composes with (runs before) the RFC-4180 quoting.
describe('csvEsc — formula-injection guard (CWE-1236)', () => {
  it('prefixes an apostrophe for each formula-trigger leading character', () => {
    expect(csvEsc('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvEsc('+1')).toBe("'+1");
    expect(csvEsc('-1+2')).toBe("'-1+2");
    expect(csvEsc('@import')).toBe("'@import");
  });

  it('neutralizes a classic exfiltration payload', () => {
    expect(csvEsc('=HYPERLINK("http://evil","x")'))
      .toBe('"\'=HYPERLINK(""http://evil"",""x"")"');
  });

  it('leaves a normal value unchanged (guard only fires on the trigger set)', () => {
    expect(csvEsc('joao')).toBe('joao');
    expect(csvEsc('2026-06')).toBe('2026-06'); // '-' only triggers when LEADING
    expect(csvEsc('a=b')).toBe('a=b'); // '=' not at the start
    expect(csvEsc("O'Brien")).toBe("O'Brien");
  });

  it('composes with RFC-4180 quoting when a guarded value also has a comma/quote', () => {
    // guard first (=a,b -> '=a,b), then quote because of the comma.
    expect(csvEsc('=a,b')).toBe('"\'=a,b"');
    // guard, then quote + double the embedded quote.
    expect(csvEsc('=a"b')).toBe('"\'=a""b"');
  });

  it('does not double-guard a value that already starts with an apostrophe', () => {
    // a leading apostrophe is not in the trigger set, so it passes through.
    expect(csvEsc("'=already")).toBe("'=already");
  });

  it('coerces then guards: a number is never a formula, a string 0/false pass through', () => {
    expect(csvEsc(0)).toBe('0');
    expect(csvEsc(-5)).toBe("'-5"); // String(-5) === '-5' starts with '-'
    expect(csvEsc(false)).toBe('false');
  });
});

describe('toCsv', () => {
  it('joins a header + data rows with comma cells and newline rows', () => {
    expect(toCsv([['a', 'b'], ['1', '2'], ['3', '4']])).toBe('a,b\n1,2\n3,4');
  });

  it('escapes each cell via csvEsc (commas, quotes, newlines)', () => {
    expect(toCsv([['name', 'note'], ['joao', 'a,b'], ['ana', 'he "said"']]))
      .toBe('name,note\njoao,"a,b"\nana,"he ""said"""');
  });

  it('coerces null/undefined/numbers per csvEsc inside a matrix', () => {
    expect(toCsv([['x', 'y'], [0, null], [false, undefined]]))
      .toBe('x,y\n0,\nfalse,');
  });

  it('serializes a header-only matrix to just the header line', () => {
    expect(toCsv([['only', 'header']])).toBe('only,header');
  });
});
