// petMapLoadState.test.js — PET-M20: the pure SOT behind the three map-load
// states + the one-time first-run hint flag + the closure pin identity.
//
// These are PURE / window-guarded helpers (the rendering lives in the
// presentational components, tested separately) — the DECISION logic and the
// localStorage flag are what this milestone adds and must gate. Covers the
// acceptance lines:
//   • loading/error/empty/ready are DISTINCT and precedence-ordered;
//   • the empty state triggers at count 0 (composes with the M7/M12 filtered count);
//   • the first-run flag shows ONCE then is dismissed (localStorage round-trip);
//   • resolveClosurePin reuses petCoordsKey (M18) to locate the just-dropped pin.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PET_MAP_LOAD_STATE,
  mapLoadState,
  readFirstRunHintSeen,
  markFirstRunHintSeen,
  resolveClosurePin,
  PET_FIRST_RUN_HINT_KEY,
} from './petMapLoadState';
import { petCoordsKey } from './petDomain';

describe('mapLoadState — estado DERIVADO de carga (distinto e ordenado)', () => {
  it('LOADING enquanto o fetch está em voo e nada chegou', () => {
    expect(mapLoadState({ loading: true, error: null, count: 0 }))
      .toBe(PET_MAP_LOAD_STATE.LOADING);
  });

  it('EMPTY quando a carga terminou com zero pets visíveis (count===0)', () => {
    expect(mapLoadState({ loading: false, error: null, count: 0 }))
      .toBe(PET_MAP_LOAD_STATE.EMPTY);
  });

  it('READY com pelo menos um pet visível', () => {
    expect(mapLoadState({ loading: false, error: null, count: 3 }))
      .toBe(PET_MAP_LOAD_STATE.READY);
  });

  it('ERROR vence tudo: uma falha de fetch manda mesmo com loading/count', () => {
    expect(mapLoadState({ loading: true, error: 'boom', count: 5 }))
      .toBe(PET_MAP_LOAD_STATE.ERROR);
    expect(mapLoadState({ loading: false, error: 'boom', count: 0 }))
      .toBe(PET_MAP_LOAD_STATE.ERROR);
  });

  it('os quatro estados são DISTINTOS entre si (acceptance: loading ≠ vazio ≠ erro)', () => {
    const loading = mapLoadState({ loading: true, error: null, count: 0 });
    const empty = mapLoadState({ loading: false, error: null, count: 0 });
    const error = mapLoadState({ loading: false, error: 'x', count: 0 });
    const ready = mapLoadState({ loading: false, error: null, count: 1 });
    expect(new Set([loading, empty, error, ready]).size).toBe(4);
  });

  it('defensivo: count não-numérico cai para vazio (degrada, não lança)', () => {
    expect(mapLoadState({ loading: false, error: null, count: undefined }))
      .toBe(PET_MAP_LOAD_STATE.EMPTY);
    expect(mapLoadState({})).toBe(PET_MAP_LOAD_STATE.EMPTY);
  });
});

describe('first-run hint flag — mostra UMA vez, depois dispensado (localStorage)', () => {
  beforeEach(() => {
    try { window.localStorage.clear(); } catch (_e) { /* noop */ }
  });
  afterEach(() => {
    try { window.localStorage.clear(); } catch (_e) { /* noop */ }
    vi.restoreAllMocks();
  });

  it('numa 1ª visita (sem flag) a dica deve aparecer: readFirstRunHintSeen()===false', () => {
    expect(readFirstRunHintSeen()).toBe(false);
  });

  it('após markFirstRunHintSeen(), a dica NÃO reaparece: readFirstRunHintSeen()===true', () => {
    markFirstRunHintSeen();
    expect(window.localStorage.getItem(PET_FIRST_RUN_HINT_KEY)).toBeTruthy();
    expect(readFirstRunHintSeen()).toBe(true);
  });

  it('localStorage indisponível (quota/privado) → false (mostra a dica, nunca lança)', () => {
    const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readFirstRunHintSeen()).toBe(false);
    spy.mockRestore();
  });

  it('markFirstRunHintSeen() engole a falha de escrita (nunca derruba a página)', () => {
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markFirstRunHintSeen()).not.toThrow();
    spy.mockRestore();
  });
});

describe('resolveClosurePin — localiza o pin recém-criado (reusa petCoordsKey do M18)', () => {
  const COORDS = [-8.0671132, -34.8766719];

  it('acha o pet recém-publicado por coords-key e devolve a mesma chave PII-free', () => {
    const justDropped = { coords: COORDS, status: 'perdido' };
    const pets = [{ coords: [-8.2, -35.0], status: 'avistado' }, justDropped];
    const pin = resolveClosurePin(COORDS, pets);
    expect(pin).not.toBeNull();
    expect(pin.coordsKey).toBe(petCoordsKey(COORDS));
    expect(pin.pet).toBe(justDropped);
    expect(pin.coords).toEqual(COORDS);
  });

  it('coords inválidas → null (degrada com calma; o fechamento não realça nada)', () => {
    expect(resolveClosurePin(null, [])).toBeNull();
    expect(resolveClosurePin([NaN, NaN], [])).toBeNull();
  });

  it('coords válidas mas pet ausente da lista → pin com pet:null (ainda recentra)', () => {
    const pin = resolveClosurePin(COORDS, []);
    expect(pin).not.toBeNull();
    expect(pin.pet).toBeNull();
    expect(pin.coordsKey).toBe(petCoordsKey(COORDS));
  });
});
