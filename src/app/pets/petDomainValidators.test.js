// petDomainValidators.test.js — PET-M5 (gap-fill for the petDomain SOT).
//
// As outras suites já cobrem o round-trip de buildPetDados/parsePetRow, o
// resolvedAt, os caps de texto livre, a classificação de falha e o throttle. ESTE
// arquivo fecha as lacunas restantes do domínio puro nomeadas no PET-M5:
//   • isValidStatus / isValidSpecies / isValidSize — derivados das listas SOT;
//   • isPetRow — o discriminador kind:'pet' (a única coisa que torna a linha
//     visível ao /pets e invisível ao /fome);
//   • sanitizePhotosUrl — a barricada de esquema: REJEITA javascript:/data:/ftp:
//     e ACEITA http/https (protege o <a href> do PetDetailSheet);
//   • parsePetRow NUNCA lança — exercita TODAS as portas defensivas (Dados não-
//     string, JSON quebrado, kind errado, Coordinates ausente/não-array/não-finito).
//
// Não há mock nem Date.now(): são funções puras. Os ids de status/espécie/porte
// são lidos das LISTAS do petDomain (não hardcoded) — mudar a SOT muda o teste.

import { describe, it, expect } from 'vitest';
import {
  isValidStatus,
  isValidSpecies,
  isValidSize,
  isPetRow,
  sanitizePhotosUrl,
  parsePetRow,
  buildPetDados,
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  PET_KIND,
} from './petDomain';

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

// Empacota um blob Dados como a planilha o devolve (uma linha tem `.Dados` em
// JSON-string). Espelha o helper das outras suites sem importá-lo.
function asRow(dados) {
  return { Dados: JSON.stringify(dados) };
}

describe('isValidStatus / isValidSpecies / isValidSize — derivados das listas SOT', () => {
  it('aceita TODO id presente na lista SOT e nada mais', () => {
    // A verdade vem das listas — se a SOT crescer, o validador acompanha sozinho.
    for (const s of PET_STATUSES) expect(isValidStatus(s.id)).toBe(true);
    for (const s of PET_SPECIES) expect(isValidSpecies(s.id)).toBe(true);
    for (const s of PET_SIZES) expect(isValidSize(s.id)).toBe(true);
  });

  it('rejeita id desconhecido / vazio / não-string em cada validador', () => {
    for (const bad of ['', 'inexistente', null, undefined, 0, {}, [], 'PERDIDO']) {
      expect(isValidStatus(bad)).toBe(false);
      expect(isValidSpecies(bad)).toBe(false);
      expect(isValidSize(bad)).toBe(false);
    }
  });

  it('os domínios não se cruzam (um id de espécie não é um status válido)', () => {
    // Forcing-function contra colar a string errada no campo errado.
    expect(isValidStatus(PET_SPECIES[0].id)).toBe(false);
    expect(isValidSpecies(PET_STATUSES[0].id)).toBe(false);
    expect(isValidSize(PET_STATUSES[0].id)).toBe(false);
  });
});

describe('isPetRow — discriminador kind:\'pet\' (isolamento /pets vs /fome)', () => {
  it('true só quando kind === PET_KIND', () => {
    expect(isPetRow({ kind: PET_KIND })).toBe(true);
    expect(isPetRow({ kind: PET_KIND, status: 'perdido' })).toBe(true);
  });

  it('false para linha de fome / kind ausente ou errado / entrada não-objeto', () => {
    expect(isPetRow({ kind: 'hunger' })).toBe(false);
    expect(isPetRow({ kind: 'Pet' })).toBe(false); // case-sensitive de propósito
    expect(isPetRow({})).toBe(false);
    expect(isPetRow(null)).toBe(false);
    expect(isPetRow(undefined)).toBe(false);
    expect(isPetRow('pet')).toBe(false);
  });
});

describe('sanitizePhotosUrl — barricada de esquema (aceita http/https, rejeita o resto)', () => {
  it('ACEITA http e https inalterados', () => {
    expect(sanitizePhotosUrl('http://exemplo.com/fotos')).toBe('http://exemplo.com/fotos');
    expect(sanitizePhotosUrl('https://drive.google.com/drive/folders/abc')).toBe('https://drive.google.com/drive/folders/abc');
  });

  it('REJEITA javascript: / data: / ftp: e outros esquemas perigosos → \'\'', () => {
    // O caso central da aceitação: nada que não seja http/https vira href.
    expect(sanitizePhotosUrl('javascript:alert(1)')).toBe('');
    expect(sanitizePhotosUrl('JavaScript:alert(1)')).toBe(''); // esquema é case-insensitive
    expect(sanitizePhotosUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizePhotosUrl('ftp://exemplo.com/arquivo')).toBe('');
    expect(sanitizePhotosUrl('file:///etc/passwd')).toBe('');
  });

  it('REJEITA lixo não-URL e entrada vazia/nula → \'\' (nunca lança)', () => {
    expect(sanitizePhotosUrl('não é uma url')).toBe('');
    expect(sanitizePhotosUrl('')).toBe('');
    expect(sanitizePhotosUrl(null)).toBe('');
    expect(sanitizePhotosUrl(undefined)).toBe('');
    expect(sanitizePhotosUrl('   ')).toBe('');
  });

  it('apara as pontas antes de validar (espaço em volta de uma url válida passa)', () => {
    expect(sanitizePhotosUrl('  https://exemplo.com/x  ')).toBe('https://exemplo.com/x');
  });
});

describe('parsePetRow — barricada de leitura: NUNCA lança em entrada malformada', () => {
  it('retorna null para cada forma quebrada sem lançar', () => {
    const broken = [
      undefined,
      null,
      {},                                   // sem .Dados
      { Dados: 42 },                        // .Dados não-string
      { Dados: '{ not json' },              // JSON inválido
      { Dados: JSON.stringify({ kind: 'hunger' }) },          // não é pet
      { Dados: JSON.stringify({ kind: PET_KIND }) },          // pet sem Coordinates
      { Dados: JSON.stringify({ kind: PET_KIND, Coordinates: '{ not json' }) }, // coords JSON quebrado
      { Dados: JSON.stringify({ kind: PET_KIND, Coordinates: JSON.stringify([1]) }) },        // par incompleto
      { Dados: JSON.stringify({ kind: PET_KIND, Coordinates: JSON.stringify(['a', 'b']) }) }, // coords não-finitas
      { Dados: JSON.stringify({ kind: PET_KIND, Coordinates: JSON.stringify({ lat: 1 }) }) }, // coords não-array
    ];
    for (const row of broken) {
      // A asserção é dupla: não lança E retorna null (descartável pelo fetchPets).
      expect(() => parsePetRow(row)).not.toThrow();
      expect(parsePetRow(row)).toBeNull();
    }
  });

  it('parseia uma linha de pet bem-formada (sanity do caminho feliz)', () => {
    const dados = buildPetDados({ coords: COORDS, status: 'perdido', dateIso: ISO });
    const pet = parsePetRow(asRow(dados));
    expect(pet).not.toBeNull();
    expect(pet.coords).toEqual(COORDS);
    expect(pet.status).toBe('perdido');
  });
});
