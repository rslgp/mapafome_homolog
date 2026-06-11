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
