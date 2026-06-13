// petListSort.js — PET-M8: distância ao centro + ORDENAÇÃO da lista. Responsabilidade
// única: ordenar a view de lista. PURO + DETERMINÍSTICO — `center` e `nowMs` são
// INJETADOS pelo chamador (PetsApp, no boundary), nunca geolocation/Date.now() aqui.
// Importa isFiniteCoordPair/haversineKm da folha (petTaxonomy) — a MESMA verdade de
// "distância entre dois pontos" do match (M9b). Re-exportado pelo barrel petDomain.js
// (todo `import { sortPetsForList, petDistanceKm } from './petDomain'` segue casando).

import { isFiniteCoordPair, haversineKm } from './petTaxonomy';

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
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? -Infinity : ms;
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
