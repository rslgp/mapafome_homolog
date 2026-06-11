// petListSort.test.js — PET-M8: helpers PUROS de distância + ordenação da lista.
//
// Cobre o contrato nomeado na acceptance do PET-M8 e na disciplina deste módulo:
//   • sortPetsForList ordena por DISTÂNCIA quando há centro GPS (mais perto antes);
//   • ordena por RECÊNCIA (mais recente antes) quando NÃO há centro;
//   • é PURO + DETERMINÍSTICO (center + nowMs injetados; sem Date.now()/geo dentro)
//     e NÃO muta a entrada (devolve um array novo);
//   • petDistanceKm devolve null quando não dá para medir (sem centro / coords
//     inválidas) — o sinal de "sem distância" que a UI renderiza como "—";
//   • NUNCA lança em lista/pet malformado (degrada com calma).
//
// Funções puras: sem mock, sem timers, sem render.

import { describe, it, expect } from 'vitest';
import { sortPetsForList, petDistanceKm } from './petDomain';

// Recife (centro padrão do app) — usado como "perto de mim" nos testes de distância.
const RECIFE = [-8.0671132, -34.8766719];
const NOW = 1_700_000_000_000;

// Fábrica de pet parseado (forma do parsePetRow) com defaults sãos.
function pet({ coords = RECIFE, status = 'perdido', dateIso = '2026-06-01T00:00:00.000Z' } = {}) {
  return { coords, status, species: 'cao', size: 'medio', dateIso };
}

describe('petDistanceKm — distância pura ao centro do usuário', () => {
  it('devolve 0 (ou ~0) quando o pet está no próprio centro', () => {
    expect(petDistanceKm(pet({ coords: RECIFE }), RECIFE)).toBeCloseTo(0, 5);
  });

  it('cresce com a distância (um ponto mais longe tem km maior)', () => {
    const near = petDistanceKm(pet({ coords: [-8.07, -34.88] }), RECIFE);
    const far = petDistanceKm(pet({ coords: [-8.20, -35.00] }), RECIFE);
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });

  it('devolve null sem centro ou com coords inválidas (sinal de "sem distância")', () => {
    expect(petDistanceKm(pet(), null)).toBeNull();
    expect(petDistanceKm(pet(), [Number.NaN, -34])).toBeNull();
    expect(petDistanceKm({ coords: null }, RECIFE)).toBeNull();
    expect(petDistanceKm({}, RECIFE)).toBeNull();
    expect(petDistanceKm(null, RECIFE)).toBeNull();
  });
});

describe('sortPetsForList — distância (com GPS) senão recência', () => {
  it('com centro GPS, ordena por DISTÂNCIA (mais perto primeiro)', () => {
    const far = pet({ coords: [-8.30, -35.10], dateIso: '2026-06-10T00:00:00.000Z' }); // recente mas LONGE
    const near = pet({ coords: [-8.07, -34.88], dateIso: '2026-01-01T00:00:00.000Z' }); // antigo mas PERTO
    const out = sortPetsForList([far, near], RECIFE, NOW);
    // Perto vem primeiro APESAR de ser mais antigo — a distância manda com GPS.
    expect(out[0]).toBe(near);
    expect(out[1]).toBe(far);
  });

  it('SEM centro GPS, ordena por RECÊNCIA (mais recente primeiro)', () => {
    const old = pet({ dateIso: '2026-01-01T00:00:00.000Z' });
    const recent = pet({ dateIso: '2026-06-10T00:00:00.000Z' });
    // center null → cai na recência, independentemente das coords.
    const out = sortPetsForList([old, recent], null, NOW);
    expect(out[0]).toBe(recent);
    expect(out[1]).toBe(old);
  });

  it('empate de distância desempata por recência (mais recente antes)', () => {
    const sameCoords = [-8.10, -34.90];
    const old = pet({ coords: sameCoords, dateIso: '2026-01-01T00:00:00.000Z' });
    const recent = pet({ coords: sameCoords, dateIso: '2026-06-10T00:00:00.000Z' });
    const out = sortPetsForList([old, recent], RECIFE, NOW);
    expect(out[0]).toBe(recent);
    expect(out[1]).toBe(old);
  });

  it('é PURO: não muta a lista de entrada (devolve um array novo)', () => {
    const a = pet({ coords: [-8.30, -35.10] });
    const b = pet({ coords: [-8.07, -34.88] });
    const input = [a, b];
    const out = sortPetsForList(input, RECIFE, NOW);
    expect(out).not.toBe(input);          // array novo
    expect(input).toEqual([a, b]);        // ordem original intacta
  });

  it('NUNCA lança em entrada malformada (degrada com calma)', () => {
    expect(sortPetsForList(null, RECIFE, NOW)).toEqual([]);
    expect(sortPetsForList(undefined, null, NOW)).toEqual([]);
    // Pets-lixo com a recência ausente afundam, mas não derrubam o sort.
    const good = pet({ dateIso: '2026-06-10T00:00:00.000Z' });
    const junk = { coords: null };
    const out = sortPetsForList([junk, good], null, NOW);
    expect(out[0]).toBe(good); // o bom (com data) sobe; o lixo (sem data) afunda
    expect(out).toContain(junk);
  });
});
