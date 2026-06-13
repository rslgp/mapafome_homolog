// petFilterDomain.js — PET-M7: filtro do mapa (SOT do estado + predicado PURO).
//
// Extraído de petDomain.js (limite FF1 de 1000 LOC). Importa as listas SOT e as
// primitivas compartilhadas da CAMADA-FOLHA (petTaxonomy) — nunca o contrário, então
// a DAG fica limpa (petFilterDomain → petTaxonomy, sem ciclo).
//
// ─── PET-M7 — filtro do mapa (SOT do estado + predicado PURO) ────────────────
//
// O filtro estreita os PINS por facetas: status / espécie / porte / COR / RECÊNCIA.
// As OPÇÕES não vivem aqui como literais — são as MESMAS listas SOT do petTaxonomy
// (PET_STATUSES / PET_SPECIES / PET_SIZES / PET_COLORS / PET_RECENCY_OPTIONS).
// Mudar a SOT muda o filtro sem outra edição: a UI itera as listas para desenhar
// os chips e o predicado valida contra os mesmos Sets/mapas. Ninguém escreve
// 'perdido' (ou qualquer id) hardcoded — é tudo derivado.
//
// SEMÂNTICA (a regra de negócio do filtro, num só lugar):
//   • faceta VAZIA = sem restrição (combina com tudo). O estado inicial é o
//     filtro vazio → todos os pets aparecem.
//   • DENTRO de uma faceta multi-seleção: OR (status perdido OU encontrado;
//     cor preto OU caramelo).
//   • ENTRE facetas: AND (status E espécie E porte E cor E recência).
//   • RECÊNCIA é a exceção de FORMA: single-select (`recencyDays` number|null),
//     não um array de toggle — 7⊂30⊂90 são aninhados (multi-seleção não teria
//     significado). null = sem restrição.
// É o mesmo modelo mental de um filtro de e-commerce — Jakob's Law: o usuário já
// o conhece de outras superfícies, então não há custo de aprendizado.
//
// COR: a faceta guarda ids de BUCKET (de PET_COLORS); o pet armazena cor em TEXTO
// LIVRE. A ponte é normalizePetColorToBucket(pet.color) — o predicado compara o
// BUCKET do pet contra os buckets selecionados (não o texto cru). Assim "caramelo
// claro" (texto) casa o chip 'caramelo'.

import { MS_PER_DAY, normalizePetColorToBucket } from './petTaxonomy';

// Fábrica do estado de filtro vazio (SOT da FORMA do filtro). Devolve uma cópia
// NOVA a cada chamada (arrays próprios) para o React poder tratar como imutável
// sem aliasing acidental entre montagens.
//
// FORMA (5 facetas; estado inicial = tudo vazio → todos os pets aparecem):
//   • statuses/species/sizes/colors — ARRAYS de ids (multi-seleção, OR interno).
//   • recencyDays — number | null. SINGLE-select (recência é eixo único, 7⊂30⊂90
//     aninhados). `null` = SEM restrição (o DEFAULT). NÃO é um array.
// `colors` parte vazio e `recencyDays` parte null (sem restrição) — um pet sem cor,
// ou sem data legível, aparece enquanto essas facetas estão inativas. Filtros
// antigos sem essas chaves leem como vazias (backward-compat, via facetIds/leituras
// defensivas no predicado).
export function defaultPetFilter() {
  return { statuses: [], species: [], sizes: [], colors: [], recencyDays: null };
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

// Faceta de RECÊNCIA (PURA + DETERMINÍSTICA, `nowMs` injetado). Um pet "combina"
// se foi publicado HÁ NO MÁXIMO `recencyDays` dias, medido contra o relógio
// injetado. Regras:
//   • recencyDays null/undefined/não-finito → SEM restrição (combina com tudo).
//   • idade = (nowMs - Date.parse(dateIso)) / dia. Combina se idade <= janela.
//   • dateIso AUSENTE ou ILEGÍVEL com a recência ATIVA → FAIL-CLOSED (exclui).
//     Decisão documentada: não dá para PROVAR que um report sem data é recente, e
//     o eixo de recência existe justamente para quem quer só os relatos novos —
//     incluir um pet de idade desconhecida traíria a intenção do filtro. (Sem o
//     filtro ativo, esse mesmo pet aparece normalmente — a exclusão é só quando o
//     usuário PEDE recência.) Espelha o petAgeDays→Infinity do M12, mas aqui a
//     consequência é "não combina" em vez de "arquiva".
// Usa o DateISO de PUBLICAÇÃO (fato histórico de quando o relato entrou), não o
// freshnessAt — "publicado nos últimos N dias" é o que o usuário lê como recência.
function matchesRecency(dateIso, recencyDays, nowMs) {
  if (!Number.isFinite(recencyDays)) return true; // null/undefined = sem restrição
  if (!dateIso) return false;                      // fail-closed: idade indemonstrável
  const then = Date.parse(dateIso);
  if (Number.isNaN(then)) return false;            // fail-closed: data ilegível
  const ageDays = (nowMs - then) / MS_PER_DAY;
  return ageDays <= recencyDays;                   // dentro da janela (inclusive)
}

// Predicado PURO e DETERMINÍSTICO do filtro. Recebe UM pet (forma do parsePetRow),
// o estado de filtro e `nowMs` INJETADO pelo chamador (nunca Date.now() aqui —
// espelha buildPetDados/classifyPublishFailure). NUNCA lança: um pet malformado
// (null, sem campos) é tratado como objeto vazio e simplesmente não combina com
// nenhuma faceta ATIVA — some do mapa em vez de derrubar o render.
//
// ENTRE facetas é AND: todas precisam combinar. Com o filtro vazio, as cinco
// facetas combinam (vazias / recência null) → true para todo pet (combina com tudo).
//
// `nowMs` AGORA É CONSULTADO pela faceta de recência (matchesRecency): a idade do
// pet é medida contra o relógio INJETADO. As demais facetas (status/espécie/porte/
// cor) são atemporais. A faceta de cor compara o BUCKET do pet (derivado do texto
// livre por normalizePetColorToBucket) contra os buckets selecionados.
export function matchesPetFilter(pet, filter, nowMs) {
  const p = pet || {};
  const f = filter || {};
  // Cor: o pet guarda texto livre; comparamos pelo BUCKET derivado. Calculado só
  // quando a faceta de cor está ATIVA (facetMatches já curto-circuita o vazio, mas
  // evitamos a normalização desnecessária no caminho comum sem filtro de cor).
  const colorIds = facetIds(f.colors);
  const colorOk = colorIds.length === 0
    ? true
    : colorIds.indexOf(normalizePetColorToBucket(p.color)) !== -1;
  return (
    facetMatches(f.statuses, p.status)
    && facetMatches(f.species, p.species)
    && facetMatches(f.sizes, p.size)
    && colorOk
    && matchesRecency(p.dateIso, f.recencyDays, nowMs)
  );
}

// Helper FINO de array: aplica o predicado a uma lista. PURO. `nowMs` injetado e
// repassado (mesma disciplina). Defende contra `pets` não-array (→ []). É o que o
// PetsApp chama para derivar os pets visíveis a partir de todos os pets + filtro.
export function filterPets(pets, filter, nowMs) {
  if (!Array.isArray(pets)) return [];
  return pets.filter((pet) => matchesPetFilter(pet, filter, nowMs));
}

// Conta quantas facetas estão ATIVAS — usado pela UI para decidir se o botão
// "limpar filtros" deve aparecer e para o resumo "filtrando por N". PURO. Uma
// faceta de ARRAY é ativa quando não-vazia; a RECÊNCIA (single-select) é ativa
// quando recencyDays é um número finito (null = inativa). Defensivo contra filtro
// ausente / facetas não-array / recencyDays lixo.
export function countActivePetFilterFacets(filter) {
  const f = filter || {};
  let n = 0;
  if (facetIds(f.statuses).length) n += 1;
  if (facetIds(f.species).length) n += 1;
  if (facetIds(f.sizes).length) n += 1;
  if (facetIds(f.colors).length) n += 1;
  if (Number.isFinite(f.recencyDays)) n += 1; // recência ativa = janela escolhida
  return n;
}

// Conjunto das facetas que são ARRAYS (multi-seleção, toggle-áveis). A recência
// NÃO está aqui: é single-select e tem seu próprio setter (setPetFilterRecency).
const TOGGLEABLE_FACET_KEYS = new Set(['statuses', 'species', 'sizes', 'colors']);

// Clona a FORMA COMPLETA do filtro (todas as 5 facetas), sem mutar o original e
// sem aliasing de array. PURO. É o ÚNICO ponto que conhece a forma do filtro para
// os mutators — assim adicionar uma faceta no futuro é uma edição de uma linha.
// Crucial: o clone preserva `colors` E `recencyDays`, então nenhum mutator
// (toggle de array OU set de recência) DERRUBA a outra faceta (regressão clássica
// de "esqueci de copiar o campo novo no spread").
function clonePetFilter(filter) {
  const base = filter || defaultPetFilter();
  // recencyDays só sobrevive se for um número finito; qualquer lixo → null (default).
  const recencyDays = Number.isFinite(base.recencyDays) ? base.recencyDays : null;
  return {
    statuses: facetIds(base.statuses).slice(),
    species: facetIds(base.species).slice(),
    sizes: facetIds(base.sizes).slice(),
    colors: facetIds(base.colors).slice(),
    recencyDays,
  };
}

// Toggle PURO e IMUTÁVEL de um id dentro de uma faceta de ARRAY: devolve um filtro
// NOVO com o id adicionado (se ausente) ou removido (se presente), sem mutar o
// anterior. A UI lê daqui em vez de reimplementar a lógica de array em cada handler
// — uma só verdade de "selecionar/desselecionar". `facetKey` é 'statuses'|'species'|
// 'sizes'|'colors'. Defensivo: chave desconhecida (ou 'recencyDays', que NÃO é
// toggle-ável aqui) devolve o filtro inalterado (clonado, preservando recência).
export function togglePetFilterValue(filter, facetKey, id) {
  const next = clonePetFilter(filter);
  if (!TOGGLEABLE_FACET_KEYS.has(facetKey)) return next; // no-op seguro (recência usa o setter)
  const arr = next[facetKey];
  const at = arr.indexOf(id);
  if (at === -1) {
    arr.push(id);
  } else {
    arr.splice(at, 1);
  }
  return next;
}

// Setter PURO e IMUTÁVEL da faceta de RECÊNCIA (single-select). Recência NÃO é um
// toggle de array: é um valor único `recencyDays` (number) ou `null`. A UI chama
// isto ao tocar um chip de recência. SEMÂNTICA do clique:
//   • passar um número (7/30/90) → define essa janela (substitui a anterior);
//   • passar null/undefined/não-finito → LIMPA (volta a "sem restrição").
//   • tocar o chip JÁ ATIVO de novo = limpar: a UI detecta isso e chama com null
//     (este módulo não conhece "o chip atual"; ele só aplica o valor pedido). Por
//     simetria/conveniência, repassar o MESMO valor já ativo também limpa (toggle-
//     off idempotente), para a UI poder mandar sempre o id tocado sem checar antes.
// Devolve um filtro NOVO preservando TODAS as outras facetas (via clonePetFilter).
export function setPetFilterRecency(filter, recencyDaysOrNull) {
  const next = clonePetFilter(filter);
  const requested = Number.isFinite(recencyDaysOrNull) ? recencyDaysOrNull : null;
  // Tocar o valor já ativo de novo desativa (toggle-off): clicar "7d" quando "7d"
  // já está selecionado volta para null (sem restrição) — o gesto "desmarcar".
  next.recencyDays = (requested !== null && requested === next.recencyDays) ? null : requested;
  return next;
}
