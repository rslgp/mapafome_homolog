// petPublishThrottle.test.js — PET-M4 (deliverable 1: rate-limit + heurística).
//
// Cobre os predicados PUROS e DETERMINÍSTICOS de petDomain — sem Date.now() em
// lugar nenhum: o tempo (`nowMs`) é SEMPRE injetado. Asserções-chave da aceitação:
//   • uma RAJADA de publicações byte-idênticas é barrada (o caso central do YAML);
//   • o reenvio byte-idêntico é detectado dentro da janela e libera após ela;
//   • a rajada por VOLUME é barrada ao atingir o teto e respeita a janela
//     deslizante (entradas velhas saem da contagem);
//   • a assinatura ignora o idempotency_key (que muda a cada tentativa de UI) mas
//     distingue qualquer mudança de CONTEÚDO;
//   • cada código de bloqueio mapeia para uma cópia CALMA e não-punitiva.
//
// Usa o petDomain REAL (nada mockado) — são funções puras, é o teste mais barato
// e o mais forte (knowledge-in-the-world: a regra de janela vira detector, não
// um comentário que pede para o leitor lembrar do "~3 em 1 minuto").

import { describe, it, expect } from 'vitest';
import {
  classifyPublishThrottle,
  isPublishRateLimited,
  publishPayloadSignature,
  PET_PUBLISH_THROTTLE,
  PET_PUBLISH_THROTTLE_COPY,
  PET_PUBLISH_RATE_LIMIT,
} from './petDomain';

const T0 = 1_000_000; // relógio base arbitrário em ms (injetado — determinístico)

// Payload "típico" de publicação. Reusado para construir o caso byte-idêntico.
function payload(over = {}) {
  return {
    coords: [-8.0671132, -34.8766719],
    status: 'perdido',
    species: 'cao',
    size: 'medio',
    color: 'caramelo',
    name: 'Rex',
    contact: '5581999990000',
    detail: 'coleira azul',
    photos: '',
    // idempotency_key MUDA a cada tentativa de UI — não pode entrar na assinatura.
    idempotency_key: Math.random().toString(36),
    ...over,
  };
}

// Constrói um histórico de N tentativas idênticas, todas no instante `at`.
function historyOf(n, at, p) {
  const sig = publishPayloadSignature(p);
  return Array.from({ length: n }, () => ({ at, signature: sig }));
}

describe('publishPayloadSignature — estável e content-only', () => {
  it('ignora o idempotency_key (muda a cada tentativa) mas é igual p/ mesmo conteúdo', () => {
    const a = payload({ idempotency_key: 'k1' });
    const b = payload({ idempotency_key: 'k2-totalmente-diferente' });
    expect(publishPayloadSignature(a)).toBe(publishPayloadSignature(b));
  });

  it('muda quando QUALQUER campo de conteúdo muda', () => {
    const base = publishPayloadSignature(payload());
    expect(publishPayloadSignature(payload({ status: 'avistado' }))).not.toBe(base);
    expect(publishPayloadSignature(payload({ detail: 'outro detalhe' }))).not.toBe(base);
    expect(publishPayloadSignature(payload({ coords: [-9, -35] }))).not.toBe(base);
  });

  it('é determinística sob ordem de chaves do objeto (mesma composição → mesma string)', () => {
    const ordered = { coords: [-8, -34], status: 'perdido', species: 'cao' };
    const shuffled = { species: 'cao', status: 'perdido', coords: [-8, -34] };
    expect(publishPayloadSignature(ordered)).toBe(publishPayloadSignature(shuffled));
  });
});

describe('classifyPublishThrottle — rajada idêntica (caso central PET-M4)', () => {
  it('uma RAJADA de publicações byte-idênticas é barrada como IDENTICAL', () => {
    const p = payload();
    // Acabou de publicar ESTE MESMO relato há 1s — o reenvio é duplicata.
    const history = historyOf(1, T0 - 1000, p);
    expect(classifyPublishThrottle(history, T0, p)).toBe(PET_PUBLISH_THROTTLE.IDENTICAL);
    expect(isPublishRateLimited(history, T0, p)).toBe(true);
  });

  it('IDENTICAL tem precedência sobre BURST (cópia mais específica e menos ansiosa)', () => {
    const p = payload();
    // 3 idênticas recentes: bateria tanto a regra de volume quanto a de duplicata.
    const history = historyOf(3, T0 - 1000, p);
    expect(classifyPublishThrottle(history, T0, p)).toBe(PET_PUBLISH_THROTTLE.IDENTICAL);
  });

  it('libera o reenvio idêntico DEPOIS da janela de duplicata', () => {
    const p = payload();
    const old = T0 - (PET_PUBLISH_RATE_LIMIT.identicalWindowMs + 1);
    const history = historyOf(1, old, p);
    // Fora da janela de duplicata E fora da janela de rajada → OK.
    expect(classifyPublishThrottle(history, T0, p)).toBe(PET_PUBLISH_THROTTLE.OK);
  });
});

describe('classifyPublishThrottle — rajada por VOLUME (janela deslizante)', () => {
  it('barra como BURST ao atingir o teto de publicações DISTINTAS na janela', () => {
    // maxInWindow tentativas DIFERENTES (assinaturas distintas → não é IDENTICAL),
    // todas dentro da janela → BURST.
    const recent = T0 - 1000;
    const history = [];
    for (let i = 0; i < PET_PUBLISH_RATE_LIMIT.maxInWindow; i += 1) {
      history.push({ at: recent, signature: publishPayloadSignature(payload({ name: `pet${i}` })) });
    }
    const next = payload({ name: 'pet-novo' });
    expect(classifyPublishThrottle(history, T0, next)).toBe(PET_PUBLISH_THROTTLE.BURST);
  });

  it('NÃO barra abaixo do teto (uso humano legítimo passa)', () => {
    const recent = T0 - 1000;
    const history = [];
    for (let i = 0; i < PET_PUBLISH_RATE_LIMIT.maxInWindow - 1; i += 1) {
      history.push({ at: recent, signature: publishPayloadSignature(payload({ name: `pet${i}` })) });
    }
    expect(classifyPublishThrottle(history, T0, payload({ name: 'mais-um' }))).toBe(PET_PUBLISH_THROTTLE.OK);
  });

  it('entradas FORA da janela deslizante não contam para a rajada', () => {
    const old = T0 - (PET_PUBLISH_RATE_LIMIT.windowMs + 1);
    const history = [];
    for (let i = 0; i < PET_PUBLISH_RATE_LIMIT.maxInWindow + 2; i += 1) {
      history.push({ at: old, signature: publishPayloadSignature(payload({ name: `velho${i}` })) });
    }
    // Todas velhas → contagem na janela = 0 → OK.
    expect(classifyPublishThrottle(history, T0, payload({ name: 'agora' }))).toBe(PET_PUBLISH_THROTTLE.OK);
  });

  it('histórico vazio / ausente → OK (defensivo, nunca lança)', () => {
    expect(classifyPublishThrottle([], T0, payload())).toBe(PET_PUBLISH_THROTTLE.OK);
    expect(classifyPublishThrottle(undefined, T0, payload())).toBe(PET_PUBLISH_THROTTLE.OK);
    expect(classifyPublishThrottle(null, T0, payload())).toBe(PET_PUBLISH_THROTTLE.OK);
  });
});

describe('PET_PUBLISH_THROTTLE_COPY — tom calmo, não punitivo', () => {
  it('cada código de bloqueio tem cópia distinta, não-vazia e sem alarme', () => {
    const blocked = [PET_PUBLISH_THROTTLE.BURST, PET_PUBLISH_THROTTLE.IDENTICAL];
    const copies = blocked.map((c) => PET_PUBLISH_THROTTLE_COPY[c]);
    expect(new Set(copies).size).toBe(blocked.length);
    for (const copy of copies) {
      expect(typeof copy).toBe('string');
      expect(copy.length).toBeGreaterThan(0);
      expect(copy).not.toMatch(/ERRO!!!|ERRO!|BLOQUEAD|PROIBID/i); // nada punitivo
    }
    // A de duplicata tranquiliza que JÁ está no mapa (não precisa reenviar).
    expect(PET_PUBLISH_THROTTLE_COPY[PET_PUBLISH_THROTTLE.IDENTICAL]).toMatch(/já está no mapa/i);
    // A de rajada pede paciência, sem acusar.
    expect(PET_PUBLISH_THROTTLE_COPY[PET_PUBLISH_THROTTLE.BURST]).toMatch(/instante|organizad/i);
  });
});
