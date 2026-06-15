// shouldApplyFilter.test.js — FILTRO_TEMPO Lane B (the time-period filter).
//
// Proves the period filter hides points OLDER than the chosen window and keeps
// points inside it, by the marker's REAL ISO date via isWithinTimeThreshold —
// the replacement for the fragile binary `dateMarked.includes("ano")` branch
// (FILTRO_TEMPO_PLAN §2.2 / §6). Coverage:
//   • each window (24h / 7d / 30d / 182d) with one point INSIDE and one OUTSIDE
//   • 'todos' (Infinity) never hides, regardless of age
//   • §7 risk: a missing OR invalid DateISO is ALWAYS visible (never vanishes
//     under a finite window)
//   • the telefoneFilter branch is intact and orthogonal to the period gate
//
// Windows come from PERIOD_OPTIONS (the SOT in mapConstants), so this test also
// pins that table: if a window changes, the inside/outside fixtures move with it.

import { describe, it, expect } from 'vitest';
import { shouldApplyFilter } from
  '../src/app/components/compatibility/components/mapUtils.js';
import { PERIOD_OPTIONS, periodMaxHoursFor } from
  '../src/app/components/compatibility/components/mapConstants.js';

const HOUR_MS = 60 * 60 * 1000;
// An ISO date `hoursAgo` hours before now. The age engine floors to whole hours,
// so we nudge by a few minutes to land cleanly inside/outside the boundary.
const isoHoursAgo = (hoursAgo) => new Date(Date.now() - hoursAgo * HOUR_MS).toISOString();

// Build the filters object the way variaveisAmbiente/App now do: a periodId
// resolved to its window in hours. telefoneFilter off unless a test sets it.
const filtersFor = (periodId, telefoneFilter = false) => ({
  telefoneFilter,
  periodMaxHours: periodMaxHoursFor(periodId),
});

// The four FINITE windows, by id (the 5th, 'todos', is tested separately).
const FINITE = PERIOD_OPTIONS.filter((o) => o.maxHours !== Infinity);

describe('shouldApplyFilter — period window (hide what is OUTSIDE the window)', () => {
  for (const opt of FINITE) {
    it(`'${opt.id}' (${opt.maxHours}h): keeps a point INSIDE, hides a point OUTSIDE`, () => {
      const filters = filtersFor(opt.id);
      // Inside: half a window old → visible (not filtered out).
      const inside = isoHoursAgo(opt.maxHours / 2);
      expect(shouldApplyFilter(filters, 'has-contact', inside)).toBe(false);
      // Outside: one full window + 1h old → hidden (filtered out).
      const outside = isoHoursAgo(opt.maxHours + 1);
      expect(shouldApplyFilter(filters, 'has-contact', outside)).toBe(true);
    });
  }

  it("'todos' (Infinity): never hides, even a very old point", () => {
    const filters = filtersFor('todos');
    const ancient = isoHoursAgo(24 * 365 * 5); // ~5 years old
    expect(shouldApplyFilter(filters, 'has-contact', ancient)).toBe(false);
  });

  it('an out-of-window point under a 24h window is hidden, but visible under 7d', () => {
    const twoDaysAgo = isoHoursAgo(48);
    expect(shouldApplyFilter(filtersFor('dia'), 'c', twoDaysAgo)).toBe(true);
    expect(shouldApplyFilter(filtersFor('semana'), 'c', twoDaysAgo)).toBe(false);
  });
});

describe('shouldApplyFilter — §7 missing/invalid DateISO is always visible', () => {
  // Under the TIGHTEST finite window, a marker with no/invalid date must NOT
  // vanish (it would, if we naively trusted isWithinTimeThreshold(NaN) === false).
  const tight = filtersFor('dia');

  it('undefined DateISO → visible', () => {
    expect(shouldApplyFilter(tight, 'c', undefined)).toBe(false);
  });
  it('empty-string DateISO → visible', () => {
    expect(shouldApplyFilter(tight, 'c', '')).toBe(false);
  });
  it('null DateISO → visible', () => {
    expect(shouldApplyFilter(tight, 'c', null)).toBe(false);
  });
  it('unparseable DateISO → visible (NaN must not hide it)', () => {
    expect(shouldApplyFilter(tight, 'c', 'not-a-date')).toBe(false);
  });
});

describe('shouldApplyFilter — telefoneFilter branch is intact + orthogonal', () => {
  it('hides a no-contact marker when telefoneFilter is on, regardless of age', () => {
    const filters = filtersFor('todos', true); // no period gate at all
    const fresh = isoHoursAgo(1);
    expect(shouldApplyFilter(filters, '', fresh)).toBe(true);   // no contact → hidden
    expect(shouldApplyFilter(filters, 'has', fresh)).toBe(false); // has contact → visible
  });

  it('telefoneFilter OFF does not hide a no-contact marker that is in-window', () => {
    const filters = filtersFor('mes', false);
    const recent = isoHoursAgo(24);
    expect(shouldApplyFilter(filters, '', recent)).toBe(false);
  });

  it('a marker can be hidden by EITHER gate (logical OR of hide conditions)', () => {
    // telefoneFilter on AND out-of-window: still hidden (both say hide).
    const filters = filtersFor('dia', true);
    const old = isoHoursAgo(48);
    expect(shouldApplyFilter(filters, '', old)).toBe(true);
  });
});
