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

// Monta o blob `Dados` de uma linha de pet. PURA: lança Error claro se status ou
// coords forem inválidos; exige `dateIso` do chamador (sem Date.now() aqui).
// Campos de texto opcionais caem para string vazia.
export function buildPetDados({ coords, status, species, size, color, name, contact, detail, photos, dateIso }) {
  if (!isValidStatus(status)) {
    throw new Error(`buildPetDados: status inválido "${status}"`);
  }
  if (!isFiniteCoordPair(coords)) {
    throw new Error('buildPetDados: coords deve ser um par [lat,lng] finito');
  }
  return {
    kind: PET_KIND,
    status,
    species: species || '',
    size: size || '',
    color: color || '',
    name: name || '',
    contact: contact || '',
    Detalhe: detail || '',
    photos: sanitizePhotosUrl(photos),
    Coordinates: JSON.stringify(coords),
    DateISO: dateIso,
  };
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
  };
}

// ============================================================================
// FILTRO DE PETS (PET-M7, camada de domínio) — predicado PURO e testável.
//
// A UI (dona da metade visual do PET-M7) CONSOME o que está aqui; ela NÃO
// re-deriva nenhuma regra. Mesma disciplina do resto do módulo:
//   • SOT: status/espécie/porte lêem ids das listas acima — nunca 'perdido'
//     hardcoded no predicado.
//   • PURO/determinístico: a recência é medida contra um `nowMs` (epoch ms)
//     INJETADO pelo chamador — sem Date.now() aqui (espelha buildPetDados).
//   • Barricada (v5 § defensive_programming.barricade_pattern): nunca lança
//     em pet malformado. Cada faceta tem um default DIGNO e TESTADO.
// ============================================================================

// Recência ("reportado nos últimos N dias"). `days` é a fonte da verdade;
// id/label são texto de UI. Espelha a forma de PET_STATUSES.
export const PET_RECENCY_OPTIONS = [
  { id: '7',  label: 'Últimos 7 dias',  days: 7 },
  { id: '30', label: 'Últimos 30 dias', days: 30 },
  { id: '90', label: 'Últimos 90 dias', days: 90 },
];

// id → entrada, para lookup O(1) (espelha PET_STATUS_MAP).
export const RECENCY_MAP = PET_RECENCY_OPTIONS.reduce((map, r) => {
  map[r.id] = r;
  return map;
}, {});

// Forma canônica do filtro vazio ("tudo visível"). UI e testes compartilham
// UMA forma só (sem duplicar o shape). Arrays vazios / '' / null = "sem
// restrição nesta faceta". É uma FÁBRICA (retorna objeto novo a cada chamada)
// para que ninguém mute um singleton compartilhado.
export function defaultPetFilter() {
  return { statuses: [], species: [], sizes: [], color: '', recencyDays: null };
}

// Normaliza texto para a busca de cor: insensível a ACENTO e a CAIXA.
// normalize('NFD') decompõe letras acentuadas em base + marca combinante;
// a regex remove as marcas combinantes (faixa U+0300–U+036F); depois caixa
// baixa + trim. Assim "Caramelo" === "caramelo" e "Marrom" casa "marrom".
// PURA e exportada para ser testável isoladamente. Aceita qualquer entrada
// (null/number/undefined viram '' via String()), nunca lança.
export function normalizeText(raw) {
  return String(raw == null ? '' : raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Casa o pet contra UMA faceta de multi-seleção (status/espécie/porte).
// Constraint vazia (não-array ou array vazio) = "sem restrição" → casa tudo
// (fail-open digno). Caso contrário, o valor do pet precisa estar na seleção
// (OR dentro da faceta).
function matchesSelection(value, selected) {
  if (!Array.isArray(selected) || selected.length === 0) return true;
  return selected.indexOf(value) !== -1;
}

// Casa a faceta de recência. Sem restrição (recencyDays == null) → casa tudo.
// Com restrição, um pet com dateIso vazio/ilegível NÃO casa (não há como
// provar que é recente — fail-closed deliberado), enquanto um dateIso válido
// casa se estiver dentro da janela [nowMs - days, nowMs]. Datas no futuro
// (idade negativa) também casam: estão dentro da janela "até agora".
function matchesRecency(dateIso, recencyDays, nowMs) {
  if (recencyDays == null) return true;
  const t = Date.parse(String(dateIso || ''));
  if (!Number.isFinite(t)) return false;
  const ageMs = nowMs - t;
  const windowMs = recencyDays * 24 * 60 * 60 * 1000;
  return ageMs <= windowMs;
}

// Predicado central — a unidade real. PURO: a recência usa o `nowMs` injetado
// (sem Date.now() aqui). Se o filtro não tem restrição de recência, `nowMs`
// não é usado e pode ser undefined. NUNCA lança em pet malformado: cada faceta
// tem default definido (acima) e um pet null/garbage simplesmente cai nos
// defaults (status/espécie/porte viram '' e só casam se a faceta estiver vazia).
// Semântica: faceta vazia casa tudo; TODAS as facetas ativas precisam passar
// (AND entre facetas), OR dentro de cada faceta de multi-seleção.
export function matchesPetFilter(pet, filter, nowMs) {
  const p = pet || {};
  const f = filter || {};

  if (!matchesSelection(p.status || '', f.statuses)) return false;
  if (!matchesSelection(p.species || '', f.species)) return false;
  if (!matchesSelection(p.size || '', f.sizes)) return false;

  // Cor: substring insensível a acento/caixa. Query vazia não restringe.
  // Uma cor de pet vazia NUNCA casa uma query não-vazia (não há texto).
  const query = normalizeText(f.color);
  if (query) {
    if (normalizeText(p.color).indexOf(query) === -1) return false;
  }

  if (!matchesRecency(p.dateIso, f.recencyDays, nowMs)) return false;

  return true;
}

// Conveniência fina: aplica o predicado sobre um array, retornando um array
// NOVO (puro, não muta a entrada). A UI pode preferir isto; o predicado acima
// continua sendo a unidade testada. Entrada não-array → [] (barricada).
export function filterPets(pets, filter, nowMs) {
  if (!Array.isArray(pets)) return [];
  return pets.filter((pet) => matchesPetFilter(pet, filter, nowMs));
}
