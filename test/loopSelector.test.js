// Pins the loop DECIDE primitive (LP-2): the highest-tier-first selector in
// loops/selector.mjs. Confirms eligibility rules (status, report_only, depends_on)
// and ordering (tier, then dep-depth, then input order) so the loop's "what runs
// next" step is testable, not a convention. No em-dash anywhere.
import { describe, it, expect } from 'vitest';
import { selectNext, eligibleSet, isEligible } from '../loops/selector.mjs';

const shipped = (id, tier = 'A') => ({ id, tier, status: 'shipped' });
const pending = (id, tier = 'A', extra = {}) => ({ id, tier, status: 'pending', ...extra });

describe('loop selector (LP-2)', () => {
  it('picks the highest tier first (S+ over S over A over B)', () => {
    const items = [pending('a', 'B'), pending('b', 'S+'), pending('c', 'A'), pending('d', 'S')];
    expect(selectNext(items).id).toBe('b'); // S+
    expect(eligibleSet(items).map((i) => i.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('excludes report_only items (binding handoff mandate)', () => {
    const items = [pending('ro', 'S+', { report_only: true }), pending('ok', 'A')];
    expect(isEligible(items[0], new Set())).toBe(false);
    expect(selectNext(items).id).toBe('ok');
  });

  it('excludes later / shipped / blocked / design-only', () => {
    const items = [
      { id: 'l', tier: 'S+', status: 'later' },
      { id: 's', tier: 'S+', status: 'shipped' },
      { id: 'bl', tier: 'S+', status: 'blocked' },
      { id: 'd', tier: 'S+', status: 'design-only' },
      pending('go', 'B'),
    ];
    expect(eligibleSet(items).map((i) => i.id)).toEqual(['go']);
  });

  it('honors depends_on: an item is eligible only when every dep is shipped', () => {
    const blocked = [shipped('dep1'), pending('x', 'S', { depends_on: ['dep1', 'dep2'] })];
    expect(selectNext(blocked)).toBeNull(); // dep2 not shipped

    const ready = [shipped('dep1'), shipped('dep2'), pending('x', 'S', { depends_on: ['dep1', 'dep2'] })];
    expect(selectNext(ready).id).toBe('x');
  });

  it('breaks tier ties by dependency depth, then input order', () => {
    const items = [
      shipped('d1'),
      pending('deep', 'A', { depends_on: ['d1'] }), // depth 1
      pending('shallow', 'A'), // depth 0, should come first
    ];
    expect(eligibleSet(items).map((i) => i.id)).toEqual(['shallow', 'deep']);
  });

  it('returns null when the eligible set is empty (goal met)', () => {
    const items = [
      { id: 's', tier: 'S+', status: 'shipped' },
      { id: 'l', tier: 'S', status: 'later' },
      { id: 'ro', tier: 'A', status: 'pending', report_only: true },
    ];
    expect(selectNext(items)).toBeNull();
    expect(eligibleSet(items)).toEqual([]);
  });

  it('treats open the same as pending for eligibility', () => {
    const items = [{ id: 'o', tier: 'S', status: 'open' }];
    expect(selectNext(items).id).toBe('o');
  });
});
