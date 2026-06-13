// petTaxonomy.js — kernel/SOT do domínio /pets (constantes + validadores + primitivas).
//
// Extraído de petDomain.js (que excedia o limite FF1 de 1000 LOC) — é a CAMADA-FOLHA
// do domínio: não importa nenhum outro módulo de pet, só o resolvedor de strings `t`.
// Os módulos acima (petFilterDomain, petMatch e o próprio petDomain) importam DAQUI.
// Mantém a DAG limpa (sem ciclos): este arquivo é a raiz, ninguém de pet o precede.
//
// O que vive aqui (a verdade ÚNICA que descreve um pet e as primitivas compartilhadas):
//   • Tabelas SOT: PET_KIND, PET_STATUSES/MAP, PET_SPECIES, PET_SIZES, PET_COLORS,
//     PET_RECENCY_OPTIONS/MAP — e seus validadores derivados.
//   • Normalizador de COR texto-livre → bucket (normalizePetColorToBucket).
//   • Primitivas geográficas/temporais COMPARTILHADAS por mais de um módulo acima:
//     MS_PER_DAY, isFiniteCoordPair, haversineKm — moram na folha porque tanto o
//     filtro/match quanto o petDomain-remainder as consomem (uma só verdade).
//   • Predicados de CICLO DE VIDA por IDADE/RESOLUÇÃO (PET-M2/M12) que o MATCH
//     precisa para a exclusão §4 (isPetResolved / isPetArchivedByAge / petAgeDays):
//     ficam na folha para o petMatch consumi-los sem criar um ciclo com petDomain.
//
// Disciplina de fronteira preservada (v5 § defensive_programming.barricade_pattern):
// tudo aqui é PURO e nunca lança; `nowMs` é INJETADO pelo chamador (nunca Date.now()).

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

// ─── COR — BUCKETS canônicos (SOT) ───────────────────────────────────────────
// Decisão do game-designer (NÃO reabrir): a COR é um CHIP de bucket FECHADO, não
// texto livre. O dono ESCREVE a cor em texto livre (`pet.color`, ex.: "caramelo
// claro", "pretinho", "tigrado") — mas quem PROCURA filtra por um conjunto
// pequeno e estável de baldes ("preto", "caramelo", ...). Esta lista é a verdade
// ÚNICA dos baldes; a UI itera ela pra desenhar os chips (igual faz com
// PET_STATUSES/PET_SPECIES/PET_SIZES) e o normalizePetColorToBucket() abaixo
// mapeia o texto livre armazenado pra um destes ids. Os labels NÃO são inline:
// resolvem via t('pets.color.<id>.label') no idioma ativo (o agente de UI/i18n
// preenche as strings em strings.js — aqui só declaramos as CHAVES, espelhando o
// padrão dos outros SOTs). 'outro' é o balde-âncora: todo texto que não casa
// nenhum bucket específico (e o vazio) cai aqui — nunca "sem cor", para o filtro
// permanecer total e honesto.
export const PET_COLORS = [
  withLabelHint({ id: 'preto' },    'pets.color.preto.label'),
  withLabelHint({ id: 'branco' },   'pets.color.branco.label'),
  withLabelHint({ id: 'caramelo' }, 'pets.color.caramelo.label'),
  withLabelHint({ id: 'marrom' },   'pets.color.marrom.label'),
  withLabelHint({ id: 'cinza' },    'pets.color.cinza.label'),
  withLabelHint({ id: 'rajado' },   'pets.color.rajado.label'),
  withLabelHint({ id: 'claro' },    'pets.color.claro.label'),
  withLabelHint({ id: 'outro' },    'pets.color.outro.label'),
];

// ─── RECÊNCIA — opções de janela (SOT, SINGLE-SELECT) ────────────────────────
// Decisão do game-designer (NÃO reabrir): recência é um eixo ÚNICO. 7 ⊂ 30 ⊂ 90
// dias são ANINHADOS — multi-seleção não teria significado ("≤7 OU ≤30" é só
// "≤30"). Por isso o estado NÃO é um array de toggle como as outras facetas: é um
// valor único `recencyDays` (number) ou `null` (= sem restrição, o DEFAULT).
//
// LIMITE de coerência com o mapa ativo: os baldes (7/30/90) são SUBCONJUNTOS da
// janela de arquivo (PET_ARCHIVE_WINDOW_DAYS = 90, definida abaixo). Todos ≤ 90 →
// nenhum balde pede um pet que o mapa ativo já teria escondido por idade (PET-M12),
// então a recência só ESTREITA o que já está visível, nunca contradiz/excede o
// arquivo. Se um dia o arquivo encolher abaixo de 90, o maior balde aqui precisa
// encolher junto (por isso a referência explícita à constante na doc, não um 90
// mágico solto). PET_MATCH_DEFAULTS.windowDays (30) já citava este staircase.
export const PET_RECENCY_OPTIONS = [
  withLabelHint({ id: '7',  days: 7  }, 'pets.recency.7.label'),
  withLabelHint({ id: '30', days: 30 }, 'pets.recency.30.label'),
  withLabelHint({ id: '90', days: 90 }, 'pets.recency.90.label'),
];

// id → entrada, lookup O(1) (espelha PET_STATUS_MAP; v5 § replace_conditional_
// with_lookup). A UI lê o `days` de um id selecionado por aqui sem varrer a lista.
export const PET_RECENCY_MAP = PET_RECENCY_OPTIONS.reduce((map, r) => {
  map[r.id] = r;
  return map;
}, {});

// Conjuntos de ids válidos — montados a partir das listas acima (sem duplicar a
// verdade; se a lista muda, os validadores acompanham automaticamente).
const STATUS_IDS  = new Set(PET_STATUSES.map((s) => s.id));
const SPECIES_IDS = new Set(PET_SPECIES.map((s) => s.id));
const SIZE_IDS    = new Set(PET_SIZES.map((s) => s.id));
const COLOR_IDS   = new Set(PET_COLORS.map((c) => c.id));

// Ms por dia — fator de conversão local (evita o número mágico 86400000 espalhado).
// Mora na FOLHA porque tem consumidores em VÁRIOS módulos acima: matchesRecency
// (petFilterDomain), petAgeDays (aqui), timeStrength/isNearDuplicate (petMatch).
// Uma constante deve ser declarada antes de QUALQUER referência em ordem de fonte —
// espelha a disciplina "locais no topo" do playbook (evita o footgun de TDZ/ordem-
// de-declaração). Exportada para os módulos-irmãos lerem a MESMA verdade.
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

// Um id de COR-BUCKET é válido (está na SOT PET_COLORS)? Defensivo, PURO. Usado
// pelo filtro de cor para descartar ids-lixo numa faceta antes de comparar.
export function isValidColor(id) {
  return COLOR_IDS.has(id);
}

// ─── COR — normalizador de TEXTO LIVRE → BUCKET (PURO, nunca lança) ───────────
// O campo `pet.color` é TEXTO LIVRE (sanitizado, mas acento/caixa/grafia variam:
// "Caramelo", "caramelado", "pretinho", "tigrado"). O chip de filtro, porém,
// trabalha com os baldes FECHADOS de PET_COLORS. Esta função é a PONTE: mapeia
// uma string de cor crua para UM id de bucket, casando por palavra-chave de forma
// insensível a acento e caixa (substring após normalizar). Determinística e PURA
// (sem Date.now()/locale-dependente). NUNCA lança: entrada não-string/vazia/sem
// casamento → 'outro' (o balde-âncora; nunca null/throw — o filtro precisa de um
// id sempre).
//
// TABELA DE MAPEAMENTO (palavra-chave normalizada → bucket). A ORDEM importa:
// a 1ª palavra-chave que casa (por substring) vence, então a tabela vai do mais
// ESPECÍFICO/dominante para o mais GENÉRICO/fraco:
//   1. 'rajado' PRIMEIRO — é um PADRÃO, não uma cor sólida; quando aparece, domina
//      a percepção ("gato rajado preto" é rajado, não preto). Avaliá-lo antes das
//      cores sólidas evita que "preto"/"branco" no meio da frase o sequestrem.
//   2. as cores SÓLIDAS (preto/branco/caramelo/marrom/cinza) no meio.
//   3. 'claro' por ÚLTIMO antes de 'outro' — é o balde mais genérico/fraco, só
//      vence quando NENHUMA cor concreta apareceu ("marrom claro" → 'marrom', a cor
//      dominante; "caramelo claro" → 'caramelo'; só "claro" sozinho → 'claro').
// Sem casamento → 'outro'.
const COLOR_KEYWORD_BUCKETS = [
  // bucket 'rajado' — PADRÃO (tigrado/malhado/listrado/manchado/tricolor): PRIMEIRO,
  //   o padrão domina a cor sólida que possa aparecer junto na mesma string.
  { bucket: 'rajado',   keywords: ['rajado', 'rajada', 'tigrado', 'tigrada', 'malhado', 'malhada', 'listrado', 'listrada', 'manchado', 'manchada', 'tricolor', 'mesclado', 'mesclada', 'escaminha'] },
  // bucket 'preto' — preto/pretinho/negro/dark.
  { bucket: 'preto',    keywords: ['preto', 'pretinho', 'preta', 'negro', 'negra', 'dark'] },
  // bucket 'branco' — branco/branquinho/albino.
  { bucket: 'branco',   keywords: ['branco', 'branca', 'branquinho', 'branquinha', 'albino'] },
  // bucket 'caramelo' — caramelo/caramelado/dourado/amarelo/laranja/ruivo/mel/bege.
  { bucket: 'caramelo', keywords: ['caramelo', 'caramelado', 'caramelada', 'dourado', 'dourada', 'amarelo', 'amarela', 'laranja', 'ruivo', 'ruiva', 'mel', 'bege', 'loiro', 'loira'] },
  // bucket 'marrom' — marrom/castanho/chocolate/cafe.
  { bucket: 'marrom',   keywords: ['marrom', 'castanho', 'castanha', 'chocolate', 'cafe', 'marron'] },
  // bucket 'cinza' — cinza/cinzento/grafite/prata/gray/grey.
  { bucket: 'cinza',    keywords: ['cinza', 'cinzento', 'cinzenta', 'grafite', 'prata', 'prateado', 'gray', 'grey'] },
  // bucket 'claro' — genérico/fraco (claro/clarinho), só vence se nada concreto casou.
  { bucket: 'claro',    keywords: ['claro', 'clara', 'clarinho', 'clarinha'] },
];

// Normaliza uma string para casamento de palavra-chave: minúsculas + remoção de
// diacríticos (NFD + strip da faixa combinante U+0300–U+036F). PURO. Defensivo:
// não-string/null → ''. Espelha a disciplina Unicode-safe do sanitizeFreeText
// (acento NUNCA corrompe pt-BR — aqui só o REMOVEMOS para comparar, sem alterar o
// dado armazenado). normalize('NFD') é padrão ECMAScript (browser E Node).
function normalizeColorText(raw) {
  return String(raw == null ? '' : raw)
    .toLowerCase()
    .normalize('NFD')
    // Remove a FAIXA de diacríticos combinantes (U+0300–U+036F) que o NFD separou
    // da letra-base — escape unicode explícito (não um literal combinante no
    // source, que seria invisível/frágil). Assim "ç"→"c", "ã"→"a", "é"→"e".
    .replace(/[\u0300-\u036f]/g, '');
}

// Mapeia um texto livre de cor → id de bucket de PET_COLORS. PURO, nunca lança.
// Empty/desconhecido → 'outro'. Acento/caixa-insensível por construção (via
// normalizeColorText). 1ª palavra-chave que casa (por substring) vence — a ordem
// de COLOR_KEYWORD_BUCKETS codifica a precedência (cor dominante > 'claro' fraco).
export function normalizePetColorToBucket(rawColor) {
  const text = normalizeColorText(rawColor);
  if (!text) return 'outro';
  for (const entry of COLOR_KEYWORD_BUCKETS) {
    for (const kw of entry.keywords) {
      if (text.indexOf(kw) !== -1) return entry.bucket;
    }
  }
  return 'outro';
}

// ─── PRIMITIVAS GEOGRÁFICAS (compartilhadas) ─────────────────────────────────
// Validação pura de um par [lat,lng]: ambos finitos. (O range Brasil é validado
// no writer via validateCoordinatePair do sheetsClient — aqui só garantimos a
// forma, mantendo o domínio independente de regras geográficas.) Mora na FOLHA
// porque é consumida tanto pelo petDomain-remainder (build/parse/coordsKey/
// distância) quanto pelo petMatch (haversineKm/elegibilidade) — uma só verdade.
export function isFiniteCoordPair(coords) {
  return Array.isArray(coords)
    && coords.length === 2
    && Number.isFinite(coords[0])
    && Number.isFinite(coords[1]);
}

// Raio médio da Terra (km) — fator local, evita o número mágico espalhado.
const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

// Distância Haversine em km entre dois pares [lat,lng]. PURA. Defensiva: par
// inválido → Infinity (nunca casa; degrada com calma em vez de lançar/NaN —
// espelha o petAgeDays→Infinity de uma data ilegível). É a UMA verdade de
// "distância entre dois pontos", reusada pelo match do M9b/M12b E pela ordenação
// por distância do M8 (petDistanceKm) — por isso mora na folha.
export function haversineKm(a, b) {
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

// ─── PET-M2 / PET-M12 — CICLO DE VIDA por RESOLUÇÃO e por IDADE (na folha) ─────
// Estes predicados de ciclo de vida moram na FOLHA porque o MATCH (petMatch) os
// consome para a exclusão §4 (isMatchEligible: um pet resolvido OU arquivado por
// idade nem entra no pareamento) E o petDomain-remainder os reusa (parsePetRow/
// withAgedFlag/activePetsByAge). Tê-los aqui mantém a DAG sem ciclo: petMatch →
// petTaxonomy, em vez de petMatch → petDomain → petMatch.

// Chave ESTÁVEL do campo de ciclo-de-vida "reunido" dentro do blob Dados (SOT).
// PET-M2. Ninguém fora do domínio escreve a string literal 'resolvedAt' — o
// writer (petsData.updatePetByCoords) e o parser leem por esta constante, então
// uma renomeação do campo na planilha é uma edição de uma linha só, aqui.
export const PET_RESOLVED_AT_KEY = 'resolvedAt';

// ─── PET-M12 / PET-M13 — chave ESTÁVEL do carimbo de FRESCOR no blob Dados (SOT) ─
// PET_FRESHNESS_SPEC.md §5.2: `freshnessAt` é o "fato vivo" — quando o dono
// afirmou pela última vez que o report vale. É SEPARADO de `DateISO` (o fato
// histórico imutável de 1ª publicação): sobrescrever DateISO apagaria a verdade
// e violaria a Lens of Honesty (um report de 45 dias pareceria ter 2). M12 só
// LÊ este campo (a idade-para-arquivo mede contra ele com fallback p/ DateISO);
// M13 o ESCREVE quando o dono toca "ainda procurando" (reusa o writer do PET-M2,
// rides updatePetByCoords). Linhas sem o campo (todas, hoje) leem como "nunca
// renovado" → a idade cai no fallback DateISO. Ninguém escreve a string literal
// 'freshnessAt' fora do domínio — leem/gravam por esta constante.
export const PET_FRESHNESS_AT_KEY = 'freshnessAt';

// Discriminador resolvido/ativo (SOT). Lê a verdade de UM lugar — o campo
// resolvedAt do pet parseado — para que o mapa/lista deixe de assumir que todo
// pet é ativo. Aceita o objeto parseado (forma do parsePetRow) e nunca lança.
// PET-M2.
export function isPetResolved(pet) {
  return Boolean(pet && pet[PET_RESOLVED_AT_KEY]);
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
