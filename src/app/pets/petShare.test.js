// petShare.test.js — PET-M19: a mensagem de compartilhamento PURA + o atuador.
//
// Duas frentes:
//   1. buildPetShareMessage (PURA) — prova status + espécie + área + o deep-link
//      M18 correto (?pet=<coordsKey>); prova que NENHUM PII (contato/nome/detalhe)
//      vaza para o texto; degrada com calma em pets malformados.
//   2. sharePet (atuador) — prova que chama navigator.share quando presente, senão
//      abre o wa.me; prova que a chamada é SÍNCRONA (no MESMO tick, sem await
//      gateando) — a correção load-bearing do mobile (PET-M19).
//   3. buildWhatsappShareUrl — o fallback codifica texto + url.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildPetShareMessage,
  buildWhatsappShareUrl,
  sharePet,
  PETS_BASE_URL,
} from './petShare';
import { petCoordsKey, PET_DEEPLINK_PARAM } from './petDomain';

const LOST_PET = {
  coords: [-8.0671132, -34.8766719],
  status: 'perdido',
  species: 'cao',
  size: 'medio',
  color: 'caramelo',
  name: 'Rex',
  // PII que NÃO pode aparecer no texto:
  contact: '5581999990000',
  detail: 'coleira azul com chapinha',
  photos: '',
  dateIso: '2026-06-11T12:00:00.000Z',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildPetShareMessage (PURA) — PET-M19', () => {
  it('inclui status + espécie + área e o deep-link M18 (?pet=<coordsKey>)', () => {
    const { text, url } = buildPetShareMessage(LOST_PET);
    const lower = text.toLowerCase();
    // status
    expect(lower).toContain('perdido');
    // espécie (label da SOT, minúsculo na frase)
    expect(lower).toContain('cão');
    // área (referência grossa de coords — 2 casas, ~1 km)
    expect(text).toContain('-8.07');
    expect(text).toContain('-34.88');
    // deep-link M18: a URL carrega ?pet=<coordsKey> EXATO (6 casas).
    const key = petCoordsKey(LOST_PET.coords);
    expect(url).toBe(`${PETS_BASE_URL}?${PET_DEEPLINK_PARAM}=${encodeURIComponent(key)}`);
  });

  it('NÃO vaza PII: contato, nome e detalhe NUNCA entram no texto nem na url', () => {
    const { text, url } = buildPetShareMessage(LOST_PET);
    const blob = `${text} ${url}`;
    expect(blob).not.toContain('5581999990000'); // contato
    expect(blob).not.toContain('Rex'); // nome
    expect(blob).not.toContain('coleira'); // detalhe/texto-livre
  });

  it('respeita uma URL-base injetada (ex.: origin de runtime)', () => {
    const { url } = buildPetShareMessage(LOST_PET, 'https://example.test/pets');
    const key = petCoordsKey(LOST_PET.coords);
    expect(url).toBe(`https://example.test/pets?${PET_DEEPLINK_PARAM}=${encodeURIComponent(key)}`);
  });

  it('a área usa precisão GROSSA (2 casas) — mais grossa que a chave do link (6)', () => {
    const { text, url } = buildPetShareMessage(LOST_PET);
    // O texto NÃO estampa a precisão de 6 casas (não é um endereço); o link sim.
    expect(text).not.toContain('-8.067113');
    expect(url).toContain('-8.067113');
  });

  it('degrada com calma: pet sem coords não lança e cai na URL-base sem param', () => {
    const { text, url } = buildPetShareMessage({ status: 'avistado', species: 'gato' });
    expect(text.toLowerCase()).toContain('avistado');
    expect(url).toBe(PETS_BASE_URL); // sem ?pet= quando não há chave estável
  });

  it('pet nulo não lança (mensagem genérica + URL-base)', () => {
    const { text, url } = buildPetShareMessage(null);
    expect(typeof text).toBe('string');
    expect(url).toBe(PETS_BASE_URL);
  });
});

describe('buildWhatsappShareUrl — fallback', () => {
  it('codifica texto + url no param ?text= do wa.me', () => {
    const out = buildWhatsappShareUrl({ text: 'Pet perdido.', url: 'https://mapafome.com.br/pets?pet=1,2' });
    expect(out).toMatch(/^https:\/\/wa\.me\/\?text=/);
    const decoded = decodeURIComponent(out.replace('https://wa.me/?text=', ''));
    expect(decoded).toContain('Pet perdido.');
    expect(decoded).toContain('https://mapafome.com.br/pets?pet=1,2');
  });
});

describe('sharePet (atuador) — PET-M19 contrato de gesto SÍNCRONO', () => {
  it('chama navigator.share quando presente, com {title,text,url}', () => {
    const shareSpy = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { share: shareSpy });

    const payload = buildPetShareMessage(LOST_PET);
    const result = sharePet(payload);

    expect(result).toBe('share');
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const arg = shareSpy.mock.calls[0][0];
    expect(arg.text).toBe(payload.text);
    expect(arg.url).toBe(payload.url);
    expect(typeof arg.title).toBe('string');
  });

  it('navigator.share é invocado SÍNCRONAMENTE — no MESMO tick, sem await gateando', () => {
    let calledSynchronously = false;
    // O spy marca uma flag local NO MOMENTO da chamada. Lemos a flag IMEDIATAMENTE
    // após sharePet (mesma pilha síncrona). Se a chamada estivesse atrás de um
    // await/microtask, a flag ainda seria false aqui.
    const shareSpy = vi.fn(() => { calledSynchronously = true; return Promise.resolve(); });
    vi.stubGlobal('navigator', { share: shareSpy });

    sharePet(buildPetShareMessage(LOST_PET));
    expect(calledSynchronously).toBe(true); // disparou no tick do clique
  });

  it('sem navigator.share → abre o wa.me (window.open) SÍNCRONO', () => {
    vi.stubGlobal('navigator', {}); // sem .share
    const opener = vi.fn();

    const result = sharePet(buildPetShareMessage(LOST_PET), opener);

    expect(result).toBe('whatsapp');
    expect(opener).toHaveBeenCalledTimes(1);
    const openedUrl = opener.mock.calls[0][0];
    expect(openedUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
    const decoded = decodeURIComponent(openedUrl.replace('https://wa.me/?text=', ''));
    // O deep-link M18 vai junto. A vírgula da coordsKey é percent-encoded (%2C) no
    // param ?pet= e sobrevive a UM decode (do wrapper wa.me) — então casamos a
    // forma codificada do param, que é o que de fato viaja e o destino decodifica.
    const key = petCoordsKey(LOST_PET.coords);
    expect(decoded).toContain(`pet=${encodeURIComponent(key)}`);
  });

  it('cancelamento do usuário (share rejeita) NÃO cai no fallback wa.me', () => {
    // navigator.share existe e rejeita (usuário fechou o sheet): NÃO é erro e NÃO
    // deve abrir o wa.me depois (seria hostil + já estaria fora do gesto).
    const shareSpy = vi.fn(() => Promise.reject(new Error('AbortError')));
    vi.stubGlobal('navigator', { share: shareSpy });
    const opener = vi.fn();

    const result = sharePet(buildPetShareMessage(LOST_PET), opener);

    expect(result).toBe('share');
    expect(opener).not.toHaveBeenCalled(); // nenhum fallback após o cancelamento
  });
});
