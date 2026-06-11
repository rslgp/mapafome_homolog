// Tests for the PET-M7 domain filter layer (pure, deterministic predicate).
//
// Mirrors the project test idiom (test/domain.test.js / sheetsValidators.test.js):
// vitest describe/it/expect, no Date.now() anywhere — recency is exercised with a
// FIXED injected nowMs and FIXED dateIso strings so the boundary is deterministic.
//
// Co-located at src/app/pets/ — discovered by vitest's include glob
// 'src/**/*.test.{js,jsx,mjs}'. (src/app/pets is NOT yet in coverage.include; that
// is PET-M5's job — placing the test here just makes it run.)

import { describe, it, expect } from 'vitest';
import {
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  PET_RECENCY_OPTIONS,
  RECENCY_MAP,
  defaultPetFilter,
  normalizeText,
  matchesPetFilter,
  filterPets,
} from './petDomain.js';

// A fixed "now" so every recency assertion is deterministic.
const NOW = Date.parse('2026-06-11T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

// Helper: a well-formed pet with overridable fields.
function pet(overrides) {
  return {
    coords: [-7.1, -34.8],
    status: 'perdido',
    species: 'cao',
    size: 'medio',
    color: 'Caramelo',
    name: 'Rex',
    contact: '',
    detail: '',
    photos: '',
    dateIso: '2026-06-10T12:00:00.000Z', // 1 day before NOW
    ...overrides,
  };
}

describe('defaultPetFilter', () => {
  it('returns the stable empty-filter shape', () => {
    expect(defaultPetFilter()).toEqual({
      statuses: [],
      species: [],
      sizes: [],
      color: '',
      recencyDays: null,
    });
  });
  it('is a factory — returns a fresh object each call (no shared singleton)', () => {
    const a = defaultPetFilter();
    const b = defaultPetFilter();
    expect(a).not.toBe(b);
    a.statuses.push('perdido');
    expect(b.statuses).toEqual([]); // mutating one never leaks into another
  });
});

describe('PET_RECENCY_OPTIONS / RECENCY_MAP (recency SOT)', () => {
  it('days is the source of truth and ids index into the map', () => {
    for (const opt of PET_RECENCY_OPTIONS) {
      expect(RECENCY_MAP[opt.id]).toBe(opt);
      expect(typeof opt.days).toBe('number');
      expect(opt.days).toBeGreaterThan(0);
    }
  });
  it('exposes the 7/30/90 day windows', () => {
    expect(PET_RECENCY_OPTIONS.map((o) => o.days)).toEqual([7, 30, 90]);
  });
});

describe('normalizeText (accent + case insensitive)', () => {
  it('lowercases, trims, and strips accents', () => {
    expect(normalizeText('  Caramelo ')).toBe('caramelo');
    expect(normalizeText('Marrom claro')).toBe('marrom claro');
    expect(normalizeText('Açaí')).toBe('acai');
    expect(normalizeText('PRETO')).toBe('preto');
  });
  it('treats accented and unaccented forms as equal', () => {
    expect(normalizeText('cão')).toBe(normalizeText('cao'));
    expect(normalizeText('Atígrado')).toBe(normalizeText('atigrado'));
  });
  it('never throws on non-string / nullish input', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(123)).toBe('123');
  });
});

describe('matchesPetFilter — empty filter matches everything', () => {
  it('the default filter matches a well-formed pet', () => {
    expect(matchesPetFilter(pet(), defaultPetFilter(), NOW)).toBe(true);
  });
  it('the default filter matches even a fully malformed pet (no recency constraint)', () => {
    expect(matchesPetFilter({}, defaultPetFilter(), NOW)).toBe(true);
    expect(matchesPetFilter(null, defaultPetFilter(), NOW)).toBe(true);
    expect(matchesPetFilter(undefined, defaultPetFilter())).toBe(true);
  });
  it('a null/undefined filter behaves like the empty filter (matches all)', () => {
    expect(matchesPetFilter(pet(), null, NOW)).toBe(true);
    expect(matchesPetFilter(pet(), undefined, NOW)).toBe(true);
  });
});

describe('matchesPetFilter — single-facet narrowing (sourced from SOT)', () => {
  it('status narrows correctly', () => {
    const lost = PET_STATUSES[0].id;       // 'perdido'
    const found = PET_STATUSES[1].id;       // 'encontrado'
    const f = { ...defaultPetFilter(), statuses: [found] };
    expect(matchesPetFilter(pet({ status: found }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: lost }), f, NOW)).toBe(false);
  });
  it('species narrows correctly', () => {
    const cat = PET_SPECIES[1].id; // 'gato'
    const f = { ...defaultPetFilter(), species: [cat] };
    expect(matchesPetFilter(pet({ species: cat }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ species: 'cao' }), f, NOW)).toBe(false);
  });
  it('size narrows correctly', () => {
    const big = PET_SIZES[2].id; // 'grande'
    const f = { ...defaultPetFilter(), sizes: [big] };
    expect(matchesPetFilter(pet({ size: big }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ size: 'pequeno' }), f, NOW)).toBe(false);
  });
});

describe('matchesPetFilter — OR within a facet, AND across facets', () => {
  it('OR within a facet: any selected status passes', () => {
    const f = {
      ...defaultPetFilter(),
      statuses: [PET_STATUSES[0].id, PET_STATUSES[2].id], // perdido OR avistado
    };
    expect(matchesPetFilter(pet({ status: 'perdido' }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: 'avistado' }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: 'encontrado' }), f, NOW)).toBe(false);
  });
  it('AND across facets: all active facets must pass', () => {
    const f = {
      ...defaultPetFilter(),
      statuses: ['perdido'],
      species: ['cao'],
    };
    expect(matchesPetFilter(pet({ status: 'perdido', species: 'cao' }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: 'perdido', species: 'gato' }), f, NOW)).toBe(false);
    expect(matchesPetFilter(pet({ status: 'encontrado', species: 'cao' }), f, NOW)).toBe(false);
  });
});

describe('matchesPetFilter — color free-text (accent + case insensitive substring)', () => {
  it('caramelo matches Caramelo (case-insensitive)', () => {
    const f = { ...defaultPetFilter(), color: 'caramelo' };
    expect(matchesPetFilter(pet({ color: 'Caramelo' }), f, NOW)).toBe(true);
  });
  it('substring matches: marrom matches "Marrom claro"', () => {
    const f = { ...defaultPetFilter(), color: 'marrom' };
    expect(matchesPetFilter(pet({ color: 'Marrom claro' }), f, NOW)).toBe(true);
  });
  it('accent-insensitive: typing without accent matches an accented color', () => {
    const f = { ...defaultPetFilter(), color: 'caramelo escuro' };
    expect(matchesPetFilter(pet({ color: 'Caramelo Escûro' }), f, NOW)).toBe(true);
  });
  it('a non-matching color query excludes the pet', () => {
    const f = { ...defaultPetFilter(), color: 'preto' };
    expect(matchesPetFilter(pet({ color: 'Caramelo' }), f, NOW)).toBe(false);
  });
  it('an empty pet.color never matches a non-empty color query', () => {
    const f = { ...defaultPetFilter(), color: 'caramelo' };
    expect(matchesPetFilter(pet({ color: '' }), f, NOW)).toBe(false);
    expect(matchesPetFilter(pet({ color: undefined }), f, NOW)).toBe(false);
  });
  it('an empty color query does not restrict (matches any color)', () => {
    const f = { ...defaultPetFilter(), color: '   ' }; // whitespace-only normalizes to ''
    expect(matchesPetFilter(pet({ color: 'Caramelo' }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ color: '' }), f, NOW)).toBe(true);
  });
});

describe('matchesPetFilter — recency boundary (deterministic, injected nowMs)', () => {
  it('a pet just INSIDE the 7-day window matches', () => {
    const inside = new Date(NOW - 6 * DAY).toISOString();
    const f = { ...defaultPetFilter(), recencyDays: 7 };
    expect(matchesPetFilter(pet({ dateIso: inside }), f, NOW)).toBe(true);
  });
  it('a pet exactly AT the window edge matches (<= boundary)', () => {
    const edge = new Date(NOW - 7 * DAY).toISOString();
    const f = { ...defaultPetFilter(), recencyDays: 7 };
    expect(matchesPetFilter(pet({ dateIso: edge }), f, NOW)).toBe(true);
  });
  it('a pet just OUTSIDE the 7-day window does not match', () => {
    const outside = new Date(NOW - 8 * DAY).toISOString();
    const f = { ...defaultPetFilter(), recencyDays: 7 };
    expect(matchesPetFilter(pet({ dateIso: outside }), f, NOW)).toBe(false);
  });
  it('an old pet matches a wider window but not a narrow one', () => {
    const old = new Date(NOW - 45 * DAY).toISOString();
    expect(matchesPetFilter(pet({ dateIso: old }), { ...defaultPetFilter(), recencyDays: 90 }, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ dateIso: old }), { ...defaultPetFilter(), recencyDays: 30 }, NOW)).toBe(false);
  });
  it('a future-dated pet still matches (within the up-to-now window)', () => {
    const future = new Date(NOW + 2 * DAY).toISOString();
    const f = { ...defaultPetFilter(), recencyDays: 7 };
    expect(matchesPetFilter(pet({ dateIso: future }), f, NOW)).toBe(true);
  });
});

describe('matchesPetFilter — barricade: malformed pet never throws', () => {
  it('a pet with an unparseable dateIso fails a recency constraint (fail-closed)', () => {
    const f = { ...defaultPetFilter(), recencyDays: 30 };
    expect(() => matchesPetFilter(pet({ dateIso: 'not-a-date' }), f, NOW)).not.toThrow();
    expect(matchesPetFilter(pet({ dateIso: 'not-a-date' }), f, NOW)).toBe(false);
    expect(matchesPetFilter(pet({ dateIso: '' }), f, NOW)).toBe(false);
    expect(matchesPetFilter(pet({ dateIso: undefined }), f, NOW)).toBe(false);
  });
  it('a pet with an unparseable dateIso STILL matches when there is no recency constraint', () => {
    expect(matchesPetFilter(pet({ dateIso: 'garbage' }), defaultPetFilter(), NOW)).toBe(true);
  });
  it('a pet missing color/size/dateIso never throws and behaves by the defined defaults', () => {
    const bare = { coords: [-7.1, -34.8], status: 'perdido' };
    expect(() => matchesPetFilter(bare, defaultPetFilter(), NOW)).not.toThrow();
    expect(matchesPetFilter(bare, defaultPetFilter(), NOW)).toBe(true);
    // a size constraint excludes the bare pet (its size is absent -> '')
    expect(matchesPetFilter(bare, { ...defaultPetFilter(), sizes: ['medio'] }, NOW)).toBe(false);
    // a color constraint excludes it (no color text to match)
    expect(matchesPetFilter(bare, { ...defaultPetFilter(), color: 'preto' }, NOW)).toBe(false);
  });
  it('null / undefined / garbage pet never throws', () => {
    expect(() => matchesPetFilter(null, defaultPetFilter(), NOW)).not.toThrow();
    expect(() => matchesPetFilter(undefined, { ...defaultPetFilter(), color: 'x' }, NOW)).not.toThrow();
    expect(() => matchesPetFilter(42, { ...defaultPetFilter(), recencyDays: 7 }, NOW)).not.toThrow();
    expect(matchesPetFilter(42, { ...defaultPetFilter(), recencyDays: 7 }, NOW)).toBe(false);
  });
});

describe('filterPets — thin pure wrapper', () => {
  const pets = [
    pet({ status: 'perdido', species: 'cao', color: 'Caramelo' }),
    pet({ status: 'encontrado', species: 'gato', color: 'Preto' }),
    pet({ status: 'avistado', species: 'cao', color: 'Branco' }),
  ];

  it('returns all pets for the empty filter', () => {
    expect(filterPets(pets, defaultPetFilter(), NOW)).toHaveLength(3);
  });
  it('narrows by facet and returns a NEW array (does not mutate input)', () => {
    const f = { ...defaultPetFilter(), species: ['cao'] };
    const out = filterPets(pets, f, NOW);
    expect(out).toHaveLength(2);
    expect(out).not.toBe(pets);
    expect(pets).toHaveLength(3); // input untouched
  });
  it('combines facets (AND): cao AND color preto -> none here', () => {
    const f = { ...defaultPetFilter(), species: ['cao'], color: 'preto' };
    expect(filterPets(pets, f, NOW)).toHaveLength(0);
  });
  it('returns [] for a non-array input (barricade)', () => {
    expect(filterPets(null, defaultPetFilter(), NOW)).toEqual([]);
    expect(filterPets(undefined, defaultPetFilter(), NOW)).toEqual([]);
    expect(filterPets('nope', defaultPetFilter(), NOW)).toEqual([]);
  });
});
