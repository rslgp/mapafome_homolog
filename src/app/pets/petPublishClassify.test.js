// petPublishClassify.test.js — PET-M1.
//
// Cobre (1) o classificador PURO de falha de publicação em petDomain — cada
// classe (offline / fora-da-área / lento / genérico) e a regra "vai pra fila?";
// e (2) o caminho de RE-PUBLICAÇÃO idempotente em petsData.publishPet com o
// sheets writer mockado — um segundo publish com a MESMA idempotency_key NÃO
// chama appendRow de novo (sem duplo-write).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  classifyPublishFailure,
  shouldQueuePublishFailure,
  PET_PUBLISH_FAILURE,
  PET_PUBLISH_FAILURE_COPY,
} from './petDomain';
import { SheetsValidationError } from '../components/compatibility/components/googlesheets/sheetsClient';

describe('classifyPublishFailure — classes de falha', () => {
  it('SheetsValidationError de bbox → out_of_bounds (fora da área atendida)', () => {
    const err = new SheetsValidationError('Coordinates', 'outside Brazil bbox', [0, 0]);
    expect(classifyPublishFailure(err, { isOffline: false })).toBe(PET_PUBLISH_FAILURE.OUT_OF_BOUNDS);
    // out_of_bounds tem precedência mesmo se offline (é regra de negócio).
    expect(classifyPublishFailure(err, { isOffline: true })).toBe(PET_PUBLISH_FAILURE.OUT_OF_BOUNDS);
  });

  it('isOffline injetado → offline (mesmo com erro de rede genérico)', () => {
    expect(classifyPublishFailure(new Error('whatever'), { isOffline: true }))
      .toBe(PET_PUBLISH_FAILURE.OFFLINE);
  });

  it('network_slow / timeout → server_slow (pode ter sido salvo)', () => {
    expect(classifyPublishFailure(new Error('network_slow'), { isOffline: false }))
      .toBe(PET_PUBLISH_FAILURE.SERVER_SLOW);
    expect(classifyPublishFailure(new Error('Request timed out'), { isOffline: false }))
      .toBe(PET_PUBLISH_FAILURE.SERVER_SLOW);
  });

  it('falha de rede em runtime (sem isOffline) → offline (foi/será enfileirado)', () => {
    expect(classifyPublishFailure(new Error('Failed to fetch'), { isOffline: false }))
      .toBe(PET_PUBLISH_FAILURE.OFFLINE);
  });

  it('qualquer outra falha → generic', () => {
    expect(classifyPublishFailure(new Error('boom'), { isOffline: false }))
      .toBe(PET_PUBLISH_FAILURE.GENERIC);
    expect(classifyPublishFailure(null, {})).toBe(PET_PUBLISH_FAILURE.GENERIC);
  });

  it('cada código mapeia para uma cópia CALMA distinta (não vazia, sem "ERRO")', () => {
    const codes = Object.values(PET_PUBLISH_FAILURE);
    const copies = codes.map((c) => PET_PUBLISH_FAILURE_COPY[c]);
    // Todas presentes e distintas.
    expect(new Set(copies).size).toBe(codes.length);
    for (const copy of copies) {
      expect(typeof copy).toBe('string');
      expect(copy.length).toBeGreaterThan(0);
      expect(copy).not.toMatch(/ERRO!!!|ERRO!/);
    }
    // A cópia de server_slow orienta a NÃO republicar (evita duplicar).
    expect(PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.SERVER_SLOW]).toMatch(/de novo|duplicar/i);
    // A de offline reassegura que foi guardado.
    expect(PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.OFFLINE]).toMatch(/guardad/i);
    // A de out_of_bounds fala da área.
    expect(PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.OUT_OF_BOUNDS]).toMatch(/área/i);
  });
});

describe('shouldQueuePublishFailure — quem vai pra fila offline', () => {
  it('offline e server_slow vão pra fila (não perde o input)', () => {
    expect(shouldQueuePublishFailure(PET_PUBLISH_FAILURE.OFFLINE)).toBe(true);
    expect(shouldQueuePublishFailure(PET_PUBLISH_FAILURE.SERVER_SLOW)).toBe(true);
  });
  it('out_of_bounds e generic NÃO vão pra fila (precisa corrigir / falha real)', () => {
    expect(shouldQueuePublishFailure(PET_PUBLISH_FAILURE.OUT_OF_BOUNDS)).toBe(false);
    expect(shouldQueuePublishFailure(PET_PUBLISH_FAILURE.GENERIC)).toBe(false);
  });
});

// ─── publishPet — re-publicação idempotente (sheets writer mockado) ──────────
// Mocka o sheetsClient: validateCoordinatePair passa, appendRow conta chamadas.
// Um segundo publishPet com a MESMA idempotency_key não deve gravar de novo.
const { mockAppendRow } = vi.hoisted(() => ({ mockAppendRow: vi.fn() }));

vi.mock('../components/compatibility/components/googlesheets/sheetsClient', () => ({
  // Barricada: aceita o par dentro do bbox usado nos testes (Recife).
  validateCoordinatePair: vi.fn((coords) => coords),
  appendRow: mockAppendRow,
  getSheet: vi.fn(),
  SheetsValidationError: class SheetsValidationError extends Error {
    constructor(field, reason, value) { super(`${field} ${reason}`); this.field = field; this.reason = reason; this.value = value; this.name = 'SheetsValidationError'; }
  },
}));

describe('publishPet — caminho idempotente (sem duplo-append no re-publish)', () => {
  let publishPet;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAppendRow.mockResolvedValue({ rowIndex: 1 });
    vi.resetModules();
    ({ publishPet } = await import('./petsData.js'));
  });

  it('publica uma vez; um segundo publish com a mesma chave NÃO chama appendRow de novo', async () => {
    const payload = {
      coords: [-8.0671132, -34.8766719],
      status: 'perdido',
      species: 'cao',
      idempotency_key: 'flush-key',
    };

    await publishPet(payload);
    expect(mockAppendRow).toHaveBeenCalledTimes(1);
    // appendRow escreve SOMENTE a coluna Dados (isolamento kind:'pet').
    const [, row] = mockAppendRow.mock.calls[0];
    const keys = Object.keys(row);
    expect(keys).toEqual(['Dados']);
    expect(JSON.parse(row.Dados).kind).toBe('pet');

    // Re-publica (o flush da fila faz exatamente isto) com a MESMA chave.
    const normalized = await publishPet(payload);
    // Nenhum segundo append: a chave já foi vista → sem linha duplicada.
    expect(mockAppendRow).toHaveBeenCalledTimes(1);
    // Ainda devolve o objeto normalizado para o chamador (otimista).
    expect(normalized.status).toBe('perdido');
  });
});
