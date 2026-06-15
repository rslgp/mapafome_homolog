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

// ── CAPITAL-ZOOM — capital-city coordinates for the flag-pick camera jump ──
//
// On a country pick the flag control zooms IN to that country's CAPITAL CITY via
// Leaflet setView([lat, lng], CAPITAL_PICK_ZOOM). This map is the data SOT for
// that jump: ISO-3166 alpha-2 code -> [lat, lng] of the capital, well-known
// city-centre coordinates (rounded to ~4 dp, city-level precision; the fixed
// zoom 11 frames the metro area, so sub-block accuracy is unnecessary).
//
// This is ADDITIVE and orthogonal to the two bounds maps above:
//   • COUNTRY_BOUNDS        — search VIEWPORT corner pairs (Brazil only).
//   • COUNTRY_PUBLISH_BOUNDS — publish GEOFENCE rectangles (dark-ship, frozen).
//   • COUNTRY_CAPITALS (here) — the capital POINT the camera jumps to on pick.
// It touches neither of the frozen bounds maps; the Brazil pick path explicitly
// IGNORES this map (CountryFlagControl keeps Brazil's fitBounds whole-country
// framing — the default-country experience stays byte-for-byte identical).
//
// Coverage goal: every key present in COUNTRY_NAMES. A handful of uninhabited /
// no-permanent-capital territories are intentionally OMITTED (no real capital
// city exists); a pick on one of those falls back to today's behavior (bounds
// or the fallback zoom) and never crashes. Omitted, by design:
//   • aq (Antártida)            — no capital; research stations only.
//   • bv (Ilha Bouvet)          — uninhabited Norwegian dependency.
//   • tf (Terras Austrais Fr.)  — admin seat is off-territory (Saint-Pierre, Réunion).
//   • um is not in COUNTRY_NAMES, so it needs no entry.
// Every other code below has a capital; getCountry().capital is null for the
// three above (COUNTRY_CAPITALS[cc] || null), which the pick handler treats as
// "no capital → use the existing bounds / fallback-zoom path".
export const COUNTRY_CAPITALS = {
  af: [34.5553, 69.2075],   // Cabul
  za: [-25.7479, 28.2293],  // Pretória (sede administrativa)
  al: [41.3275, 19.8189],   // Tirana
  de: [52.5200, 13.4050],   // Berlim
  ad: [42.5063, 1.5218],    // Andorra-a-Velha
  ao: [-8.8390, 13.2894],   // Luanda
  ai: [18.2206, -63.0686],  // The Valley
  ag: [17.1274, -61.8468],  // Saint John's
  sa: [24.7136, 46.6753],   // Riade
  dz: [36.7538, 3.0588],    // Argel
  ar: [-34.6037, -58.3816], // Buenos Aires
  am: [40.1792, 44.4991],   // Erevan
  aw: [12.5092, -70.0086],  // Oranjestad
  au: [-35.2809, 149.1300], // Camberra
  at: [48.2082, 16.3738],   // Viena
  az: [40.4093, 49.8671],   // Baku
  bs: [25.0480, -77.3554],  // Nassau
  bh: [26.2285, 50.5860],   // Manama
  bd: [23.8103, 90.4125],   // Daca
  bb: [13.1132, -59.5988],  // Bridgetown
  be: [50.8503, 4.3517],    // Bruxelas
  bz: [17.2510, -88.7590],  // Belmopan
  bj: [6.4969, 2.6289],     // Porto-Novo
  bm: [32.2949, -64.7820],  // Hamilton
  by: [53.9006, 27.5590],   // Minsk
  bo: [-16.4897, -68.1193], // La Paz (sede de governo)
  ba: [43.8563, 18.4131],   // Sarajevo
  bw: [-24.6282, 25.9231],  // Gaborone
  br: [-15.7939, -47.8828], // Brasília
  bn: [4.9031, 114.9398],   // Bandar Seri Begauã
  bg: [42.6977, 23.3219],   // Sófia
  bf: [12.3714, -1.5197],   // Uagadugu
  bi: [-3.3614, 29.3599],   // Gitega
  bt: [27.4728, 89.6390],   // Timphu
  cv: [14.9330, -23.5133],  // Praia
  cm: [3.8480, 11.5021],    // Iaundé
  kh: [11.5564, 104.9282],  // Phnom Penh
  ca: [45.4215, -75.6972],  // Otava
  qa: [25.2854, 51.5310],   // Doha
  kz: [51.1694, 71.4491],   // Astana
  td: [12.1348, 15.0557],   // Jamena
  cl: [-33.4489, -70.6693], // Santiago
  cn: [39.9042, 116.4074],  // Pequim
  cy: [35.1856, 33.3823],   // Nicósia
  co: [4.7110, -74.0721],   // Bogotá
  km: [-11.7172, 43.2473],  // Moroni
  cg: [-4.2634, 15.2429],   // Brazzaville
  cd: [-4.4419, 15.2663],   // Kinshasa
  kp: [39.0392, 125.7625],  // Pyongyang
  kr: [37.5665, 126.9780],  // Seul
  ci: [6.8276, -5.2893],    // Yamoussoukro (capital oficial)
  cr: [9.9281, -84.0907],   // San José
  hr: [45.8150, 15.9819],   // Zagreb
  cu: [23.1136, -82.3666],  // Havana
  cw: [12.1224, -68.8824],  // Willemstad
  dk: [55.6761, 12.5683],   // Copenhague
  dj: [11.5721, 43.1456],   // Djibuti
  dm: [15.3092, -61.3790],  // Roseau
  eg: [30.0444, 31.2357],   // Cairo
  sv: [13.6929, -89.2182],  // São Salvador
  ae: [24.4539, 54.3773],   // Abu Dhabi
  ec: [-0.1807, -78.4678],  // Quito
  er: [15.3229, 38.9251],   // Asmara
  sk: [48.1486, 17.1077],   // Bratislava
  si: [46.0569, 14.5058],   // Liubliana
  es: [40.4168, -3.7038],   // Madri
  us: [38.9072, -77.0369],  // Washington, D.C.
  ee: [59.4370, 24.7536],   // Talim
  sz: [-26.3054, 31.1367],  // Mbabane
  et: [9.0320, 38.7469],    // Adis Abeba
  fj: [-18.1248, 178.4501], // Suva
  ph: [14.5995, 120.9842],  // Manila
  fi: [60.1699, 24.9384],   // Helsinque
  fr: [48.8566, 2.3522],    // Paris
  ga: [0.4162, 9.4673],     // Libreville
  gm: [13.4549, -16.5790],  // Banjul
  gh: [5.6037, -0.1870],    // Acra
  ge: [41.7151, 44.8271],   // Tiblíssi
  gi: [36.1408, -5.3536],   // Gibraltar
  gd: [12.0561, -61.7488],  // Saint George's
  gr: [37.9838, 23.7275],   // Atenas
  gl: [64.1814, -51.6941],  // Nuuk
  gp: [16.2415, -61.5340],  // Basse-Terre
  gu: [13.4745, 144.7504],  // Hagåtña
  gt: [14.6349, -90.5069],  // Cidade da Guatemala
  gg: [49.4555, -2.5368],   // Saint Peter Port
  gy: [6.8013, -58.1551],   // Georgetown
  gf: [4.9224, -52.3135],   // Caiena
  gn: [9.6412, -13.5784],   // Conacri
  gq: [3.7504, 8.7371],     // Malabo
  gw: [11.8817, -15.6178],  // Bissau
  ht: [18.5944, -72.3074],  // Porto Príncipe
  nl: [52.3676, 4.9041],    // Amsterdã
  hn: [14.0723, -87.1921],  // Tegucigalpa
  hk: [22.3193, 114.1694],  // Hong Kong
  hu: [47.4979, 19.0402],   // Budapeste
  ye: [15.3694, 44.1910],   // Sana
  cx: [-10.4217, 105.6791], // Flying Fish Cove
  im: [54.1509, -4.4777],   // Douglas
  ky: [19.2869, -81.3674],  // George Town
  cc: [-12.1642, 96.8710],  // West Island
  ck: [-21.2129, -159.7777],// Avarua
  fo: [62.0079, -6.7906],   // Tórshavn
  fk: [-51.6921, -57.8589], // Stanley
  mp: [15.1898, 145.7193],  // Saipan (Capitol Hill)
  mh: [7.0897, 171.3803],   // Majuro
  sb: [-9.4456, 159.9729],  // Honiara
  tc: [21.4664, -71.1359],  // Cockburn Town
  vg: [18.4207, -64.6400],  // Road Town
  vi: [18.3358, -64.8963],  // Charlotte Amalie
  in: [28.6139, 77.2090],   // Nova Déli
  id: [-6.2088, 106.8456],  // Jacarta
  ir: [35.6892, 51.3890],   // Teerã
  iq: [33.3152, 44.3661],   // Bagdá
  ie: [53.3498, -6.2603],   // Dublin
  is: [64.1466, -21.9426],  // Reykjavík
  il: [31.7683, 35.2137],   // Jerusalém
  it: [41.9028, 12.4964],   // Roma
  jm: [17.9712, -76.7936],  // Kingston
  jp: [35.6762, 139.6503],  // Tóquio
  je: [49.1869, -2.1064],   // Saint Helier
  jo: [31.9454, 35.9284],   // Amã
  kw: [29.3759, 47.9774],   // Cidade do Kuwait
  la: [17.9757, 102.6331],  // Vienciana
  ls: [-29.3100, 27.4786],  // Maseru
  lv: [56.9496, 24.1052],   // Riga
  lb: [33.8938, 35.5018],   // Beirute
  lr: [6.3004, -10.7969],   // Monróvia
  ly: [32.8872, 13.1913],   // Trípoli
  li: [47.1410, 9.5209],    // Vaduz
  lt: [54.6872, 25.2797],   // Vilnius
  lu: [49.6116, 6.1319],    // Luxemburgo
  mo: [22.1987, 113.5439],  // Macau
  mk: [41.9981, 21.4254],   // Escópia
  mg: [-18.8792, 47.5079],  // Antananarivo
  my: [3.1390, 101.6869],   // Kuala Lumpur
  mw: [-13.9626, 33.7741],  // Lilôngue
  mv: [4.1755, 73.5093],    // Malé
  ml: [12.6392, -8.0029],   // Bamaco
  mt: [35.8989, 14.5146],   // Valeta
  ma: [34.0209, -6.8416],   // Rabat
  mq: [14.6161, -61.0588],  // Fort-de-France
  mu: [-20.1609, 57.5012],  // Port Louis
  mr: [18.0735, -15.9582],  // Nouakchott
  yt: [-12.7806, 45.2278],  // Mamoudzou
  mx: [19.4326, -99.1332],  // Cidade do México
  mm: [19.7633, 96.0785],   // Népido
  fm: [6.9248, 158.1611],   // Palikir
  mz: [-25.9692, 32.5732],  // Maputo
  md: [47.0105, 28.8638],   // Quixinau
  mc: [43.7384, 7.4246],    // Mônaco
  mn: [47.8864, 106.9057],  // Ulã Bator
  me: [42.4304, 19.2594],   // Podgorica
  ms: [16.7064, -62.2150],  // Brades (capital de facto)
  na: [-22.5609, 17.0658],  // Windhoek
  nr: [-0.5477, 166.9209],  // Yaren (distrito de facto)
  np: [27.7172, 85.3240],   // Catmandu
  ni: [12.1149, -86.2362],  // Manágua
  ne: [13.5128, 2.1128],    // Niamei
  ng: [9.0765, 7.3986],     // Abuja
  nu: [-19.0544, -169.8672],// Alofi
  no: [59.9139, 10.7522],   // Oslo
  nc: [-22.2758, 166.4580], // Numeá
  nz: [-41.2865, 174.7762], // Wellington
  om: [23.5880, 58.3829],   // Mascate
  pw: [7.5006, 134.6242],   // Ngerulmud
  pa: [8.9824, -79.5199],   // Cidade do Panamá
  pg: [-9.4438, 147.1803],  // Port Moresby
  pk: [33.6844, 73.0479],   // Islamabad
  py: [-25.2637, -57.5759], // Assunção
  pe: [-12.0464, -77.0428], // Lima
  pf: [-17.5350, -149.5696],// Papeete
  pl: [52.2297, 21.0122],   // Varsóvia
  pr: [18.4655, -66.1057],  // San Juan
  pt: [38.7223, -9.1393],   // Lisboa
  ke: [-1.2921, 36.8219],   // Nairóbi
  kg: [42.8746, 74.5698],   // Bisqueque
  ki: [1.3290, 172.9790],   // Tarawa do Sul
  gb: [51.5074, -0.1278],   // Londres
  cf: [4.3947, 18.5582],    // Bangui
  do: [18.4861, -69.9312],  // São Domingos
  re: [-20.8789, 55.4481],  // Saint-Denis
  ro: [44.4268, 26.1025],   // Bucareste
  rw: [-1.9706, 30.1044],   // Kigali
  ru: [55.7558, 37.6173],   // Moscou
  eh: [27.1536, -13.2033],  // Aiune
  ws: [-13.8333, -171.7667],// Apia
  as: [-14.2756, -170.7020],// Pago Pago
  sm: [43.9424, 12.4578],   // São Marinho
  sh: [-15.9650, -5.7089],  // Jamestown
  lc: [14.0101, -60.9875],  // Castries
  bl: [17.8962, -62.8498],  // Gustavia
  kn: [17.2955, -62.7261],  // Basseterre
  st: [0.3302, 6.7333],     // São Tomé
  vc: [13.1600, -61.2248],  // Kingstown
  sn: [14.7167, -17.4677],  // Dacar
  sl: [8.4657, -13.2317],   // Freetown
  rs: [44.7866, 20.4489],   // Belgrado
  sc: [-4.6191, 55.4513],   // Victória
  sg: [1.3521, 103.8198],   // Singapura
  sy: [33.5138, 36.2765],   // Damasco
  so: [2.0469, 45.3182],    // Mogadíscio
  lk: [6.9271, 79.8612],    // Colombo (Sri Jayawardenepura Kotte é a sede legislativa)
  sd: [15.5007, 32.5599],   // Cartum
  ss: [4.8594, 31.5713],    // Juba
  se: [59.3293, 18.0686],   // Estocolmo
  ch: [46.9480, 7.4474],    // Berna
  sr: [5.8520, -55.2038],   // Paramaribo
  tj: [38.5598, 68.7870],   // Duchambe
  th: [13.7563, 100.5018],  // Banguecoque
  tw: [25.0330, 121.5654],  // Taipé
  tz: [-6.1630, 35.7516],   // Dodoma
  tl: [-8.5569, 125.5603],  // Díli
  tg: [6.1725, 1.2314],     // Lomé
  to: [-21.1393, -175.2046],// Nukualofa
  tt: [10.6549, -61.5019],  // Porto de Espanha
  tn: [36.8065, 10.1815],   // Túnis
  tm: [37.9601, 58.3261],   // Asgabate
  tr: [39.9334, 32.8597],   // Ancara
  tv: [-8.5211, 179.1983],  // Funafuti
  ua: [50.4501, 30.5234],   // Kiev
  ug: [0.3476, 32.5825],    // Campala
  uy: [-34.9011, -56.1645], // Montevidéu
  uz: [41.2995, 69.2401],   // Tasquente
  vu: [-17.7333, 168.3273], // Porto Vila
  va: [41.9029, 12.4534],   // Cidade do Vaticano
  ve: [10.4806, -66.9036],  // Caracas
  vn: [21.0278, 105.8342],  // Hanói
  wf: [-13.2825, -176.1736],// Mata-Utu
  zm: [-15.3875, 28.3228],  // Lusaca
  zw: [-17.8252, 31.0335],  // Harare
};

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
  // FAR-FLUNG TERRITORY POLICY: mainland box ONLY. Where a country has
  // non-contiguous territory it is EXCLUDED and called out inline:
  //   • us — Alaska + Hawaii EXCLUDED (contiguous lower-48 only).
  //   • fr — overseas (Guyane, Réunion, Antilles, Polynésie…) EXCLUDED
  //          (metropolitan / European France only).
  //   • pt — Azores + Madeira EXCLUDED (mainland Iberian Portugal only).
  //   • ec — Galápagos EXCLUDED; ye — Socotra EXCLUDED; in — Andaman/Nicobar +
  //          Lakshadweep EXCLUDED; cr — Isla del Coco EXCLUDED; ma — Western
  //          Sahara EXCLUDED; gq — Annobón EXCLUDED.
  // ONE deliberate exception to "mainland only": gq adds a second rect for BIOKO
  // island, because the CAPITAL (Malabo) sits there and a capital must stay
  // publishable. These exclusions are intentional scope, revisitable later.
  //
  // ── INTL LOCALE-COVERAGE (this pass) — the curated subset above (Iberia/Western
  // Europe + the Americas) was the LAUNCH set; it left the non-Latin-script UI
  // locales (ru/zh/ar/uk/bn) and the newly-added hi/tr without a publishable
  // country. This pass extends the map so EVERY SUPPORTED_LOCALES option has its
  // primary geography (and, for pt/es/ar, the major countries that locale serves)
  // publishable — see the LOCALE-COVERAGE section after the `us` box. Same
  // [Inference] approximate-rectangle caveat applies; verify against a basemap.
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

  // ── INTL LOCALE-COVERAGE — a publish hitbox for EVERY UI locale's country ──
  //
  // Goal (this pass): every option in the language picker (SUPPORTED_LOCALES) has
  // its primary geography publishable, so a user who switches to hi/tr/ar/zh/ru/
  // uk/bn — or to a PALOP / Hispanophone country — is not silently geofenced out
  // (D6: "no publish shape -> blocked"). Same conventions as the boxes above:
  // APPROXIMATE coastline-hugging rectangles ([Inference], not surveyor polygons),
  // mainland-only with far-flung territory EXCLUDED, multi-rect where a single box
  // would swallow a lot of open sea. The reverseGeocodeGuard remains the second
  // hygiene layer for the residual offshore strip a bbox can't avoid (M4.5/R6).
  // These coordinates are [Inference]; verify against a basemap before any
  // accuracy-critical use.

  // hi -> India; tr -> Turkey (the two locales added this pass)
  in: [{ N: 35.50, S: 6.55, W: 68.10, E: 97.42 }], // India mainland — Kashmir down to Kanyakumari; Andaman/Nicobar & Lakshadweep EXCLUDED (far-flung)
  tr: [{ N: 42.15, S: 35.80, W: 25.66, E: 44.83 }], // Turkey (Anatolia + East Thrace) — N off the Black Sea, S off the Med, spanning the Bosphorus

  // Lusophone (pt) — the PALOP + Timor-Leste, which lusophone auto-detect already
  // routes to pt (engine resolveLocaleFromCountry). Brazil + Portugal are above.
  ao: [{ N: -4.39, S: -18.04, W: 11.67, E: 24.08 }], // Angola — W off the South Atlantic (Cabinda exclave folded into the N edge)
  mz: [{ N: -10.47, S: -26.87, W: 30.21, E: 40.84 }], // Mozambique — E off the Indian Ocean / Mozambique Channel
  cv: [{ N: 17.20, S: 14.80, W: -25.36, E: -22.66 }], // Cape Verde — archipelago box (Atlantic island nation, no mainland to trim to)
  gw: [{ N: 12.69, S: 10.86, W: -16.72, E: -13.64 }], // Guinea-Bissau — W off the Atlantic (Bijagós archipelago inside the box)
  st: [{ N: 1.74, S: 0.01, W: 6.45, E: 7.47 }], // São Tomé e Príncipe — two-island box in the Gulf of Guinea
  gq: [
    // Equatorial Guinea split: rect1 = Río Muni mainland; rect2 = Bioko island,
    // included because the CAPITAL Malabo sits there (a capital must be publishable).
    // The remote Annobón island stays EXCLUDED (far-flung, ~340 km offshore).
    { N: 2.35, S: 0.92, W: 9.30, E: 11.34 }, // Río Muni mainland
    { N: 3.79, S: 3.20, W: 8.40, E: 8.95 }, // Bioko island (Malabo)
  ],
  tl: [{ N: -8.13, S: -9.51, W: 124.04, E: 127.34 }], // Timor-Leste — E half of Timor island + Oecusse, off the Timor/Banda Sea

  // Hispanophone (es) — the rest of Spanish-speaking Latin America. Argentina,
  // Uruguay, Paraguay, Chile, Colombia, Peru, Bolivia + Spain are above.
  mx: [{ N: 32.72, S: 14.53, W: -117.13, E: -86.74 }], // Mexico — W off the Pacific, E off the Gulf/Caribbean to the Yucatán
  ve: [{ N: 12.20, S: 0.65, W: -73.37, E: -59.81 }], // Venezuela — N off the Caribbean (Isla Margarita inside the N edge)
  ec: [{ N: 1.44, S: -5.01, W: -81.04, E: -75.19 }], // Ecuador mainland — W off the Pacific; Galápagos EXCLUDED (far-flung)
  gt: [{ N: 17.82, S: 13.74, W: -92.25, E: -88.22 }], // Guatemala — between the Pacific and the Caribbean
  cu: [{ N: 23.28, S: 19.82, W: -84.96, E: -74.13 }], // Cuba — long-thin island box, off the Gulf/Caribbean/Atlantic
  do: [{ N: 19.93, S: 17.54, W: -72.01, E: -68.32 }], // Dominican Republic — E two-thirds of Hispaniola, off the Atlantic/Caribbean
  hn: [{ N: 16.51, S: 12.98, W: -89.35, E: -83.15 }], // Honduras — N off the Caribbean, narrow Pacific (Gulf of Fonseca) at the S
  ni: [{ N: 15.03, S: 10.71, W: -87.69, E: -83.13 }], // Nicaragua — between the Pacific and the Caribbean
  cr: [{ N: 11.22, S: 8.03, W: -85.95, E: -82.55 }], // Costa Rica — Pacific + Caribbean; Isla del Coco EXCLUDED (far-flung)
  pa: [{ N: 9.64, S: 7.20, W: -83.05, E: -77.17 }], // Panama — isthmus box, Pacific S + Caribbean N
  sv: [{ N: 14.45, S: 13.15, W: -90.13, E: -87.69 }], // El Salvador — Pacific coast (the only LatAm country with no Caribbean side)

  // Arabic (ar) — the Arabophone high-need geographies the ar locale serves. These
  // are MAINLAND boxes hugging the relevant coast/desert extent.
  eg: [{ N: 31.67, S: 21.99, W: 24.70, E: 36.90 }], // Egypt — Mediterranean N, Red Sea E, incl. Sinai
  iq: [{ N: 37.38, S: 29.06, W: 38.79, E: 48.57 }], // Iraq (nearly landlocked — short Persian Gulf coast at the SE)
  jo: [{ N: 33.37, S: 29.19, W: 34.96, E: 39.30 }], // Jordan (landlocked but for the Gulf of Aqaba sliver at the S)
  sy: [{ N: 37.32, S: 32.31, W: 35.73, E: 42.38 }], // Syria — W off the Mediterranean
  ye: [{ N: 18.99, S: 12.11, W: 42.60, E: 53.11 }], // Yemen mainland — Red Sea W, Gulf of Aden S; Socotra EXCLUDED (far-flung)
  sd: [{ N: 22.22, S: 8.69, W: 21.83, E: 38.58 }], // Sudan — E off the Red Sea
  dz: [{ N: 37.09, S: 18.97, W: -8.67, E: 11.98 }], // Algeria — N off the Mediterranean, S deep into the Sahara
  ma: [{ N: 35.92, S: 27.66, W: -13.17, E: -1.01 }], // Morocco — Atlantic W + Mediterranean N (Western Sahara EXCLUDED)
  tn: [{ N: 37.34, S: 30.24, W: 7.52, E: 11.59 }], // Tunisia — N/E off the Mediterranean
  lb: [{ N: 34.69, S: 33.05, W: 35.10, E: 36.62 }], // Lebanon — W off the Mediterranean
  sa: [{ N: 32.15, S: 16.37, W: 34.50, E: 55.67 }], // Saudi Arabia — Red Sea W, Persian Gulf E (ar picker flag country)

  // Single-country locales: zh -> China, ru -> Russia, uk -> Ukraine, bn -> Bangladesh
  cn: [{ N: 53.56, S: 18.16, W: 73.50, E: 134.77 }], // China mainland — Bohai/Yellow/East/South China Sea on the E; Hainan inside the S edge
  ru: [
    // Russia split: a single box would span ~170 deg of longitude and swallow the
    // Arctic Ocean. rect1 = European + Siberian mainland up to the Pacific; rect2 =
    // Kaliningrad exclave on the Baltic (W of the main landmass, off Poland/Lithuania).
    { N: 77.70, S: 41.19, W: 27.30, E: 169.00 }, // main Russian landmass (Baltic coast to the Chukchi/Bering)
    { N: 55.30, S: 54.32, W: 19.64, E: 22.87 }, // Kaliningrad Oblast (Baltic exclave)
  ],
  ua: [{ N: 52.38, S: 44.39, W: 22.14, E: 40.23 }], // Ukraine — S off the Black Sea / Sea of Azov (incl. Crimea)
  bd: [{ N: 26.63, S: 20.74, W: 88.01, E: 92.67 }], // Bangladesh — S off the Bay of Bengal (Ganges/Brahmaputra delta)

  // ── REMAINING COUNTRIES — full catalog hitboxes ──
  //
  // Approximate coastline-hugging bounding rectangles ([Inference], not surveyor
  // polygons) for every country in COUNTRY_NAMES not yet covered above. Same
  // conventions as the launch set: mainland-only where far-flung territories are
  // excluded, multi-rect only where a single box would swallow excessive open sea,
  // strict { N, S, W, E } shape. reverseGeocodeGuard remains the second hygiene
  // layer for residual offshore strips. Coordinates are [Inference]; verify against
  // a basemap before any accuracy-critical use.

  // ── Europe ──
  ad: [{ N: 42.66, S: 42.43, W: 1.41, E: 1.79 }], // Andorra — tiny Pyrenean enclave
  al: [{ N: 42.67, S: 39.63, W: 19.27, E: 21.06 }], // Albania
  am: [{ N: 41.30, S: 38.84, W: 43.45, E: 46.63 }], // Armenia
  at: [{ N: 49.02, S: 46.38, W: 9.53, E: 17.16 }], // Austria
  az: [{ N: 41.90, S: 38.39, W: 44.77, E: 50.38 }], // Azerbaijan (excl. Nakhchivan — but box approx covers it)
  ba: [{ N: 45.28, S: 42.56, W: 15.72, E: 19.62 }], // Bosnia and Herzegovina
  be: [{ N: 51.51, S: 49.50, W: 2.54, E: 6.41 }], // Belgium
  bg: [{ N: 44.22, S: 41.24, W: 22.36, E: 28.61 }], // Bulgaria
  by: [{ N: 53.91, S: 51.26, W: 23.17, E: 32.76 }], // Belarus
  ch: [{ N: 47.81, S: 45.83, W: 5.96, E: 10.49 }], // Switzerland
  cy: [{ N: 35.71, S: 34.63, W: 32.27, E: 34.60 }], // Cyprus
  dk: [{ N: 57.75, S: 54.56, W: 8.08, E: 15.19 }], // Denmark (mainland Jutland + islands; Greenland/Faroe excluded)
  ee: [{ N: 59.68, S: 57.52, W: 21.77, E: 28.21 }], // Estonia
  fi: [{ N: 70.09, S: 59.81, W: 19.09, E: 31.59 }], // Finland
  ge: [{ N: 43.59, S: 41.05, W: 39.99, E: 46.72 }], // Georgia
  gg: [{ N: 49.51, S: 49.41, W: -2.68, E: -2.50 }], // Guernsey — Channel Islands
  gi: [{ N: 36.16, S: 36.10, W: -5.36, E: -5.33 }], // Gibraltar — tiny peninsula
  gl: [{ N: 83.63, S: 59.77, W: -73.00, E: -12.08 }], // Greenland
  gr: [{ N: 41.75, S: 34.80, W: 19.37, E: 28.24 }], // Greece (mainland + islands incl. Crete)
  hr: [{ N: 46.55, S: 42.39, W: 13.49, E: 19.45 }], // Croatia
  hu: [{ N: 48.58, S: 45.74, W: 16.11, E: 22.90 }], // Hungary
  ie: [{ N: 55.40, S: 51.45, W: -10.48, E: -5.99 }], // Ireland
  im: [{ N: 54.42, S: 54.05, W: -4.78, E: -4.31 }], // Isle of Man
  is: [{ N: 66.57, S: 63.30, W: -24.55, E: -13.50 }], // Iceland
  je: [{ N: 49.26, S: 49.17, W: -2.25, E: -2.02 }], // Jersey — Channel Islands
  li: [{ N: 47.27, S: 47.05, W: 9.47, E: 9.64 }], // Liechtenstein
  lt: [{ N: 56.45, S: 53.90, W: 20.94, E: 26.84 }], // Lithuania
  lu: [{ N: 50.18, S: 49.44, W: 5.73, E: 6.53 }], // Luxembourg
  lv: [{ N: 57.98, S: 55.67, W: 20.97, E: 28.24 }], // Latvia
  mc: [{ N: 43.76, S: 43.72, W: 7.40, E: 7.44 }], // Monaco
  md: [{ N: 48.49, S: 45.47, W: 26.62, E: 30.14 }], // Moldova
  me: [{ N: 43.57, S: 41.85, W: 18.43, E: 20.36 }], // Montenegro
  mk: [{ N: 42.37, S: 40.85, W: 20.45, E: 23.03 }], // North Macedonia
  mt: [{ N: 36.08, S: 35.80, W: 14.18, E: 14.58 }], // Malta
  nl: [{ N: 53.51, S: 50.75, W: 3.36, E: 7.23 }], // Netherlands (European mainland)
  no: [{ N: 71.17, S: 57.98, W: 4.64, E: 31.14 }], // Norway (mainland)
  pl: [{ N: 54.84, S: 49.00, W: 14.12, E: 24.15 }], // Poland
  ro: [{ N: 48.27, S: 43.62, W: 20.26, E: 29.74 }], // Romania
  rs: [{ N: 46.19, S: 42.23, W: 18.84, E: 23.01 }], // Serbia
  se: [{ N: 69.06, S: 55.34, W: 10.96, E: 24.17 }], // Sweden
  si: [{ N: 46.88, S: 45.42, W: 13.38, E: 16.61 }], // Slovenia
  sk: [{ N: 49.61, S: 47.73, W: 16.83, E: 22.57 }], // Slovakia
  sm: [{ N: 43.99, S: 43.86, W: 12.40, E: 12.52 }], // San Marino
  va: [{ N: 41.912, S: 41.899, W: 12.439, E: 12.461 }], // Vatican City

  // ── Asia – Middle East ──
  ae: [{ N: 26.09, S: 22.63, W: 51.58, E: 56.39 }], // UAE
  bh: [{ N: 26.33, S: 25.79, W: 50.44, E: 50.65 }], // Bahrain — archipelago
  il: [{ N: 33.34, S: 29.50, W: 34.27, E: 35.90 }], // Israel
  ir: [{ N: 39.78, S: 25.06, W: 44.03, E: 63.33 }], // Iran
  kw: [{ N: 30.10, S: 28.53, W: 46.55, E: 48.43 }], // Kuwait
  om: [{ N: 26.39, S: 16.65, W: 51.99, E: 59.84 }], // Oman (mainland + Musandam approx)
  qa: [{ N: 26.18, S: 24.56, W: 50.75, E: 51.62 }], // Qatar — peninsula

  // ── Asia – Central ──
  af: [{ N: 38.49, S: 29.38, W: 60.48, E: 74.90 }], // Afghanistan
  kg: [{ N: 43.24, S: 39.19, W: 69.28, E: 80.28 }], // Kyrgyzstan
  kz: [{ N: 55.45, S: 40.57, W: 50.27, E: 87.36 }], // Kazakhstan
  mn: [{ N: 52.15, S: 41.58, W: 87.74, E: 119.93 }], // Mongolia
  pk: [{ N: 37.10, S: 23.69, W: 60.87, E: 77.84 }], // Pakistan
  tj: [{ N: 41.04, S: 36.67, W: 67.34, E: 75.15 }], // Tajikistan
  tm: [{ N: 42.80, S: 35.14, W: 52.44, E: 66.69 }], // Turkmenistan
  uz: [{ N: 45.59, S: 37.18, W: 55.99, E: 73.16 }], // Uzbekistan

  // ── Asia – South ──
  bt: [{ N: 28.32, S: 26.70, W: 88.75, E: 92.12 }], // Bhutan
  lk: [{ N: 9.84, S: 5.92, W: 79.65, E: 81.88 }], // Sri Lanka
  mv: [{ N: 7.11, S: -0.71, W: 72.65, E: 73.76 }], // Maldives — atoll chain
  np: [{ N: 30.42, S: 26.36, W: 80.06, E: 88.20 }], // Nepal

  // ── Asia – Southeast ──
  bn: [{ N: 5.05, S: 4.00, W: 114.08, E: 115.36 }], // Brunei — two enclaves in NW Borneo
  id: [
    // Indonesia is an archipelago; split into three approximate boxes to avoid
    // swallowing the Indian/Pacific Ocean. Sumatra+Java+Bali = rect1,
    // Kalimantan(Borneo)+Sulawesi = rect2, Papua/Maluku = rect3.
    { N: 5.90, S: -8.80, W: 95.01, E: 115.70 }, // Sumatra, Java, Bali, NTB/NTT
    { N: 4.25, S: -4.07, W: 108.03, E: 125.90 }, // Kalimantan + Sulawesi
    { N: -0.83, S: -8.48, W: 126.02, E: 141.02 }, // Maluku + Papua
  ],
  kh: [{ N: 14.69, S: 10.41, W: 102.34, E: 107.63 }], // Cambodia
  la: [{ N: 22.50, S: 13.92, W: 100.09, E: 107.63 }], // Laos
  mm: [{ N: 28.55, S: 9.78, W: 92.19, E: 101.17 }], // Myanmar
  my: [
    // Malaysia: rect1 = Peninsular Malaysia; rect2 = East Malaysia (Sabah+Sarawak in Borneo)
    { N: 6.73, S: 1.26, W: 99.64, E: 104.37 }, // Peninsular
    { N: 7.38, S: 0.85, W: 109.56, E: 119.28 }, // Sabah + Sarawak
  ],
  ph: [{ N: 21.12, S: 4.64, W: 116.93, E: 126.61 }], // Philippines — main island chain
  sg: [{ N: 1.47, S: 1.16, W: 103.60, E: 104.09 }], // Singapore
  th: [{ N: 20.46, S: 5.61, W: 97.34, E: 105.64 }], // Thailand
  vn: [{ N: 23.39, S: 8.56, W: 102.14, E: 109.46 }], // Vietnam

  // ── Asia – East ──
  hk: [{ N: 22.56, S: 22.15, W: 113.83, E: 114.44 }], // Hong Kong
  jp: [{ N: 45.52, S: 24.26, W: 122.93, E: 145.83 }], // Japan — Hokkaido to Okinawa
  mo: [{ N: 22.22, S: 22.11, W: 113.52, E: 113.60 }], // Macau
  tw: [{ N: 25.30, S: 21.90, W: 119.30, E: 122.00 }], // Taiwan
  kp: [{ N: 43.00, S: 37.67, W: 124.21, E: 130.71 }], // North Korea
  kr: [{ N: 38.61, S: 33.10, W: 125.89, E: 129.59 }], // South Korea

  // ── Oceania ──
  as: [{ N: -14.16, S: -14.55, W: -171.10, E: -168.10 }], // American Samoa (Tutuila + Manu'a group)
  au: [{ N: -10.69, S: -43.64, W: 113.16, E: 153.64 }], // Australia mainland + Tasmania
  ck: [{ N: -18.83, S: -21.93, W: -159.86, E: -157.31 }], // Cook Islands (Northern + Southern group)
  fj: [
    // Fiji splits across the anti-meridian; represent as two rects to keep the
    // isInsideCountry (W < lng < E) predicate valid. rect1 = Viti Levu + Vanua Levu
    // (west of 180); rect2 = Lau group (east of 180 / -180 side).
    { N: -15.72, S: -19.20, W: 177.32, E: 179.99 }, // Viti Levu + Vanua Levu (W of dateline)
    { N: -16.50, S: -19.10, W: -180.00, E: -178.15 }, // Lau group (E of dateline)
  ],
  fm: [{ N: 10.08, S: 5.26, W: 138.06, E: 163.04 }], // Micronesia — spread across the Pacific
  gu: [{ N: 13.66, S: 13.24, W: 144.62, E: 144.96 }], // Guam
  ki: [
    // Kiribati spans across the dateline. Split into two rects so W < E holds.
    { N: 4.72, S: 1.20, W: 172.67, E: 176.90 }, // Gilbert Islands incl. Tarawa
    { N: 4.72, S: -11.46, W: -174.57, E: -150.00 }, // Phoenix & Line Islands (E of dateline)
  ],
  mh: [{ N: 14.73, S: 5.59, W: 160.80, E: 172.00 }], // Marshall Islands
  mp: [{ N: 20.56, S: 14.10, W: 144.89, E: 145.87 }], // Northern Mariana Islands
  nc: [{ N: -19.55, S: -22.68, W: 163.57, E: 167.96 }], // New Caledonia
  nr: [{ N: -0.49, S: -0.57, W: 166.90, E: 166.96 }], // Nauru — tiny island
  nu: [{ N: -18.93, S: -19.17, W: -170.14, E: -169.77 }], // Niue
  nz: [{ N: -34.41, S: -47.31, W: 166.43, E: 178.56 }], // New Zealand (North + South Island)
  pf: [{ N: -7.90, S: -23.87, W: -154.70, E: -134.44 }], // French Polynesia (main island groups approx)
  pg: [{ N: -1.34, S: -11.66, W: 140.84, E: 155.97 }], // Papua New Guinea (mainland + main islands)
  pw: [{ N: 8.09, S: 2.95, W: 131.13, E: 134.72 }], // Palau
  sb: [{ N: -6.59, S: -11.86, W: 155.49, E: 162.75 }], // Solomon Islands
  to: [{ N: -15.56, S: -22.34, W: -175.71, E: -173.91 }], // Tonga
  tv: [{ N: -5.64, S: -9.44, W: 176.06, E: 179.87 }], // Tuvalu
  vu: [{ N: -13.07, S: -20.25, W: 166.52, E: 170.24 }], // Vanuatu
  wf: [{ N: -13.22, S: -14.36, W: -178.19, E: -176.12 }], // Wallis and Futuna
  ws: [{ N: -13.44, S: -14.07, W: -172.80, E: -171.43 }], // Samoa

  // ── Sub-Saharan Africa ──
  bf: [{ N: 15.08, S: 9.40, W: -5.52, E: 2.40 }], // Burkina Faso
  bi: [{ N: -2.31, S: -4.47, W: 28.99, E: 30.85 }], // Burundi
  bj: [{ N: 12.41, S: 6.22, W: 0.77, E: 3.84 }], // Benin
  bw: [{ N: -17.78, S: -26.91, W: 19.99, E: 29.36 }], // Botswana
  cd: [{ N: 5.39, S: -13.46, W: 12.21, E: 31.31 }], // DR Congo
  cf: [{ N: 11.00, S: 2.22, W: 14.42, E: 27.46 }], // Central African Republic
  cg: [{ N: 3.73, S: -5.03, W: 11.15, E: 18.65 }], // Congo (Republic)
  ci: [{ N: 10.74, S: 4.36, W: -8.60, E: -2.49 }], // Côte d'Ivoire
  cm: [{ N: 13.08, S: 1.66, W: 8.50, E: 16.21 }], // Cameroon
  er: [{ N: 18.00, S: 12.37, W: 36.44, E: 43.13 }], // Eritrea
  et: [{ N: 14.90, S: 3.42, W: 32.99, E: 47.98 }], // Ethiopia
  ga: [{ N: 2.32, S: -3.98, W: 8.70, E: 14.52 }], // Gabon
  gh: [{ N: 11.17, S: 4.74, W: -3.26, E: 1.20 }], // Ghana
  gm: [{ N: 13.83, S: 13.06, W: -16.83, E: -13.80 }], // Gambia — thin strip around the Gambia River
  gn: [{ N: 12.68, S: 7.19, W: -15.08, E: -7.65 }], // Guinea
  ke: [{ N: 5.02, S: -4.68, W: 33.91, E: 41.90 }], // Kenya
  km: [{ N: -11.36, S: -12.39, W: 43.22, E: 44.54 }], // Comoros — three-island archipelago
  lr: [{ N: 8.55, S: 4.35, W: -11.50, E: -7.37 }], // Liberia
  ls: [{ N: -28.57, S: -30.67, W: 27.01, E: 29.46 }], // Lesotho (enclave in South Africa)
  ly: [{ N: 33.17, S: 19.50, W: 9.39, E: 25.15 }], // Libya
  mg: [{ N: -11.95, S: -25.61, W: 43.19, E: 50.48 }], // Madagascar
  ml: [{ N: 25.00, S: 10.15, W: -12.25, E: 4.25 }], // Mali — W extended to Kayes region near Senegal border
  mr: [{ N: 27.31, S: 14.72, W: -17.08, E: -4.83 }], // Mauritania
  mu: [{ N: -19.97, S: -20.53, W: 57.30, E: 57.80 }], // Mauritius — main island
  mw: [{ N: -9.37, S: -17.12, W: 32.67, E: 35.92 }], // Malawi
  na: [{ N: -16.96, S: -29.04, W: 11.72, E: 25.26 }], // Namibia
  ne: [{ N: 23.52, S: 11.70, W: 0.16, E: 15.99 }], // Niger
  ng: [{ N: 13.89, S: 4.28, W: 2.67, E: 14.68 }], // Nigeria
  rw: [{ N: -1.06, S: -2.83, W: 28.86, E: 30.90 }], // Rwanda
  sc: [{ N: -4.28, S: -4.85, W: 55.38, E: 55.55 }], // Seychelles — Mahé group approx
  sl: [{ N: 9.99, S: 6.92, W: -13.30, E: -10.27 }], // Sierra Leone
  sn: [{ N: 16.70, S: 12.30, W: -17.54, E: -11.36 }], // Senegal
  so: [{ N: 11.98, S: -1.66, W: 40.99, E: 51.41 }], // Somalia
  ss: [{ N: 12.25, S: 3.49, W: 24.12, E: 36.89 }], // South Sudan
  sz: [{ N: -25.72, S: -27.32, W: 30.80, E: 32.13 }], // Eswatini
  td: [{ N: 23.45, S: 7.46, W: 13.47, E: 24.00 }], // Chad
  tg: [{ N: 11.14, S: 6.10, W: -0.15, E: 1.81 }], // Togo
  tz: [{ N: -0.99, S: -11.74, W: 29.34, E: 40.44 }], // Tanzania (mainland + Zanzibar)
  ug: [{ N: 4.23, S: -1.48, W: 29.57, E: 35.03 }], // Uganda
  zm: [{ N: -8.23, S: -18.08, W: 21.98, E: 33.70 }], // Zambia
  za: [{ N: -22.13, S: -34.83, W: 16.46, E: 32.89 }], // South Africa (excl. Lesotho)
  zw: [{ N: -15.61, S: -22.42, W: 25.24, E: 33.07 }], // Zimbabwe

  // ── North Africa (non-Arabic) ──
  eh: [{ N: 27.67, S: 20.77, W: -17.10, E: -8.68 }], // Western Sahara

  // ── Indian Ocean / Atlantic islands ──
  bv: [{ N: -54.39, S: -54.48, W: 3.34, E: 3.45 }], // Bouvet Island
  re: [{ N: -20.85, S: -21.40, W: 55.22, E: 55.84 }], // Réunion
  sh: [{ N: -15.89, S: -16.05, W: -5.80, E: -5.63 }], // Saint Helena
  yt: [{ N: -12.63, S: -13.01, W: 45.01, E: 45.31 }], // Mayotte

  // ── Caribbean ──
  ag: [{ N: 17.74, S: 16.99, W: -61.91, E: -61.67 }], // Antigua (+ Barbuda slightly N)
  ai: [{ N: 18.27, S: 18.15, W: -63.17, E: -62.97 }], // Anguilla
  aw: [{ N: 12.63, S: 12.41, W: -70.08, E: -69.87 }], // Aruba
  bb: [{ N: 13.33, S: 13.04, W: -59.65, E: -59.43 }], // Barbados
  bl: [{ N: 17.93, S: 17.87, W: -62.89, E: -62.79 }], // Saint Barthélemy
  bm: [{ N: 32.39, S: 32.26, W: -64.88, E: -64.64 }], // Bermuda
  bs: [{ N: 27.27, S: 20.91, W: -79.30, E: -72.71 }], // Bahamas
  cw: [{ N: 12.38, S: 12.05, W: -69.17, E: -68.74 }], // Curaçao
  dm: [{ N: 15.64, S: 15.21, W: -61.48, E: -61.25 }], // Dominica
  gd: [{ N: 12.24, S: 11.98, W: -61.80, E: -61.61 }], // Grenada
  gp: [{ N: 16.51, S: 15.84, W: -61.80, E: -61.00 }], // Guadeloupe
  ht: [{ N: 19.93, S: 17.99, W: -74.48, E: -71.64 }], // Haiti (western Hispaniola)
  jm: [{ N: 18.52, S: 17.70, W: -78.37, E: -76.20 }], // Jamaica
  kn: [{ N: 17.42, S: 17.10, W: -62.86, E: -62.55 }], // Saint Kitts and Nevis
  ky: [{ N: 19.37, S: 19.26, W: -81.42, E: -81.10 }], // Cayman Islands (Grand Cayman)
  lc: [{ N: 14.11, S: 13.71, W: -61.08, E: -60.88 }], // Saint Lucia
  mq: [{ N: 14.88, S: 14.39, W: -61.23, E: -60.82 }], // Martinique
  ms: [{ N: 16.81, S: 16.67, W: -62.24, E: -62.14 }], // Montserrat
  pr: [{ N: 18.52, S: 17.92, W: -67.27, E: -65.59 }], // Puerto Rico
  tc: [{ N: 21.97, S: 21.29, W: -72.48, E: -71.13 }], // Turks and Caicos
  tt: [{ N: 10.85, S: 10.03, W: -61.92, E: -60.89 }], // Trinidad and Tobago
  vc: [{ N: 13.38, S: 12.58, W: -61.46, E: -61.12 }], // Saint Vincent and the Grenadines
  vg: [{ N: 18.75, S: 18.30, W: -64.73, E: -64.27 }], // British Virgin Islands
  vi: [{ N: 18.41, S: 17.67, W: -65.09, E: -64.56 }], // US Virgin Islands

  // ── Pacific (Central America / Caribbean adjacent) ──
  gy: [{ N: 8.56, S: 1.18, W: -61.40, E: -56.48 }], // Guyana
  gf: [{ N: 5.77, S: 2.11, W: -54.61, E: -51.64 }], // French Guiana
  sr: [{ N: 6.00, S: 1.84, W: -58.07, E: -53.99 }], // Suriname

  // ── Overseas/territories in Oceania / Pacific ──
  fo: [{ N: 62.40, S: 61.39, W: -7.68, E: -6.26 }], // Faroe Islands
  fk: [{ N: -51.24, S: -53.00, W: -61.35, E: -57.71 }], // Falkland Islands
  tf: [{ N: -37.78, S: -49.72, W: 50.18, E: 70.56 }], // French Southern Territories (approx Kerguelen + Crozet)
  cc: [{ N: -11.83, S: -12.22, W: 96.82, E: 96.93 }], // Cocos (Keeling) Islands
  cx: [{ N: -10.41, S: -10.57, W: 105.58, E: 105.73 }], // Christmas Island
  aq: [{ N: -63.27, S: -90.00, W: -180.00, E: 180.00 }], // Antarctica — whole continent approx
  gq: [
    { N: 2.35, S: 0.92, W: 9.30, E: 11.34 }, // Río Muni mainland (already above)
    { N: 3.79, S: 3.20, W: 8.40, E: 8.95 }, // Bioko island (Malabo) (already above)
  ], // Equatorial Guinea duplicate — JS takes last value, keeping the correct split rect

  // ── North / West Africa ──
  dj: [{ N: 12.71, S: 10.93, W: 41.77, E: 43.42 }], // Djibouti

  // ── Central America ──
  bz: [{ N: 18.50, S: 15.89, W: -89.23, E: -87.79 }], // Belize
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

// getCountry('br') -> { code, name, flag, bounds, capital }. Falls back to the
// default country for an unknown code, so callers always get a renderable object.
// `capital` is the [lat, lng] the flag-pick camera jumps to (CAPITAL-ZOOM), or
// null for the few territories with no capital city (the pick then falls back to
// the bounds / fallback-zoom path — see CountryFlagControl.pick).
export function getCountry(code) {
  const cc = normalizeCountryCode(code) || DEFAULT_COUNTRY;
  return {
    code: cc,
    name: COUNTRY_NAMES[cc],
    flag: flagEmoji(cc),
    bounds: COUNTRY_BOUNDS[cc] || null,
    capital: COUNTRY_CAPITALS[cc] || null,
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
