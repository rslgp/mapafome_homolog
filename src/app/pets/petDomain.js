// petDomain.js — BARREL do domínio /pets (pets perdidos) + o resíduo de superfície
// que não merece módulo próprio.
//
// Tudo que descreve um pet (status, espécie, porte) e a forma do seu blob `Dados`
// vive na DAG abaixo. Nunca escreva a string 'perdido' (ou qualquer id/label)
// hardcoded em outro arquivo — importe da lista/mapa deste barrel.
//
// ─── ESTRUTURA (PET-M: split FF1) ────────────────────────────────────────────
// Este módulo cresceu além do limite FF1 e foi dividido numa DAG limpa (sem ciclos),
// mantendo a API PÚBLICA IDÊNTICA: este arquivo é o BARREL — re-exporta tudo que não
// define mais, então todo `import { X } from './petDomain'` (app E testes) segue
// funcionando sem nenhuma edição no chamador.
//   • petTaxonomy.js     — CAMADA-FOLHA: constantes/validadores SOT + cor + as
//       primitivas compartilhadas (MS_PER_DAY/isFiniteCoordPair/haversineKm) + os
//       predicados de ciclo de vida por idade/resolução (PET-M2/M12). Não importa
//       nenhum outro módulo de pet.
//   • petFilterDomain.js — PET-M7: estado do filtro + predicado puro. → petTaxonomy.
//   • petMatch.js        — PET-M9b match + PET-M12b de-dup. → petTaxonomy.
//   • petHygiene.js      — PET-M3: higiene de entrada (sanitize texto/URL). Folha.
//   • petBlob.js         — round-trip do blob (build/parse) + closureReason.
//       → petTaxonomy + petHygiene.
//   • petPublishGuards.js— PET-M1/M4: classificação de falha + throttle (+ a cópia
//       calma via t). É o ÚNICO leaf que acopla a i18n. → strings.
//   • petIdentity.js     — PET-M18/M13: chave de coords PII-free + deep link param.
//       → petTaxonomy.
//   • petListSort.js     — PET-M8: distância + ordenação da lista. → petTaxonomy.
//   • petDomain.js (este)— o BARREL + o RESÍDUO: flag de denúncia (contador) e os
//       wrappers de superfície da exclusão por idade (PET-M12). → petTaxonomy. E
//       re-exporta todos os módulos acima.

import {
  isPetArchivedByAge,
  PET_ARCHIVE_WINDOW_DAYS,
} from './petTaxonomy';

// ─── BARREL — re-exporta os módulos extraídos para manter a API pública INTACTA ─
// Re-export NOMEADO (não `export *`): preserva EXATAMENTE a superfície pública
// original — cada `import { X } from './petDomain'` (app E testes) segue casando —
// SEM vazar os helpers internos compartilhados que vivem nas folhas só para a DAG
// (MS_PER_DAY/isFiniteCoordPair/haversineKm/roundCoord/petRecencyMs continuam
// privados ao domínio). A ordem não cria ciclo: nenhum dos módulos importa de volta
// o petDomain — todos só importam da folha (petTaxonomy/petHygiene).
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
  petColorBucketLabelPtBR,
  PET_RESOLVED_AT_KEY,
  PET_FRESHNESS_AT_KEY,
  isPetResolved,
  PET_ARCHIVE_WINDOW_DAYS,
  petAgeDays,
  isPetArchivedByAge,
  describePet,
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
  // petMatch — PET-M9b match possível (perdido ↔ encontrado/avistado)
  PET_MATCH_DEFAULTS,
  PET_MATCH_STRENGTH,
  petMatchStrength,
  findPossibleMatches,
} from './petMatch';
export {
  // petDedup — PET-M12b de-dup near-duplicate (soft-merge visual)
  PET_DEDUP_DEFAULTS,
  isNearDuplicate,
  groupNearDuplicates,
} from './petDedup';
export {
  // petHygiene — PET-M3 higiene de entrada (sanitize texto livre + URL de fotos)
  sanitizePhotosUrl,
  PET_FREETEXT_MAXLEN,
  sanitizeFreeText,
} from './petHygiene';
export {
  // petBlob — round-trip do blob `Dados` + motivo de fechamento
  PET_CLOSURE_REASON_KEY,
  PET_CLOSURE_REASON,
  isValidClosureReason,
  buildPetDados,
  parsePetRow,
} from './petBlob';
export {
  // petPublishGuards — PET-M1/M4 falha de publicação + throttle/rate-limit (+ cópia)
  PET_PUBLISH_FAILURE,
  PET_PUBLISH_FAILURE_COPY,
  classifyPublishFailure,
  shouldQueuePublishFailure,
  PET_PUBLISH_RATE_LIMIT,
  PET_PUBLISH_THROTTLE,
  PET_PUBLISH_THROTTLE_COPY,
  publishPayloadSignature,
  classifyPublishThrottle,
  isPublishRateLimited,
} from './petPublishGuards';
export {
  // petIdentity — PET-M18/M13 chave de coords PII-free + deep link param
  PET_COORDS_KEY_PRECISION,
  petCoordsKey,
  findPetByCoordsKey,
  normalizeCoordsKey,
  PET_DEEPLINK_PARAM,
  parsePetDeepLinkParam,
} from './petIdentity';
export {
  // petListSort — PET-M8 distância + ordenação da lista
  petDistanceKm,
  sortPetsForList,
} from './petListSort';

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
