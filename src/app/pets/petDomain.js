// petDomain.js — SOT (single source of truth) do domínio /pets (pets perdidos).
//
// Tudo que descreve um pet (status, espécie, porte) e a forma do seu blob `Dados`
// vive AQUI e em nenhum outro lugar. Nunca escreva a string 'perdido' (ou qualquer
// id/label) hardcoded em outro arquivo — importe da lista/mapa deste módulo.
//
// ─── ESTRUTURA (PET-M: split FF1) ────────────────────────────────────────────
// Este módulo cresceu além do limite FF1 (1000 LOC) e foi dividido em quatro peças
// numa DAG limpa (sem ciclos), mantendo a API PÚBLICA IDÊNTICA: este arquivo é o
// BARREL — re-exporta tudo que não define mais, então todo `import { X } from
// './petDomain'` (app E testes) segue funcionando sem nenhuma edição no chamador.
//   • petTaxonomy.js     — CAMADA-FOLHA: constantes/validadores SOT + cor + as
//       primitivas compartilhadas (MS_PER_DAY/isFiniteCoordPair/haversineKm) + os
//       predicados de ciclo de vida por idade/resolução (PET-M2/M12) de que o
//       match precisa. Não importa nenhum outro módulo de pet.
//   • petFilterDomain.js — PET-M7: estado do filtro + predicado puro. → petTaxonomy.
//   • petMatch.js        — PET-M9b match + PET-M12b de-dup. → petTaxonomy.
//   • petDomain.js (este)— o REMANESCENTE: parse/build do blob, higiene de texto
//       livre, motivo de fechamento, falha+throttle de publicação, identidade por
//       coords + deep link, flag de denúncia, exclusão por idade (wrappers M12) e
//       distância+ordenação da lista (M8). → petTaxonomy. E re-exporta os 3 acima.
//
// Disciplina de fronteira (v5 § defensive_programming.barricade_pattern):
//   • buildPetDados é PURA: valida, mas NÃO carimba data nem chama Date.now() —
//     quem chama (petsData.publishPet) injeta `dateIso`. Mantém o módulo testável
//     e determinístico.
//   • parsePetRow é a barricada de LEITURA: todo parse é try/catch e retorna null
//     em qualquer entrada malformada — nunca lança (não pode derrubar o batch).
//
// Discriminador de coexistência: linhas de pet ficam na MESMA planilha do app de
// fome, distinguidas só por `kind:'pet'`. Sem `Roaster`/`Categorias`, ficam
// invisíveis a todas as superfícies de fome (ver análise no PetMarkers/relatório).

import { t } from '../components/compatibility/components/ux/strings';
import {
  PET_KIND,
  isPetRow,
  isValidStatus,
  isFiniteCoordPair,
  haversineKm,
  PET_RESOLVED_AT_KEY,
  PET_FRESHNESS_AT_KEY,
  isPetArchivedByAge,
  PET_ARCHIVE_WINDOW_DAYS,
} from './petTaxonomy';

// ─── BARREL — re-exporta os módulos extraídos para manter a API pública INTACTA ─
// Re-export NOMEADO (não `export *`): preserva EXATAMENTE a superfície pública
// original — cada `import { X } from './petDomain'` (app E testes) segue casando —
// SEM vazar os helpers internos compartilhados que vivem na folha só para a DAG
// (MS_PER_DAY/isFiniteCoordPair/haversineKm continuam privados ao domínio, como
// eram antes do split). A ordem não cria ciclo: este arquivo importa só de
// petTaxonomy (a folha); petFilterDomain/petMatch também só importam da folha —
// nenhum deles importa de volta o petDomain.
export {
  // petTaxonomy — constantes/validadores SOT + cor + ciclo de vida por idade/resolução
  PET_KIND,
  PET_STATUSES,
  PET_STATUS_MAP,
  PET_SPECIES,
  PET_SIZES,
  PET_COLORS,
  PET_RECENCY_OPTIONS,
  PET_RECENCY_MAP,
  isPetRow,
  isValidStatus,
  isValidSpecies,
  isValidSize,
  isValidColor,
  normalizePetColorToBucket,
  PET_RESOLVED_AT_KEY,
  PET_FRESHNESS_AT_KEY,
  isPetResolved,
  PET_ARCHIVE_WINDOW_DAYS,
  petAgeDays,
  isPetArchivedByAge,
} from './petTaxonomy';
export {
  // petFilterDomain — PET-M7 estado do filtro + predicado
  defaultPetFilter,
  matchesPetFilter,
  filterPets,
  countActivePetFilterFacets,
  togglePetFilterValue,
  setPetFilterRecency,
} from './petFilterDomain';
export {
  // petMatch — PET-M9b match + PET-M12b de-dup
  PET_MATCH_DEFAULTS,
  PET_MATCH_STRENGTH,
  petMatchStrength,
  findPossibleMatches,
  PET_DEDUP_DEFAULTS,
  isNearDuplicate,
  groupNearDuplicates,
} from './petMatch';

// Sanitiza a URL de fotos (ex.: link de pasta do Google Drive). PURA: aceita
// SÓ http/https — qualquer outro esquema (javascript:, data:, ftp:, lixo) vira
// '' . É a barricada que protege o <a href> renderizado no PetDetailSheet de
// carregar um esquema perigoso, já que a URL vem de entrada livre do usuário.
// Roda igual no browser e no Node (URL é global em ambos).
export function sanitizePhotosUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  let parsed;
  try {
    parsed = new URL(v);
  } catch (_e) {
    return '';
  }
  return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? v : '';
}

// ─── PET-M3 — higiene de TEXTO LIVRE (sanitizer puro e determinístico) ───────
// SOT dos limites de comprimento de cada campo de texto livre que vai para o
// blob `Dados` PÚBLICO. Antes, name/color/detail entravam crus com só `|| ''`:
// um achador podia colar uma placa, um endereço exato, dados de terceiros ou
// caracteres de controle (que quebram o JSON renderizado / abrem espaço para
// truques de exibição). Estes limites espelham os maxLength dos inputs do
// PetReportSheet — manter os DOIS em sincronia é a regra; este módulo é a verdade
// que de fato BARRA no momento da montagem (o maxLength do input é só conforto de
// digitação e é contornável colando texto/automação).
export const PET_FREETEXT_MAXLEN = {
  name: 40,
  color: 40,
  detail: 140,
};

// Sanitiza UM campo de texto livre. PURA + DETERMINÍSTICA (sem Date.now()):
//   1. coage para string e apara as pontas;
//   2. REMOVE apenas caracteres de CONTROLE — C0 (\x00–\x1F: inclui \t \n \r),
//      DEL (\x7F) e C1 (\x80–\x9F). NUNCA toca em Unicode imprimível: acentos,
//      ç, ã, emoji e pontuação sobrevivem (a barricada é contra controle, não
//      contra idioma — corromper pt-BR seria um bug, não uma defesa);
//   3. colapsa espaços em branco repetidos (resíduo de uma quebra de linha
//      removida vira um espaço só, não cola duas palavras);
//   4. corta no limite do campo (cap de comprimento) e apara de novo.
// É a forcing-function que substitui o antigo caminho cru `valor || ''` — um
// teste fixa que controle some e que o acento permanece.
//
// Implementação Unicode-safe: itera por code points (spread de string) para não
// partir um par substituto (emoji) ao aplicar o cap; o filtro de controle usa um
// teste por code point, não um regex de classe \p (compat ampla de runtime).
export function sanitizeFreeText(raw, maxLen) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  const cap = Number.isFinite(maxLen) && maxLen > 0 ? maxLen : Infinity;
  const out = [];
  for (const ch of s) {
    const code = ch.codePointAt(0);
    // C0 + DEL + C1: faixas de controle. Tudo o mais (incl. acentos/ç/ã/emoji) passa.
    const isControl = code <= 0x1f || (code >= 0x7f && code <= 0x9f);
    if (isControl) {
      out.push(' '); // vira espaço; o colapso abaixo limpa o excedente
    } else {
      out.push(ch);
    }
    if (out.length >= cap) break;
  }
  // Colapsa espaços repetidos (inclui os criados ao trocar controle por espaço)
  // e apara — entrada determinística → saída determinística.
  return out.join('').replace(/\s{2,}/g, ' ').trim();
}

// ─── PET-M7b — DISCRIMINADOR de MOTIVO do fechamento (closureReason, SOT) ─────
// `resolvedAt` (PET-M2) diz QUANDO o report saiu do mapa ativo. `closureReason`
// diz POR QUÊ — e os dois desfechos do estágio E da curva (PET_CURVE §1-E) são
// semanticamente DISTINTOS, embora ambos carimbem resolvedAt:
//   • REUNIDO   — o pet voltou (o desfecho mais esperançoso).
//   • ENCERRADO — o dono parou de procurar, um fechamento DIGNO e consciente
//                 (distinto de envelhecer/arquivar em silêncio pela janela do M12).
// Round-trip igual ao resolvedAt: buildPetDados EMITE a chave só quando presente,
// parsePetRow a LÊ de volta, e linhas antigas (sem a chave) leem como undefined
// (backward-compat). Ninguém escreve a string literal 'closureReason' fora deste
// módulo — o writer (petsData.resolvePet) e o parser usam esta constante.
export const PET_CLOSURE_REASON_KEY = 'closureReason';

// Os DOIS motivos válidos (SOT). Ids estáveis (vão pra planilha). Ninguém escreve
// 'reunido'/'encerrado' hardcoded como motivo — importam destas constantes.
export const PET_CLOSURE_REASON = {
  REUNIDO: 'reunido',
  ENCERRADO: 'encerrado',
};

const CLOSURE_REASON_IDS = new Set(Object.values(PET_CLOSURE_REASON));

// Um motivo de fechamento é válido? Defensivo: qualquer valor fora da SOT (lixo,
// undefined) → false. PURO. Usado por buildPetDados (barricada de escrita) e pode
// ser lido por qualquer consumidor que precise distinguir os dois desfechos.
export function isValidClosureReason(reason) {
  return CLOSURE_REASON_IDS.has(reason);
}

// Monta o blob `Dados` de uma linha de pet. PURA: lança Error claro se status ou
// coords forem inválidos; exige `dateIso` do chamador (sem Date.now() aqui).
// Campos de texto opcionais caem para string vazia.
//
// PET-M2 — ciclo de vida "reunido": `resolvedAt` é OPCIONAL e, igual a `dateIso`,
// é INJETADO pelo chamador (ISO string; nunca Date.now() aqui — a função segue
// pura/determinística). Só é EMITIDO quando fornecido: uma linha recém-publicada
// (sem resolvedAt) não carrega a chave, e o parser a lê de volta como ATIVA
// (backward-compat). Isto REMOVE a suposição implícita de que todo pet montado
// está ativo — o estado agora é explícito no blob.
export function buildPetDados({ coords, status, species, size, color, name, contact, detail, photos, dateIso, resolvedAt, closureReason, freshnessAt }) {
  if (!isValidStatus(status)) {
    throw new Error(`buildPetDados: status inválido "${status}"`);
  }
  if (!isFiniteCoordPair(coords)) {
    throw new Error('buildPetDados: coords deve ser um par [lat,lng] finito');
  }
  // PET-M3 — texto livre passa pela barricada de higiene (cap + strip de
  // controle), nunca mais cru. `species`/`size` são ids validados contra um Set
  // (não texto livre), então só caem para ''. `contact` NÃO é higienizado aqui
  // de propósito: o resolveContact já o trata como ação (nunca como texto cru
  // renderizado) e o cap dele vive no input; aplicar strip de controle a um
  // identificador/telefone poderia mexer em formatação legítima.
  const dados = {
    kind: PET_KIND,
    status,
    species: species || '',
    size: size || '',
    color: sanitizeFreeText(color, PET_FREETEXT_MAXLEN.color),
    name: sanitizeFreeText(name, PET_FREETEXT_MAXLEN.name),
    contact: contact || '',
    Detalhe: sanitizeFreeText(detail, PET_FREETEXT_MAXLEN.detail),
    photos: sanitizePhotosUrl(photos),
    Coordinates: JSON.stringify(coords),
    DateISO: dateIso,
  };
  // Só carimba a chave quando o chamador realmente passou um ISO não-vazio —
  // mantém as linhas ativas LIMPAS (sem campo nulo) e o round-trip simétrico.
  if (resolvedAt) {
    dados[PET_RESOLVED_AT_KEY] = resolvedAt;
  }
  // PET-M7b — `closureReason` segue a MESMA disciplina opcional do resolvedAt:
  // só é emitido quando o chamador passa um motivo VÁLIDO (da SOT). Um motivo
  // lixo/inválido é descartado (não polui o blob) — a barricada de escrita aceita
  // só 'reunido'/'encerrado'. Uma linha ativa (sem fechamento) não carrega a chave
  // e o parser a lê de volta como undefined (backward-compat).
  if (isValidClosureReason(closureReason)) {
    dados[PET_CLOSURE_REASON_KEY] = closureReason;
  }
  // PET-M12/M13 — `freshnessAt` segue a MESMA disciplina opcional do resolvedAt:
  // só é emitido quando o chamador injeta um ISO (o writer de "ainda procurando"
  // do M13). Uma linha recém-publicada NÃO carrega a chave (round-trip limpo) e o
  // parser a lê de volta como undefined → a idade cai no fallback DateISO.
  if (freshnessAt) {
    dados[PET_FRESHNESS_AT_KEY] = freshnessAt;
  }
  return dados;
}

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
  // SheetsValidationError carrega .reason 'outside Brazil bbox' (ver sheetsClient).
  // Detecta por shape (não por instanceof — sobrevive a fronteiras de módulo/bundle).
  if (error && (error.reason === 'outside Brazil bbox' || error.name === 'SheetsValidationError')) {
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

// Lê uma linha da planilha (objeto com `.Dados` em JSON-string) e retorna um pet
// NORMALIZADO ou null. Nunca lança — toda etapa é defensiva (barricada de leitura).
export function parsePetRow(row) {
  if (!row || typeof row.Dados !== 'string') return null;

  let dados;
  try {
    dados = JSON.parse(row.Dados);
  } catch (_e) {
    return null;
  }
  if (!isPetRow(dados)) return null;

  let coords;
  try {
    coords = JSON.parse(dados.Coordinates);
  } catch (_e) {
    return null;
  }
  if (!isFiniteCoordPair(coords)) return null;

  // PET-M2 — ciclo de vida "reunido". Linhas antigas (sem a chave) leem como
  // resolvedAt:undefined → resolved:false → ATIVAS (backward-compat, sem
  // regressão de parse). `resolved` é o discriminador derivado: a fonte é o
  // ISO, mas o consumidor (mapa/lista) só precisa do booleano para descartar
  // ou distinguir um pet reunido (ver também isPetResolved).
  const resolvedAt = dados[PET_RESOLVED_AT_KEY] || undefined;
  // PET-M7b — motivo do fechamento (round-trip, backward-compat). Linhas antigas
  // (sem a chave) E pets ativos leem como undefined. Um valor fora da SOT é
  // descartado na leitura também (só 'reunido'/'encerrado' sobrevivem) — a mesma
  // barricada da escrita, espelhada na leitura, para um blob adulterado não
  // injetar um motivo lixo na UI.
  const rawClosure = dados[PET_CLOSURE_REASON_KEY];
  const closureReason = isValidClosureReason(rawClosure) ? rawClosure : undefined;
  // PET-M12/M13 — carimbo de frescor (round-trip, backward-compat). Linhas sem o
  // campo (todas hoje) leem como undefined → o relógio de idade cai no fallback
  // DateISO (ver isPetArchivedByAge). M13 grava este campo via o writer do M2.
  const freshnessAt = dados[PET_FRESHNESS_AT_KEY] || undefined;
  return {
    coords,
    status: dados.status,
    species: dados.species || '',
    size: dados.size || '',
    color: dados.color || '',
    name: dados.name || '',
    contact: dados.contact || '',
    detail: dados.Detalhe || '',
    photos: sanitizePhotosUrl(dados.photos),
    dateIso: dados.DateISO,
    resolvedAt,
    resolved: Boolean(resolvedAt),
    // PET-M7b — POR QUÊ do fechamento (ou undefined se ativo / linha antiga). O
    // mapa/lista só precisa de `resolved` (booleano) para podar; `closureReason`
    // distingue reunido de encerrado onde o desfecho importa (ex.: PET-M11 pode
    // dar um glifo distinto, ou analytics PET-M21 separar os funis).
    closureReason,
    // `freshnessAt` é exposto para o relógio de idade do M12/M13 medir contra ele
    // com fallback para `dateIso`. Não vira um booleano derivado aqui (diferente
    // de `resolved`): a idade é contínua, então o discriminador `aged` é DERIVADO
    // por isPetArchivedByAge(pet, nowMs) no boundary que tem o relógio (PetsApp),
    // nunca no parse puro (que é determinístico, sem Date.now()).
    freshnessAt,
  };
}

// ─── PET-M18 — IDENTIDADE de report PII-FREE, coords-keyed (UMA SOT) ──────────
//
// A FORMA do reportId compartilhada por DOIS consumidores, definida aqui uma vez:
//   • PET-M18 (deep link): o param `?pet=<coordsKey>` que recentra o mapa e abre
//     o detalhe do pet ao carregar — a verdade do "qual pet" num link compartilhado.
//   • PET-M13 (token local, PET_FRESHNESS_SPEC §5.1): a chave `petReport:<reportId>`
//     no localStorage que re-identifica "fui EU que reportei" SEM conta. O spec
//     §5.1 manda explicitamente reutilizar "o mesmo identificador que o PET-M18
//     define" — então a identidade NASCE aqui, uma só vez, e os dois a importam.
//
// POR QUE coords-keyed e NÃO contato/nome/texto-livre: um link/token é PÚBLICO
// (vai pro WhatsApp, fica no histórico do browser, aparece em logs/referrers). Um
// reportId derivado de contato/nome VAZARIA PII de quem reportou (viola a barricada
// de PII do PET-M3 / PET_CURVE §5). As coords do pin JÁ são públicas (o marcador no
// mapa as mostra), então uma chave derivada delas não revela nada novo — é a
// identidade mínima e PII-free.
//
// PRECISÃO (6 casas decimais, ~11 cm): mais que suficiente para identificar
// unicamente um pin solto à mão (dois reports distintos no mesmo ponto de ~11 cm
// não acontecem na prática), e MENOR que a precisão de armazenamento — então o
// arredondamento é ESTÁVEL: pequenas variações de representação em ponto flutuante
// (ida-e-volta por JSON/URL) colapsam na MESMA chave. NÃO casamos coords por
// igualdade exata de float de propósito: um link copiado/colado não deve depender
// do último bit de um double.
//
// NOTA de fronteira vs. o writer do PET-M2 (updatePetByCoords): aquele writer casa
// a LINHA por JSON.stringify(coords) EXATO (precisão cheia) porque escreve no
// servidor a partir das coords reais do pet em memória — contexto onde o float é
// idêntico. AQUI a chave é a identidade PÚBLICA/portável (link/token), que precisa
// sobreviver a um round-trip por texto. Duas chaves, dois contextos: a exata para
// casar a linha de escrita; a arredondada para o reportId compartilhável. O token
// do M13 guarda AMBAS (coordsKey p/ casar via writer + a forma deste módulo).
export const PET_COORDS_KEY_PRECISION = 6;

// Arredonda UM número à precisão da chave, normalizando o -0 para 0 (um -0 viraria
// "-0.000000" e quebraria a igualdade de string com "0.000000"). PURA.
function roundCoord(n) {
  if (!Number.isFinite(n)) return null;
  const r = Number(n.toFixed(PET_COORDS_KEY_PRECISION));
  // toFixed devolve string; Number() reduz -0.000000 → -0, então somamos 0 p/ 0.
  return (r === 0 ? 0 : r).toFixed(PET_COORDS_KEY_PRECISION);
}

// Chave ESTÁVEL e PII-FREE de um par [lat,lng] → "lat6,lng6" (ou null se o par for
// inválido). PURA + DETERMINÍSTICA. É a identidade de report compartilhada pelo
// deep link (PET-M18) e pelo token local (PET-M13). Defensiva: coords ausentes/
// malformadas/não-finitas → null (o chamador degrada com calma — nunca lança).
//
// Round-trip: petCoordsKey([-8.0671132, -34.8766719]) === "-8.067113,-34.876672";
// re-arredondar a saída dá a MESMA chave (idempotente), então um link gerado a
// partir de um pet casa o mesmo pet ao voltar.
export function petCoordsKey(coords) {
  if (!isFiniteCoordPair(coords)) return null;
  const lat = roundCoord(coords[0]);
  const lng = roundCoord(coords[1]);
  if (lat === null || lng === null) return null;
  return `${lat},${lng}`;
}

// Acha o pet cuja chave de coords casa `key`, numa lista de pets parseados. PURA.
// Devolve o pet ou null (nunca lança; defende contra lista não-array, key vazia e
// pets malformados — um pet sem coords válidas simplesmente não casa).
//
// IMPORTANTE (PET-M18): o chamador procura na lista COMPLETA de pets carregados —
// NÃO na lista já filtrada/podada por idade. Um link compartilhado representa um
// pedido EXPLÍCITO do usuário para ver AQUELE pet; honrá-lo mesmo que um filtro do
// M7 ou a janela de idade do M12 o esconderia do mapa por padrão é o comportamento
// menos surpreendente (o usuário clicou no link de propósito). Se o report sumiu de
// verdade (linha inexistente), nenhuma chave casa → null → degradação calma.
//
// Normaliza a `key` de entrada re-arredondando-a por petCoordsKey quando ela vier
// no formato "lat,lng" — assim um link ligeiramente mais/menos preciso (ex.: 5 vs 6
// casas, vindo de outra fonte) ainda casa, e uma key-lixo simplesmente não casa.
export function findPetByCoordsKey(pets, key) {
  if (!Array.isArray(pets) || !key || typeof key !== 'string') return null;
  const target = normalizeCoordsKey(key);
  if (!target) return null;
  for (const pet of pets) {
    if (pet && petCoordsKey(pet.coords) === target) return pet;
  }
  return null;
}

// Normaliza uma key crua "lat,lng" (de um param de URL, possivelmente com precisão
// diferente ou espaços) à forma canônica deste módulo, re-arredondando via
// petCoordsKey. PURA. Devolve null para qualquer entrada que não seja um par
// numérico — um param adulterado/lixo nunca casa um pet (degrada com calma).
export function normalizeCoordsKey(key) {
  if (!key || typeof key !== 'string') return null;
  const parts = key.split(',');
  if (parts.length !== 2) return null;
  const latStr = parts[0].trim();
  const lngStr = parts[1].trim();
  // Componente VAZIO ("," / "1," / ",2") é param malformado, NÃO a coord 0:
  // Number('') é 0 (não NaN), então sem este guard um param adulterado casaria
  // silenciosamente um pino em [0,0]. Barricada-estrita na semântica (Postel):
  // só um par numérico EXPLÍCITO é aceito — qualquer outra coisa → null.
  if (latStr === '' || lngStr === '') return null;
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return petCoordsKey([lat, lng]);
}

// Nome ESTÁVEL do param de deep link (SOT). PET-M18 lê/escreve por esta constante
// (e o PET-M19, que PRODUZ o link, também) — ninguém escreve a string 'pet'
// hardcoded num querystring espalhado pelo código.
export const PET_DEEPLINK_PARAM = 'pet';

// Extrai o valor cru do param de deep link de uma query string (ex.:
// "?pet=-8.06,-34.87" ou "pet=-8.06,-34.87"). PURA + DETERMINÍSTICA: recebe a
// string de busca (window.location.search é lido NO BOUNDARY, em PetsApp, nunca
// aqui — o domínio fica testável sem window). Devolve a string crua do param ou
// null se ausente/vazio. URLSearchParams é global no browser E no Node, então roda
// igual nos dois (igual ao uso de URL em sanitizePhotosUrl).
//
// NÃO resolve o pet aqui — só desembrulha o param. O chamador (PetsApp) passa o
// resultado a findPetByCoordsKey contra a lista COMPLETA de pets carregados, e
// degrada com calma quando o retorno é null (param ausente) OU quando findPet…
// não acha o pet (sumiu/arquivou/reunido/nunca existiu). Separar "ler o param" de
// "achar o pet" mantém cada peça pura e testável isoladamente.
export function parsePetDeepLinkParam(search) {
  if (!search || typeof search !== 'string') return null;
  let params;
  try {
    params = new URLSearchParams(search);
  } catch (_e) {
    return null;
  }
  const raw = params.get(PET_DEEPLINK_PARAM);
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

// ─── PET-M12 — wrappers de EXCLUSÃO por idade (age-archive, READ-side) ────────
// Os predicados-núcleo (petAgeDays / isPetArchivedByAge / isPetResolved) e o SOT
// PET_ARCHIVE_WINDOW_DAYS vivem na CAMADA-FOLHA (petTaxonomy) porque o match (§4)
// também os consome — manter a DAG sem ciclo. Aqui ficam os wrappers de SUPERFÍCIE
// que o PetsApp usa: estampar o flag `aged` e derivar a lista do mapa ativo.

// Estampa o discriminador derivado `aged` em UM pet parseado, SEM mutar o original
// (devolve um objeto novo). `aged` é o que petMarkerIcon.lifecycleForPet já lê para
// o cue visual de envelhecimento do PET-M11 — esta é a integração natural: o M12
// computa o booleano (com o relógio do boundary) e o pendura no pet, e o M11
// renderiza a pista. PURA: `nowMs` injetado. Não deleta nada; o flag é de leitura.
//
// NOTA de fronteira: aqui `aged` significa "cruzou a JANELA DE ARQUIVO" — o mesmo
// limiar que o exclui do mapa. No mapa ativo um pet aged já foi EXCLUÍDO (não
// renderiza), então o cue visual aged do M11 aparece em superfícies que mostram
// reports arquivados (ex.: a lista/sheet, que mantém o report — acceptance line 1).
export function withAgedFlag(pet, nowMs, windowDays = PET_ARCHIVE_WINDOW_DAYS) {
  if (!pet) return pet;
  return { ...pet, aged: isPetArchivedByAge(pet, nowMs, windowDays) };
}

// EXCLUSÃO de mapa ativo (SOT da regra, num só lugar): dado todos os pets + o
// relógio injetado, devolve só os que NÃO foram arquivados por idade. PURA,
// nunca lança, defende contra `pets` não-array (→ []). É READ-side: nenhuma linha
// é mutada/deletada — os arquivados simplesmente não entram nesta lista. O PetsApp
// chama isto para derivar a lista que vai ao mapa (espelha filterPets do PET-M7).
// Os reports arquivados continuam existindo na planilha e na sheet/lista (que NÃO
// aplica esta exclusão) — "somem do mapa ativo mas permanecem na sheet".
export function activePetsByAge(pets, nowMs, windowDays = PET_ARCHIVE_WINDOW_DAYS) {
  if (!Array.isArray(pets)) return [];
  return pets.filter((pet) => !isPetArchivedByAge(pet, nowMs, windowDays));
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

// ─── PET-M4 — denúncia (flag) de um relato para revisão ──────────────────────
// Chave ESTÁVEL do contador de denúncias dentro do blob Dados (SOT). Ninguém fora
// deste módulo escreve a string literal — o writer (petsData.flagPet) e qualquer
// leitor futuro acessam por esta constante. Um inteiro (contador), não um boolean:
// duas pessoas denunciando o mesmo relato é sinal MAIS forte que uma, e o servidor
// (quando chegar o handoff) pode ordenar a fila de revisão por contagem.
export const PET_FLAG_COUNT_KEY = 'flagCount';

// Lê a contagem de denúncias de um pet parseado/blob, defendendo contra ausência
// (linhas antigas não têm o campo → 0) e contra lixo (NaN/negativo → 0). PURO.
export function getPetFlagCount(petOrDados) {
  const n = petOrDados && Number(petOrDados[PET_FLAG_COUNT_KEY]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// Incrementa a contagem de denúncias DENTRO de um blob Dados, em UM lugar (o
// mutator que petsData.flagPet passa ao writer coords-keyed). PURO: muta só o
// campo de flag e devolve a nova contagem; NÃO toca em nenhum outro campo do
// blob — preserva o isolamento kind:'pet' (o writer já garante que é uma linha de
// pet). É a forcing-function de "denunciar reescreve SÓ o contador, nada mais".
export function incrementPetFlag(dados) {
  const next = getPetFlagCount(dados) + 1;
  dados[PET_FLAG_COUNT_KEY] = next;
  return next;
}

// ─── PET-M8 — distância + ORDENAÇÃO da lista (helpers PUROS e testáveis) ──────
//
// A lista do PET-M8 mostra os MESMOS pets que o mapa (visiblePets), mas ordenados:
//   • por DISTÂNCIA (mais perto primeiro) QUANDO há um centro GPS do usuário;
//   • por RECÊNCIA (mais recente primeiro) caso contrário.
// As duas regras vivem AQUI, puras e determinísticas — `center` e `nowMs` são
// INJETADOS pelo chamador (PetsApp, no boundary), nunca Date.now()/geolocation
// aqui (espelha matchesPetFilter/findPossibleMatches). A UI (PetListView) só
// consome a lista já ordenada e a distância já computada por linha — não recomputa
// nada nem conhece Haversine. Reusa o `haversineKm` da folha (petTaxonomy) — o
// MESMO usado pelo match do M9b — uma só verdade de "distância entre dois pontos".

// Distância em km de UM pet ao centro do usuário, ou null se não dá para medir
// (sem centro, ou coords do pet/centro inválidas). PURA. `null` (não Infinity) é
// o sinal de "sem distância" que a UI renderiza como "—" (distância só aparece
// quando o GPS está disponível). Reusa haversineKm (par inválido → Infinity, que
// normalizamos para null aqui — a fronteira "não mensurável" é explícita).
export function petDistanceKm(pet, center) {
  if (!isFiniteCoordPair(center)) return null;
  const coords = pet && pet.coords;
  if (!isFiniteCoordPair(coords)) return null;
  const km = haversineKm(coords, center);
  return Number.isFinite(km) ? km : null;
}

// Timestamp (ms) de um pet para a ordenação por recência. PURO: lê o DateISO de
// publicação (o fato histórico — NÃO o freshnessAt, que é o "fato vivo"; a lista
// ordena por QUANDO o relato entrou, o que o usuário lê como "mais recente"). Data
// ausente/ilegível → -Infinity (vai para o FIM da lista por recência, em vez de
// embaralhar a ordem com um NaN). PURO, nunca lança.
function petRecencyMs(pet) {
  const iso = pet && pet.dateIso;
  if (!iso) return -Infinity;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? -Infinity : t;
}

// ORDENA os pets para a lista do PET-M8. PURA + DETERMINÍSTICA, NÃO muta a entrada
// (devolve um array novo). Regra única, num só lugar:
//   • `center` é um par [lat,lng] finito  → ordena por DISTÂNCIA (mais perto
//     primeiro); empate de distância desempata por recência (mais recente antes).
//   • `center` ausente/inválido            → ordena por RECÊNCIA (mais recente
//     primeiro) — o usuário negou/não tem GPS, então proximidade não existe.
// `nowMs` é parte da assinatura (injetado, nunca Date.now() aqui) por simetria com
// os outros predicados puros e reservado para uma futura ordenação ponderada
// distância×idade (espelha o ranqueamento da ListView de fome) sem reescrever a
// assinatura. Hoje a recência usa o timestamp absoluto do relato, então `nowMs`
// não é consultado — a referência inócua marca-o como consumido para o linter.
// Defensiva: `pets` não-array → []; pets malformados não derrubam o sort (chaves
// caem em null/-Infinity e simplesmente afundam na ordem).
export function sortPetsForList(pets, center, nowMs) {
  void nowMs;
  if (!Array.isArray(pets)) return [];
  const hasCenter = isFiniteCoordPair(center);
  // Pré-computa a chave de cada pet uma vez (evita recalcular Haversine no
  // comparador, que roda O(n log n) vezes) e devolve um array novo.
  const decorated = pets.map((pet) => ({
    pet,
    km: hasCenter ? petDistanceKm(pet, center) : null,
    recency: petRecencyMs(pet),
  }));
  decorated.sort((a, b) => {
    if (hasCenter) {
      // Sem distância mensurável (km null) afunda para o fim da ordenação por
      // distância (Infinity), mas ainda acima de "nunca" — desempata por recência.
      const ka = a.km == null ? Infinity : a.km;
      const kb = b.km == null ? Infinity : b.km;
      if (ka !== kb) return ka - kb;
    }
    // Recência: mais recente (timestamp MAIOR) primeiro.
    return b.recency - a.recency;
  });
  return decorated.map((d) => d.pet);
}
