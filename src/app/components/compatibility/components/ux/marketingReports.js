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

const R_EARTH_KM = 6371;

function distanceKm(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
  if (a.length !== 2 || b.length !== 2) return Infinity;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Infinity;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R_EARTH_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function coordsOfRow(row) {
  try {
    const d = JSON.parse(row.Dados);
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

  return {
    hasWindow,
    hasGeo,
    audiencia_potencial_no_periodo: potencial,
    audiencia_engajada_no_periodo: engajada,
    ate_agora_no_periodo: noPeriodoSoFar,
    atendidos_no_periodo_ate_agora: engajadaSoFar,
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

function esc(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

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
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
