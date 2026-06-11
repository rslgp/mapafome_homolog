// petDomain.js — SOT (single source of truth) do domínio /pets (pets perdidos).
//
// Tudo que descreve um pet (status, espécie, porte) e a forma do seu blob `Dados`
// vive AQUI e em nenhum outro lugar. Nunca escreva a string 'perdido' (ou qualquer
// id/label) hardcoded em outro arquivo — importe da lista/mapa deste módulo.
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

export const PET_KIND = 'pet';

// Status do pet. id = chave estável (vai pra planilha); icon = glifo de fallback;
// colorVar = nome da CSS var (definida em petPalette.css). PET-M23: label/hint NÃO
// são mais strings inline — resolvem via t('pets.status.<id>.label|hint') no idioma
// ATIVO (getters reavaliam a cada acesso). O id continua sendo a SOT; a CÓPIA mora
// em strings.js. Quem lê s.label/s.hint (UI ou teste-fixture em pt-BR) recebe o
// texto traduzido do idioma corrente.
function withLabelHint(entry, labelKey, hintKey) {
  const props = { label: { enumerable: true, get: () => t(labelKey) } };
  if (hintKey) props.hint = { enumerable: true, get: () => t(hintKey) };
  return Object.defineProperties({ ...entry }, props);
}

export const PET_STATUSES = [
  withLabelHint({ id: 'perdido',    icon: '😿', colorVar: '--pet-perdido' },    'pets.status.perdido.label',    'pets.status.perdido.hint'),
  withLabelHint({ id: 'encontrado', icon: '🏠', colorVar: '--pet-encontrado' }, 'pets.status.encontrado.label', 'pets.status.encontrado.hint'),
  withLabelHint({ id: 'avistado',   icon: '👀', colorVar: '--pet-avistado' },   'pets.status.avistado.label',   'pets.status.avistado.hint'),
];

// id → entrada, para lookup O(1) (v5 § replace_conditional_with_lookup).
export const PET_STATUS_MAP = PET_STATUSES.reduce((map, s) => {
  map[s.id] = s;
  return map;
}, {});

export const PET_SPECIES = [
  withLabelHint({ id: 'cao',   icon: '🐕' }, 'pets.species.cao.label'),
  withLabelHint({ id: 'gato',  icon: '🐈' }, 'pets.species.gato.label'),
  withLabelHint({ id: 'outro', icon: '🐾' }, 'pets.species.outro.label'),
];

export const PET_SIZES = [
  withLabelHint({ id: 'pequeno' }, 'pets.size.pequeno.label'),
  withLabelHint({ id: 'medio' },   'pets.size.medio.label'),
  withLabelHint({ id: 'grande' },  'pets.size.grande.label'),
];

// Conjuntos de ids válidos — montados a partir das listas acima (sem duplicar a
// verdade; se a lista muda, os validadores acompanham automaticamente).
const STATUS_IDS  = new Set(PET_STATUSES.map((s) => s.id));
const SPECIES_IDS = new Set(PET_SPECIES.map((s) => s.id));
const SIZE_IDS    = new Set(PET_SIZES.map((s) => s.id));

// Discrimina uma linha de pet pelo campo `kind`. É o único critério que torna a
// linha visível ao /pets e invisível ao /fome.
export function isPetRow(dados) {
  return Boolean(dados && dados.kind === PET_KIND);
}

export function isValidStatus(id) {
  return STATUS_IDS.has(id);
}

export function isValidSpecies(id) {
  return SPECIES_IDS.has(id);
}

export function isValidSize(id) {
  return SIZE_IDS.has(id);
}

// ─── PET-M7 — filtro do mapa (SOT do estado + predicado PURO) ────────────────
//
// O filtro estreita os PINS por facetas: status / espécie / porte. As OPÇÕES
// não vivem aqui como literais — são as MESMAS listas SOT acima (PET_STATUSES /
// PET_SPECIES / PET_SIZES). Mudar a SOT muda o filtro sem outra edição: a UI
// itera as listas para desenhar os chips e o predicado valida contra os mesmos
// Sets. Ninguém escreve 'perdido' (ou qualquer id) hardcoded — é tudo derivado.
//
// SEMÂNTICA (a regra de negócio do filtro, num só lugar):
//   • faceta VAZIA = sem restrição (combina com tudo). O estado inicial é o
//     filtro vazio → todos os pets aparecem.
//   • DENTRO de uma faceta: OR (status perdido OU encontrado).
//   • ENTRE facetas: AND (status escolhido E espécie escolhida E porte escolhido).
// É o mesmo modelo mental de um filtro de e-commerce — Jakob's Law: o usuário já
// o conhece de outras superfícies, então não há custo de aprendizado.

// Fábrica do estado de filtro vazio (SOT da FORMA do filtro). Devolve uma cópia
// NOVA a cada chamada (arrays próprios) para o React poder tratar como imutável
// sem aliasing acidental entre montagens. Mantida a status/species/size neste
// milestone (cor/recência ficam de fora deliberadamente — escopo PET-M7).
export function defaultPetFilter() {
  return { statuses: [], species: [], sizes: [] };
}

// Normaliza uma faceta para um array de ids (defensivo: aceita null/undefined/
// não-array → []). PURA. Usada pelo predicado e por qualquer leitor de contagem.
function facetIds(facet) {
  return Array.isArray(facet) ? facet : [];
}

// Uma faceta "combina"? VAZIA → sempre (sem restrição). Não-vazia → o valor do
// pet precisa estar na lista escolhida (OR dentro da faceta). PURA + defensiva:
// um `value` undefined/'' só combina se a faceta estiver vazia (um pet sem porte
// não some por engano enquanto NENHUM porte está filtrado, mas é excluído assim
// que o usuário escolhe um porte específico — comportamento esperado).
function facetMatches(selected, value) {
  const ids = facetIds(selected);
  if (ids.length === 0) return true; // faceta vazia = sem restrição
  return ids.indexOf(value) !== -1;  // OR dentro da faceta
}

// Predicado PURO e DETERMINÍSTICO do filtro. Recebe UM pet (forma do parsePetRow),
// o estado de filtro e `nowMs` INJETADO pelo chamador (nunca Date.now() aqui —
// espelha buildPetDados/classifyPublishFailure; reservado para uma futura faceta
// de recência sem reescrever a assinatura). NUNCA lança: um pet malformado
// (null, sem campos) é tratado como objeto vazio e simplesmente não combina com
// nenhuma faceta ATIVA — some do mapa em vez de derrubar o render.
//
// ENTRE facetas é AND: todas precisam combinar. Com o filtro vazio, as três
// facetas combinam (vazias) → true para todo pet (combina com tudo).
//
// `nowMs` é parte da ASSINATURA (injetado pelo chamador, nunca Date.now() aqui)
// mas ainda não é consultado: as facetas de status/espécie/porte deste milestone
// não dependem do tempo. Fica reservado para uma futura faceta de recência sem
// reescrever a assinatura nem quebrar quem já chama com nowMs (LSP).
export function matchesPetFilter(pet, filter, nowMs) {
  // Referência inócua: marca nowMs como "consumido" para o linter sem alterar a
  // semântica (a saída independe do tempo neste milestone) — documenta a injeção.
  void nowMs;
  const p = pet || {};
  const f = filter || {};
  return (
    facetMatches(f.statuses, p.status)
    && facetMatches(f.species, p.species)
    && facetMatches(f.sizes, p.size)
  );
}

// Helper FINO de array: aplica o predicado a uma lista. PURO. `nowMs` injetado e
// repassado (mesma disciplina). Defende contra `pets` não-array (→ []). É o que o
// PetsApp chama para derivar os pets visíveis a partir de todos os pets + filtro.
export function filterPets(pets, filter, nowMs) {
  if (!Array.isArray(pets)) return [];
  return pets.filter((pet) => matchesPetFilter(pet, filter, nowMs));
}

// Conta quantas facetas estão ATIVAS (não-vazias) — usado pela UI para decidir se
// o botão "limpar filtros" deve aparecer e para o resumo "filtrando por N". PURO.
export function countActivePetFilterFacets(filter) {
  const f = filter || {};
  let n = 0;
  if (facetIds(f.statuses).length) n += 1;
  if (facetIds(f.species).length) n += 1;
  if (facetIds(f.sizes).length) n += 1;
  return n;
}

// Toggle PURO e IMUTÁVEL de um id dentro de uma faceta: devolve um filtro NOVO com
// o id adicionado (se ausente) ou removido (se presente), sem mutar o anterior.
// A UI lê daqui em vez de reimplementar a lógica de array em cada handler — uma
// só verdade de "selecionar/desselecionar". `facetKey` é 'statuses'|'species'|
// 'sizes'. Defensivo: chave desconhecida devolve o filtro inalterado (clonado).
export function togglePetFilterValue(filter, facetKey, id) {
  const base = filter || defaultPetFilter();
  const next = {
    statuses: facetIds(base.statuses).slice(),
    species: facetIds(base.species).slice(),
    sizes: facetIds(base.sizes).slice(),
  };
  const arr = next[facetKey];
  if (!arr) return next; // faceta desconhecida: no-op seguro (filtro clonado)
  const at = arr.indexOf(id);
  if (at === -1) {
    arr.push(id);
  } else {
    arr.splice(at, 1);
  }
  return next;
}

// Validação pura de um par [lat,lng]: ambos finitos. (O range Brasil é validado
// no writer via validateCoordinatePair do sheetsClient — aqui só garantimos a
// forma, mantendo o domínio independente de regras geográficas.)
function isFiniteCoordPair(coords) {
  return Array.isArray(coords)
    && coords.length === 2
    && Number.isFinite(coords[0])
    && Number.isFinite(coords[1]);
}

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

// Chave ESTÁVEL do campo de ciclo-de-vida "reunido" dentro do blob Dados (SOT).
// PET-M2. Ninguém fora deste módulo escreve a string literal 'resolvedAt' — o
// writer (petsData.updatePetByCoords) e o parser leem por esta constante, então
// uma renomeação do campo na planilha é uma edição de uma linha só, aqui.
export const PET_RESOLVED_AT_KEY = 'resolvedAt';

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

// ─── PET-M12 / PET-M13 — chave ESTÁVEL do carimbo de FRESCOR no blob Dados (SOT) ─
// PET_FRESHNESS_SPEC.md §5.2: `freshnessAt` é o "fato vivo" — quando o dono
// afirmou pela última vez que o report vale. É SEPARADO de `DateISO` (o fato
// histórico imutável de 1ª publicação): sobrescrever DateISO apagaria a verdade
// e violaria a Lens of Honesty (um report de 45 dias pareceria ter 2). M12 só
// LÊ este campo (a idade-para-arquivo mede contra ele com fallback p/ DateISO);
// M13 o ESCREVE quando o dono toca "ainda procurando" (reusa o writer do PET-M2,
// rides updatePetByCoords). Linhas sem o campo (todas, hoje) leem como "nunca
// renovado" → a idade cai no fallback DateISO. Ninguém escreve a string literal
// 'freshnessAt' fora deste módulo — leem/gravam por esta constante.
export const PET_FRESHNESS_AT_KEY = 'freshnessAt';

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

// Discriminador resolvido/ativo (SOT). Lê a verdade de UM lugar — o campo
// resolvedAt do pet parseado — para que o mapa/lista deixe de assumir que todo
// pet é ativo. Aceita o objeto parseado (forma do parsePetRow) e nunca lança.
// PET-M2.
export function isPetResolved(pet) {
  return Boolean(pet && pet[PET_RESOLVED_AT_KEY]);
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

// ─── PET-M12 — amortecedor MECÂNICO de staleness (age-archive, EXCLUSÃO de mapa) ─
//
// A TESE (PET_FRESHNESS_SPEC §0): passado um limiar de IDADE, um report some do
// mapa ATIVO — arquivado *in place*, NUNCA deletado. É a camada cega/determinística
// que age sozinha quando ninguém confirmou nada (o convite humano honesto é o
// PET-M13). Fork do helper de idade da fome (mdfMarkers.hoursSince/isArchived):
// mesma forma "idade desde um ISO cruza um limiar = arquivado", MAS endurecida em
// dois pontos exigidos pela disciplina deste módulo:
//   1. PURA + DETERMINÍSTICA — `nowMs` é INJETADO pelo chamador, nunca Date.now()
//      aqui (o helper de fome chama Date.now() inline; aqui o relógio mora no
//      boundary, igual a buildPetDados/matchesPetFilter). Testável sem fake timers.
//   2. EXCLUSÃO de LEITURA, não escrita — o report NÃO é mutado nem deletado. O
//      predicado deriva o estado "arquivado" da IDADE; o mapa ativo o exclui na
//      leitura. A linha na planilha fica intacta (audit trail + isolação kind:'pet'
//      preservados). É o que a acceptance line "no row is ever deleted" exige.
//
// ── O LIMIAR VIVE EM UMA SOT (a constante abaixo) ──
// Lido pelo predicado E por qualquer teste — nunca espalhado. ~90 dias é o default
// do spec (§2.1) e é DURO que seja MAIOR que o limiar de frescor do M13 (30 dias):
// o convite humano (M13) precede o machado mecânico (M12), dando ao dono ~60 dias
// de folga entre "fui convidado a confirmar" e "fui arquivado por idade".
export const PET_ARCHIVE_WINDOW_DAYS = 90;

// Ms por dia — fator de conversão local (evita o número mágico 86400000 espalhado).
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Idade de um pet em DIAS, medida contra o carimbo de FRESCOR se presente, senão
// contra o DateISO de publicação (PET_FRESHNESS_SPEC §2.1/§5.2). PURA: `nowMs`
// injetado. Defensiva: ISO ausente/inválido → Infinity (um report sem data legível
// conta como "infinitamente velho" e é arquivado, em vez de viver para sempre no
// mapa por causa de um dado quebrado — espelha o hoursSince→Infinity da fome).
//
// O fallback DateISO→freshnessAt é o que torna o M13 capaz de ADIAR o M12: quando
// o dono toca "ainda procurando" (M13 grava freshnessAt=agora), o relógio de idade
// reseta legitimamente, porque o dono AFIRMOU que o report ainda vale. Hoje, sem
// nenhuma linha carregando freshnessAt, a idade sempre cai no DateISO — o M13
// alimenta este mesmo cálculo sem reescrever a assinatura (LSP).
export function petAgeDays(pet, nowMs) {
  const p = pet || {};
  // freshnessAt (fato vivo) tem precedência sobre dateIso (fato histórico).
  const iso = p[PET_FRESHNESS_AT_KEY] || p.dateIso;
  if (!iso) return Infinity;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return Infinity;
  return (nowMs - then) / MS_PER_DAY;
}

// Predicado PURO de "este report deve sair do mapa ativo por IDADE?". `nowMs`
// injetado (determinístico, nunca Date.now() aqui). `windowDays` lido do SOT por
// default; aceita um override só para testes determinísticos. NUNCA lança.
//
// Um pet REUNIDO (resolvedAt) NÃO é "arquivado por idade": ele já saiu do mapa
// ativo pelo lifecycle resolvido (PET-M2), e tratá-lo como aged-by-age confundiria
// dois eixos ortogonais (resolvido vs envelhecido). Aqui respondemos só ao eixo da
// IDADE; o eixo do lifecycle resolvido é de isPetResolved. (lifecycleForPet em
// petMarkerIcon já dá precedência a `reunido` sobre `aged`.)
export function isPetArchivedByAge(pet, nowMs, windowDays = PET_ARCHIVE_WINDOW_DAYS) {
  if (!pet) return false;
  if (isPetResolved(pet)) return false; // resolvido sai por outro eixo, não por idade
  return petAgeDays(pet, nowMs) >= windowDays;
}

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
// nada nem conhece Haversine. Reusa o `haversineKm` privado deste módulo (o MESMO
// usado pelo match do M9b) — uma só verdade de "distância entre dois pontos".

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

// ─── PET-M9b — MATCH POSSÍVEL (perdido ↔ encontrado/avistado), predicado PURO ──
//
// Implementa o PET_MATCH_SPEC.md (PET-M9a) — o spec é a SOT de PRODUTO; este bloco
// é a SOT de CÓDIGO. NÃO reabre as decisões de design (raio 5 km, janela 30 dias,
// coringa de espécie, regra do silêncio §3, exclusão §4 ANTES de parear): só as
// codifica. O predicado é PURO e DETERMINÍSTICO — `nowMs` é INJETADO (nunca
// Date.now() aqui, mesma disciplina de matchesPetFilter/isPetArchivedByAge) — e
// NUNCA lança em pet malformado (barricada de leitura: pet "lixo" simplesmente
// não casa, some do conjunto de candidatos em vez de derrubar o render).
//
// ÉTICA (spec §0/§6): um match errado mostrado como certeza é o erro MAIS CARO da
// superfície (falsa-esperança no ponto de maior vulnerabilidade). Por isso o
// default é o SILÊNCIO: `candidate` (passa em §1) é SEPARADO de `shouldSurface`
// (rompe o limiar de §3). Um par pode ser candidato e mesmo assim ficar silencioso.

// ── Os QUATRO defaults vivem em UMA SOT (espelha PET_RECENCY_OPTIONS / o limiar
//    do M12), lidos pelo predicado E pelos testes — nunca espalhados (spec §1.5). ──
//
// Raio (km): centro a centro (Haversine). ≤ STRONG forte · ≤ MAX moderado · > MAX
// fora (não candidato). Janela (dias): |Δrelatos| ≤ MAX_DAYS; achado posterior à
// perda é PREFERÊNCIA (mais forte), não exclusão (datas de relato são ruidosas).
export const PET_MATCH_DEFAULTS = {
  radiusStrongKm: 1,   // spec §1.3 — ≤1 km: proximidade forte
  radiusMaxKm: 5,      // spec §1.3 — teto padrão (não um piso); >5 km não é candidato
  windowDays: 30,      // spec §1.4 — espelha o staircase 7/30/90 do SOT
};

// Vereditos de FORÇA de uma faceta/agregado (degraus, nunca um score cru exposto —
// o número não vai à UI, só decide mostrar/silenciar; spec §1.3/§3.1).
export const PET_MATCH_STRENGTH = {
  STRONG: 'strong',
  MODERATE: 'moderate',
  WEAK: 'weak',
  NONE: 'none',
};

// Raio médio da Terra (km) — fator local, evita o número mágico espalhado.
const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

// Distância Haversine em km entre dois pares [lat,lng]. PURA. Defensiva: par
// inválido → Infinity (nunca casa; degrada com calma em vez de lançar/NaN —
// espelha o petAgeDays→Infinity de uma data ilegível).
function haversineKm(a, b) {
  if (!isFiniteCoordPair(a) || !isFiniteCoordPair(b)) return Infinity;
  const lat1 = a[0] * DEG_TO_RAD;
  const lat2 = b[0] * DEG_TO_RAD;
  const dLat = (b[0] - a[0]) * DEG_TO_RAD;
  const dLng = (b[1] - a[1]) * DEG_TO_RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Status que contam como "alguém viu/pegou um pet" (o lado NÃO-perdido do par).
// DERIVADO da SOT PET_STATUSES — ninguém escreve 'encontrado'/'avistado' hardcoded;
// o lado-perdido é 'perdido' (também da SOT). Se a lista de status mudar, a regra
// de pareamento acompanha (a âncora é "exatamente um lado perdido", spec §1.1).
const PERDIDO_ID = 'perdido';
const SIGHTING_STATUS_IDS = new Set(
  PET_STATUSES.map((s) => s.id).filter((id) => id !== PERDIDO_ID),
);

// Espécie é CORINGA (não bloqueia o par, mas o enfraquece)? `outro` OU vazia/ausente
// = "não sei classificar" → incerteza, não contradição (spec §1.2). Lê o id 'outro'
// da SOM PET_SPECIES indiretamente: é o único id de espécie que NÃO é uma classe
// concreta de bicho. Aqui tratamos vazio e 'outro' igualmente como coringa.
function isWildcardSpecies(species) {
  const s = String(species || '').trim();
  return s === '' || s === 'outro';
}

// Pareamento de STATUS (spec §1.1): é candidato SOMENTE se EXATAMENTE um lado é
// `perdido` e o outro é `encontrado`/`avistado`. perdido↔perdido, achador↔achador
// e encontrado↔avistado NÃO são candidatos (nenhum dono à espera no par, ou nenhuma
// evidência). PURA + defensiva (status ausente/lixo → não casa).
function statusesPair(statusA, statusB) {
  const aLost = statusA === PERDIDO_ID;
  const bLost = statusB === PERDIDO_ID;
  // XOR: exatamente um lado perdido.
  if (aLost === bLost) return false;
  const sighting = aLost ? statusB : statusA;
  return SIGHTING_STATUS_IDS.has(sighting);
}

// Força da faceta ESPÉCIE: igualdade concreta = forte; coringa (outro/vazio de um
// lado) = fraca (não bloqueia, mas não é evidência de identidade — spec §1.2/§3.1);
// espécies concretas diferentes (cao≠gato) = NONE (contradição dura → não candidato).
function speciesStrength(spA, spB) {
  const wildA = isWildcardSpecies(spA);
  const wildB = isWildcardSpecies(spB);
  if (wildA || wildB) {
    // Pelo menos um lado é coringa: nunca bloqueia, mas é fraco (ausência de
    // contradição, não prova). Dois coringas também: ainda fraco.
    return PET_MATCH_STRENGTH.WEAK;
  }
  // Ambos concretos: igualdade = forte; diferença = contradição (não candidato).
  return spA === spB ? PET_MATCH_STRENGTH.STRONG : PET_MATCH_STRENGTH.NONE;
}

// Força da faceta DISTÂNCIA (spec §1.3): ≤1 km forte · 1–5 km moderado · >5 km
// NONE (fora — não candidato). Lê os limiares do SOT PET_MATCH_DEFAULTS.
function distanceStrength(km, defaults) {
  if (!(km <= defaults.radiusMaxKm)) return PET_MATCH_STRENGTH.NONE; // inclui Infinity/NaN
  if (km <= defaults.radiusStrongKm) return PET_MATCH_STRENGTH.STRONG;
  return PET_MATCH_STRENGTH.MODERATE;
}

// Força da faceta TEMPO (spec §1.4): |Δrelatos| em dias. Fora da janela → NONE (não
// candidato). Dentro: achado POSTERIOR à perda = forte (caso típico); achado
// anterior (pré-avistamento) = moderado (plausível, mas mais fraco — não excluído,
// pois datas de relato são ruidosas). `nowMs` é injetado por simetria com as outras
// funções puras do módulo (a janela mede Δ ENTRE os dois relatos, não a idade
// absoluta, então `nowMs` não é consultado aqui — reservado, documenta a injeção).
function timeStrength(petA, petB, nowMs, defaults) {
  void nowMs;
  const tA = Date.parse(petA && petA.dateIso);
  const tB = Date.parse(petB && petB.dateIso);
  if (Number.isNaN(tA) || Number.isNaN(tB)) return PET_MATCH_STRENGTH.NONE;
  const deltaDays = Math.abs(tA - tB) / MS_PER_DAY;
  if (deltaDays > defaults.windowDays) return PET_MATCH_STRENGTH.NONE; // fora da janela
  // Ordem temporal: o achado (lado não-perdido) é POSTERIOR à perda? Mais forte.
  const aLost = petA.status === PERDIDO_ID;
  const lostT = aLost ? tA : tB;
  const sightingT = aLost ? tB : tA;
  return sightingT >= lostT ? PET_MATCH_STRENGTH.STRONG : PET_MATCH_STRENGTH.MODERATE;
}

// Um pet é CANDIDATO ELEGÍVEL (entra no pareamento)? Ativo: NÃO resolvido (M2) E
// NÃO arquivado por idade (M12) — a exclusão do spec §4, aplicada ANTES de parear.
// `nowMs` injetado (a idade do M12 precisa do relógio). Defensiva: pet sem coords
// finitas também é inelegível (não dá para medir distância). NUNCA lança.
function isMatchEligible(pet, nowMs) {
  if (!pet) return false;
  if (!isFiniteCoordPair(pet.coords)) return false;
  if (isPetResolved(pet)) return false;          // reunido/encerrado — spec §4
  if (isPetArchivedByAge(pet, nowMs)) return false; // envelhecido/arquivado — M12/§4
  return true;
}

// Predicado PURO do match entre DOIS pets (forma do parsePetRow). Devolve um
// veredito ESTÁVEL { candidate, strength, shouldSurface, distanceKm }:
//   • candidate     — passa em TODAS as condições de §1 (status/espécie/raio/janela).
//   • strength      — força agregada do par ('strong'|'moderate'|'weak'|'none').
//   • shouldSurface — rompe o LIMIAR DE SILÊNCIO de §3 (a única coisa que a UI lê
//                     para decidir MOSTRAR). FALSE para um par que só casa por
//                     coringa de espécie e/ou só pela distância no teto de 5 km.
//   • distanceKm    — distância centro-a-centro (informativa; NUNCA exposta como
//                     número ao usuário — score é banido §2.2).
// `nowMs` injetado. NUNCA lança (pet malformado → não candidato, silencioso).
//
// LIMIAR DE SILÊNCIO (spec §3.1, calibração fixada e testada aqui):
//   Um par rompe o silêncio SÓ quando soma confiança em MAIS DE UMA faceta:
//     - espécie CONCRETA (não coringa)  E
//     - proximidade real (forte ≤1 km, OU moderada 1–5 km mas então com o tempo
//       forte) — o teto de 5 km SOZINHO nunca rompe o silêncio  E
//     - coincidência temporal dentro da janela (achado fora de ordem só passa se
//       distância for forte).
//   Caso contrário: candidate pode ser true, mas shouldSurface = false (silêncio).
export function petMatchStrength(petA, petB, nowMs, defaults = PET_MATCH_DEFAULTS) {
  const SILENT = { candidate: false, strength: PET_MATCH_STRENGTH.NONE, shouldSurface: false, distanceKm: Infinity };
  const a = petA || {};
  const b = petB || {};

  // §1.1 — pareamento de status (exatamente um lado perdido).
  if (!statusesPair(a.status, b.status)) return SILENT;

  // §1.2 — espécie (concreta-igual / coringa / contradição).
  const sp = speciesStrength(a.species, b.species);
  if (sp === PET_MATCH_STRENGTH.NONE) return SILENT; // cao≠gato: contradição → não candidato

  // §1.3 — distância (Haversine; >5 km não é candidato).
  const distanceKm = haversineKm(a.coords, b.coords);
  const dist = distanceStrength(distanceKm, defaults);
  if (dist === PET_MATCH_STRENGTH.NONE) return SILENT;

  // §1.4 — janela de tempo (|Δ| ≤ 30 d; fora → não candidato).
  const time = timeStrength(a, b, nowMs, defaults);
  if (time === PET_MATCH_STRENGTH.NONE) return SILENT;

  // Chegou aqui: é CANDIDATO (passa em todas as condições de §1).
  // Agora o LIMIAR DE SILÊNCIO de §3 decide mostrar ou silenciar.
  const speciesConcrete = sp === PET_MATCH_STRENGTH.STRONG;
  const proximityReal =
    dist === PET_MATCH_STRENGTH.STRONG
    || (dist === PET_MATCH_STRENGTH.MODERATE && time === PET_MATCH_STRENGTH.STRONG);
  const timeOk =
    time === PET_MATCH_STRENGTH.STRONG
    || (time === PET_MATCH_STRENGTH.MODERATE && dist === PET_MATCH_STRENGTH.STRONG);

  const shouldSurface = speciesConcrete && proximityReal && timeOk;

  // Força agregada (degrau informativo): forte só quando as três facetas são fortes;
  // moderado quando rompe o silêncio mas não é tudo forte; fraco quando é candidato
  // porém silenciado (coringa e/ou só no teto de 5 km).
  let strength;
  if (sp === PET_MATCH_STRENGTH.STRONG && dist === PET_MATCH_STRENGTH.STRONG && time === PET_MATCH_STRENGTH.STRONG) {
    strength = PET_MATCH_STRENGTH.STRONG;
  } else if (shouldSurface) {
    strength = PET_MATCH_STRENGTH.MODERATE;
  } else {
    strength = PET_MATCH_STRENGTH.WEAK;
  }

  return { candidate: true, strength, shouldSurface, distanceKm };
}

// Acha os possíveis matches de UM pet numa lista de pets (forma do parsePetRow).
// PURA + DETERMINÍSTICA (`nowMs` injetado). Aplica a EXCLUSÃO de §4 ANTES de parear
// (resolvidos/arquivados nem entram, dos DOIS lados) e devolve só os pares que
// ROMPEM O SILÊNCIO de §3 (shouldSurface) — o default é não mostrar. Nunca o
// próprio pet (não casa consigo mesmo). Ordenado do mais forte/mais perto ao mais
// fraco (a UI mostra o melhor candidato primeiro; UMA próxima decisão calma, §2.3).
// NUNCA lança: lista não-array → []; pet/elemento malformado → ignorado.
//
// Cada item: { pet, strength, distanceKm }. NÃO expõe um score numérico (banido
// §2.2) — `strength` é um degrau e `distanceKm` é só p/ ordenação interna/futuro
// "a ~X km" calmo, nunca uma porcentagem de certeza.
export function findPossibleMatches(pet, allPets, nowMs, defaults = PET_MATCH_DEFAULTS) {
  if (!pet || !Array.isArray(allPets)) return [];
  if (!isMatchEligible(pet, nowMs)) return []; // o próprio pet aberto já saiu de cena
  const out = [];
  for (const other of allPets) {
    if (!other || other === pet) continue;
    if (!isMatchEligible(other, nowMs)) continue; // §4 — exclusão ANTES de parear
    const verdict = petMatchStrength(pet, other, nowMs, defaults);
    if (verdict.shouldSurface) {
      out.push({ pet: other, strength: verdict.strength, distanceKm: verdict.distanceKm });
    }
  }
  // Ordena: força (strong antes de moderate) e, empatando, mais perto primeiro.
  const rank = { [PET_MATCH_STRENGTH.STRONG]: 0, [PET_MATCH_STRENGTH.MODERATE]: 1, [PET_MATCH_STRENGTH.WEAK]: 2 };
  out.sort((x, y) => {
    const r = (rank[x.strength] ?? 3) - (rank[y.strength] ?? 3);
    if (r !== 0) return r;
    return x.distanceKm - y.distanceKm;
  });
  return out;
}

// ─── PET-M12b — DE-DUP NEAR-DUPLICATE (SOFT-merge VISUAL, predicado PURO) ──────
//
// O QUE É: o MESMO relato re-postado (a pessoa publicou duas/três vezes em pânico,
// ou dois vizinhos relataram o MESMÍSSIMO avistamento) vira VÁRIOS pinos quase
// sobrepostos no mapa. Este bloco DETECTA esses quase-duplicados e os AGRUPA num
// cluster de exibição — para o mapa mostrar UM pino expansível em vez de uma pilha.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ NOTA DE LENS-OF-FAILURE (espelha PET_MATCH_SPEC §6 — leia ANTES de mexer)  ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║ O ERRO MAIS CARO desta superfície é o FALSO-MERGE: agrupar dois gatos      ║
// ║ pretos DIFERENTES como se fossem o mesmo relato APAGA, da visão do usuário,║
// ║ um report real (um pet que alguém está procurando some atrás do "dupe").   ║
// ║ Um falso-merge é PIOR que um pino duplicado — por isso o PET-M12b foi      ║
// ║ SEPARADO do PET-M12 (que só arquiva por idade, sem risco de identidade).   ║
// ║                                                                            ║
// ║ As TRÊS barricadas contra o falso-merge (em ordem), análogas às do match:  ║
// ║                                                                            ║
// ║  (a) SOFT / VISUAL-ONLY — esta camada NUNCA deleta, NUNCA reescreve, NUNCA ║
// ║      muta a linha do report "absorvido". É uma transformação de LEITURA    ║
// ║      sobre os pets já parseados (igual a activePetsByAge / filterPets): os ║
// ║      dados crus de TODOS os membros sobrevivem intactos na planilha E no   ║
// ║      grupo devolvido. Nenhuma escrita acontece. Isolação kind:'pet'        ║
// ║      preservada por construção (não há writer aqui).                       ║
// ║                                                                            ║
// ║  (b) CONSERVADOR — o limiar é MUITO mais APERTADO que o match do M9b. O    ║
// ║      M9b casa status DIFERENTES (perdido↔encontrado) a 5 km e 30 dias —    ║
// ║      "pode ser o mesmo bicho". O dedup exige o MESMO relato re-postado:    ║
// ║      MESMO status + MESMA espécie CONCRETA (coringa outro/vazio NUNCA      ║
// ║      funde — incerteza não é identidade) + coords MUITO próximas (~75 m    ║
// ║      default, ~67× mais apertado que os 5 km do match) + janela curta      ║
// ║      (~3 dias). Concordância em VÁRIOS eixos, não um só. Na dúvida, NÃO    ║
// ║      funde (preferimos o pino duplicado ao falso-merge — espelha o        ║
// ║      "prefere o silêncio" do §3.3 do match).                              ║
// ║                                                                            ║
// ║  (c) REVERSÍVEL / EXPANSÍVEL pelo viewer — o grupo EXPÕE todos os membros  ║
// ║      (`group.members` = [representante, ...absorvidos]). A UI mostra um    ║
// ║      pino mas pode SEMPRE re-expandir o cluster e exibir cada membro       ║
// ║      individualmente. Nada é escondido de forma irreversível; o falso-     ║
// ║      merge, se acontecer, é desfeito por um toque do usuário, não por uma  ║
// ║      restauração de dados (porque o dado nunca saiu).                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// PURO + DETERMINÍSTICO: `nowMs` é INJETADO pelo chamador (nunca Date.now() aqui —
// mesma disciplina de petMatchStrength/isPetArchivedByAge). NUNCA lança: pet
// malformado simplesmente não funde com ninguém (some do agrupamento como singleton
// em vez de derrubar o render).

// ── Os limiares vivem em UMA SOT (espelha PET_MATCH_DEFAULTS / PET_ARCHIVE_WINDOW_DAYS),
//    lidos pelo predicado E pelos testes — nunca espalhados. CONSERVADORES por
//    design: muito mais apertados que o match, porque o custo do erro é maior. ──
//
// radiusMeters (~75 m): dois relatos do MESMO episódio caem praticamente no mesmo
//   ponto (a pessoa toca o mapa quase no mesmo lugar / o GPS varia poucos metros).
//   75 m absorve o jitter de um pino solto à mão sem alcançar o quarteirão vizinho
//   — ~67× mais apertado que os 5 km do match (intencional: dedup ≠ match).
// windowDays (~3): o mesmo relato re-postado acontece em horas/poucos dias, não em
//   semanas. 3 dias cobre "publiquei, não vi aparecer, publiquei de novo amanhã"
//   sem fundir dois episódios distantes no tempo — ~10× mais apertado que os 30
//   dias do match.
export const PET_DEDUP_DEFAULTS = {
  radiusMeters: 75, // ~75 m: jitter do mesmo episódio, NÃO o quarteirão vizinho
  windowDays: 3,    // ~3 dias: re-post em horas/poucos dias, não um novo episódio
};

// Metros por km — fator local (evita o número mágico 1000 espalhado).
const METERS_PER_KM = 1000;

// Timestamp (ms) de um pet para a janela de dedup. PURO: usa o DateISO de
// publicação (o fato histórico de QUANDO o relato entrou — NÃO freshnessAt, que é
// o "fato vivo" do M13; dois posts do mesmo episódio são próximos na PUBLICAÇÃO,
// não na última renovação). Data ausente/ilegível → null (não funde por tempo —
// degrada com calma, igual ao Infinity de petAgeDays). PURO, nunca lança.
function petPublishMs(pet) {
  const iso = pet && pet.dateIso;
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

// Predicado PURO e DETERMINÍSTICO: dois pets são QUASE-DUPLICADOS (o MESMO relato
// re-postado)? `nowMs` é parte da assinatura (injetado, nunca Date.now() aqui) por
// simetria com os outros predicados puros do módulo; a janela mede Δ ENTRE as duas
// publicações (não a idade absoluta), então `nowMs` não é consultado hoje — fica
// reservado e documenta a injeção. NUNCA lança.
//
// CONSERVADOR por construção (Lens-of-Failure barricada (b)): exige concordância em
// QUATRO eixos, TODOS apertados — um único eixo frouxo já NÃO funde:
//   1. MESMO status (perdido com perdido; não cruza status como o match faz);
//   2. MESMA espécie CONCRETA — coringa (outro/vazio) NUNCA funde (incerteza de
//      identidade não pode apagar um report; espelha a regra do coringa do §1.2,
//      mas aqui ainda mais dura: lá o coringa só enfraquece, aqui ele BLOQUEIA);
//   3. coords dentro de radiusMeters (~75 m — muito mais apertado que o match);
//   4. publicações dentro de windowDays (~3 dias — muito mais apertado que o match).
// Default em DÚVIDA = NÃO funde (qualquer eixo que falhe → false): preferimos o
// pino duplicado ao falso-merge (espelha "prefere o silêncio" do §3.3).
export function isNearDuplicate(petA, petB, nowMs, defaults = PET_DEDUP_DEFAULTS) {
  void nowMs;
  const a = petA || {};
  const b = petB || {};

  // 1) MESMO status (string igual; status ausente/lixo de um lado → não funde).
  if (!a.status || a.status !== b.status) return false;

  // 2) MESMA espécie CONCRETA — coringa (outro/vazio) NUNCA funde. Se qualquer
  //    lado é coringa, a identidade é incerta e fundir poderia apagar um report
  //    distinto (barricada (b) do Lens-of-Failure). Espécies concretas precisam
  //    ser IGUAIS (cao com cao); cao≠gato obviamente não funde.
  if (isWildcardSpecies(a.species) || isWildcardSpecies(b.species)) return false;
  if (a.species !== b.species) return false;

  // 3) coords MUITO próximas (~75 m). haversineKm devolve km (Infinity p/ par
  //    inválido → nunca funde). Converte o limiar SOT de metros p/ km e compara.
  const km = haversineKm(a.coords, b.coords);
  const radiusKm = defaults.radiusMeters / METERS_PER_KM;
  if (!(km <= radiusKm)) return false; // inclui Infinity/NaN: par inválido não funde

  // 4) janela de tempo curta (~3 dias) entre as DUAS publicações. Data ilegível de
  //    qualquer lado → não funde (degrada com calma).
  const tA = petPublishMs(a);
  const tB = petPublishMs(b);
  if (tA === null || tB === null) return false;
  const deltaDays = Math.abs(tA - tB) / MS_PER_DAY;
  return deltaDays <= defaults.windowDays;
}

// SOFT-CONSOLIDA uma lista de pets em GRUPOS de quase-duplicados, para EXIBIÇÃO.
// PURA + DETERMINÍSTICA (`nowMs` injetado). NÃO muta nenhum pet de entrada, NÃO
// deleta, NÃO reescreve — devolve uma NOVA estrutura de grupos sobre os MESMOS
// objetos de pet (barricada (a) do Lens-of-Failure: visual/soft only).
//
// Forma de cada grupo (REVERSÍVEL/EXPANSÍVEL — barricada (c)):
//   {
//     representative,  // o pet mostrado como pino único (o 1º membro, ordem estável)
//     members,         // [representative, ...absorvidos] — TODOS os membros, sempre
//     duplicateCount,  // members.length - 1 (quantos foram absorvidos; 0 = singleton)
//   }
// `members` SEMPRE contém todos os relatos do cluster, então a UI pode re-expandir
// o grupo e mostrar cada um individualmente — o falso-merge (se ocorrer) é desfeito
// por um toque, porque NADA foi destruído.
//
// AGRUPAMENTO conservador (single-linkage simples e determinístico): varre os pets
// na ORDEM dada; cada pet ou abre um grupo novo (vira representante) ou entra no
// PRIMEIRO grupo existente cujo REPRESENTANTE seja seu quase-duplicado. Casar contra
// o REPRESENTANTE (não contra qualquer membro) mantém o cluster APERTADO em torno de
// um ponto único — evita o "encadeamento" (drift) onde A~B e B~C arrastariam C para
// longe de A. Na dúvida (sem representante quase-duplicado), o pet vira seu próprio
// grupo (singleton) — preferir não-fundir é a barricada (b).
//
// Defensiva: `pets` não-array → []; um pet null/lixo nunca casa (isNearDuplicate é
// defensivo) e simplesmente forma um singleton — nunca derruba o agrupamento.
export function groupNearDuplicates(pets, nowMs, defaults = PET_DEDUP_DEFAULTS) {
  if (!Array.isArray(pets)) return [];
  const groups = [];
  for (const pet of pets) {
    let placed = false;
    for (const g of groups) {
      // Casa contra o REPRESENTANTE do grupo (cluster apertado, sem drift).
      if (isNearDuplicate(g.representative, pet, nowMs, defaults)) {
        g.members.push(pet);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Novo grupo: este pet é o representante (members começa com ele mesmo).
      groups.push({ representative: pet, members: [pet] });
    }
  }
  // Carimba o duplicateCount derivado em cada grupo (DEPOIS de fechar os membros),
  // sem mutar nenhum pet — só os objetos de grupo recém-criados aqui.
  return groups.map((g) => ({
    representative: g.representative,
    members: g.members,
    duplicateCount: g.members.length - 1,
  }));
}
