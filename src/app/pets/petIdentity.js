// petIdentity.js — PET-M18/M13: identidade de report PII-FREE, coords-keyed, e o
// param de deep link. Responsabilidade única: derivar/parsear a chave pública de
// coords e o param `?pet=`. PURO. Importa só isFiniteCoordPair da folha (petTaxonomy)
// — DAG sem ciclo. Re-exportado pelo barrel petDomain.js (todo `import { petCoordsKey,
// … } from './petDomain'` segue casando sem edição no chamador).

import { isFiniteCoordPair } from './petTaxonomy';

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
