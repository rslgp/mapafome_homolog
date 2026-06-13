// INTL-1 — country catalog for the flag-driven geocoder scope.
//
// The map's address search was hard-pinned to Brazil (countrycodes/region='br'
// + BRAZIL_BOUNDS). The "international" feature opens it to ANY country: the
// user picks a flag, and the chosen country's ISO-3166 alpha-2 code drives the
// Nominatim query (countrycodes/region/accept-language). "Non-water" is
// inherent — a geocoder only returns addressable land, never open ocean.
//
// Data shape, kept deliberately minimal: we store only `code -> name` (pt-BR).
// The flag emoji is DERIVED from the two-letter code via the Unicode regional-
// indicator block (A..Z -> U+1F1E6..U+1F1FF), so we never hand-maintain ~250
// emoji literals — `flagEmoji('br')` returns 🇧🇷. Per-country viewport bounds are
// optional and live in COUNTRY_BOUNDS; when absent the search is country-
// restricted but not bounds-clamped (Nominatim's countrycodes alone is enough
// to keep results inside the country).
//
// ── INTL M3.5 — country catalog follows the UI locale (I18N-1) ──
//
// The eager COUNTRY_NAMES map below is pt-BR ONLY, and the eager COUNTRIES list
// sorts with localeCompare(..., 'pt-BR'). So an `es` user opened the flag picker
// and read a Portuguese list sorted for Portuguese — the exact country/language
// mismatch this feature removes. M3.5 adds countriesForLocale(locale): names are
// rendered via Intl.DisplayNames in the ACTIVE UI language and sorted with that
// locale, with COUNTRY_NAMES as a fallback. getLocale() is the i18n READ function
// (not the country STORE) so importing it does NOT create the countryStore cycle
// §4.1/ARCH-5 warns about (the i18n subtree imports neither countries nor
// countryStore — verified acyclic). It is a DEFAULT arg only; the resolver takes
// an explicit locale so it stays pure-testable without the engine.

import { getLocale } from './ux/strings';

// ISO-3166-1 alpha-2 -> pt-BR short name. Sorted by name at module load for the
// picker. This is the full UN/ISO set; editing it is just adding a `code: name`.
//
// This map is ALSO the authoritative pt-BR override (see countriesForLocale): for
// the pt-BR locale these hand-curated names WIN over Intl.DisplayNames, so the
// default-locale picker stays byte-for-byte identical to today (the dark-ship
// invariant). Intl.DisplayNames' pt-BR CLDR names diverge from these for ~20 codes
// (e.g. "Holanda"→"Países Baixos", "Macau"→"Macau, RAE da China"); we keep the
// curated forms. For OTHER locales Intl.DisplayNames is the source and this map is
// the fallback when the API is unavailable or yields nothing.
const COUNTRY_NAMES = {
  af: 'Afeganistão', za: 'África do Sul', al: 'Albânia', de: 'Alemanha',
  ad: 'Andorra', ao: 'Angola', ai: 'Anguilla', aq: 'Antártida',
  ag: 'Antígua e Barbuda', sa: 'Arábia Saudita', dz: 'Argélia', ar: 'Argentina',
  am: 'Armênia', aw: 'Aruba', au: 'Austrália', at: 'Áustria', az: 'Azerbaijão',
  bs: 'Bahamas', bh: 'Bahrein', bd: 'Bangladesh', bb: 'Barbados', be: 'Bélgica',
  bz: 'Belize', bj: 'Benin', bm: 'Bermudas', by: 'Bielorrússia', bo: 'Bolívia',
  ba: 'Bósnia e Herzegovina', bw: 'Botsuana', br: 'Brasil', bn: 'Brunei',
  bg: 'Bulgária', bf: 'Burquina Faso', bi: 'Burundi', bt: 'Butão',
  cv: 'Cabo Verde', cm: 'Camarões', kh: 'Camboja', ca: 'Canadá', qa: 'Catar',
  kz: 'Cazaquistão', td: 'Chade', cl: 'Chile', cn: 'China', cy: 'Chipre',
  co: 'Colômbia', km: 'Comores', cg: 'Congo', cd: 'Congo (RDC)',
  kp: 'Coreia do Norte', kr: 'Coreia do Sul', ci: 'Costa do Marfim',
  cr: 'Costa Rica', hr: 'Croácia', cu: 'Cuba', cw: 'Curaçao', dk: 'Dinamarca',
  dj: 'Djibuti', dm: 'Dominica', eg: 'Egito', sv: 'El Salvador',
  ae: 'Emirados Árabes Unidos', ec: 'Equador', er: 'Eritreia', sk: 'Eslováquia',
  si: 'Eslovênia', es: 'Espanha', us: 'Estados Unidos', ee: 'Estônia',
  sz: 'Essuatíni', et: 'Etiópia', fj: 'Fiji', ph: 'Filipinas', fi: 'Finlândia',
  fr: 'França', ga: 'Gabão', gm: 'Gâmbia', gh: 'Gana', ge: 'Geórgia',
  gi: 'Gibraltar', gd: 'Granada', gr: 'Grécia', gl: 'Groenlândia',
  gp: 'Guadalupe', gu: 'Guam', gt: 'Guatemala', gg: 'Guernsey', gy: 'Guiana',
  gf: 'Guiana Francesa', gn: 'Guiné', gq: 'Guiné Equatorial', gw: 'Guiné-Bissau',
  ht: 'Haiti', nl: 'Holanda', hn: 'Honduras', hk: 'Hong Kong', hu: 'Hungria',
  ye: 'Iêmen', bv: 'Ilha Bouvet', cx: 'Ilha Christmas', im: 'Ilha de Man',
  ky: 'Ilhas Cayman', cc: 'Ilhas Cocos', ck: 'Ilhas Cook', fo: 'Ilhas Faroé',
  fk: 'Ilhas Malvinas', mp: 'Ilhas Marianas', mh: 'Ilhas Marshall',
  sb: 'Ilhas Salomão', tc: 'Ilhas Turks e Caicos', vg: 'Ilhas Virgens (RU)',
  vi: 'Ilhas Virgens (EUA)', in: 'Índia', id: 'Indonésia', ir: 'Irã',
  iq: 'Iraque', ie: 'Irlanda', is: 'Islândia', il: 'Israel', it: 'Itália',
  jm: 'Jamaica', jp: 'Japão', je: 'Jersey', jo: 'Jordânia', kw: 'Kuwait',
  la: 'Laos', ls: 'Lesoto', lv: 'Letônia', lb: 'Líbano', lr: 'Libéria',
  ly: 'Líbia', li: 'Liechtenstein', lt: 'Lituânia', lu: 'Luxemburgo',
  mo: 'Macau', mk: 'Macedônia do Norte', mg: 'Madagascar', my: 'Malásia',
  mw: 'Malávi', mv: 'Maldivas', ml: 'Mali', mt: 'Malta', ma: 'Marrocos',
  mq: 'Martinica', mu: 'Maurício', mr: 'Mauritânia', yt: 'Mayotte',
  mx: 'México', mm: 'Mianmar', fm: 'Micronésia', mz: 'Moçambique',
  md: 'Moldávia', mc: 'Mônaco', mn: 'Mongólia', me: 'Montenegro',
  ms: 'Montserrat', na: 'Namíbia', nr: 'Nauru', np: 'Nepal',
  ni: 'Nicarágua', ne: 'Níger', ng: 'Nigéria', nu: 'Niue', no: 'Noruega',
  nc: 'Nova Caledônia', nz: 'Nova Zelândia', om: 'Omã', pw: 'Palau',
  pa: 'Panamá', pg: 'Papua-Nova Guiné', pk: 'Paquistão', py: 'Paraguai',
  pe: 'Peru', pf: 'Polinésia Francesa', pl: 'Polônia', pr: 'Porto Rico',
  pt: 'Portugal', ke: 'Quênia', kg: 'Quirguistão', ki: 'Kiribati',
  gb: 'Reino Unido', cf: 'República Centro-Africana', do: 'República Dominicana',
  re: 'Reunião', ro: 'Romênia', rw: 'Ruanda', ru: 'Rússia', eh: 'Saara Ocidental',
  ws: 'Samoa', as: 'Samoa Americana', sm: 'San Marino', sh: 'Santa Helena',
  lc: 'Santa Lúcia', bl: 'São Bartolomeu', kn: 'São Cristóvão e Nevis',
  st: 'São Tomé e Príncipe', vc: 'São Vicente e Granadinas', sn: 'Senegal',
  sl: 'Serra Leoa', rs: 'Sérvia', sc: 'Seychelles', sg: 'Singapura',
  sy: 'Síria', so: 'Somália', lk: 'Sri Lanka', sd: 'Sudão', ss: 'Sudão do Sul',
  se: 'Suécia', ch: 'Suíça', sr: 'Suriname', tj: 'Tajiquistão', th: 'Tailândia',
  tw: 'Taiwan', tz: 'Tanzânia', tf: 'Terras Austrais Francesas', tl: 'Timor-Leste',
  tg: 'Togo', to: 'Tonga', tt: 'Trinidad e Tobago', tn: 'Tunísia',
  tm: 'Turcomenistão', tr: 'Turquia', tv: 'Tuvalu', ua: 'Ucrânia', ug: 'Uganda',
  uy: 'Uruguai', uz: 'Uzbequistão', vu: 'Vanuatu', va: 'Vaticano',
  ve: 'Venezuela', vn: 'Vietnã', wf: 'Wallis e Futuna', zm: 'Zâmbia',
  zw: 'Zimbábue',
};

// Per-country viewport bounds, as the same [lat, lng] pair shape the search
// already used: index 0 = NORTH corner, index 1 = SOUTH corner. Optional: only
// countries we want to clamp need an entry. Brazil reuses the EXACT historical
// BRAZIL_BOUNDS values (mapConstants) so the default experience is byte-for-byte
// unchanged; everything else relies on Nominatim's countrycodes alone.
export const COUNTRY_BOUNDS = {
  br: [[0.275901, -59.178876], [-35.558031, -28.944502]],
};

export const DEFAULT_COUNTRY = 'br';

// ── INTL M1 — publish geofence bounds (DISTINCT from the search viewport above) ──
//
// COUNTRY_BOUNDS (above) is the SEARCH VIEWPORT: a single [NORTH, SOUTH] corner
// pair consumed by getCountry().bounds / SearchField.buildCountryProvider. It is
// NOT the publish geofence and must not be conflated with it (INTERNATIONAL_PLAN
// §4.0 / §4.6: the viewport's role stays separate).
//
// The PUBLISH geofence is a SET of rectangles per country. Brazil's publish shape
// is the TWO rectangles historically hard-coded in variaveisAmbiente.dentroLimites
// (NOT the viewport, NOT BR_BBOX). Representing Brazil as exactly these two rects,
// with the SAME strict (< / >) comparison semantics, makes
// isInsideCountry(coords, 'br') reproduce the legacy dentroLimites(coords) output
// bit-for-bit — the dark-ship invariant the M0 characterization net (D5/§4.0)
// proves. A rectangle is { N, S, W, E } (lat upper/lower, lng west/east).
//
// M2 populates this map with the curated launch subset (D4). Until then only 'br'
// has a publish shape; isInsideCountry returns false for any country without one
// (D6: no bounds → blocked, never "allow without clamp"). M2 folds this into the
// COUNTRY_BOUNDS SOT (§4.6 row 1); kept separate here so M1 does not corrupt the
// viewport corner-pair shape its existing consumers read.
export const COUNTRY_PUBLISH_BOUNDS = {
  // Brazil: rect1 (wider-north) OR rect2 (lower-west). Verbatim from
  // variaveisAmbiente.dentroLimites:13-22, frozen by the M0 net (RECT1/RECT2).
  // DO NOT EDIT these two rectangles — they are the dark-ship byte-identical
  // contract (D5/§4.0); the M0 characterization net fails on any change.
  br: [
    { N: 2.20, S: -14.09, W: -52.42, E: -34.32 }, // rect1
    { N: -14.18, S: -32.66, W: -55.55, E: -38.06 }, // rect2
  ],

  // ── INTL M2 / M4.5 — curated launch-country subset (D4 / §4.4 / §5 M2a) ──
  //
  // [Inference] These are LAUNCH-APPROXIMATE bounding boxes, hand-picked to be
  // SANE (no ocean-only box, no Antarctica). M4.5 (DATA-3) HAND-TIGHTENED them to
  // hug coastlines better than the original M2 boxes — pulling the Atlantic /
  // Pacific / Mediterranean edges in toward the mainland coast so a single box
  // admits far less open sea. They are STILL APPROXIMATE rectangles, NOT
  // surveyor-precise polygons: a box can never perfectly hug a coast, so a pin in
  // a coastal bay or just offshore inside the rectangle still passes the bbox. The
  // reverse-geocode guard (reverseGeocodeGuard.js, M4.5) is the second, best-effort
  // hygiene layer for that residual; it REDUCES but does NOT eliminate ocean pins,
  // and is hygiene not security (R6: client validation is bypassable anyway).
  //
  // Shape matches Brazil's: { N, S, W, E } with the SAME strict (< / >) edges
  // isInsideCountry enforces. A box can be multi-rectangle (an array of rects)
  // when a single rectangle would swallow a lot of open sea (e.g. Italy is split
  // mainland+Sicily vs Sardinia so the box does not engulf the whole Tyrrhenian).
  //
  // FAR-FLUNG TERRITORY POLICY (launch): mainland box ONLY. Where a country has
  // non-contiguous territory it is EXCLUDED for now and called out inline:
  //   • us — Alaska + Hawaii EXCLUDED (contiguous lower-48 only).
  //   • fr — overseas (Guyane, Réunion, Antilles, Polynésie…) EXCLUDED
  //          (metropolitan / European France only).
  //   • pt — Azores + Madeira EXCLUDED (mainland Iberian Portugal only).
  // These exclusions are intentional launch scope, to be revisited post-launch.
  //
  // NOTE: 'es' here is the COUNTRY code for Spain (ISO-3166 alpha-2) — a DIFFERENT
  // namespace from the 'es' UI-locale code used by the i18n layer. Do not conflate.

  // Iberia / Western Europe
  pt: [{ N: 42.15, S: 36.95, W: -9.52, E: -6.19 }], // mainland Portugal — W pulled off the Atlantic to Cabo da Roca (Azores/Madeira excluded)
  es: [{ N: 43.80, S: 36.00, W: -9.32, E: 3.34 }], // mainland Spain — W off the Atlantic, E off the Med past Cap de Creus (Canary Is. excluded)
  fr: [{ N: 51.10, S: 41.35, W: -5.15, E: 9.66 }], // metropolitan France — W off the Bay of Biscay, E hugs the Côte d'Azur/Corsica (overseas excluded)
  de: [{ N: 55.06, S: 47.27, W: 5.87, E: 15.04 }], // Germany — N pulled off the North/Baltic Sea to the Sylt coast
  it: [
    // Italy split so a single box does not swallow the Ligurian/Tyrrhenian/Ionian
    // open sea. rect1 = peninsular mainland + Sicily; rect2 = Sardinia.
    { N: 47.10, S: 36.60, W: 8.40, E: 18.55 }, // mainland + Sicily (W pulled in off the Ligurian Sea + Corsica)
    { N: 41.30, S: 38.82, W: 8.10, E: 9.86 }, // Sardinia
  ],
  gb: [{ N: 60.90, S: 49.86, W: -8.20, E: 1.78 }], // United Kingdom (GB + NI) — W pulled in off the Atlantic to the NI/Donegal-facing coast

  // South America (launch demand)
  ar: [{ N: -21.75, S: -55.10, W: -73.60, E: -53.62 }], // Argentina (incl. Tierra del Fuego) — E off the South Atlantic
  uy: [{ N: -30.08, S: -35.05, W: -58.48, E: -53.08 }], // Uruguay — E off the Atlantic to Barra del Chuy
  py: [{ N: -19.25, S: -27.65, W: -62.70, E: -54.20 }], // Paraguay (landlocked — no ocean to trim)
  cl: [{ N: -17.45, S: -56.00, W: -75.72, E: -66.30 }], // Chile (long-thin mainland) — W off the Pacific to the Taitao peninsula
  co: [{ N: 13.52, S: -4.30, W: -79.06, E: -66.80 }], // Colombia — W off the Pacific
  pe: [{ N: 0.10, S: -18.40, W: -81.36, E: -68.60 }], // Peru — W off the Pacific to Punta Pariñas
  bo: [{ N: -9.60, S: -22.95, W: -69.70, E: -57.40 }], // Bolivia (landlocked — no ocean to trim)

  // North America
  ca: [{ N: 83.15, S: 41.66, W: -141.05, E: -52.58 }], // Canada — edges nudged toward the mainland extremes
  us: [
    // Contiguous lower-48 (Alaska + Hawaii EXCLUDED — far-flung, launch scope).
    // W pulled off the Pacific to Cape Alava, E to West Quoddy Head, S to Key West.
    { N: 49.38, S: 24.46, W: -124.79, E: -66.93 },
  ],
};

// isInsideCountry(coords, code) — PURE publish-geofence predicate. Reads ONLY
// COUNTRY_PUBLISH_BOUNDS (no countryStore, no intlConfig — country resolution is
// the consumer's job, §4.1/§4.2/ARCH-5: countryStore already imports this module,
// so a reverse import would risk a temporal-dead-zone cycle). `code` is always
// explicit. coords is [lat, lng]. A point is inside iff it falls strictly within
// ANY of the country's rectangles (OR-union), matching dentroLimites' strict
// edges: a point exactly ON an edge is REJECTED.
export function isInsideCountry(coords, code) {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  const cc = typeof code === 'string' ? code.trim().toLowerCase() : '';
  const rects = COUNTRY_PUBLISH_BOUNDS[cc];
  if (!Array.isArray(rects)) return false; // no publish shape → blocked (D6)
  const lat = coords[0];
  const lng = coords[1];
  for (const r of rects) {
    if (lat < r.N && lat > r.S && lng > r.W && lng < r.E) return true;
  }
  return false;
}

// flagEmoji('br') -> 🇧🇷. A two-letter code maps to two Unicode regional-
// indicator symbols (A..Z -> U+1F1E6..U+1F1FF). Returns a globe for any input
// that is not exactly two A-Z letters, so a bad code never renders blank.
const REGIONAL_INDICATOR_BASE = 0x1f1e6;
const LETTER_A = 'A'.charCodeAt(0);
export function flagEmoji(code) {
  const cc = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  return String.fromCodePoint(
    REGIONAL_INDICATOR_BASE + cc.charCodeAt(0) - LETTER_A,
    REGIONAL_INDICATOR_BASE + cc.charCodeAt(1) - LETTER_A,
  );
}

// Normalize any input to a lowercase 2-letter code we actually know, or null.
export function normalizeCountryCode(code) {
  const cc = typeof code === 'string' ? code.trim().toLowerCase() : '';
  return Object.prototype.hasOwnProperty.call(COUNTRY_NAMES, cc) ? cc : null;
}

// getCountry('br') -> { code, name, flag, bounds }. Falls back to the default
// country for an unknown code, so callers always get a renderable object.
export function getCountry(code) {
  const cc = normalizeCountryCode(code) || DEFAULT_COUNTRY;
  return {
    code: cc,
    name: COUNTRY_NAMES[cc],
    flag: flagEmoji(cc),
    bounds: COUNTRY_BOUNDS[cc] || null,
  };
}

// Full picker list, sorted by pt-BR name (locale-aware, case/diacritic-folding).
// This is the SSR/default-locale value: it is built eagerly at module load in
// pt-BR so the server render and the first client paint are stable, and so the
// existing pt-BR consumers (and country.test.js) keep their exact shape. The
// LOCALE-AWARE list lives in countriesForLocale() below; COUNTRIES === the pt-BR
// entry of that resolver's cache.
export const COUNTRIES = Object.keys(COUNTRY_NAMES)
  .map((code) => ({ code, name: COUNTRY_NAMES[code], flag: flagEmoji(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

// ── INTL M3.5 — locale-aware country names + sort (I18N-1) ──
//
// countryNameFor(code, locale): the active UI language's name for a country,
// via Intl.DisplayNames, with the curated pt-BR COUNTRY_NAMES map as fallback.
// Precedence is forced by two requirements that pull in opposite directions:
//   • pt-BR MUST read exactly as today (dark-ship): the curated map is the pt-BR
//     SOT and WINS for any pt-* locale (CLDR diverges for ~20 codes).
//   • es / en-US / … MUST read in their own language: only Intl.DisplayNames
//     supplies those, so it wins for non-pt locales, falling back to the curated
//     map only when the API is missing (old/odd runtime) or returns nothing.
// Guarded for SSR / static-export (output:'export'): Intl.DisplayNames runs
// CLIENT-SIDE; if it is unavailable we silently use the fallback map and never
// throw. Codes are upper-cased (Intl.DisplayNames echoes a lowercase input back
// unchanged) and the .of() call is try/catch-wrapped (a 1-char code throws
// invalid_argument). A result equal to the input code is treated as "no name".
function isPtLocale(locale) {
  return typeof locale === 'string' && locale.toLowerCase().indexOf('pt') === 0;
}

function makeRegionNamer(locale) {
  if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return null;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' });
  } catch (_e) {
    return null; // unsupported locale tag → caller falls back to the curated map
  }
}

function countryNameFor(code, namer, locale) {
  const cc = typeof code === 'string' ? code.trim().toLowerCase() : '';
  const fallback = COUNTRY_NAMES[cc] || cc;
  // pt-* keeps the hand-curated SOT (today, byte-for-byte). Other locales prefer
  // Intl.DisplayNames and only fall back when it yields nothing usable.
  if (isPtLocale(locale)) return fallback;
  if (!namer) return fallback;
  try {
    const display = namer.of(cc.toUpperCase());
    if (display && display.toLowerCase() !== cc) return display;
  } catch (_e) { /* invalid code → fallback */ }
  return fallback;
}

// Per-locale memo: build+sort runs at most ONCE per locale tag, never per render.
// Keyed by the locale string; switching language re-reads the cache (a different
// key) so the new list is correct without ever mutating the COUNTRIES singleton.
// Seeded with the eager pt-BR COUNTRIES so the default locale reuses that exact
// array (no rebuild, identical to today).
const _countriesByLocale = new Map([['pt-BR', COUNTRIES]]);

// countriesForLocale(locale=getLocale()) — the full picker list with names in the
// given locale and sorted with that locale's collation. Memoized per locale tag.
// getLocale() is the DEFAULT (server returns DEFAULT_LOCALE 'pt-BR'); pass an
// explicit tag in tests. The pt-BR entry IS the COUNTRIES singleton, so the
// default-locale path is byte-identical to before M3.5.
export function countriesForLocale(locale = getLocale()) {
  const tag = typeof locale === 'string' && locale ? locale : 'pt-BR';
  const cached = _countriesByLocale.get(tag);
  if (cached) return cached;
  const namer = makeRegionNamer(tag);
  const list = Object.keys(COUNTRY_NAMES)
    .map((code) => ({ code, name: countryNameFor(code, namer, tag), flag: flagEmoji(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, tag));
  _countriesByLocale.set(tag, list);
  return list;
}

// Test seam: drop every memoized list EXCEPT the pt-BR singleton, so a test can
// re-derive a locale's list under a stubbed Intl.DisplayNames. Never called in
// production.
export function __resetCountriesForLocaleCache() {
  _countriesByLocale.clear();
  _countriesByLocale.set('pt-BR', COUNTRIES);
}
