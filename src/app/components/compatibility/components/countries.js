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

// ISO-3166-1 alpha-2 -> pt-BR short name. Sorted by name at module load for the
// picker. This is the full UN/ISO set; editing it is just adding a `code: name`.
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
  br: [
    { N: 2.20, S: -14.09, W: -52.42, E: -34.32 }, // rect1
    { N: -14.18, S: -32.66, W: -55.55, E: -38.06 }, // rect2
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
export const COUNTRIES = Object.keys(COUNTRY_NAMES)
  .map((code) => ({ code, name: COUNTRY_NAMES[code], flag: flagEmoji(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
