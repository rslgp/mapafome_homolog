// petClosureReason.test.js — PET-M7b (round-trip do discriminador closureReason).
//
// Cobre o motivo de fechamento ('reunido' | 'encerrado') no DOMÍNIO PURO:
//   • buildPetDados EMITE closureReason só quando o motivo é VÁLIDO (SOT);
//   • parsePetRow faz o ROUND-TRIP e o expõe (undefined quando ativo / linha antiga);
//   • um motivo INVÁLIDO/lixo é descartado na escrita E na leitura (barricada);
//   • linhas ANTIGAS (sem a chave) parseiam sem closureReason — sem regressão;
//   • os dois desfechos carimbam resolvedAt mas são distinguíveis por closureReason.
//
// Determinístico: o ISO e o motivo são INJETADOS, nunca Date.now()/aleatório no
// corpo puro, então as asserções de igualdade são estáveis.

import { describe, it, expect } from 'vitest';
import {
  buildPetDados,
  parsePetRow,
  isValidClosureReason,
  PET_CLOSURE_REASON,
  PET_CLOSURE_REASON_KEY,
  PET_KIND,
} from './petDomain';

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

function asRow(dados) {
  return { Dados: JSON.stringify(dados) };
}

describe('isValidClosureReason — SOT dos dois motivos', () => {
  it('aceita só os ids da SOT (reunido / encerrado)', () => {
    expect(isValidClosureReason(PET_CLOSURE_REASON.REUNIDO)).toBe(true);
    expect(isValidClosureReason(PET_CLOSURE_REASON.ENCERRADO)).toBe(true);
  });

  it('rejeita qualquer valor fora da SOT (lixo / undefined / vazio)', () => {
    expect(isValidClosureReason('desistido')).toBe(false);
    expect(isValidClosureReason('')).toBe(false);
    expect(isValidClosureReason(undefined)).toBe(false);
    expect(isValidClosureReason(null)).toBe(false);
  });
});

describe('buildPetDados — emissão opcional de closureReason', () => {
  it('NÃO emite a chave quando o motivo não é fornecido (linha ativa limpa)', () => {
    const dados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    expect(PET_CLOSURE_REASON_KEY in dados).toBe(false);
  });

  it('emite o motivo quando válido (reunido)', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO,
      resolvedAt: ISO, closureReason: PET_CLOSURE_REASON.REUNIDO,
    });
    expect(dados[PET_CLOSURE_REASON_KEY]).toBe(PET_CLOSURE_REASON.REUNIDO);
  });

  it('emite o motivo quando válido (encerrado)', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO,
      resolvedAt: ISO, closureReason: PET_CLOSURE_REASON.ENCERRADO,
    });
    expect(dados[PET_CLOSURE_REASON_KEY]).toBe(PET_CLOSURE_REASON.ENCERRADO);
  });

  it('DESCARTA um motivo inválido/lixo (barricada de escrita)', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO,
      resolvedAt: ISO, closureReason: 'desistido',
    });
    expect(PET_CLOSURE_REASON_KEY in dados).toBe(false);
  });
});

describe('parsePetRow — round-trip de closureReason + backward-compat', () => {
  it('faz round-trip do motivo reunido', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO,
      resolvedAt: ISO, closureReason: PET_CLOSURE_REASON.REUNIDO,
    });
    const pet = parsePetRow(asRow(dados));
    expect(pet.resolved).toBe(true);
    expect(pet.closureReason).toBe(PET_CLOSURE_REASON.REUNIDO);
  });

  it('faz round-trip do motivo encerrado (distinto de reunido, ambos resolvidos)', () => {
    const dados = buildPetDados({
      coords: COORDS, status: 'perdido', dateIso: ISO,
      resolvedAt: ISO, closureReason: PET_CLOSURE_REASON.ENCERRADO,
    });
    const pet = parsePetRow(asRow(dados));
    expect(pet.resolved).toBe(true);
    expect(pet.closureReason).toBe(PET_CLOSURE_REASON.ENCERRADO);
    // Os dois desfechos SAEM do mapa ativo (resolved) mas são distinguíveis.
    expect(pet.closureReason).not.toBe(PET_CLOSURE_REASON.REUNIDO);
  });

  it('um pet ATIVO (sem fechamento) parseia com closureReason undefined', () => {
    const dados = buildPetDados({ coords: COORDS, status: 'avistado', dateIso: ISO });
    const pet = parsePetRow(asRow(dados));
    expect(pet.resolved).toBe(false);
    expect(pet.closureReason).toBeUndefined();
  });

  it('linhas ANTIGAS (sem a chave) parseiam sem closureReason — sem regressão', () => {
    const legacy = {
      kind: PET_KIND,
      status: 'perdido',
      Coordinates: JSON.stringify(COORDS),
      DateISO: ISO,
      // resolvido por uma versão antiga que só carimbava resolvedAt, sem motivo:
      resolvedAt: ISO,
    };
    const pet = parsePetRow(asRow(legacy));
    expect(pet).not.toBeNull();
    expect(pet.resolved).toBe(true);
    expect(pet.closureReason).toBeUndefined();
  });

  it('um motivo lixo num blob adulterado é descartado na leitura também', () => {
    const tampered = {
      kind: PET_KIND,
      status: 'perdido',
      Coordinates: JSON.stringify(COORDS),
      DateISO: ISO,
      resolvedAt: ISO,
      [PET_CLOSURE_REASON_KEY]: '<script>',
    };
    const pet = parsePetRow(asRow(tampered));
    expect(pet.closureReason).toBeUndefined();
  });
});
