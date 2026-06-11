'use client';

// petAnalytics.js — PET-M21. Funil de observabilidade do /pets sobre o SEAM
// EXISTENTE (analytics.track / analytics.trackError). NÃO inventa um logger nem
// adiciona um vendor novo: importa o transporte já usado pelo app de fome
// (window.gtag → window.dataLayer → sessionStorage) e só DEFINE os eventos do
// funil de pets numa camada fina. A SOT do transporte continua sendo analytics.js;
// aqui mora apenas a FORMA dos eventos de pet (nomes + propriedades permitidas).
//
// POR QUE um módulo pets/* e não editar analytics.js (HARD constraint da PET-M21):
// os nomes/propriedades destes eventos são domínio de PETS, não do app de fome.
// Mantê-los aqui evita inchar o seam compartilhado e respeita o single-responsibility:
// analytics.js TRANSPORTA; petAnalytics DEFINE o vocabulário do funil de pet.
//
// ─── A INVARIANTE DURA: ZERO PII ───────────────────────────────────────────────
// NENHUM evento carrega contato, texto livre (name/color/detail) ou nome do pet.
// A defesa NÃO é "lembrar de não passar PII" (um comentário não é forcing-function):
// cada emissor monta o payload por uma ALLOW-LIST de campos enumerados/codificados
// (status, espécie, motivo de fechamento, reasonCode de falha — todos da SOT
// petDomain, conjuntos finitos e públicos). Um objeto cru de pet/payload NUNCA é
// espalhado (`...pet`) num evento. Assim, mesmo que um chamador passe o pet inteiro,
// só os campos da allow-list saem — vazar PII exigiria EDITAR a allow-list, o que um
// teste vigia (petAnalytics.test.js: assert nenhum contato/texto-livre/nome aparece).
//
// As COORDS: a PET-M21 manda "arredondadas como o analytics.js já faz, OU omitidas
// se mais simples". Escolhemos OMITIR coords de todos os eventos do funil — elas não
// agregam ao funil (report→publish→reunir/encerrar é medido por CONTAGEM e por
// reasonCode, não por geografia) e omiti-las é a barricada de privacidade mais
// simples e mais forte (Postel: estrito na SAÍDA). Quando uma futura métrica precisar
// de geografia agregada, o helper roundCoord abaixo (mesma precisão do analytics.js)
// já existe — mas hoje nenhum evento o usa por design.

import { track } from '../components/compatibility/components/ux/analytics';
import { PET_PUBLISH_FAILURE, PET_CLOSURE_REASON } from './petDomain';

// Prefixo estável dos eventos do funil de pet (SOT dos NOMES, num lugar só). Um
// dashboard filtra o funil inteiro por `pet_*`; ninguém escreve a string de nome
// de evento espalhada — todos os emissores derivam daqui.
const PET_EVENT = {
  REPORT_STARTED: 'pet_report_started',
  REPORT_PUBLISHED: 'pet_report_published',
  REPORT_FAILED: 'pet_report_failed',
  OPENED: 'pet_opened',
  MARKED_REUNIDO: 'pet_marked_reunido',
  ENCERROU_BUSCA: 'pet_encerrou_busca',
};

export { PET_EVENT };

// Conjunto FINITO de reasonCodes de falha válidos (da SOT). Um código fora da SOT
// (lixo/undefined) cai para GENERIC — o evento de falha NUNCA carrega um valor cru
// não-classificado, e jamais a mensagem técnica do erro (essa, quando logada, vai
// pelo analytics.trackError, que já tem redação de token; aqui o funil só conta a
// CLASSE da falha, nunca o detalhe).
const FAILURE_CODES = new Set(Object.values(PET_PUBLISH_FAILURE));
function safeFailureReason(reasonCode) {
  return FAILURE_CODES.has(reasonCode) ? reasonCode : PET_PUBLISH_FAILURE.GENERIC;
}

// Conjunto FINITO de motivos de fechamento (da SOT). Defende os eventos de
// reunir/encerrar contra um motivo lixo (→ undefined, omitido do payload).
const CLOSURE_CODES = new Set(Object.values(PET_CLOSURE_REASON));
function safeClosureReason(reason) {
  return CLOSURE_CODES.has(reason) ? reason : undefined;
}

// Normaliza um id de status/espécie a uma string ENUMERADA segura. Um status/espécie
// é um id de SET fechado (petDomain), nunca texto livre — mas defendemos a forma
// (coage a string, apara) para um payload malformado não vazar um objeto. Vazio → omitido.
function enumOrUndefined(id) {
  const s = typeof id === 'string' ? id.trim() : '';
  return s || undefined;
}

// Remove as chaves `undefined` de um payload — mantém os eventos enxutos e evita
// emitir uma propriedade nula (espelha a higiene do analytics.js, que só empacota o
// que tem valor). PURA.
function compact(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// Arredonda uma coord à MESMA precisão do analytics.js (6 casas, ~11 cm). Mantido
// aqui para PARIDADE com o seam (se uma futura métrica agregada precisar de
// geografia, usa-se ISTO, não um arredondamento ad hoc). HOJE nenhum evento do
// funil o chama — coords são OMITIDAS por design (ver cabeçalho). PURA.
export function roundCoord(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n * 1e6) / 1e6;
}

// ─── EMISSORES DO FUNIL (report → publish → reunir/encerrar) ──────────────────
// Cada um monta o payload por ALLOW-LIST e delega ao seam `track`. Nenhum espalha
// um objeto cru. Todos são seguros para chamar no boundary do browser; `track` já
// guarda contra SSR (typeof window) e nome vazio.

// O dono ABRIU a sheet de relato (topo do funil). `species` é opcional e enumerado
// (a sheet arranca em 'outro'); nenhum dado livre.
export function trackReportStarted({ species } = {}) {
  track(PET_EVENT.REPORT_STARTED, compact({
    species: enumOrUndefined(species),
  }));
}

// PUBLICAÇÃO bem-sucedida. Só status + espécie (enumerados da SOT) — o sinal de
// "que tipo de relato foi publicado" sem geografia, contato ou texto.
export function trackReportPublished({ status, species } = {}) {
  track(PET_EVENT.REPORT_PUBLISHED, compact({
    status: enumOrUndefined(status),
    species: enumOrUndefined(species),
  }));
}

// FALHA de publicação — carrega o reasonCode DIFERENCIADO do PET-M1 (offline /
// out_of_bounds / server_slow / generic) e o flag `queued` (foi guardado na fila?),
// para o funil medir a CONFIABILIDADE que o PET-M1 comprou. NUNCA a mensagem técnica
// (essa vai pelo trackError, com redação de token), nunca PII.
export function trackReportFailed({ reasonCode, queued } = {}) {
  track(PET_EVENT.REPORT_FAILED, compact({
    reason: safeFailureReason(reasonCode),
    queued: Boolean(queued),
  }));
}

// Uma sheet de DETALHE foi aberta (meio do funil: descoberta). Só o status do pet
// aberto (enumerado) — mede "que tipo de pet as pessoas abrem" sem identificar o pet.
export function trackPetOpened({ status } = {}) {
  track(PET_EVENT.OPENED, compact({
    status: enumOrUndefined(status),
  }));
}

// Desfecho REUNIDO (fundo do funil — o loop de valor fechou no melhor jeito). O
// motivo é fixo da SOT (REUNIDO), validado; nenhum dado do pet.
export function trackMarkedReunido({ status } = {}) {
  track(PET_EVENT.MARKED_REUNIDO, compact({
    status: enumOrUndefined(status),
    reason: safeClosureReason(PET_CLOSURE_REASON.REUNIDO),
  }));
}

// Desfecho ENCERRAR BUSCA (fundo do funil — fechamento digno e consciente). Distinto
// de reunido no funil para medir os DOIS desfechos separadamente.
export function trackEncerrouBusca({ status } = {}) {
  track(PET_EVENT.ENCERROU_BUSCA, compact({
    status: enumOrUndefined(status),
    reason: safeClosureReason(PET_CLOSURE_REASON.ENCERRADO),
  }));
}
