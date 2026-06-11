// petResolveWriter.test.js — PET-M2.
//
// Cobre o writer coords-keyed de petsData (updatePetByCoords / resolvePet) com o
// sheetsClient MOCKADO (getSheet → fake sheet com getRows + linhas que têm
// .save()). Asserções-chave da aceitação:
//   • a atualização reescreve SOMENTE a coluna Dados (nada de Roaster/Categorias);
//   • só casa uma linha de PET — uma linha de FOME nas MESMAS coords é ignorada
//     (isolamento kind:'pet' absoluto);
//   • resolvePet carimba resolvedAt e é idempotente (re-resolve não regrava);
//   • o resolvedAt injetado sobrevive a um reload (round-trip via parsePetRow).
//
// Usa o petDomain REAL (buildPetDados/parsePetRow/isPetRow) — só o I/O de planilha
// é mockado, mantendo as regras de domínio sob teste de verdade.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetSheet } = vi.hoisted(() => ({ mockGetSheet: vi.fn() }));

vi.mock('../components/compatibility/components/googlesheets/sheetsClient', () => ({
  getSheet: mockGetSheet,
  // appendRow/validateCoordinatePair existem no módulo real importado por
  // petsData; o resolve não os usa, mas o import precisa resolvê-los.
  appendRow: vi.fn(),
  validateCoordinatePair: vi.fn((coords) => coords),
}));

import { buildPetDados, parsePetRow, PET_KIND, PET_CLOSURE_REASON } from './petDomain';

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

// Constrói uma "linha" da planilha: tem .Dados (JSON-string) + um .save() spy,
// como as linhas do google-spreadsheet que updatePinDadosByCoords muta+salva.
function makeRow(dados) {
  return {
    Dados: JSON.stringify(dados),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

// Liga o getSheet mockado a um conjunto fixo de linhas.
function withRows(rows) {
  mockGetSheet.mockResolvedValue({
    getRows: vi.fn().mockResolvedValue(rows),
  });
}

let updatePetByCoords;
let resolvePet;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  ({ updatePetByCoords, resolvePet } = await import('./petsData.js'));
});

describe('updatePetByCoords — reescreve SÓ a coluna Dados', () => {
  it('muta o blob e salva, tocando apenas .Dados (isolamento)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);
    const env = {};

    const result = await updatePetByCoords(env, JSON.stringify(COORDS), (dados) => {
      dados.resolvedAt = ISO;
    });

    expect(result).toBe(row);
    expect(row.save).toHaveBeenCalledTimes(1);
    // O writer só escreveu de volta a coluna Dados — nada de outras colunas.
    const written = JSON.parse(row.Dados);
    expect(written.resolvedAt).toBe(ISO);
    expect(written.kind).toBe(PET_KIND);
    // O conjunto de chaves do blob não ganhou nenhuma coluna de fome.
    expect(written.Roaster).toBeUndefined();
    expect(written.Categorias).toBeUndefined();
  });

  it('NÃO casa uma linha de FOME nas MESMAS coords (kind:pet isolation)', async () => {
    // Linha de fome com Coordinates idênticas — NUNCA pode ser reescrita aqui.
    const hungerRow = makeRow({ Coordinates: JSON.stringify(COORDS), Roaster: 'x' });
    withRows([hungerRow]);
    const env = {};

    const result = await updatePetByCoords(env, JSON.stringify(COORDS), (dados) => {
      dados.resolvedAt = ISO; // não deve rodar
    });

    expect(result).toBeNull();
    expect(hungerRow.save).not.toHaveBeenCalled();
  });

  it('devolve null quando nenhuma linha de pet casa as coords', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    withRows([makeRow(petDados)]);
    const env = {};
    const result = await updatePetByCoords(env, JSON.stringify([1, 2]), () => {});
    expect(result).toBeNull();
  });
});

describe('resolvePet — carimba resolvedAt, idempotente, round-trip por reload', () => {
  it('marca reunido e o resolvedAt injetado sobrevive a um reload (parsePetRow)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'encontrado', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await resolvePet({ coords: COORDS, resolvedAt: ISO, idempotency_key: 'r1', envVariables: {} });

    expect(row.save).toHaveBeenCalledTimes(1);
    // "Reload": parseia a linha como o fetchPets faria — lê de volta resolvido.
    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded.resolved).toBe(true);
    expect(reloaded.resolvedAt).toBe(ISO);
  });

  it('é idempotente: um segundo resolve com a MESMA chave não regrava', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);
    const env = {};

    await resolvePet({ coords: COORDS, resolvedAt: ISO, idempotency_key: 'dup', envVariables: env });
    expect(row.save).toHaveBeenCalledTimes(1);

    // O flush da fila offline reaplica o MESMO payload — não pode gravar de novo.
    const second = await resolvePet({ coords: COORDS, resolvedAt: ISO, idempotency_key: 'dup', envVariables: env });
    expect(second).toBeNull();
    expect(row.save).toHaveBeenCalledTimes(1); // ainda 1 — sem regravação
  });

  it('um resolvedAt INJETADO produz o mesmo carimbo (queue-compatible / determinístico)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'avistado', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await resolvePet({ coords: COORDS, resolvedAt: ISO, idempotency_key: 'inj', envVariables: {} });
    // O carimbo é exatamente o ISO injetado — é isto que deixa um flush da fila
    // reaplicar e ler de volta IDÊNTICO (LSP), sem depender de Date.now().
    expect(JSON.parse(row.Dados).resolvedAt).toBe(ISO);
  });
});

describe('resolvePet — PET-M7b: closureReason ("reunido" | "encerrado") round-trip', () => {
  it('carimba o motivo reunido junto com resolvedAt (reescreve SÓ os campos de ciclo)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await resolvePet({
      coords: COORDS, resolvedAt: ISO, closureReason: PET_CLOSURE_REASON.REUNIDO,
      idempotency_key: 'reu', envVariables: {},
    });

    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded.resolved).toBe(true);
    expect(reloaded.closureReason).toBe(PET_CLOSURE_REASON.REUNIDO);
    // Isolamento intacto: nenhuma coluna de fome foi introduzida.
    const written = JSON.parse(row.Dados);
    expect(written.kind).toBe(PET_KIND);
    expect(written.Roaster).toBeUndefined();
  });

  it('carimba o motivo encerrado (fechamento digno, distinto de reunido)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await resolvePet({
      coords: COORDS, resolvedAt: ISO, closureReason: PET_CLOSURE_REASON.ENCERRADO,
      idempotency_key: 'enc', envVariables: {},
    });

    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded.resolved).toBe(true);
    expect(reloaded.closureReason).toBe(PET_CLOSURE_REASON.ENCERRADO);
  });

  it('descarta um motivo inválido mas ainda resolve (resolvedAt carimbado)', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await resolvePet({
      coords: COORDS, resolvedAt: ISO, closureReason: 'desistido',
      idempotency_key: 'bad', envVariables: {},
    });

    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded.resolved).toBe(true);        // ainda resolve
    expect(reloaded.closureReason).toBeUndefined(); // motivo lixo descartado
  });

  it('resolve sem motivo (compat) — resolvedAt sem closureReason', async () => {
    const petDados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const row = makeRow(petDados);
    withRows([row]);

    await resolvePet({ coords: COORDS, resolvedAt: ISO, idempotency_key: 'noreason', envVariables: {} });

    const reloaded = parsePetRow({ Dados: row.Dados });
    expect(reloaded.resolved).toBe(true);
    expect(reloaded.closureReason).toBeUndefined();
  });
});
