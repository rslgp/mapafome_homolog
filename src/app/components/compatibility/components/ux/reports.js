'use client';

// Aggregate-report builder for public-policy use (Ministério Público,
// secretarias de SAN, direitos humanos).
//
// Dignity / LGPD contract:
//   • NEVER expose raw coordinates, reporter contact, telefone, redes sociais,
//     or any field that could re-identify a mapped person.
//   • Buckets: region slug (via regionResolver bbox) + month (YYYY-MM).
//   • Small buckets are merged into 'outros' below k=5 so a single pin can
//     never be isolated through cross-referencing region + category + month.
//
// Source: rows from Google Sheets with a `Dados` JSON blob.
// Output: plain JS objects. Serialize to JSON or CSV via the helpers below.

import { resolveRegion } from './regionResolver';
import { csvEsc } from './csv';
import { NEED_CATEGORIES } from './needCategories';

const K_ANON = 5;

// Legend for the public aggregate. The reporter-need labels come from the
// needCategories SOT (so disaster needs added there — remédios/animais/carregar
// — are documented in the report too). The two legacy food SUBTYPES below are
// report-only buckets derived from legacy Roaster rows; they have no reporter
// chip, so they are spelled out here.
const CATEGORY_LABELS = {
  ...Object.fromEntries(NEED_CATEGORIES.map((c) => [c.id, c.reportLabel])),
  alimento_pronto: 'Alimento pronto (refeição imediata)',
  cesta_basica: 'Cesta básica (suprimento semanal)',
};

// Legacy Roaster values mapped to reporter-pin semantics. Donor/initiative
// rows are excluded — reports describe the reporter surface (people in need),
// not distribution endpoints.
const LEGACY_NEED_ROASTERS = new Set(['Alimento pronto', 'CestaBasica', 'MoradorRua']);

function parseRow(row) {
  try { return JSON.parse(row.Dados); } catch (_e) { return null; }
}

function isReporterPin(d) {
  if (!d) return false;
  if (Array.isArray(d.Categorias) && d.Categorias.length > 0) return true;
  return LEGACY_NEED_ROASTERS.has(d.Roaster);
}

// Preserve the legacy distinction between 'Alimento pronto' and 'CestaBasica'
// because they activate different public policies:
//   • alimento pronto → emergency / population in street situation
//   • cesta basica    → household food security (Bolsa Família, cartão alimentação)
// Generic 'MoradorRua' from the M1 flow stays aggregated under its Categorias[]
// array, which already carries finer-grained categories (comida/agua/…).
function categoriesOf(d) {
  if (Array.isArray(d.Categorias) && d.Categorias.length > 0) return d.Categorias;
  if (d.Roaster === 'Alimento pronto') return ['alimento_pronto'];
  if (d.Roaster === 'CestaBasica') return ['cesta_basica'];
  if (d.Roaster === 'MoradorRua') return ['comida'];
  return [];
}

// Specifically the food-need subtype, used for the vulnerability report.
// Returns 'alimento_pronto' | 'cesta_basica' | 'generico' | null.
function foodSubtype(d) {
  if (d.Roaster === 'Alimento pronto') return 'alimento_pronto';
  if (d.Roaster === 'CestaBasica') return 'cesta_basica';
  const cats = Array.isArray(d.Categorias) ? d.Categorias : [];
  if (cats.includes('alimento_pronto')) return 'alimento_pronto';
  if (cats.includes('cesta_basica')) return 'cesta_basica';
  if (cats.includes('comida') || d.Roaster === 'MoradorRua') return 'generico';
  return null;
}

function coordsOf(d) {
  if (!d || !d.Coordinates) return null;
  try {
    const c = JSON.parse(d.Coordinates);
    return Array.isArray(c) && c.length === 2 ? c : null;
  } catch (_e) { return null; }
}

function monthKey(iso) {
  if (!iso) return 'sem-data';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'sem-data';
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addCount(map, key, n = 1) {
  map.set(key, (map.get(key) || 0) + n);
}

function toObj(map) {
  const obj = {};
  for (const [k, v] of map) obj[k] = v;
  return obj;
}

// Small-bucket collapse: counts below K_ANON merge into 'outros'.
function kAnonymize(obj, { minCount = K_ANON } = {}) {
  const out = {};
  let stashed = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (v < minCount) stashed += v;
    else out[k] = v;
  }
  if (stashed > 0) out.outros = (out.outros || 0) + stashed;
  return out;
}

// ────────────────────────────────────────────────────────────
// Report builders

const WEEKDAY_LABELS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function buildReport(rows, { now = Date.now() } = {}) {
  const pins = (Array.isArray(rows) ? rows : [])
    .map(parseRow)
    .filter(isReporterPin);

  const byCategoryMonth = new Map();
  const byRegionMonth = new Map();
  const responseTimesH = [];
  const attendanceByRegion = new Map();

  // ── M8/5 extras for public-policy use ────────────────────
  const byWeekday = new Map(); // 0..6 → count
  const byHour = new Map();    // 0..23 → count
  const byCategoryTotal = new Map(); // category → total count (cross-period demand)
  const byRegionCategoryTotal = new Map(); // `${region}|${cat}` → count (for heat-of-need tables)
  const monthTotal = new Map(); // month → count (for growth deltas)
  let unattendedOver24h = 0;
  let unattendedOver72h = 0;
  let attendedTotal = 0;

  // Food-vulnerability subtype breakdown by region — directly answers
  // "onde estão as pessoas em vulnerabilidade que precisam de alimento
  // pronto ou cesta básica?", which activates different public policies.
  const vulnerabilityByRegion = new Map(); // region → { alimento_pronto, cesta_basica, generico, total, attended }

  for (const d of pins) {
    const month = monthKey(d.DateISO);
    const cats = categoriesOf(d);
    const coords = coordsOf(d);
    const region = coords ? resolveRegion(coords) : 'sem-regiao';
    const attended = Boolean(d.AlimentoEntregue) || Boolean(d.AttendedAt);
    const ts = d.DateISO ? Date.parse(d.DateISO) : NaN;
    const ageH = Number.isFinite(ts) ? (now - ts) / 36e5 : null;

    for (const c of cats) {
      addCount(byCategoryMonth, `${c}|${month}`);
      addCount(byCategoryTotal, c);
      addCount(byRegionCategoryTotal, `${region}|${c}`);
    }
    addCount(byRegionMonth, `${region}|${month}`);
    addCount(monthTotal, month);

    if (Number.isFinite(ts)) {
      const dt = new Date(ts);
      addCount(byWeekday, dt.getDay());
      addCount(byHour, dt.getHours());
    }

    if (attended) attendedTotal += 1;
    if (!attended && ageH != null && ageH >= 24) unattendedOver24h += 1;
    if (!attended && ageH != null && ageH >= 72) unattendedOver72h += 1;

    const sub = foodSubtype(d);
    if (sub) {
      const vrec = vulnerabilityByRegion.get(region)
        || { alimento_pronto: 0, cesta_basica: 0, generico: 0, total: 0, atendidos: 0 };
      vrec[sub] += 1;
      vrec.total += 1;
      if (attended) vrec.atendidos += 1;
      vulnerabilityByRegion.set(region, vrec);
    }

    const rec = attendanceByRegion.get(region) || { total: 0, attended: 0 };
    rec.total += 1;
    if (attended) rec.attended += 1;
    attendanceByRegion.set(region, rec);

    if (attended && d.DateISO && d.AttendedAt) {
      const dt = (Date.parse(d.AttendedAt) - Date.parse(d.DateISO)) / 36e5;
      if (Number.isFinite(dt) && dt >= 0 && dt <= 24 * 30) responseTimesH.push(dt);
    }
  }

  const byCategory = {};
  for (const [k, v] of byCategoryMonth) {
    const [cat, month] = k.split('|');
    byCategory[cat] = byCategory[cat] || {};
    byCategory[cat][month] = v;
  }
  const byRegion = {};
  for (const [k, v] of byRegionMonth) {
    const [region, month] = k.split('|');
    byRegion[region] = byRegion[region] || {};
    byRegion[region][month] = v;
  }
  for (const cat of Object.keys(byCategory)) byCategory[cat] = kAnonymize(byCategory[cat]);
  for (const region of Object.keys(byRegion)) byRegion[region] = kAnonymize(byRegion[region]);

  const attendance = {};
  for (const [region, rec] of attendanceByRegion) {
    const rate = rec.total > 0 ? rec.attended / rec.total : 0;
    attendance[region] = {
      total: rec.total,
      atendidos: rec.attended,
      taxa_atendimento: Number(rate.toFixed(3)),
    };
  }

  responseTimesH.sort((a, b) => a - b);
  const percentile = (p) => {
    if (responseTimesH.length === 0) return null;
    const idx = Math.min(responseTimesH.length - 1, Math.floor(p * responseTimesH.length));
    return Number(responseTimesH[idx].toFixed(2));
  };

  // Weekly + daily seasonality — useful for shift planning of public rede de SAN.
  const sazonalidade_dia_semana = {};
  for (let i = 0; i < 7; i += 1) sazonalidade_dia_semana[WEEKDAY_LABELS[i]] = byWeekday.get(i) || 0;
  const sazonalidade_hora_dia = {};
  for (let h = 0; h < 24; h += 1) sazonalidade_hora_dia[String(h).padStart(2, '0')] = byHour.get(h) || 0;

  // Month-over-month growth — tracks whether the SAN crisis is worsening.
  const sortedMonths = [...monthTotal.keys()].filter((k) => k !== 'sem-data').sort();
  const crescimento_mensal = [];
  for (let i = 0; i < sortedMonths.length; i += 1) {
    const m = sortedMonths[i];
    const total = monthTotal.get(m) || 0;
    const prev = i > 0 ? (monthTotal.get(sortedMonths[i - 1]) || 0) : null;
    const delta = prev != null ? total - prev : null;
    const deltaPct = prev && prev > 0 ? Number(((delta / prev) * 100).toFixed(1)) : null;
    crescimento_mensal.push({ mes: m, total, delta, delta_pct: deltaPct });
  }

  // Region × category heatmap of demand — where which need concentrates.
  const demanda_regiao_categoria = {};
  for (const [k, v] of byRegionCategoryTotal) {
    const [region, cat] = k.split('|');
    demanda_regiao_categoria[region] = demanda_regiao_categoria[region] || {};
    demanda_regiao_categoria[region][cat] = v;
  }
  for (const region of Object.keys(demanda_regiao_categoria)) {
    demanda_regiao_categoria[region] = kAnonymize(demanda_regiao_categoria[region]);
  }

  // Category demand share — which needs dominate, for budget prioritization.
  const categoriasTotal = Object.fromEntries(byCategoryTotal);
  const totalCategoriaCount = Object.values(categoriasTotal).reduce((s, v) => s + v, 0);
  const distribuicao_categorias = Object.fromEntries(
    Object.entries(categoriasTotal).map(([c, v]) => [
      c,
      { total: v, share_pct: totalCategoriaCount > 0 ? Number(((v / totalCategoriaCount) * 100).toFixed(1)) : 0 },
    ]),
  );

  // Headline KPIs for executive summary.
  const total = pins.length;
  const alerta_pontos_sem_atendimento = {
    acima_de_24h: unattendedOver24h,
    acima_de_72h: unattendedOver72h,
    share_acima_24h_pct: total > 0 ? Number(((unattendedOver24h / total) * 100).toFixed(1)) : 0,
  };
  const taxa_atendimento_global_pct = total > 0
    ? Number(((attendedTotal / total) * 100).toFixed(1))
    : 0;

  return {
    meta: {
      gerado_em: new Date(now).toISOString(),
      total_pontos_reportados: total,
      nota_dignidade:
        'Nenhum dado pessoal ou coordenada individual nesta agregação. ' +
        'Grupos < 5 foram consolidados em "outros" para evitar reidentificação.',
      legenda_categorias: CATEGORY_LABELS,
    },
    resumo_executivo: {
      total_pontos_reportados: total,
      total_atendidos: attendedTotal,
      taxa_atendimento_global_pct,
      tempo_mediano_atendimento_h: percentile(0.5),
      tempo_p90_atendimento_h: percentile(0.9),
      pontos_sem_atendimento_24h: unattendedOver24h,
    },
    pontos_por_categoria_mes: byCategory,
    pontos_por_regiao_mes: byRegion,
    atendimento_por_regiao: attendance,
    tempo_atendimento_horas: {
      amostra: responseTimesH.length,
      p50: percentile(0.5),
      p90: percentile(0.9),
      max_30d_filtrado: true,
    },
    sazonalidade_dia_semana,
    sazonalidade_hora_dia,
    crescimento_mensal,
    crescimento_mapafome: (() => {
      // Composite growth series: cumulative pins, regions reached per month,
      // attendance rate per month. Useful for public narrative ("o projeto
      // cresceu X%") and for impact storytelling em editais + comunicação.
      const monthsSorted = [...monthTotal.keys()].filter((k) => k !== 'sem-data').sort();

      // Attended per month (for monthly taxa de atendimento).
      const attendedPerMonth = new Map();
      // Active regions per month (distinct count).
      const regionsPerMonth = new Map();

      for (const d of pins) {
        const m = monthKey(d.DateISO);
        if (m === 'sem-data') continue;
        if (Boolean(d.AlimentoEntregue) || Boolean(d.AttendedAt)) {
          addCount(attendedPerMonth, m);
        }
        const coords = coordsOf(d);
        const region = coords ? resolveRegion(coords) : 'sem-regiao';
        if (!regionsPerMonth.has(m)) regionsPerMonth.set(m, new Set());
        regionsPerMonth.get(m).add(region);
      }

      let acumulado = 0;
      const series = monthsSorted.map((m) => {
        const novos = monthTotal.get(m) || 0;
        acumulado += novos;
        const atend = attendedPerMonth.get(m) || 0;
        const taxa = novos > 0 ? Number(((atend / novos) * 100).toFixed(1)) : 0;
        const regs = regionsPerMonth.get(m) ? regionsPerMonth.get(m).size : 0;
        return {
          mes: m,
          novos_pontos: novos,
          pontos_acumulado: acumulado,
          atendidos_no_mes: atend,
          taxa_atendimento_mes_pct: taxa,
          regioes_ativas_no_mes: regs,
        };
      });

      // Headline: overall growth from first active month to latest.
      const first = series[0];
      const last = series[series.length - 1];
      const crescimento_total_pct = (first && last && first.pontos_acumulado > 0)
        ? Number((((last.pontos_acumulado - first.pontos_acumulado) / first.pontos_acumulado) * 100).toFixed(1))
        : null;

      return {
        resumo: {
          meses_ativos: series.length,
          total_pontos: last ? last.pontos_acumulado : 0,
          crescimento_total_pct,
          regioes_ativas_total: (() => {
            const s = new Set();
            for (const set of regionsPerMonth.values()) for (const r of set) s.add(r);
            return s.size;
          })(),
        },
        serie_mensal: series,
      };
    })(),
    demanda_regiao_categoria,
    distribuicao_categorias,
    alerta_pontos_sem_atendimento,
    vulnerabilidade_alimentar_por_regiao: Object.fromEntries(
      [...vulnerabilityByRegion.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([region, rec]) => [region, {
          alimento_pronto: rec.alimento_pronto,
          cesta_basica: rec.cesta_basica,
          comida_generico: rec.generico,
          total: rec.total,
          atendidos: rec.atendidos,
          taxa_atendimento: rec.total > 0 ? Number((rec.atendidos / rec.total).toFixed(3)) : 0,
        }]),
    ),
  };
}

// ────────────────────────────────────────────────────────────
// CSV serializers — one per section. Field escape lives in ./csv (csvEsc);
// aliased so the per-row `r.map(esc)` call sites stay byte-for-byte unchanged.

const esc = csvEsc;

export function toCsvCategoryMonth(report) {
  const rows = [['categoria', 'mes', 'pontos']];
  const data = report.pontos_por_categoria_mes || {};
  for (const [cat, series] of Object.entries(data)) {
    for (const [month, count] of Object.entries(series)) {
      rows.push([cat, month, count]);
    }
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvRegionMonth(report) {
  const rows = [['regiao', 'mes', 'pontos']];
  const data = report.pontos_por_regiao_mes || {};
  for (const [region, series] of Object.entries(data)) {
    for (const [month, count] of Object.entries(series)) {
      rows.push([region, month, count]);
    }
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvAttendance(report) {
  const rows = [['regiao', 'pontos_reportados', 'pontos_atendidos', 'taxa_atendimento']];
  const data = report.atendimento_por_regiao || {};
  for (const [region, rec] of Object.entries(data)) {
    rows.push([region, rec.total, rec.atendidos, rec.taxa_atendimento]);
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvWeekday(report) {
  const rows = [['dia_semana', 'pontos']];
  for (const [day, n] of Object.entries(report.sazonalidade_dia_semana || {})) rows.push([day, n]);
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvHour(report) {
  const rows = [['hora', 'pontos']];
  for (const [h, n] of Object.entries(report.sazonalidade_hora_dia || {})) rows.push([h, n]);
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvGrowth(report) {
  const rows = [['mes', 'total', 'delta', 'delta_pct']];
  for (const g of (report.crescimento_mensal || [])) {
    rows.push([g.mes, g.total, g.delta ?? '', g.delta_pct ?? '']);
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvDemandRegionCategory(report) {
  const rows = [['regiao', 'categoria', 'pontos']];
  for (const [region, cats] of Object.entries(report.demanda_regiao_categoria || {})) {
    for (const [cat, n] of Object.entries(cats)) rows.push([region, cat, n]);
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvCategoryShare(report) {
  const rows = [['categoria', 'total', 'share_pct']];
  for (const [cat, rec] of Object.entries(report.distribuicao_categorias || {})) {
    rows.push([cat, rec.total, rec.share_pct]);
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvGrowthMapaFome(report) {
  const rows = [['mes', 'novos_pontos', 'pontos_acumulado', 'atendidos_no_mes', 'taxa_atendimento_mes_pct', 'regioes_ativas_no_mes']];
  const g = report.crescimento_mapafome;
  if (g && Array.isArray(g.serie_mensal)) {
    for (const s of g.serie_mensal) {
      rows.push([s.mes, s.novos_pontos, s.pontos_acumulado, s.atendidos_no_mes, s.taxa_atendimento_mes_pct, s.regioes_ativas_no_mes]);
    }
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function toCsvVulnerability(report) {
  const rows = [['regiao', 'alimento_pronto', 'cesta_basica', 'comida_generico', 'total', 'atendidos', 'taxa_atendimento']];
  const data = report.vulnerabilidade_alimentar_por_regiao || {};
  for (const [region, rec] of Object.entries(data)) {
    rows.push([region, rec.alimento_pronto, rec.cesta_basica, rec.comida_generico, rec.total, rec.atendidos, rec.taxa_atendimento]);
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
