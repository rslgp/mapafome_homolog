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
