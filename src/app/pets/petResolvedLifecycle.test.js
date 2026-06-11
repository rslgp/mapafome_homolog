// petResolvedLifecycle.test.js — PET-M2.
//
// Cobre o ciclo de vida "reunido" no DOMÍNIO PURO (petDomain):
//   • buildPetDados EMITE resolvedAt só quando o chamador injeta o ISO;
//   • parsePetRow faz o ROUND-TRIP do resolvedAt e deriva o booleano `resolved`;
//   • linhas ANTIGAS (sem o campo) parseiam como ATIVAS — sem regressão;
//   • LSP: um pet reunido relido da planilha === um escrito nesta sessão;
//   • isPetResolved é o discriminador SOT (resolvido vs ativo).
//
// O domínio é determinístico: o ISO é INJETADO, nunca Date.now() no corpo puro,
// então as asserções de igualdade são estáveis.

import { describe, it, expect } from 'vitest';
import {
  buildPetDados,
  parsePetRow,
  isPetResolved,
  PET_RESOLVED_AT_KEY,
  PET_KIND,
} from './petDomain';

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

// Empacota um blob Dados como a planilha o devolve: uma linha tem `.Dados`
// (JSON-string). Mesma forma que parsePetRow consome em produção.
function asRow(dados) {
  return { Dados: JSON.stringify(dados) };
}

describe('buildPetDados — emissão opcional de resolvedAt', () => {
  it('NÃO emite a chave quando resolvedAt não é fornecido (linha ativa limpa)', () => {
    const dados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    expect(PET_RESOLVED_AT_KEY in dados).toBe(false);
    expect(dados.resolvedAt).toBeUndefined();
  });

  it('emite resolvedAt quando o chamador injeta o ISO (pura — sem Date.now())', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO, resolvedAt: ISO,
    });
    expect(dados[PET_RESOLVED_AT_KEY]).toBe(ISO);
    // Determinismo: duas chamadas com o mesmo input produzem o mesmo blob.
    const again = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO, resolvedAt: ISO,
    });
    expect(again).toEqual(dados);
  });

  it('resolvedAt vazio/falsy NÃO carimba a chave (mantém a linha ativa)', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO, resolvedAt: '',
    });
    expect(PET_RESOLVED_AT_KEY in dados).toBe(false);
  });
});

describe('parsePetRow — round-trip de resolvedAt + discriminador resolved', () => {
  it('faz round-trip do resolvedAt e deriva resolved:true', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'encontrado', dateIso: ISO, resolvedAt: ISO,
    });
    const pet = parsePetRow(asRow(dados));
    expect(pet).not.toBeNull();
    expect(pet.resolvedAt).toBe(ISO);
    expect(pet.resolved).toBe(true);
    expect(isPetResolved(pet)).toBe(true);
  });

  it('um pet recém-publicado (sem resolvedAt) parseia como ATIVO', () => {
    const dados = buildPetDados({ coords: COORDS, status: 'avistado', dateIso: ISO });
    const pet = parsePetRow(asRow(dados));
    expect(pet.resolvedAt).toBeUndefined();
    expect(pet.resolved).toBe(false);
    expect(isPetResolved(pet)).toBe(false);
  });

  it('linhas ANTIGAS (escritas antes do campo existir) parseiam como ativas — sem regressão', () => {
    // Simula uma linha legada: o blob NÃO tem a chave resolvedAt (nem foi
    // construído por buildPetDados moderno). Deve ler como ativa, nunca quebrar.
    const legacy = {
      kind: PET_KIND,
      status: 'perdido',
      species: 'cao',
      Coordinates: JSON.stringify(COORDS),
      DateISO: ISO,
    };
    const pet = parsePetRow(asRow(legacy));
    expect(pet).not.toBeNull();
    expect(pet.status).toBe('perdido');
    expect(pet.resolved).toBe(false);
    expect(pet.resolvedAt).toBeUndefined();
    expect(isPetResolved(pet)).toBe(false);
  });

  it('parsePetRow nunca lança em entrada malformada (barricada de leitura intacta)', () => {
    expect(parsePetRow(null)).toBeNull();
    expect(parsePetRow({ Dados: '{ not json' })).toBeNull();
    expect(parsePetRow({ Dados: JSON.stringify({ kind: 'hunger' }) })).toBeNull();
  });
});

describe('LSP — um pet reunido relido === um escrito nesta sessão', () => {
  it('o objeto parseado de uma linha resolvida bate campo-a-campo com o construído na sessão', () => {
    // "Escrito nesta sessão": construímos o blob e derivamos a forma normalizada
    // que o publishPet devolveria mais o carimbo resolvido — mas a verdade do
    // round-trip é o que VOLTA da planilha. Comparamos o parse de volta.
    const dados = buildPetDados({
      coords: COORDS,
      status: 'encontrado',
      species: 'gato',
      size: 'pequeno',
      color: 'preto',
      name: 'Mingau',
      contact: '81999999999',
      detail: 'coleira vermelha',
      photos: 'https://exemplo.com/fotos',
      dateIso: ISO,
      resolvedAt: ISO,
    });

    const first = parsePetRow(asRow(dados));
    // "Relido após um reload": re-serializa e re-parseia a MESMA linha.
    const reloaded = parsePetRow(asRow(JSON.parse(JSON.stringify(dados))));

    // Substituível: o reunido relido é idêntico ao desta sessão (incl. resolvedAt).
    expect(reloaded).toEqual(first);
    expect(reloaded.resolved).toBe(true);
    expect(reloaded.resolvedAt).toBe(ISO);
  });
});
