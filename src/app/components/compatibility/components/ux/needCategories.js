import { t } from './strings';

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
//   id   — stable slug persisted in a pin's Categorias[] (ASCII, no accents).
//          NEVER translated/renamed/reordered: it is the data contract (it lives
//          in every pin's Categorias[] and in the `need:<id>` filter encoding).
//   icon — emoji, DECORATIVE + locale-independent (always paired with a text
//          label; the icon node is aria-hidden at every render site), so it stays
//          in the data file, not the dictionary.
//
// The display TEXT is i18n-keyed, NOT hardcoded here (INTL): the short UI label
// (chips, detail sheet, filter menu) resolves from `need.label.<id>` and the
// fuller public aggregate-report legend label from `need.report.<id>` in the core
// i18n shard, at full 7-locale parity. Read them at the render boundary via the
// needLabel(id) / needReportLabel(id) accessors below (they call t() so the active
// locale resolves at render time). pt-BR is the verbatim source; the other six
// locales are `[REVISAR-HUMANO] ` drafts pending human tone review (dignity copy).
export const NEED_CATEGORIES = [
  { id: 'comida',  icon: '🍞' },
  { id: 'agua',    icon: '💧' },
  { id: 'roupa',   icon: '👕' },
  { id: 'higiene', icon: '🧼' },
  { id: 'abrigo',  icon: '🏠' },
  { id: 'remedio', icon: '💊' },
  { id: 'animais', icon: '🐾' },
  { id: 'energia', icon: '⚡' },
];

// id → entry, for O(1) icon lookup at render.
export const NEED_CATEGORY_MAP = Object.fromEntries(
  NEED_CATEGORIES.map((c) => [c.id, c]),
);

// ── i18n accessors (resolve at the render boundary) ──────────────────────────
// needLabel(id) / needReportLabel(id) — resolve the localized display text for a
// need id from the core i18n shard via t(). The import is safe (no cycle): strings.js
// re-exports only the engine, which imports only the dictionary shards, none of which
// import THIS module. t() reads the ACTIVE locale at call time, so a render site
// calling these (and subscribed via useLocale()) re-resolves on a language switch.
// An unknown id falls back to the `need.label.<id>`/`need.report.<id>` key (t()
// returns the key on a dictionary miss), never a blank label.
export function needLabel(id) {
  return t(`need.label.${id}`);
}

export function needReportLabel(id) {
  return t(`need.report.${id}`);
}

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
