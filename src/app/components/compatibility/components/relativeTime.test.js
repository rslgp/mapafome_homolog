import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './relativeTime';

// I18N-01 — the shared relative-time SOT must format in the caller's locale, not
// a frozen pt-BR. These tests pass an EXPLICIT locale (never the ambient active
// locale) so they are deterministic and don't depend on i18n global state.

// A date exactly N days before a fixed "now". We can't inject now() into
// formatRelativeTime (it reads Date.now()), so build the ISO relative to real now
// and assert on the UNIT WORD the locale produces, not the exact number.
function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('formatRelativeTime — locale-aware (I18N-01)', () => {
  it('formats in pt-BR when asked (the legacy default shape)', () => {
    const out = formatRelativeTime(isoDaysAgo(2), 'pt-BR');
    // "há 2 dias" — pt-BR uses "dia(s)" and the "há" prefix.
    expect(out).toMatch(/dia/);
    expect(out).toMatch(/2/);
  });

  it('formats the SAME instant differently in German', () => {
    const de = formatRelativeTime(isoDaysAgo(2), 'de');
    // German day unit is "Tag(en)" — must NOT be the pt-BR "dias".
    expect(de).toMatch(/Tag/);
    expect(de).not.toMatch(/dias/);
  });

  it('formats in Russian (Cyrillic day unit)', () => {
    const ru = formatRelativeTime(isoDaysAgo(3), 'ru');
    // Russian "дн." / "дня" — Cyrillic, definitely not the Latin "dias".
    expect(ru).toMatch(/[Ѐ-ӿ]/); // contains Cyrillic
    expect(ru).not.toMatch(/dias/);
  });

  it('pt-BR and de outputs for the same instant are not identical', () => {
    const iso = isoDaysAgo(5);
    expect(formatRelativeTime(iso, 'pt-BR')).not.toEqual(formatRelativeTime(iso, 'de'));
  });

  it('falls back to the default locale on a bad tag instead of throwing', () => {
    expect(() => formatRelativeTime(isoDaysAgo(1), 'not-a-locale!!')).not.toThrow();
    const out = formatRelativeTime(isoDaysAgo(1), 'not-a-locale!!');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('returns "" for missing/invalid input (contract preserved)', () => {
    expect(formatRelativeTime('', 'de')).toBe('');
    expect(formatRelativeTime(null, 'de')).toBe('');
    expect(formatRelativeTime('not-a-date', 'de')).toBe('');
  });

  it('preserves the pt-BR "semana"/"mes" substrings cleanold.js keys on', () => {
    // cleanold.js prunes rows whose pt-BR relative time includes "semana" or "mes".
    // A ~2-week-old date must still say "semana" in pt-BR so that GC keeps working.
    expect(formatRelativeTime(isoDaysAgo(14), 'pt-BR')).toMatch(/semana/);
    // ~2 months old -> "meses" (contains "mes").
    expect(formatRelativeTime(isoDaysAgo(70), 'pt-BR')).toMatch(/mes/);
  });
});
