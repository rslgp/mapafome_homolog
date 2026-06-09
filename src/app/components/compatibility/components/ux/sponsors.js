// Monetization data module — first-party sponsor entries.
//
// Distance math is delegated to the domain value object Coordinates
// (VM10) — the Haversine formula has ONE home now, not a re-typed copy here.
//
// Shape:
//   {
//     id:          unique slug, also used for /go/{id}/ redirector paths
//     img:         PNG path under /public/sponsors/
//     href:        destination URL (external http(s) OR internal like /apoiar)
//     alt:         image alt text — short brand identifier
//     label:       display label (optional — used when description is present)
//     description: one-line tagline, HARD LIMIT 150 chars (truncated at render)
//     regions:     slugs from regionResolver.js, or '*' for the global fallback
//     placements:  array of slot slugs (see PLACEMENTS below)
//     weight:      relative weight within the resolved region (default 1)
//     startsAt:    date string — exposure window opens (optional, default: now)
//     expiresAt:   date string — exposure window closes (optional, default: never)
//     center:      [lat, lng] — geographic center of paid reach (optional)
//     radiusKm:    number — reach radius in kilometers around `center` (optional)
//   }
//
// Two targeting modes (a sponsor may use either or both):
//   • Region buckets (regions[]) — broad city-area matching via bbox table.
//   • Precise geo (center + radiusKm) — paid reach. If set, the user's GPS
//     coords must be within `radiusKm` of `center`. Geo-targeted matches are
//     PRIORITIZED over region-only matches in the carousel, so the brand that
//     paid for a specific reach appears first when its audience is inside it.
//
// When a sponsor has `center + radiusKm`, the user MUST be inside the circle
// for the sponsor to be eligible. Missing GPS coords → no geo-targeted match.
// When a sponsor has only `regions`, it matches via the bbox slug as before.
// When a sponsor has both, either match path is acceptable but radius-match
// still sorts to the top.
//
// Exposure-window format:
//   • Preferred: 'YYYY-MM-DD' (ISO 8601), e.g. '2026-02-17'.
//   • Also accepted: 'MM-DD-YYYY' and 'DD/MM/YYYY' for convenience when typing
//     contract dates, e.g. '02-17-2026' or '17/02/2026'. Parsed by parseDate()
//     below — invalid inputs are treated as if the field was omitted.
//   • Boundary semantics: the date is treated as the END of that day in the
//     user's local timezone. A sponsor with expiresAt='2026-02-17' stays
//     visible through 23:59:59 on Feb 17 and disappears on Feb 18.
//
// Known placement slots:
//   'info-panel-footer'  — SponsorSlot in InfoPanel below Sugestao
//   'info-panel-parceiros' — Phase 3 Parceiros accordion inside InfoPanel
//   'apoiar-grid'        — Phase 2 /apoiar page banner grid
//   'initiatives-footer' — below the initiatives registration page
//
// Banner assets live in /public/sponsors/ (see /public/sponsors/README.md).

import { Coordinates } from '../../domain/Coordinates';

export const PLACEMENTS = {
  INFO_PANEL_FOOTER: 'info-panel-footer',
  INFO_PANEL_PARCEIROS: 'info-panel-parceiros',
  APOIAR_GRID: 'apoiar-grid',
  INITIATIVES_FOOTER: 'initiatives-footer',
};

export const DESCRIPTION_MAX = 150;

export const SPONSORS = [
  {
    // Required ────────────────────────────────────────────
    id: 'apoie',
    img: '/sponsors/mapafome_sponsor.png',
    href: 'https://nubank.com.br/pagar/2i6kb/zRE5wsvEe2',
    alt: 'Apoie o MAPA FOME',
    label: 'Apoie o projeto',
    description: 'Sua marca aqui. Parte da receita vira marketing que traz mais voluntários para quem está esperando ajuda. Conheça a parceria.',
    placements: [
      PLACEMENTS.INFO_PANEL_FOOTER,
      PLACEMENTS.APOIAR_GRID,
      PLACEMENTS.INITIATIVES_FOOTER,
    ],

    // Targeting ───────────────────────────────────────────
    // Broad match via bbox slugs. '*' = show everywhere as a fallback.
    regions: ['*'],
    // Precise paid reach. Leave null for evergreen/global sponsors.
    // When set, the user's GPS must be within radiusKm of [lat, lng] and
    // this sponsor sorts above region-only matches.
    center: null,     // e.g. [-8.0671, -34.8767] — Recife center
    radiusKm: null,   // e.g. 3 — 3 km around `center`

    // Time exposure ───────────────────────────────────────
    // YYYY-MM-DD preferred. Also accepts MM-DD-YYYY and DD/MM/YYYY.
    // End-of-day local — paid day is fully honored.
    startsAt: null,   // e.g. '2026-01-15' — evergreen when null
    expiresAt: null,  // e.g. '2026-02-17' — never expires when null

    // Ranking ─────────────────────────────────────────────
    weight: 1,
  },

  // ── Example: paid geo + time-bounded slot (uncomment to ship) ──
  // {
  //   id: 'pizza-gentle',
  //   img: '/sponsors/pizza-gentle.png',
  //   href: 'https://pizzagentle.com.br',
  //   alt: 'Pizza Gentle — parceira do MAPA FOME',
  //   label: 'Pizza Gentle',
  //   description: 'A cada pedido em Boa Viagem, uma refeição vai para alguém mapeado aqui. Peça e ajude sem sair de casa.',
  //   placements: [PLACEMENTS.INFO_PANEL_FOOTER],
  //   regions: ['pe-recife'],
  //   center: [-8.1196, -34.9061], // Boa Viagem
  //   radiusKm: 3,
  //   startsAt: '2026-02-01',
  //   expiresAt: '2026-02-28',
  //   weight: 2,
  // },
];

// Lenient date parser for contract-style strings. Accepts:
//   • ISO 'YYYY-MM-DD' or full ISO with time/timezone
//   • US 'MM-DD-YYYY' (e.g. '02-17-2026')
//   • BR 'DD/MM/YYYY' (e.g. '17/02/2026')
// Returns a timestamp (ms) at END-OF-DAY local time, or NaN on parse failure.
// End-of-day so a sponsor paid through Feb 17 stays live the entire day.
export function parseDate(input) {
  if (input == null) return NaN;
  if (typeof input === 'number') return input;
  const s = String(input).trim();
  if (!s) return NaN;

  let y, m, d;
  let iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(T.*)?$/);
  if (iso) {
    y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]);
  } else {
    let us = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (us) {
      m = Number(us[1]); d = Number(us[2]); y = Number(us[3]);
    } else {
      let br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (br) {
        d = Number(br[1]); m = Number(br[2]); y = Number(br[3]);
      } else {
        const fallback = Date.parse(s);
        return Number.isFinite(fallback) ? fallback : NaN;
      }
    }
  }
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return NaN;
  // End-of-day local — sponsor stays live until midnight rolls over.
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  const t = dt.getTime();
  return Number.isFinite(t) ? t : NaN;
}

// True when the sponsor's exposure window contains `now` (or is evergreen).
// Missing startsAt = runs-from-anytime. Missing expiresAt = never expires.
// Unparseable dates are treated as missing — invoices are outside our code,
// we fail open on parse errors rather than blocking the render.
export function isActiveNow(sponsor, now = Date.now()) {
  const start = parseDate(sponsor && sponsor.startsAt);
  const end = parseDate(sponsor && sponsor.expiresAt);
  if (Number.isFinite(start) && now < start) return false;
  if (Number.isFinite(end) && now > end) return false;
  return true;
}

// Haversine, km — delegated to Coordinates.distanceKmTo (VM10), the single
// home of the formula. This thin wrapper keeps the tuple-in / Infinity-on-bad-
// input contract that isInsideReach relies on (Coordinates throws on a non-
// finite pair, so guard the tuples here and fail open to Infinity).
function distanceKm(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
  if (a.length !== 2 || b.length !== 2) return Infinity;
  if (![a[0], a[1], b[0], b[1]].every(Number.isFinite)) return Infinity;
  return Coordinates.fromTuple(a).distanceKmTo(Coordinates.fromTuple(b));
}

// True when the sponsor defines a paid geo reach AND the user is inside it.
// Returns false if the sponsor has no center/radius OR coords are missing.
export function isInsideReach(sponsor, userCoords) {
  if (!sponsor || !Array.isArray(sponsor.center) || !Number.isFinite(sponsor.radiusKm)) return false;
  if (!Array.isArray(userCoords) || userCoords.length !== 2) return false;
  return distanceKm(sponsor.center, userCoords) <= sponsor.radiusKm;
}

// Return all sponsors eligible for the given placement + region + user coords,
// ordered so that paid-reach radius matches appear first (that is their point),
// then by weight, descending. Expired/not-yet-started sponsors are filtered out.
//
// A sponsor qualifies if:
//   • placement matches AND time window matches AND
//   • user is inside its paid radius (if it defined center + radiusKm), OR
//   • it has a regions[] match for the resolved regionSlug (or '*')
// When both a radius and regions[] are provided, either path admits the sponsor
// but radius-matched sponsors always sort above region-only matches.
export function eligibleSponsors(placement, regionSlug, userCoords = null, now = Date.now()) {
  if (!Array.isArray(SPONSORS) || SPONSORS.length === 0) return [];
  return SPONSORS
    .filter((s) => {
      if (!Array.isArray(s.placements) || !s.placements.includes(placement)) return false;
      if (!isActiveNow(s, now)) return false;

      const hasReach = Array.isArray(s.center) && Number.isFinite(s.radiusKm);
      const insideReach = hasReach && isInsideReach(s, userCoords);
      const regionMatch = Array.isArray(s.regions)
        && (s.regions.includes(regionSlug) || s.regions.includes('*'));

      // If the sponsor only targets by reach, the user must be inside it.
      if (hasReach && !Array.isArray(s.regions)) return insideReach;
      return insideReach || regionMatch;
    })
    .map((s) => ({
      sponsor: s,
      reachHit: isInsideReach(s, userCoords),
    }))
    .sort((a, b) => {
      // Paid-reach matches sort first (true > false).
      if (a.reachHit !== b.reachHit) return a.reachHit ? -1 : 1;
      return (b.sponsor.weight ?? 1) - (a.sponsor.weight ?? 1);
    })
    .map((e) => e.sponsor);
}

export function pickSponsor(placement, regionSlug, userCoords = null, rng = Math.random, now = Date.now()) {
  const eligible = eligibleSponsors(placement, regionSlug, userCoords, now);
  if (eligible.length === 0) return null;
  const total = eligible.reduce((sum, s) => sum + (Number.isFinite(s.weight) ? s.weight : 1), 0);
  if (total <= 0) return eligible[0];
  let pick = rng() * total;
  for (const s of eligible) {
    pick -= Number.isFinite(s.weight) ? s.weight : 1;
    if (pick <= 0) return s;
  }
  return eligible[eligible.length - 1];
}

// Used at render time to respect the 150-char contract even if a sponsor
// entry slips through code review with a longer description. Never throws.
export function clampDescription(text) {
  const s = String(text || '');
  if (s.length <= DESCRIPTION_MAX) return s;
  return `${s.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}
