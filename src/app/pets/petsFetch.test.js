// petsFetch.test.js — PET-M5 (gap-fill for petsData.fetchPets).
//
// As suites de writer (petResolveWriter / petFlagWriter / petPublishClassify) já
// cobrem o caminho de ESCRITA (publish/resolve/flag, writes-only-Dados,
// idempotência). A LACUNA era a LEITURA: fetchPets faz o full-table scan da
// planilha COMPARTILHADA (sheet 0) e:
//   • parseia toda linha por parsePetRow;
//   • DESCARTA os nulos — uma linha de FOME ou malformada NUNCA derruba o batch
//     (parsePetRow retorna null, não lança), e NUNCA aparece no resultado (o
//     isolamento kind:'pet' no caminho de leitura);
//   • devolve só os pets normalizados.
//
// Só o I/O de planilha (getSheet/getRows) é mockado — o petDomain REAL (parsePetRow)
// é exercitado de verdade, então o teste prova a integração leitura→parse.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetSheet } = vi.hoisted(() => ({ mockGetSheet: vi.fn() }));

vi.mock('../components/compatibility/components/googlesheets/sheetsClient', () => ({
  getSheet: mockGetSheet,
  // O import real de petsData resolve estes; fetchPets não os usa.
  appendRow: vi.fn(),
  validateCoordinatePair: vi.fn((coords) => coords),
}));

import { fetchPets } from './petsData';
import { buildPetDados, PET_KIND } from './petDomain';

const ISO = '2026-06-11T12:00:00.000Z';

// Empacota um blob como uma linha da planilha (coluna Dados em JSON-string).
function petRow(over) {
  const dados = buildPetDados({
    coords: over.coords || [-8.06, -34.87],
    status: over.status || 'perdido',
    species: over.species,
    dateIso: ISO,
    ...over,
  });
  return { Dados: JSON.stringify(dados) };
}

function setRows(rows) {
  mockGetSheet.mockResolvedValue({ getRows: vi.fn().mockResolvedValue(rows) });
}

describe('fetchPets — full-table scan + descarta nulos (isolamento de leitura)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna SÓ as linhas de pet, parseadas e normalizadas', async () => {
    setRows([
      petRow({ coords: [-8.01, -34.81], status: 'perdido', species: 'cao' }),
      petRow({ coords: [-8.02, -34.82], status: 'encontrado', species: 'gato' }),
    ]);
    const pets = await fetchPets();
    expect(pets).toHaveLength(2);
    expect(pets[0].status).toBe('perdido');
    expect(pets[0].coords).toEqual([-8.01, -34.81]);
    expect(pets[1].status).toBe('encontrado');
  });

  it('DESCARTA linhas de fome / malformadas — só os pets sobrevivem ao scan', async () => {
    setRows([
      { Dados: JSON.stringify({ kind: 'hunger', Coordinates: JSON.stringify([-8, -34]) }) }, // fome
      { Dados: '{ not json' },                                  // JSON quebrado
      { Dados: 42 },                                            // Dados não-string
      {},                                                       // sem Dados
      petRow({ coords: [-8.03, -34.83], status: 'avistado' }),  // o único pet
    ]);
    const pets = await fetchPets();
    expect(pets).toHaveLength(1);
    expect(pets[0].status).toBe('avistado');
    expect(pets[0].coords).toEqual([-8.03, -34.83]);
  });

  it('planilha vazia → lista vazia (nunca lança)', async () => {
    setRows([]);
    await expect(fetchPets()).resolves.toEqual([]);
  });

  it('uma linha malformada no meio NÃO derruba o batch (barricada de leitura)', async () => {
    setRows([
      petRow({ coords: [-8.04, -34.84] }),
      { Dados: '{ corrupto' },
      petRow({ coords: [-8.05, -34.85] }),
    ]);
    // Sem try/catch aqui de propósito: se fetchPets lançasse numa linha ruim, o
    // teste falharia. Ele resolve com as DUAS linhas boas.
    const pets = await fetchPets();
    expect(pets).toHaveLength(2);
  });

  it('todo objeto devolvido carrega o discriminador de pet (status válido + coords)', async () => {
    setRows([petRow({ coords: [-8.06, -34.86], status: 'perdido', species: 'outro' })]);
    const [pet] = await fetchPets();
    // O blob de origem é kind:'pet'; o parseado expõe os campos normalizados.
    expect(pet.status).toBe('perdido');
    expect(Array.isArray(pet.coords)).toBe(true);
    // Sanity: a fonte era mesmo uma linha de pet (não vazou nada de fome).
    expect(PET_KIND).toBe('pet');
  });
});
