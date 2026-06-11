// petContactPrivacy.test.js — PET-M3 (deliverables b, c, f).
//
// Forcing-functions de PII (não comentários):
//   (b) O caminho de dados RENDERIZADO no mapa/lista NUNCA carrega o contato (ou
//       qualquer texto livre). O marcador (buildPetMarkerIcon) é construído SÓ de
//       {status, species} — provamos que o HTML do ícone não contém o contato/
//       nome/detalhe, mesmo quando o pet os tem. (O reveal-on-tap do contato vive
//       no PetDetailSheet, fora do caminho do mapa/lista — testado por render.)
//   (c) Um relato SEM contato publica e parseia limpo de ponta a ponta
//       (publishPet com sheets mockado → parsePetRow round-trip).
//   (f) trackError NÃO vaza contato/texto-livre: a redação de token funciona e o
//       payload que o PetsApp emite (reason/queued) não carrega PII.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildPetMarkerIcon } from './petMarkerIcon';
import { parsePetRow, buildPetDados } from './petDomain';

// Mock do sheetsClient no TOPO do módulo (vi.hoisted/vi.mock são içados de
// qualquer forma; declará-los aqui reflete a ordem real e evita o warning de
// "não está no top level"). Só o bloco (c) importa petsData dinamicamente e usa
// este mock; (b) e (f) não tocam o sheetsClient.
const { mockAppendRow } = vi.hoisted(() => ({ mockAppendRow: vi.fn() }));

vi.mock('../components/compatibility/components/googlesheets/sheetsClient', () => ({
  validateCoordinatePair: vi.fn((coords) => coords),
  appendRow: mockAppendRow,
  getSheet: vi.fn(),
  SheetsValidationError: class SheetsValidationError extends Error {
    constructor(field, reason, value) {
      super(`${field} ${reason}`);
      this.field = field; this.reason = reason; this.value = value;
      this.name = 'SheetsValidationError';
    }
  },
}));

// Dados sensíveis "marcadores": se QUALQUER um aparecer no caminho do mapa/lista,
// o teste falha. Strings improváveis de colidir com markup do SVG.
const CONTACT = '5581999990000';
const NAME = 'ZZNOMESECRETOZZ';
const DETAIL = 'XXDETALHEPRIVADOXX';
const COLOR = 'QQCORUNICAQQ';
const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

function asRow(dados) {
  return { Dados: JSON.stringify(dados) };
}

describe('(b) o caminho de dados do MAPA/LISTA nunca renderiza o contato', () => {
  it('buildPetMarkerIcon é construído só de {status, species} — sem contato/nome/detalhe no HTML', () => {
    const icon = buildPetMarkerIcon({
      status: 'perdido',
      species: 'cao',
      // Mesmo se um chamador descuidado espalhar PII no objeto, o ícone só lê
      // status/species — o restante é IGNORADO por construção.
      contact: CONTACT,
      name: NAME,
      detail: DETAIL,
      color: COLOR,
    });
    const html = icon.options.html;
    expect(html).not.toContain(CONTACT);
    expect(html).not.toContain(NAME);
    expect(html).not.toContain(DETAIL);
    expect(html).not.toContain(COLOR);
    // E carrega o que DEVE: a forma do status (codificação para daltônicos).
    expect(icon.options.className).toContain('pet-marker--perdido');
  });

  it('o objeto que o mapa/lista consome (parsePetRow) carrega contato, mas o RENDER do marcador não', () => {
    // parsePetRow PRECISA devolver contact (o detalhe sheet o consome após reveal);
    // o invariante é que o caminho RENDERIZADO do marcador não o emite. Provamos
    // os dois lados: o dado existe no objeto, mas não no HTML do marcador.
    const dados = buildPetDados({
      coords: COORDS, status: 'avistado', species: 'gato',
      contact: CONTACT, name: NAME, detail: DETAIL, color: COLOR, dateIso: ISO,
    });
    const pet = parsePetRow(asRow(dados));
    expect(pet.contact).toBe(CONTACT); // detalhe sheet precisa do dado

    const html = buildPetMarkerIcon({ status: pet.status, species: pet.species }).options.html;
    expect(html).not.toContain(CONTACT);
    expect(html).not.toContain(NAME);
    expect(html).not.toContain(DETAIL);
  });
});

describe('(c) relato CONTACTLESS publica e parseia limpo de ponta a ponta', () => {
  let publishPet;
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAppendRow.mockResolvedValue({ rowIndex: 1 });
    vi.resetModules();
    ({ publishPet } = await import('./petsData.js'));
  });

  it('publica sem contato (contact vazio) gravando só a coluna Dados; parseia de volta limpo', async () => {
    const normalized = await publishPet({
      coords: COORDS,
      status: 'perdido',
      species: 'cao',
      contact: '', // CONTACTLESS
      idempotency_key: 'contactless-1',
    });
    // Publicou.
    expect(mockAppendRow).toHaveBeenCalledTimes(1);
    const [, row] = mockAppendRow.mock.calls[0];
    expect(Object.keys(row)).toEqual(['Dados']); // só a coluna Dados (isolamento)

    // O objeto otimista devolvido tem contact vazio (renderiza sem botão de contato).
    expect(normalized.contact).toBe('');

    // Round-trip pela barricada de leitura: parseia limpo, contato vazio, ATIVO.
    const pet = parsePetRow(row);
    expect(pet).not.toBeNull();
    expect(pet.status).toBe('perdido');
    expect(pet.contact).toBe('');
    expect(pet.resolved).toBe(false);
  });

  it('parsePetRow nunca lança e devolve contact:\'\' quando o blob não tem contato', () => {
    const dados = buildPetDados({ coords: COORDS, status: 'encontrado', dateIso: ISO });
    const pet = parsePetRow(asRow(dados));
    expect(pet.contact).toBe('');
  });
});

describe('(f) trackError não vaza contato/texto-livre', () => {
  let track;
  let trackError;

  beforeEach(async () => {
    vi.resetModules();
    // Captura o que de fato é DESPACHADO pelo transporte do analytics.
    window.gtag = vi.fn();
    window.dataLayer = [];
    // Silencia o console.error que trackError espelha (sem poluir o output).
    vi.spyOn(console, 'error').mockImplementation(() => {});
    ({ track, trackError } = await import('../components/compatibility/components/ux/analytics.js'));
  });

  it('redige um token presente na mensagem de erro antes de despachar', () => {
    trackError('pet_publish', new Error('falha token=abc123secreto na request'));
    const payload = window.gtag.mock.calls.at(-1)[2];
    expect(payload.error_message).not.toContain('abc123secreto');
    expect(payload.error_message).toContain('[redacted]');
  });

  it('o payload de erro do PetsApp (reason/queued) não carrega contato nem texto-livre', () => {
    // Espelha a chamada real do PetsApp.handlePublish: trackError('pet_publish',
    // err, { reason, queued }). NUNCA passa contact/name/detail/color.
    trackError('pet_publish', new Error('network_slow'), { reason: 'server_slow', queued: true });
    const payload = window.gtag.mock.calls.at(-1)[2];
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(CONTACT);
    expect(serialized).not.toContain(NAME);
    expect(serialized).not.toContain(DETAIL);
    expect(serialized).not.toContain(COLOR);
    // O que DEVE estar: a categoria, o motivo classificado e a flag de fila.
    expect(payload.category).toBe('pet_publish');
    expect(payload.reason).toBe('server_slow');
    expect(payload.queued).toBe(true);
  });

  it('eventos de funil genéricos só carregam o que o chamador passa (sem PII implícita)', () => {
    // track() faz spread só das properties dadas — não puxa nada do pet.
    track('pet_opened', { status: 'perdido' });
    const props = window.gtag.mock.calls.at(-1)[2];
    expect(props).toEqual({ status: 'perdido' });
  });
});
