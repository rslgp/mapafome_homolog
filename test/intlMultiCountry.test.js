// intlMultiCountry.test.js — proves the publish geofence works for EVERY curated
// launch country, not just Brazil. This is the authoritative module-level proof
// that "marking points works in different countries": for each country in
// COUNTRY_PUBLISH_BOUNDS we assert a real in-country landmark is ACCEPTED and a
// known out-of-country / ocean point is REJECTED, through isInsideCountry — the
// exact predicate the publish gate (variaveisAmbiente.dentroLimites) calls.
//
// Complements geofence.test.js (which proves Brazil bit-for-bit + edge semantics);
// this one fans the check across the whole launch subset so adding/removing a
// country, or a bad bbox that swallows an ocean, fails loudly here.
import { describe, it, expect } from 'vitest';
import {
  isInsideCountry,
  COUNTRY_PUBLISH_BOUNDS,
} from '../src/app/components/compatibility/components/countries';

// One real, well-inside-the-mainland landmark per launch country, plus a point
// that must NOT be accepted for that country (another country's capital or open
// ocean). Coordinates are [lat, lng].
const LANDMARKS = {
  // ── Original launch set (Iberia / Western Europe / the Americas) ──
  br: { name: 'São Paulo', inside: [-23.55, -46.63], outside: [40.42, -3.7] },
  pt: { name: 'Lisbon', inside: [38.72, -9.14], outside: [52.52, 13.405] },
  es: { name: 'Madrid', inside: [40.42, -3.7], outside: [-23.55, -46.63] },
  fr: { name: 'Paris', inside: [48.86, 2.35], outside: [35.0, -40.0] },
  de: { name: 'Berlin', inside: [52.52, 13.405], outside: [38.72, -9.14] },
  gb: { name: 'London', inside: [51.5074, -0.1278], outside: [48.86, 2.35] },
  ar: { name: 'Buenos Aires', inside: [-34.6, -58.38], outside: [40.42, -3.7] },
  uy: { name: 'Montevideo', inside: [-34.9, -56.16], outside: [-23.55, -46.63] },
  py: { name: 'Asunción', inside: [-25.28, -57.63], outside: [-34.6, -58.38] },
  cl: { name: 'Santiago', inside: [-33.45, -70.66], outside: [-34.6, -58.38] },
  co: { name: 'Bogotá', inside: [4.71, -74.07], outside: [-12.05, -77.04] },
  pe: { name: 'Lima', inside: [-12.05, -77.04], outside: [4.71, -74.07] },
  bo: { name: 'La Paz', inside: [-16.5, -68.15], outside: [-33.45, -70.66] },
  ca: { name: 'Toronto', inside: [43.65, -79.38], outside: [40.71, -74.01] },
  us: { name: 'Chicago', inside: [41.88, -87.63], outside: [40.42, -3.7] }, // contiguous lower-48 (Madrid ES is well outside the US bbox)
  it: { name: 'Rome', inside: [41.9, 12.5], outside: [48.86, 2.35] }, // mainland Italy (Paris FR outside)

  // ── INTL LOCALE-COVERAGE — Hispanophone (es) extension ──
  mx: { name: 'Mexico City', inside: [19.43, -99.13], outside: [-23.55, -46.63] },
  ve: { name: 'Caracas', inside: [10.49, -66.88], outside: [40.42, -3.7] },
  ec: { name: 'Quito', inside: [-0.23, -78.52], outside: [-33.45, -70.66] },
  gt: { name: 'Guatemala City', inside: [14.64, -90.51], outside: [-23.55, -46.63] },
  cu: { name: 'Havana', inside: [23.12, -82.37], outside: [40.42, -3.7] },
  do: { name: 'Santo Domingo', inside: [18.48, -69.96], outside: [-23.55, -46.63] },
  hn: { name: 'Tegucigalpa', inside: [14.09, -87.21], outside: [-23.55, -46.63] },
  ni: { name: 'Managua', inside: [12.13, -86.29], outside: [-23.55, -46.63] },
  cr: { name: 'San José', inside: [9.93, -84.08], outside: [-23.55, -46.63] },
  pa: { name: 'Panama City', inside: [8.99, -79.52], outside: [-23.55, -46.63] },
  sv: { name: 'San Salvador', inside: [13.69, -89.19], outside: [-23.55, -46.63] },

  // ── INTL LOCALE-COVERAGE — Lusophone (pt) extension ──
  ao: { name: 'Luanda', inside: [-8.84, 13.23], outside: [40.42, -3.7] },
  mz: { name: 'Maputo', inside: [-25.97, 32.58], outside: [40.42, -3.7] },
  cv: { name: 'Praia', inside: [14.93, -23.51], outside: [-23.55, -46.63] },
  gw: { name: 'Bissau', inside: [11.86, -15.60], outside: [40.42, -3.7] },
  st: { name: 'São Tomé city', inside: [0.34, 6.73], outside: [40.42, -3.7] },
  gq: { name: 'Malabo (Bioko)', inside: [3.75, 8.78], outside: [40.42, -3.7] }, // capital on Bioko island, in the island rect
  tl: { name: 'Dili', inside: [-8.56, 125.58], outside: [40.42, -3.7] },

  // ── INTL LOCALE-COVERAGE — Arabic (ar) geographies ──
  eg: { name: 'Cairo', inside: [30.06, 31.25], outside: [-23.55, -46.63] },
  iq: { name: 'Baghdad', inside: [33.34, 44.40], outside: [40.42, -3.7] },
  jo: { name: 'Amman', inside: [31.95, 35.93], outside: [40.42, -3.7] },
  sy: { name: 'Damascus', inside: [33.51, 36.29], outside: [40.42, -3.7] },
  ye: { name: 'Sanaa', inside: [15.35, 44.21], outside: [40.42, -3.7] },
  sd: { name: 'Khartoum', inside: [15.55, 32.53], outside: [40.42, -3.7] },
  dz: { name: 'Algiers', inside: [36.74, 3.06], outside: [-23.55, -46.63] },
  ma: { name: 'Rabat', inside: [34.01, -6.83], outside: [40.42, -3.7] },
  tn: { name: 'Tunis', inside: [36.82, 10.17], outside: [40.42, -3.7] },
  lb: { name: 'Beirut', inside: [33.89, 35.50], outside: [40.42, -3.7] },
  sa: { name: 'Riyadh', inside: [24.69, 46.72], outside: [40.42, -3.7] },

  // ── INTL LOCALE-COVERAGE — single-country locales ──
  cn: { name: 'Beijing', inside: [39.91, 116.39], outside: [40.42, -3.7] },
  ru: { name: 'Moscow', inside: [55.75, 37.62], outside: [40.42, -3.7] },
  ua: { name: 'Kyiv', inside: [50.45, 30.52], outside: [40.42, -3.7] },
  bd: { name: 'Dhaka', inside: [23.73, 90.40], outside: [40.42, -3.7] },

  // ── INTL LOCALE-COVERAGE — hi/tr (DEMAND EXPANSION) ──
  in: { name: 'New Delhi', inside: [28.61, 77.21], outside: [40.42, -3.7] },
  tr: { name: 'Ankara', inside: [39.92, 32.85], outside: [40.42, -3.7] },

  // ── ALL REMAINING COUNTRIES — full catalog ──
  ad: { name: 'Andorra la Vella', inside: [42.51, 1.52], outside: [-23.55, -46.63] },
  ae: { name: 'Abu Dhabi', inside: [24.45, 54.38], outside: [-23.55, -46.63] },
  af: { name: 'Kabul', inside: [34.56, 69.21], outside: [-23.55, -46.63] },
  ag: { name: "Saint John's", inside: [17.13, -61.85], outside: [-23.55, -46.63] },
  ai: { name: 'The Valley', inside: [18.22, -63.07], outside: [-23.55, -46.63] },
  al: { name: 'Tirana', inside: [41.33, 19.82], outside: [-23.55, -46.63] },
  am: { name: 'Yerevan', inside: [40.18, 44.50], outside: [-23.55, -46.63] },
  aq: { name: 'South Pole', inside: [-89.0, 0.0], outside: [40.42, -3.7] },
  as: { name: 'Pago Pago', inside: [-14.28, -170.70], outside: [-23.55, -46.63] },
  at: { name: 'Vienna', inside: [48.21, 16.37], outside: [-23.55, -46.63] },
  au: { name: 'Canberra', inside: [-35.28, 149.13], outside: [-23.55, -46.63] },
  aw: { name: 'Oranjestad', inside: [12.51, -70.01], outside: [40.42, -3.7] },
  az: { name: 'Baku', inside: [40.41, 49.87], outside: [-23.55, -46.63] },
  ba: { name: 'Sarajevo', inside: [43.86, 18.41], outside: [-23.55, -46.63] },
  bb: { name: 'Bridgetown', inside: [13.11, -59.60], outside: [40.42, -3.7] },
  be: { name: 'Brussels', inside: [50.85, 4.35], outside: [-23.55, -46.63] },
  bf: { name: 'Ouagadougou', inside: [12.37, -1.52], outside: [40.42, -3.7] },
  bg: { name: 'Sofia', inside: [42.70, 23.32], outside: [-23.55, -46.63] },
  bh: { name: 'Manama', inside: [26.23, 50.59], outside: [-23.55, -46.63] },
  bi: { name: 'Gitega', inside: [-3.36, 29.36], outside: [40.42, -3.7] },
  bj: { name: 'Porto-Novo', inside: [6.50, 2.63], outside: [40.42, -3.7] },
  bl: { name: 'Gustavia', inside: [17.90, -62.85], outside: [-23.55, -46.63] },
  bm: { name: 'Hamilton', inside: [32.29, -64.78], outside: [-23.55, -46.63] },
  bn: { name: 'Bandar Seri Begawan', inside: [4.90, 114.94], outside: [-23.55, -46.63] },
  bs: { name: 'Nassau', inside: [25.05, -77.36], outside: [40.42, -3.7] },
  bt: { name: 'Thimphu', inside: [27.47, 89.64], outside: [-23.55, -46.63] },
  bv: { name: 'Bouvet Island', inside: [-54.42, 3.40], outside: [40.42, -3.7] },
  bw: { name: 'Gaborone', inside: [-24.63, 25.92], outside: [40.42, -3.7] },
  by: { name: 'Minsk', inside: [53.90, 27.56], outside: [-23.55, -46.63] },
  bz: { name: 'Belmopan', inside: [17.25, -88.76], outside: [-23.55, -46.63] },
  cc: { name: 'West Island', inside: [-12.10, 96.88], outside: [40.42, -3.7] },
  cd: { name: 'Kinshasa', inside: [-4.44, 15.27], outside: [40.42, -3.7] },
  cf: { name: 'Bangui', inside: [4.39, 18.56], outside: [40.42, -3.7] },
  cg: { name: 'Brazzaville', inside: [-4.26, 15.24], outside: [40.42, -3.7] },
  ch: { name: 'Bern', inside: [46.95, 7.45], outside: [-23.55, -46.63] },
  ci: { name: 'Yamoussoukro', inside: [6.83, -5.29], outside: [40.42, -3.7] },
  ck: { name: 'Avarua', inside: [-21.21, -159.78], outside: [-23.55, -46.63] },
  cm: { name: 'Yaoundé', inside: [3.85, 11.50], outside: [40.42, -3.7] },
  cw: { name: 'Willemstad', inside: [12.12, -68.88], outside: [40.42, -3.7] },
  cx: { name: 'Flying Fish Cove', inside: [-10.48, 105.67], outside: [40.42, -3.7] },
  cy: { name: 'Nicosia', inside: [35.19, 33.38], outside: [-23.55, -46.63] },
  dj: { name: 'Djibouti', inside: [11.57, 43.15], outside: [40.42, -3.7] },
  dk: { name: 'Copenhagen', inside: [55.68, 12.57], outside: [-23.55, -46.63] },
  dm: { name: 'Roseau', inside: [15.31, -61.38], outside: [40.42, -3.7] },
  ee: { name: 'Tallinn', inside: [59.44, 24.75], outside: [-23.55, -46.63] },
  eh: { name: 'Laayoune', inside: [27.15, -13.20], outside: [40.42, -3.7] },
  er: { name: 'Asmara', inside: [15.32, 38.93], outside: [40.42, -3.7] },
  et: { name: 'Addis Ababa', inside: [9.03, 38.75], outside: [40.42, -3.7] },
  fi: { name: 'Helsinki', inside: [60.17, 24.94], outside: [-23.55, -46.63] },
  fj: { name: 'Suva', inside: [-18.14, 178.44], outside: [-23.55, -46.63] },
  fk: { name: 'Stanley', inside: [-51.70, -57.85], outside: [40.42, -3.7] },
  fm: { name: 'Palikir', inside: [6.92, 158.16], outside: [-23.55, -46.63] },
  fo: { name: 'Tórshavn', inside: [62.01, -6.79], outside: [40.42, -3.7] },
  ga: { name: 'Libreville', inside: [0.42, 9.47], outside: [40.42, -3.7] },
  gd: { name: "Saint George's", inside: [12.06, -61.75], outside: [40.42, -3.7] },
  ge: { name: 'Tbilisi', inside: [41.72, 44.83], outside: [-23.55, -46.63] },
  gf: { name: 'Cayenne', inside: [4.92, -52.31], outside: [40.42, -3.7] },
  gg: { name: 'Saint Peter Port', inside: [49.46, -2.54], outside: [-23.55, -46.63] },
  gh: { name: 'Accra', inside: [5.60, -0.19], outside: [40.42, -3.7] },
  gi: { name: 'Gibraltar', inside: [36.14, -5.35], outside: [-23.55, -46.63] },
  gl: { name: 'Nuuk', inside: [64.18, -51.69], outside: [40.42, -3.7] },
  gm: { name: 'Banjul', inside: [13.45, -16.58], outside: [40.42, -3.7] },
  gn: { name: 'Conakry', inside: [9.64, -13.58], outside: [40.42, -3.7] },
  gp: { name: 'Basse-Terre', inside: [16.24, -61.53], outside: [40.42, -3.7] },
  gr: { name: 'Athens', inside: [37.98, 23.73], outside: [-23.55, -46.63] },
  gu: { name: 'Hagåtña', inside: [13.47, 144.75], outside: [-23.55, -46.63] },
  gy: { name: 'Georgetown', inside: [6.80, -58.16], outside: [40.42, -3.7] },
  hk: { name: 'Hong Kong', inside: [22.32, 114.17], outside: [-23.55, -46.63] },
  hr: { name: 'Zagreb', inside: [45.82, 15.98], outside: [-23.55, -46.63] },
  ht: { name: 'Port-au-Prince', inside: [18.54, -72.34], outside: [-23.55, -46.63] },
  hu: { name: 'Budapest', inside: [47.50, 19.04], outside: [-23.55, -46.63] },
  id: { name: 'Jakarta', inside: [-6.21, 106.85], outside: [-23.55, -46.63] },
  ie: { name: 'Dublin', inside: [53.35, -6.26], outside: [-23.55, -46.63] },
  il: { name: 'Jerusalem', inside: [31.77, 35.21], outside: [-23.55, -46.63] },
  im: { name: 'Douglas', inside: [54.15, -4.48], outside: [-23.55, -46.63] },
  ir: { name: 'Tehran', inside: [35.69, 51.39], outside: [-23.55, -46.63] },
  is: { name: 'Reykjavik', inside: [64.15, -21.94], outside: [-23.55, -46.63] },
  je: { name: 'Saint Helier', inside: [49.19, -2.11], outside: [-23.55, -46.63] },
  jm: { name: 'Kingston', inside: [17.99, -76.79], outside: [-23.55, -46.63] },
  jp: { name: 'Tokyo', inside: [35.68, 139.65], outside: [-23.55, -46.63] },
  ke: { name: 'Nairobi', inside: [-1.29, 36.82], outside: [40.42, -3.7] },
  kg: { name: 'Bishkek', inside: [42.87, 74.57], outside: [-23.55, -46.63] },
  kh: { name: 'Phnom Penh', inside: [11.56, 104.93], outside: [-23.55, -46.63] },
  ki: { name: 'Tarawa', inside: [1.33, 172.98], outside: [-23.55, -46.63] },
  km: { name: 'Moroni', inside: [-11.72, 43.25], outside: [40.42, -3.7] },
  kn: { name: 'Basseterre', inside: [17.30, -62.73], outside: [40.42, -3.7] },
  kp: { name: 'Pyongyang', inside: [39.04, 125.76], outside: [-23.55, -46.63] },
  kr: { name: 'Seoul', inside: [37.57, 126.98], outside: [-23.55, -46.63] },
  kw: { name: 'Kuwait City', inside: [29.38, 47.98], outside: [-23.55, -46.63] },
  ky: { name: 'George Town', inside: [19.29, -81.37], outside: [40.42, -3.7] },
  kz: { name: 'Astana', inside: [51.17, 71.45], outside: [-23.55, -46.63] },
  la: { name: 'Vientiane', inside: [17.98, 102.63], outside: [-23.55, -46.63] },
  lc: { name: 'Castries', inside: [14.01, -60.99], outside: [40.42, -3.7] },
  li: { name: 'Vaduz', inside: [47.14, 9.52], outside: [-23.55, -46.63] },
  lk: { name: 'Colombo', inside: [6.93, 79.86], outside: [-23.55, -46.63] },
  lr: { name: 'Monrovia', inside: [6.30, -10.80], outside: [40.42, -3.7] },
  ls: { name: 'Maseru', inside: [-29.31, 27.48], outside: [40.42, -3.7] },
  lt: { name: 'Vilnius', inside: [54.69, 25.28], outside: [-23.55, -46.63] },
  lu: { name: 'Luxembourg City', inside: [49.61, 6.13], outside: [-23.55, -46.63] },
  lv: { name: 'Riga', inside: [56.95, 24.11], outside: [-23.55, -46.63] },
  ly: { name: 'Tripoli', inside: [32.89, 13.19], outside: [40.42, -3.7] },
  mc: { name: 'Monaco', inside: [43.74, 7.42], outside: [-23.55, -46.63] },
  md: { name: 'Chișinău', inside: [47.01, 28.86], outside: [-23.55, -46.63] },
  me: { name: 'Podgorica', inside: [42.43, 19.26], outside: [-23.55, -46.63] },
  mg: { name: 'Antananarivo', inside: [-18.88, 47.51], outside: [40.42, -3.7] },
  mh: { name: 'Majuro', inside: [7.09, 171.38], outside: [-23.55, -46.63] },
  mk: { name: 'Skopje', inside: [42.00, 21.43], outside: [-23.55, -46.63] },
  ml: { name: 'Bamako', inside: [12.64, -8.00], outside: [40.42, -3.7] },
  mm: { name: 'Naypyidaw', inside: [19.76, 96.08], outside: [-23.55, -46.63] },
  mn: { name: 'Ulaanbaatar', inside: [47.89, 106.91], outside: [-23.55, -46.63] },
  mo: { name: 'Macau', inside: [22.20, 113.54], outside: [-23.55, -46.63] },
  mp: { name: 'Saipan', inside: [15.19, 145.72], outside: [-23.55, -46.63] },
  mq: { name: 'Fort-de-France', inside: [14.62, -61.06], outside: [40.42, -3.7] },
  mr: { name: 'Nouakchott', inside: [18.07, -15.96], outside: [40.42, -3.7] },
  ms: { name: 'Brades', inside: [16.71, -62.22], outside: [40.42, -3.7] },
  mt: { name: 'Valletta', inside: [35.90, 14.51], outside: [-23.55, -46.63] },
  mu: { name: 'Port Louis', inside: [-20.16, 57.50], outside: [40.42, -3.7] },
  mv: { name: 'Malé', inside: [4.18, 73.51], outside: [-23.55, -46.63] },
  mw: { name: 'Lilongwe', inside: [-13.96, 33.77], outside: [40.42, -3.7] },
  my: { name: 'Kuala Lumpur', inside: [3.14, 101.69], outside: [-23.55, -46.63] },
  na: { name: 'Windhoek', inside: [-22.56, 17.07], outside: [40.42, -3.7] },
  nc: { name: 'Nouméa', inside: [-22.28, 166.46], outside: [-23.55, -46.63] },
  ne: { name: 'Niamey', inside: [13.51, 2.11], outside: [40.42, -3.7] },
  ng: { name: 'Abuja', inside: [9.08, 7.40], outside: [40.42, -3.7] },
  nl: { name: 'Amsterdam', inside: [52.37, 4.90], outside: [-23.55, -46.63] },
  no: { name: 'Oslo', inside: [59.91, 10.75], outside: [-23.55, -46.63] },
  np: { name: 'Kathmandu', inside: [27.72, 85.32], outside: [-23.55, -46.63] },
  nr: { name: 'Yaren', inside: [-0.55, 166.92], outside: [-23.55, -46.63] },
  nu: { name: 'Alofi', inside: [-19.05, -169.87], outside: [-23.55, -46.63] },
  nz: { name: 'Wellington', inside: [-41.29, 174.78], outside: [-23.55, -46.63] },
  om: { name: 'Muscat', inside: [23.59, 58.38], outside: [-23.55, -46.63] },
  pf: { name: 'Papeete', inside: [-17.54, -149.57], outside: [-23.55, -46.63] },
  pg: { name: 'Port Moresby', inside: [-9.44, 147.18], outside: [-23.55, -46.63] },
  ph: { name: 'Manila', inside: [14.60, 120.98], outside: [-23.55, -46.63] },
  pk: { name: 'Islamabad', inside: [33.68, 73.05], outside: [-23.55, -46.63] },
  pl: { name: 'Warsaw', inside: [52.23, 21.01], outside: [-23.55, -46.63] },
  pr: { name: 'San Juan', inside: [18.47, -66.11], outside: [40.42, -3.7] },
  pw: { name: 'Ngerulmud', inside: [7.50, 134.62], outside: [-23.55, -46.63] },
  qa: { name: 'Doha', inside: [25.29, 51.53], outside: [-23.55, -46.63] },
  re: { name: 'Saint-Denis', inside: [-20.88, 55.45], outside: [40.42, -3.7] },
  ro: { name: 'Bucharest', inside: [44.43, 26.10], outside: [-23.55, -46.63] },
  rs: { name: 'Belgrade', inside: [44.79, 20.45], outside: [-23.55, -46.63] },
  rw: { name: 'Kigali', inside: [-1.97, 30.10], outside: [40.42, -3.7] },
  sb: { name: 'Honiara', inside: [-9.45, 159.97], outside: [-23.55, -46.63] },
  sc: { name: 'Victoria', inside: [-4.62, 55.45], outside: [40.42, -3.7] },
  se: { name: 'Stockholm', inside: [59.33, 18.07], outside: [-23.55, -46.63] },
  sg: { name: 'Singapore', inside: [1.35, 103.82], outside: [-23.55, -46.63] },
  sh: { name: 'Jamestown', inside: [-15.97, -5.71], outside: [40.42, -3.7] },
  si: { name: 'Ljubljana', inside: [46.06, 14.51], outside: [-23.55, -46.63] },
  sk: { name: 'Bratislava', inside: [48.15, 17.11], outside: [-23.55, -46.63] },
  sl: { name: 'Freetown', inside: [8.47, -13.23], outside: [40.42, -3.7] },
  sm: { name: 'San Marino city', inside: [43.94, 12.46], outside: [-23.55, -46.63] },
  sn: { name: 'Dakar', inside: [14.72, -17.47], outside: [40.42, -3.7] },
  so: { name: 'Mogadishu', inside: [2.05, 45.32], outside: [40.42, -3.7] },
  sr: { name: 'Paramaribo', inside: [5.85, -55.20], outside: [40.42, -3.7] },
  ss: { name: 'Juba', inside: [4.86, 31.57], outside: [40.42, -3.7] },
  sz: { name: 'Mbabane', inside: [-26.31, 31.14], outside: [40.42, -3.7] },
  tc: { name: 'Cockburn Town', inside: [21.47, -71.14], outside: [-23.55, -46.63] },
  td: { name: "N'Djamena", inside: [12.13, 15.06], outside: [40.42, -3.7] },
  tf: { name: 'Kerguelen', inside: [-49.35, 70.22], outside: [40.42, -3.7] },
  tg: { name: 'Lomé', inside: [6.17, 1.23], outside: [40.42, -3.7] },
  th: { name: 'Bangkok', inside: [13.76, 100.50], outside: [-23.55, -46.63] },
  tj: { name: 'Dushanbe', inside: [38.56, 68.79], outside: [-23.55, -46.63] },
  tm: { name: 'Ashgabat', inside: [37.96, 58.33], outside: [-23.55, -46.63] },
  to: { name: 'Nukualofa', inside: [-21.14, -175.20], outside: [-23.55, -46.63] },
  tt: { name: 'Port of Spain', inside: [10.65, -61.50], outside: [-23.55, -46.63] },
  tv: { name: 'Funafuti', inside: [-8.52, 179.20], outside: [-23.55, -46.63] },
  tw: { name: 'Taipei', inside: [25.03, 121.57], outside: [-23.55, -46.63] },
  tz: { name: 'Dodoma', inside: [-6.16, 35.75], outside: [40.42, -3.7] },
  ug: { name: 'Kampala', inside: [0.35, 32.58], outside: [40.42, -3.7] },
  uz: { name: 'Tashkent', inside: [41.30, 69.24], outside: [-23.55, -46.63] },
  va: { name: 'Vatican City', inside: [41.904, 12.45], outside: [-23.55, -46.63] },
  vc: { name: 'Kingstown', inside: [13.16, -61.22], outside: [40.42, -3.7] },
  vg: { name: 'Road Town', inside: [18.42, -64.64], outside: [40.42, -3.7] },
  vi: { name: 'Charlotte Amalie', inside: [18.34, -64.90], outside: [40.42, -3.7] },
  vn: { name: 'Hanoi', inside: [21.03, 105.83], outside: [-23.55, -46.63] },
  vu: { name: 'Port Vila', inside: [-17.73, 168.33], outside: [-23.55, -46.63] },
  wf: { name: 'Mata-Utu', inside: [-13.28, -176.17], outside: [-23.55, -46.63] },
  ws: { name: 'Apia', inside: [-13.83, -171.77], outside: [-23.55, -46.63] },
  yt: { name: 'Mamoudzou', inside: [-12.78, 45.23], outside: [40.42, -3.7] },
  za: { name: 'Pretoria', inside: [-25.75, 28.23], outside: [40.42, -3.7] },
  zm: { name: 'Lusaka', inside: [-15.39, 28.32], outside: [40.42, -3.7] },
  zw: { name: 'Harare', inside: [-17.83, 31.03], outside: [40.42, -3.7] },
};

describe('intl marking — every curated launch country accepts its own pins', () => {
  // Guard: the launch set should have grown well past Brazil-only (the whole
  // point of the feature). If someone reverts to br-only, this fails loudly.
  it('the publish-bounds set covers many countries, not just Brazil', () => {
    const codes = Object.keys(COUNTRY_PUBLISH_BOUNDS);
    expect(codes).toContain('br');
    expect(codes.length, 'expected a multi-country launch set').toBeGreaterThan(5);
  });

  // Every bounded country must have a landmark fixture here, or coverage silently
  // lags the data. This forces the fixture table to track COUNTRY_PUBLISH_BOUNDS.
  it('has a landmark fixture for every bounded country (no silent coverage gap)', () => {
    const bounded = Object.keys(COUNTRY_PUBLISH_BOUNDS).sort();
    const fixtured = Object.keys(LANDMARKS).sort();
    expect(fixtured).toEqual(bounded);
  });

  for (const [code, { name, inside, outside }] of Object.entries(LANDMARKS)) {
    it(`${code.toUpperCase()} (${name}): in-country ACCEPTED, outside REJECTED`, () => {
      expect(isInsideCountry(inside, code), `${name} should be inside ${code}`).toBe(true);
      expect(isInsideCountry(outside, code), `outside point should be rejected for ${code}`).toBe(
        false,
      );
    });
  }
});

describe('intl marking — a country with no publish shape is blocked (D6)', () => {
  // All COUNTRY_NAMES codes now have hitboxes; only invented / non-catalog codes
  // should be blocked. Verify with a fake two-letter code and a null/empty input.
  for (const code of ['zz', 'xx', '']) {
    it(`"${code}": blocked — not a real country code`, () => {
      expect(isInsideCountry([0, 0], code)).toBe(false);
    });
  }
});
