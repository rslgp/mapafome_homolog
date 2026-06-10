// Single source of truth for reporter-pin NEED categories — the things a mapped
// person can be asking for. The M1 ReportSheet captures them as chips,
// PinDetailSheet renders them, the map "filtro atual" menu narrows by them, and
// reports.js labels them in the public aggregate. Add a category HERE and every
// surface picks it up; do not hardcode the list anywhere else.
//
// History / why these exist:
//   • The first five (comida/agua/roupa/higiene/abrigo) shipped with the M1
//     reporter flow for everyday food insecurity.
//   • The last three (remedio/animais/energia) were added for the natural-
//     disaster case — specifically the 2024 Rio Grande do Sul floods, where the
//     people stranded by the enchente needed medicine, help for their animals,
//     and a way to charge a phone just as much as food. A catastrophe makes
//     people homeless regardless of wealth, so these needs serve everyone in the
//     disaster, not only people who cannot afford food.
//
// Field contract per entry:
//   id          — stable slug persisted in a pin's Categorias[] (ASCII, no accents).
//   label       — short UI label (chips, detail sheet, filter menu).
//   icon        — emoji, DECORATIVE only (always paired with a text label; the
//                 icon node is aria-hidden at every render site).
//   reportLabel — fuller label for the public aggregate-report legend.
export const NEED_CATEGORIES = [
  { id: 'comida',  label: 'Comida',   icon: '🍞', reportLabel: 'Comida (genérico)' },
  { id: 'agua',    label: 'Água',     icon: '💧', reportLabel: 'Água' },
  { id: 'roupa',   label: 'Roupa',    icon: '👕', reportLabel: 'Roupa' },
  { id: 'higiene', label: 'Higiene',  icon: '🧼', reportLabel: 'Higiene' },
  { id: 'abrigo',  label: 'Abrigo',   icon: '🏠', reportLabel: 'Abrigo' },
  { id: 'remedio', label: 'Remédios', icon: '💊', reportLabel: 'Remédios' },
  { id: 'animais', label: 'Animais',  icon: '🐾', reportLabel: 'Animais (resgate e ração)' },
  { id: 'energia', label: 'Carregar', icon: '⚡', reportLabel: 'Carregar celular / energia' },
];

// id → entry, for O(1) label/icon lookup at render.
export const NEED_CATEGORY_MAP = Object.fromEntries(
  NEED_CATEGORIES.map((c) => [c.id, c]),
);

// Active-filter convention: the "filtro atual" menu emits `need:<id>` (or
// `need:*` for every need). Keeping the encoding here means the menu, the
// marker layer, and any test all agree on one string contract.
export const NEED_FILTER_PREFIX = 'need:';
export const NEED_FILTER_ALL = 'need:*';

// Returns the need id encoded in a filter value, '*' for "all needs", or null
// when the value is not a need filter at all (i.e. a legacy Roaster filter).
export function needFilterId(filtro) {
  if (typeof filtro !== 'string' || !filtro.startsWith(NEED_FILTER_PREFIX)) return null;
  return filtro.slice(NEED_FILTER_PREFIX.length) || null;
}
