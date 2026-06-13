// petPublishGuards.js — PET-M1/M4: o que decidir sobre uma TENTATIVA de publicação.
// Responsabilidade única: classificar uma falha de publicação num código estável
// (+ a cópia calma) E aplicar a heurística de throttle/rate-limit (rajada/idêntico).
// PURO e DETERMINÍSTICO: o chamador injeta estado de rede (isOffline) e tempo
// (nowMs) — nenhum Date.now()/navigator aqui. É o ÚNICO leaf de pet que acopla a
// i18n (`t`): a cópia resolve no idioma ATIVO. Re-exportado pelo barrel petDomain.js
// (todo `import { classifyPublishFailure, … } from './petDomain'` segue casando).

import { t } from '../components/compatibility/components/ux/strings';
import { OUT_OF_COUNTRY_BBOX } from '../components/compatibility/components/googlesheets/sheetsClient';

// ─── Classificação de FALHA de publicação (SOT) ──────────────────────────────
// PET-M1. Antes existia UMA única string genérica ('publish_failed'). Agora a
// causa real é classificada num código estável e mapeada para uma cópia CALMA
// distinta (governador de tom: nada de "ERRO!!!", sem urgência, pt-BR).
//
// PURA e DETERMINÍSTICA: recebe um erro (ou null) e devolve só o CÓDIGO. Nenhum
// Date.now()/navigator aqui — quem chama injeta o estado de rede (isOffline) e o
// tempo, mantendo o domínio testável (espelha buildPetDados/publishPet).
//
// Códigos (chaves estáveis; a UI lê a cópia em PET_PUBLISH_FAILURE_COPY):
//   • 'out_of_bounds' — coords fora da área atendida (SheetsValidationError).
//   • 'offline'       — sem internet: foi enfileirado, será enviado depois.
//   • 'server_slow'   — timeout/lento: PODE ter sido salvo, não republique.
//   • 'generic'       — qualquer outra falha (fallback calmo).
export const PET_PUBLISH_FAILURE = {
  OUT_OF_BOUNDS: 'out_of_bounds',
  OFFLINE: 'offline',
  SERVER_SLOW: 'server_slow',
  GENERIC: 'generic',
};

// Cópia CALMA por código. Cada linha LOWERS a ansiedade do dono — reassegura,
// nunca cobra. Lida pela UI via role=alert. PET-M23: a STRING não é mais inline
// aqui — cada código RESOLVE via t('pets.publish.failed.<code>') no idioma ATIVO
// (getters reavaliam a cada acesso). A SOT do CÓDIGO continua sendo PET_PUBLISH_
// FAILURE; a SOT da CÓPIA é strings.js. Object.values()/spread também funcionam
// (os getters são enumeráveis), então quem itera as cópias segue funcionando.
export const PET_PUBLISH_FAILURE_COPY = Object.freeze(
  Object.defineProperties({}, {
    [PET_PUBLISH_FAILURE.OUT_OF_BOUNDS]: { enumerable: true, get: () => t('pets.publish.failed.out_of_bounds') },
    [PET_PUBLISH_FAILURE.OFFLINE]:       { enumerable: true, get: () => t('pets.publish.failed.offline') },
    [PET_PUBLISH_FAILURE.SERVER_SLOW]:   { enumerable: true, get: () => t('pets.publish.failed.server_slow') },
    [PET_PUBLISH_FAILURE.GENERIC]:       { enumerable: true, get: () => t('pets.publish.failed.generic') },
  }),
);

// Erros (mensagem ou .name) que indicam servidor LENTO / timeout. O write pode
// ter chegado ao servidor: a fila reenvia depois e a chave de idempotência evita
// o duplo-append, então a cópia diz "pode ter sido salvo, não republique".
const SERVER_SLOW_RE = /network_slow|timeout|timed out|abort/i;
// Erros que indicam rede caída / fetch falho (distinto de "lento").
const NETWORK_RE = /network|failed to fetch|networkerror|offline/i;

// Classifica uma falha de publicação num código estável. `isOffline` é INJETADO
// pelo chamador (navigator.onLine) para manter a função pura/determinística.
// Ordem de precedência: out-of-bounds (regra de negócio) > offline (estado de
// rede explícito) > lento/timeout (write pode ter saído) > rede caída > genérico.
export function classifyPublishFailure(error, { isOffline = false } = {}) {
  // INTL M3 (SCOPE-2/FACT-2): classifica out_of_bounds pelo CÓDIGO ESTÁVEL de
  // geofence (.reason === OUT_OF_COUNTRY_BBOX) APENAS. Detecta por shape (não por
  // instanceof — sobrevive a fronteiras de módulo/bundle), mas NÃO mais pelo
  // `error.name === 'SheetsValidationError'` genérico: aquele catch-all bucketava
  // QUALQUER SheetsValidationError (telefone/rating) como out_of_bounds, uma
  // mis-classificação latente que também mascarava esta própria migração de reason
  // (o ramo do name "passava" mesmo se o reason mudasse). Erros de telefone/rating
  // agora caem nos ramos seguintes (offline/rede/genérico), não em "fora do país".
  if (error && error.reason === OUT_OF_COUNTRY_BBOX) {
    return PET_PUBLISH_FAILURE.OUT_OF_BOUNDS;
  }
  if (isOffline) {
    return PET_PUBLISH_FAILURE.OFFLINE;
  }
  const msg = (error && (error.message || String(error))) || '';
  if (SERVER_SLOW_RE.test(msg)) {
    return PET_PUBLISH_FAILURE.SERVER_SLOW;
  }
  if (NETWORK_RE.test(msg)) {
    // Rede caída em runtime sem navigator.onLine ter pegado: tratamos como offline
    // (foi/​será enfileirado) para a cópia reassegurar em vez de assustar.
    return PET_PUBLISH_FAILURE.OFFLINE;
  }
  return PET_PUBLISH_FAILURE.GENERIC;
}

// Verdade ÚNICA de "esta falha deve ir para a fila offline?" — usada pela UI E
// pelos testes (sem reimplementar a regex em dois lugares). offline e server_slow
// vão pra fila (o input não se perde); out_of_bounds e generic NÃO (o usuário
// precisa corrigir / é uma falha real que enfileirar só esconderia).
export function shouldQueuePublishFailure(reasonCode) {
  return reasonCode === PET_PUBLISH_FAILURE.OFFLINE
    || reasonCode === PET_PUBLISH_FAILURE.SERVER_SLOW;
}

// ─── PET-M4 — guarda-corpos de confiança: rate-limit + heurística de abuso ────
//
// HONESTIDADE DE ESCOPO (leia antes): estes controles são do LADO DO CLIENTE e,
// portanto, BURLÁVEIS. Enquanto NEXT_PUBLIC_GOOGLE_PRIVATE_KEY embarca a chave de
// escrita no bundle, um agente determinado escreve direto na planilha sem passar
// por nada disto (superfície herdada P14, HIGH-severity, mesma do homolog). Eles
// existem para amortecer o ABUSO ACIDENTAL e o de baixo esforço (double-tap
// nervoso do dono em pânico, um bot ingênuo de formulário) com tom CALMO — não
// para deter um atacante. A correção DURÁVEL é um PROXY DE ESCRITA no servidor
// que REMOVE o segredo NEXT_PUBLIC do cliente; isso é um HANDOFF de
// bug-bounty/arquitetura-de-segredo (espelha homolog P14), NÃO resolvido aqui.
// (Section 2 conservation_of_complexity: a complexidade essencial de "confiar na
// escrita" pertence ao SERVIDOR, não a cada cliente.)
//
// SOT dos limites de rate-limit/abuso. Um lugar só — a UI E os testes leem daqui;
// mudar a janela é uma edição de uma linha. Os valores iniciais são conservadores
// (deixam passar o uso humano legítimo): um dono raramente publica >3 pets em 1
// minuto, e NUNCA o byte-idêntico duas vezes de propósito.
export const PET_PUBLISH_RATE_LIMIT = {
  // Janela deslizante (ms) e teto de publicações DENTRO dela.
  windowMs: 60000,        // 1 minuto
  maxInWindow: 3,         // >3 na janela = rajada suspeita
  // Janela (ms) em que um payload BYTE-IDÊNTICO repetido é tratado como duplicata
  // de spam (distinto do double-tap idempotente legítimo, que o idempotency_key
  // de petsData já cobre — aqui é a MESMA composição reenviada de novo e de novo).
  identicalWindowMs: 120000, // 2 minutos
};

// Códigos estáveis de bloqueio do rate-limit (a UI lê a cópia abaixo). PUROS.
export const PET_PUBLISH_THROTTLE = {
  OK: 'ok',                 // pode publicar
  BURST: 'burst',           // publicou demais rápido demais
  IDENTICAL: 'identical',   // mesmíssimo relato repetido (provável duplicata)
};

// Cópia CALMA por código. NUNCA punitiva: o dono em pânico não é um inimigo. Cada
// linha tranquiliza e dá o próximo passo — "já está no mapa", "espere um instante"
// — em vez de acusar (governador de tom). PET-M23: a STRING resolve via
// t('pets.publish.throttle.<code>') no idioma ATIVO (getters), não mais inline.
export const PET_PUBLISH_THROTTLE_COPY = Object.freeze(
  Object.defineProperties({}, {
    [PET_PUBLISH_THROTTLE.BURST]:     { enumerable: true, get: () => t('pets.publish.throttle.burst') },
    [PET_PUBLISH_THROTTLE.IDENTICAL]: { enumerable: true, get: () => t('pets.publish.throttle.identical') },
  }),
);

// Assinatura ESTÁVEL e determinística de um payload de publicação, para detectar
// o reenvio byte-idêntico. PURA: extrai só os campos que DEFINEM o relato (não o
// idempotency_key, que muda a cada tentativa de UI) e os serializa numa ordem
// fixa. Dois payloads com os mesmos campos de conteúdo → mesma assinatura, mesmo
// que o idempotency_key difira. Coords são normalizadas via JSON do array.
export function publishPayloadSignature(payload) {
  const p = payload || {};
  // Ordem de chaves fixa (não depende da ordem de inserção do objeto) — a mesma
  // composição sempre gera a mesma string.
  return JSON.stringify([
    Array.isArray(p.coords) ? p.coords : null,
    p.status || '',
    p.species || '',
    p.size || '',
    p.color || '',
    p.name || '',
    p.contact || '',
    p.detail || '',
    p.photos || '',
  ]);
}

// Predicado PURO e DETERMINÍSTICO do rate-limit/abuso. `nowMs` é INJETADO pelo
// chamador (nunca Date.now() aqui — mantém testável; espelha buildPetDados/
// classifyPublishFailure). `history` é uma lista de tentativas anteriores no
// formato { at, signature } (mais antigas ou mais novas, em qualquer ordem — a
// função filtra por janela). Devolve um código de PET_PUBLISH_THROTTLE:
//   • IDENTICAL — existe no histórico, dentro de identicalWindowMs, uma tentativa
//     com a MESMA assinatura de conteúdo (reenvio do mesmíssimo relato);
//   • BURST     — há >= maxInWindow tentativas dentro de windowMs;
//   • OK        — pode publicar.
// Precedência: IDENTICAL antes de BURST (a cópia de "é igual" é mais específica e
// menos ansiosa que a de "muitos relatos"). Limites lidos do SOT acima; aceita um
// override opcional só para testes determinísticos.
export function classifyPublishThrottle(history, nowMs, payload, limits = PET_PUBLISH_RATE_LIMIT) {
  const list = Array.isArray(history) ? history : [];
  const sig = publishPayloadSignature(payload);

  // 1) Reenvio byte-idêntico dentro da janela de duplicata.
  const identicalCutoff = nowMs - limits.identicalWindowMs;
  for (const h of list) {
    if (h && h.at >= identicalCutoff && h.signature === sig) {
      return PET_PUBLISH_THROTTLE.IDENTICAL;
    }
  }

  // 2) Rajada: conta tentativas dentro da janela deslizante.
  const burstCutoff = nowMs - limits.windowMs;
  let inWindow = 0;
  for (const h of list) {
    if (h && h.at >= burstCutoff) inWindow += 1;
  }
  if (inWindow >= limits.maxInWindow) {
    return PET_PUBLISH_THROTTLE.BURST;
  }

  return PET_PUBLISH_THROTTLE.OK;
}

// Açúcar booleano sobre o classificador, para o ponto de decisão de petsData ler
// "devo bloquear esta publicação?" sem reimplementar a regra. PURO.
export function isPublishRateLimited(history, nowMs, payload, limits = PET_PUBLISH_RATE_LIMIT) {
  return classifyPublishThrottle(history, nowMs, payload, limits) !== PET_PUBLISH_THROTTLE.OK;
}
