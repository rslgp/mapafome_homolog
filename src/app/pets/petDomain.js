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

export const PET_KIND = 'pet';

// Status do pet. id = chave estável (vai pra planilha); label/hint = texto de UI;
// icon = glifo de fallback; colorVar = nome da CSS var (definida em petPalette.css).
export const PET_STATUSES = [
  { id: 'perdido',    label: 'Perdido',    hint: 'Meu pet sumiu',    icon: '😿', colorVar: '--pet-perdido' },
  { id: 'encontrado', label: 'Encontrado', hint: 'Achei um pet',     icon: '🏠', colorVar: '--pet-encontrado' },
  { id: 'avistado',   label: 'Avistado',   hint: 'Vi um pet na rua', icon: '👀', colorVar: '--pet-avistado' },
];

// id → entrada, para lookup O(1) (v5 § replace_conditional_with_lookup).
export const PET_STATUS_MAP = PET_STATUSES.reduce((map, s) => {
  map[s.id] = s;
  return map;
}, {});

export const PET_SPECIES = [
  { id: 'cao',   label: 'Cão',   icon: '🐕' },
  { id: 'gato',  label: 'Gato',  icon: '🐈' },
  { id: 'outro', label: 'Outro', icon: '🐾' },
];

export const PET_SIZES = [
  { id: 'pequeno', label: 'Pequeno' },
  { id: 'medio',   label: 'Médio' },
  { id: 'grande',  label: 'Grande' },
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
export function buildPetDados({ coords, status, species, size, color, name, contact, detail, photos, dateIso, resolvedAt }) {
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

// Cópia CALMA por código (pt-BR; i18n/es entra no PET-M23). Cada linha LOWERS a
// ansiedade do dono — reassegura, nunca cobra. Lida pela UI via role=alert.
export const PET_PUBLISH_FAILURE_COPY = {
  [PET_PUBLISH_FAILURE.OUT_OF_BOUNDS]:
    'Esse ponto está fora da área que a gente atende por aqui. Toque no mapa, dentro da região, para marcar onde o pet foi visto.',
  [PET_PUBLISH_FAILURE.OFFLINE]:
    'Você está sem internet agora. Seu relato foi guardado com segurança e vai ser publicado sozinho assim que a conexão voltar.',
  [PET_PUBLISH_FAILURE.SERVER_SLOW]:
    'A conexão está lenta e seu relato pode já ter sido salvo. Aguarde um instante e recarregue antes de publicar de novo, para não duplicar.',
  [PET_PUBLISH_FAILURE.GENERIC]:
    'Não deu para publicar agora. Seu relato não se perdeu — confira a conexão e tente de novo com calma.',
};

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
  };
}

// Discriminador resolvido/ativo (SOT). Lê a verdade de UM lugar — o campo
// resolvedAt do pet parseado — para que o mapa/lista deixe de assumir que todo
// pet é ativo. Aceita o objeto parseado (forma do parsePetRow) e nunca lança.
// PET-M2.
export function isPetResolved(pet) {
  return Boolean(pet && pet[PET_RESOLVED_AT_KEY]);
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

// Cópia CALMA por código (pt-BR; i18n/es entra no PET-M23). NUNCA punitiva: o
// dono em pânico não é um inimigo. Cada linha tranquiliza e dá o próximo passo —
// "já está no mapa", "espere um instante" — em vez de acusar (governador de tom).
export const PET_PUBLISH_THROTTLE_COPY = {
  [PET_PUBLISH_THROTTLE.BURST]:
    'Você publicou vários relatos em pouco tempo. Eles já estão no mapa — espere um instante antes de enviar outro, para a gente manter tudo organizado.',
  [PET_PUBLISH_THROTTLE.IDENTICAL]:
    'Esse relato parece igual a um que você acabou de publicar. Ele já está no mapa — não precisa enviar de novo.',
};

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
