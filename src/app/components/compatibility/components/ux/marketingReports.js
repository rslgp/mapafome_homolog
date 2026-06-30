'use client';

// Marketing-report builder for sponsor companies. Separate surface from the
// public-policy reports at /relatorios because the audience is different:
//
//   • /relatorios        → Ministério Público, secretarias, pesquisa
//   • /relatorio-marketing → marcas que patrocinam slots (media kit,
//                            prestação de contas de campanha)
//
// Uses sheet rows to estimate reach (pin reports) within each sponsor's
// configured geo-reach + time window. No individual user tracking — this
// is an aggregate "audiência potencial" number, not per-device impressions.

import { SPONSORS, parseDate, isActiveNow } from './sponsors';
import { Coordinates } from '../../domain/Coordinates';
import { toCsv } from './csv';
import { K_ANON } from './reports';

// Small-cell suppression for a single per-campaign audience count. reports.js
// folds small buckets into an 'outros' sibling, but a campaign count is a lone
// scalar with no sibling to merge into, so the equivalent k-anonymity collapse
// is suppression: any precise geo+time bucket below K_ANON reads as 0 instead of
// surfacing a re-identifying 1, 2, 3, or 4 on the public page. Stays an integer,
// so the sponsor data contract (field names and types) is unchanged.
function kAnonCount(n, { minCount = K_ANON } = {}) {
  return n < minCount ? 0 : n;
}

// Haversine, km — delegated to Coordinates.distanceKmTo (VM10), the single
// home of the formula. Thin wrapper keeps the tuple-in / Infinity-on-bad-input
// contract the geo gate relies on (Coordinates throws on a non-finite pair, so
// guard the tuples here and fail open to Infinity).
function distanceKm(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
  if (a.length !== 2 || b.length !== 2) return Infinity;
  if (![a[0], a[1], b[0], b[1]].every(Number.isFinite)) return Infinity;
  return Coordinates.fromTuple(a).distanceKmTo(Coordinates.fromTuple(b));
}

function coordsOfRow(row) {
  try {
    const d = JSON.parse(row.Dados);
    // pet rows (/pets fork) carry Coordinates + DateISO too, but they are a
    // different domain — never count them in a sponsor's "audiência potencial"
    // reach. Returning the null shape makes the caller's loop skip the row.
    if (d && d.kind === 'pet') return { coords: null, dateIso: null, attended: false };
    if (!d || !d.Coordinates) return { coords: null, dateIso: null, attended: false };
    const c = JSON.parse(d.Coordinates);
    return {
      coords: Array.isArray(c) && c.length === 2 ? c : null,
      dateIso: d.DateISO || null,
      attended: Boolean(d.AlimentoEntregue) || Boolean(d.AttendedAt),
    };
  } catch (_e) {
    return { coords: null, dateIso: null, attended: false };
  }
}

// Compute per-sponsor reach inside their geo-window-and-time-window:
// audiencia_potencial = pins reported in the sponsor's radius during
// [startsAt, expiresAt]. audiencia_engajada = pins attended inside the
// window (proxy for donor interactions). impressoes_ate_hoje and
// pode_aumentar give a status picture for the campaign so far.
function sponsorReach(sponsor, pins, now) {
  const start = parseDate(sponsor.startsAt);
  const end = parseDate(sponsor.expiresAt);
  const hasWindow = Number.isFinite(start) || Number.isFinite(end);
  const hasGeo = Array.isArray(sponsor.center) && Number.isFinite(sponsor.radiusKm);

  let potencial = 0;
  let engajada = 0;
  let noPeriodoSoFar = 0;
  let engajadaSoFar = 0;

  for (const p of pins) {
    if (!p.coords) continue;
    if (!p.dateIso) continue;

    // Geo gate.
    if (hasGeo) {
      const km = distanceKm(sponsor.center, p.coords);
      if (km > sponsor.radiusKm) continue;
    }

    // Window gate.
    const ts = Date.parse(p.dateIso);
    if (!Number.isFinite(ts)) continue;
    if (Number.isFinite(start) && ts < start) continue;
    if (Number.isFinite(end) && ts > end) continue;

    potencial += 1;
    if (p.attended) engajada += 1;

    if (ts <= now) {
      noPeriodoSoFar += 1;
      if (p.attended) engajadaSoFar += 1;
    }
  }

  // k-anonymity: collapse each per-campaign count below K_ANON to 0 so a
  // narrow-radius, short-window campaign can never surface a count of 1, 2, 3,
  // or 4 (a precise geo+time bucket) on the public page. Same K_ANON=5 threshold
  // as reports.js; see kAnonCount above.
  return {
    hasWindow,
    hasGeo,
    audiencia_potencial_no_periodo: kAnonCount(potencial),
    audiencia_engajada_no_periodo: kAnonCount(engajada),
    ate_agora_no_periodo: kAnonCount(noPeriodoSoFar),
    atendidos_no_periodo_ate_agora: kAnonCount(engajadaSoFar),
    pode_aumentar: Number.isFinite(end) ? (now < end) : true,
  };
}

function sponsorStatus(sponsor, now) {
  const active = isActiveNow(sponsor, now);
  const start = parseDate(sponsor.startsAt);
  const end = parseDate(sponsor.expiresAt);
  if (active) return 'ativo';
  if (Number.isFinite(start) && now < start) return 'aguardando-inicio';
  if (Number.isFinite(end) && now > end) return 'expirado';
  return 'ativo';
}

function fmtDate(t) {
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return d.toISOString().slice(0, 10);
}

export function buildMarketingReport(rows, { now = Date.now() } = {}) {
  const pins = (Array.isArray(rows) ? rows : []).map(coordsOfRow).filter((p) => p.coords);

  const sponsors = (Array.isArray(SPONSORS) ? SPONSORS : []).map((s) => {
    const reach = sponsorReach(s, pins, now);
    return {
      id: s.id,
      label: s.label || s.id,
      placements: s.placements || [],
      regioes: s.regions || [],
      centro: Array.isArray(s.center) ? s.center : null,
      raio_km: Number.isFinite(s.radiusKm) ? s.radiusKm : null,
      inicio: fmtDate(parseDate(s.startsAt)),
      fim: fmtDate(parseDate(s.expiresAt)),
      status: sponsorStatus(s, now),
      ...reach,
    };
  });

  const totalPotencial = sponsors.reduce((a, s) => a + s.audiencia_potencial_no_periodo, 0);
  const totalAteAgora = sponsors.reduce((a, s) => a + s.ate_agora_no_periodo, 0);
  const totalEngajada = sponsors.reduce((a, s) => a + s.audiencia_engajada_no_periodo, 0);

  return {
    meta: {
      gerado_em: new Date(now).toISOString(),
      nota:
        'Audiência potencial = quantos pontos de necessidade foram reportados '
        + 'dentro do raio e janela de tempo de cada patrocínio. É um número '
        + 'agregado, não rastreia usuários individuais. '
        + 'Audiência engajada = desses pontos, quantos foram atendidos por um voluntário.',
      anti_rastreamento: 'Nenhum identificador pessoal ou device id é usado. Zero tracking pixel.',
    },
    resumo: {
      patrocinios_ativos: sponsors.filter((s) => s.status === 'ativo').length,
      patrocinios_expirados: sponsors.filter((s) => s.status === 'expirado').length,
      patrocinios_agendados: sponsors.filter((s) => s.status === 'aguardando-inicio').length,
      audiencia_potencial_total: totalPotencial,
      audiencia_potencial_ate_agora: totalAteAgora,
      audiencia_engajada_total: totalEngajada,
    },
    campanhas: sponsors,
  };
}

// Field escape + row serialization live in ./csv (toCsv); this serializer only
// builds its header + data rows.

export function toCsvCampanhas(report) {
  const rows = [[
    'id', 'label', 'status', 'inicio', 'fim',
    'centro_lat', 'centro_lng', 'raio_km',
    'placements', 'regioes',
    'audiencia_potencial_no_periodo', 'audiencia_engajada_no_periodo',
    'ate_agora_no_periodo', 'atendidos_no_periodo_ate_agora',
  ]];
  for (const c of (report.campanhas || [])) {
    rows.push([
      c.id, c.label, c.status, c.inicio ?? '', c.fim ?? '',
      c.centro ? c.centro[0] : '', c.centro ? c.centro[1] : '',
      c.raio_km ?? '',
      (c.placements || []).join('|'),
      (c.regioes || []).join('|'),
      c.audiencia_potencial_no_periodo, c.audiencia_engajada_no_periodo,
      c.ate_agora_no_periodo, c.atendidos_no_periodo_ate_agora,
    ]);
  }
  return toCsv(rows);
}
