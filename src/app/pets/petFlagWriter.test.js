// petFlagWriter.test.js — PET-M4 (deliverables 1 e 2, lado petsData).
//
// Cobre, com o sheetsClient MOCKADO (mesmo padrão de petResolveWriter):
//   • publishPet CONSULTA o rate-limit antes de escrever — uma rajada de
//     publicações byte-idênticas é barrada (PetThrottleError) sem chamar appendRow
//     de novo; um payload de CONTEÚDO diferente passa;
//   • flagPet PERSISTE o flag no blob Dados via o writer do PET-M2, reescrevendo
//     SOMENTE a coluna Dados (incrementa flagCount, nada mais) — isolamento
//     kind:'pet' preservado (uma linha de FOME nas mesmas coords é ignorada);
//   • flagPet é idempotente (re-tap com a mesma chave não conta duas vezes) e o
//     flag sobrevive a um reload (round-trip via parsePetRow + getPetFlagCount).
//
// Usa o petDomain REAL (build/parse/increment) — só o I/O de planilha é mockado.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetSheet, mockAppendRow } = vi.hoisted(() => ({
  mockGetSheet: vi.fn(),
  mockAppendRow: vi.fn(),
}));

vi.mock('../components/compatibility/components/googlesheets/sheetsClient', () => ({
  getSheet: mockGetSheet,
  appendRow: mockAppendRow,
  validateCoordinatePair: vi.fn((coords) => coords),
  SheetsValidationError: class SheetsValidationError extends Error {
    constructor(field, reason, value) {
      super(`${field} ${reason}`);
      this.field = field; this.reason = reason; this.value = value;
      this.name = 'SheetsValidationError';
    }
  },
}));

import { buildPetDados, parsePetRow, getPetFlagCount, PET_KIND } from './petDomain';

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

function makeRow(dados) {
  return {
    Dados: JSON.stringify(dados),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function withRows(rows) {
  mockGetSheet.mockResolvedValue({
    getRows: vi.fn().mockResolvedValue(rows),
  });
}

let publishPet;
let flagPet;
let PetThrottleError;

beforeEach(async () => {
  vi.clearAllMocks();
  mockAppendRow.mockResolvedValue({ rowIndex: 1 });
  vi.resetModules(); // zera o histórico de rate-limit + o cache de idempotência entre testes
  ({ publishPet, flagPet, PetThrottleError } = await import('./petsData.js'));
});

describe('publishPet — consulta o rate-limit antes de escrever (PET-M4)', () => {
  it('uma RAJADA de publicações byte-idênticas é barrada client-side com feedback calmo', async () => {
    const p = { coords: COORDS, status: 'perdido', species: 'cao', name: 'Rex' };

    // 1ª publicação byte-idêntica passa e grava.
    await publishPet({ ...p, idempotency_key: 'a' });
    expect(mockAppendRow).toHaveBeenCalledTimes(1);

    // 2ª com idempotency_key DIFERENTE (simula o usuário reabrindo e reenviando o
    // MESMO relato): a heurística de duplicata barra ANTES de escrever.
    let thrown;
    try {
      await publishPet({ ...p, idempotency_key: 'b' });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PetThrottleError);
    expect(thrown.throttleCode).toBe('identical');
    // NÃO escreveu de novo — a rajada idêntica foi barrada.
    expect(mockAppendRow).toHaveBeenCalledTimes(1);
  });

  it('um relato de CONTEÚDO diferente NÃO é barrado (uso legítimo passa)', async () => {
    await publishPet({ coords: COORDS, status: 'perdido', species: 'cao', name: 'Rex', idempotency_key: '1' });
    // Conteúdo diferente (outro pet) → não é duplicata, e 2 < teto de rajada.
    const out = await publishPet({ coords: COORDS, status: 'avistado', species: 'gato', name: 'Mia', idempotency_key: '2' });
    expect(mockAppendRow).toHaveBeenCalledTimes(2);
    expect(out.status).toBe('avistado');
  });

  it('um re-publish IDEMPOTENTE (mesma chave) não é tratado como rajada', async () => {
    const p = { coords: COORDS, status: 'perdido', species: 'cao', idempotency_key: 'same' };
    await publishPet(p);
    // O flush da fila reaplica o MESMO payload+chave: devolve sem gravar e SEM
    // lançar throttle (a idempotência precede o rate-limit).
    const out = await publishPet(p);
    expect(mockAppendRow).toHaveBeenCalledTimes(1);
    expect(out.status).toBe('perdido');
  });
});

describe('flagPet — persiste o flag no blob Dados, isolamento intacto (PET-M4)', () => {
  it('incrementa flagCount reescrevendo SÓ a coluna Dados (writes-only-Dados)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', name: 'Rex', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    const result = await flagPet({ coords: COORDS, idempotency_key: 'flag-1' });

    expect(result).not.toBeNull();
    expect(result.flagCount).toBe(1);
    expect(row.save).toHaveBeenCalledTimes(1);

    const written = JSON.parse(row.Dados);
    // Persistiu o flag…
    expect(written.flagCount).toBe(1);
    // …e NADA mais mudou: kind preservado, sem colunas de fome injetadas.
    expect(written.kind).toBe(PET_KIND);
    expect(written.status).toBe('perdido');
    expect(written.name).toBe('Rex');
    expect(written.Roaster).toBeUndefined();
    expect(written.Categorias).toBeUndefined();
  });

  it('NÃO sinaliza uma linha de FOME nas MESMAS coords (kind:pet isolation)', async () => {
    const hungerRow = makeRow({ Coordinates: JSON.stringify(COORDS), Roaster: 'x' });
    withRows([hungerRow]);

    const result = await flagPet({ coords: COORDS, idempotency_key: 'flag-hunger' });

    expect(result).toBeNull();
    expect(hungerRow.save).not.toHaveBeenCalled();
  });

  it('é idempotente: um re-tap com a MESMA chave não conta a denúncia de novo', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'avistado', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await flagPet({ coords: COORDS, idempotency_key: 'dup' });
    expect(row.save).toHaveBeenCalledTimes(1);
    expect(JSON.parse(row.Dados).flagCount).toBe(1);

    const second = await flagPet({ coords: COORDS, idempotency_key: 'dup' });
    expect(second).toBeNull();
    expect(row.save).toHaveBeenCalledTimes(1); // ainda 1 — sem regravação
    expect(JSON.parse(row.Dados).flagCount).toBe(1);
  });

  it('o flag sobrevive a um reload (round-trip por parsePetRow + getPetFlagCount)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'encontrado', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await flagPet({ coords: COORDS, idempotency_key: 'rt' });

    // "Reload": parseia como o fetchPets faria — o contador está no blob.
    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded).not.toBeNull();
    expect(reloaded.status).toBe('encontrado'); // conteúdo intacto
    // getPetFlagCount lê o contador do blob bruto (linhas antigas → 0).
    const blob = JSON.parse(row.Dados);
    expect(getPetFlagCount(blob)).toBe(1);
  });

  it('devolve null quando nenhuma linha de pet casa as coords (relato sumiu)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    withRows([makeRow(petDados)]);
    const result = await flagPet({ coords: [1, 2], idempotency_key: 'gone' });
    expect(result).toBeNull();
  });
});
