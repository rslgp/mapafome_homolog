// petRenewWriter.test.js — PET-03 (PET-M13 "ainda procurando").
//
// Cobre renewPet: o writer que carimba freshnessAt na linha que casa as coords.
// Antes desta milestone freshnessAt era LIDO mas nunca ESCRITO por um módulo-fonte
// — a idade sempre media da 1ª publicação. renewPet espelha resolvePet (mesmo
// writer coords-keyed, mesma idempotência, ISO injetável para a fila) mas escreve
// SÓ freshnessAt e NÃO tira o pet do mapa ativo (não escreve resolvedAt).
//
// sheetsClient mockado; petDomain REAL (buildPetDados/parsePetRow) sob teste.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetSheet } = vi.hoisted(() => ({ mockGetSheet: vi.fn() }));

vi.mock('../components/compatibility/components/googlesheets/sheetsClient', () => ({
  getSheet: mockGetSheet,
  appendRow: vi.fn(),
  validateCoordinatePair: vi.fn((coords) => coords),
}));

import { buildPetDados, parsePetRow, PET_KIND } from './petDomain';

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';
const RENEW_ISO = '2026-07-01T09:00:00.000Z';

function makeRow(dados) {
  return { Dados: JSON.stringify(dados), save: vi.fn().mockResolvedValue(undefined) };
}
function withRows(rows) {
  mockGetSheet.mockResolvedValue({ getRows: vi.fn().mockResolvedValue(rows) });
}

let renewPet;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  ({ renewPet } = await import('./petsData.js'));
});

describe('renewPet — carimba freshnessAt, idempotente, round-trip por reload', () => {
  it('escreve freshnessAt e o ISO injetado sobrevive a um reload (parsePetRow)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await renewPet({ coords: COORDS, freshnessAt: RENEW_ISO, idempotency_key: 'n1', envVariables: {} });

    expect(row.save).toHaveBeenCalledTimes(1);
    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded.freshnessAt).toBe(RENEW_ISO);
  });

  it('NÃO tira o pet do mapa ativo (não escreve resolvedAt)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await renewPet({ coords: COORDS, freshnessAt: RENEW_ISO, idempotency_key: 'n2', envVariables: {} });

    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded.resolved).toBe(false);       // continua ativo
    expect(reloaded.freshnessAt).toBe(RENEW_ISO); // mas com o relógio renovado
  });

  it('é idempotente: um segundo renew com a MESMA chave não regrava', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);
    const env = {};

    await renewPet({ coords: COORDS, freshnessAt: RENEW_ISO, idempotency_key: 'dup', envVariables: env });
    expect(row.save).toHaveBeenCalledTimes(1);

    const second = await renewPet({ coords: COORDS, freshnessAt: RENEW_ISO, idempotency_key: 'dup', envVariables: env });
    expect(second).toBeNull();
    expect(row.save).toHaveBeenCalledTimes(1); // ainda 1
  });

  it('preserva o isolamento kind:pet — não introduz coluna de fome', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await renewPet({ coords: COORDS, freshnessAt: RENEW_ISO, idempotency_key: 'iso', envVariables: {} });

    const written = JSON.parse(row.Dados);
    expect(written.kind).toBe(PET_KIND);
    expect(written.Roaster).toBeUndefined();
    expect(written.Categorias).toBeUndefined();
  });

  it('devolve null quando nenhuma linha de pet casa as coords (degrada com calma)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    withRows([makeRow(petDados)]);
    const result = await renewPet({ coords: [1, 2], freshnessAt: RENEW_ISO, idempotency_key: 'miss', envVariables: {} });
    expect(result).toBeNull();
  });
});
