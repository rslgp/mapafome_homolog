// petMatch.js — PET-M9b (match possível) + PET-M12b (de-dup near-duplicate).
//
// Extraído de petDomain.js (limite FF1 de 1000 LOC). Importa da CAMADA-FOLHA
// (petTaxonomy) tudo de que precisa — as primitivas geográficas/temporais
// (MS_PER_DAY/isFiniteCoordPair/haversineKm), a SOT de status (PET_STATUSES) e os
// predicados de ciclo de vida da exclusão §4 (isPetResolved/isPetArchivedByAge).
// Não importa petFilterDomain nem o petDomain-remainder → DAG limpa, sem ciclo.

import {
  MS_PER_DAY,
  isFiniteCoordPair,
  haversineKm,
  PET_STATUSES,
  isPetResolved,
  isPetArchivedByAge,
  isWildcardSpecies,
} from './petTaxonomy';

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

// Status que contam como "alguém viu/pegou um pet" (o lado NÃO-perdido do par).
// DERIVADO da SOT PET_STATUSES — ninguém escreve 'encontrado'/'avistado' hardcoded;
// o lado-perdido é 'perdido' (também da SOT). Se a lista de status mudar, a regra
// de pareamento acompanha (a âncora é "exatamente um lado perdido", spec §1.1).
const PERDIDO_ID = 'perdido';
const SIGHTING_STATUS_IDS = new Set(
  PET_STATUSES.map((s) => s.id).filter((id) => id !== PERDIDO_ID),
);

// isWildcardSpecies foi promovida à CAMADA-FOLHA (petTaxonomy) — match (enfraquece)
// e dedup (BLOQUEIA) leem a MESMA verdade; importada acima.

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
