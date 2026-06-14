'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import './relatorios.css';
import {
  buildReport,
  toCsvCategoryMonth,
  toCsvRegionMonth,
  toCsvAttendance,
  toCsvWeekday,
  toCsvHour,
  toCsvGrowth,
  toCsvDemandRegionCategory,
  toCsvCategoryShare,
  toCsvVulnerability,
  toCsvGrowthMapaFome,
} from '../components/compatibility/components/ux/reports';
import { downloadBlob } from '../components/compatibility/components/ux/downloadBlob';
import { t, useLocale } from '../components/compatibility/components/ux/strings';

// Public-interest aggregate reports surface. Intended for:
//   • Ministério Público (SAN / direitos humanos)
//   • Secretarias de saúde municipais e estaduais
//   • Organizações parceiras em segurança alimentar
//
// Fetches the Google Sheet client-side using the same NEXT_PUBLIC_* creds
// the rest of the app already uses. All data shown here is aggregated —
// no PII, no raw coordinates, k-anonymized at k=5. See reports.js.

export default function RelatoriosPage() {
  useLocale(); // re-render on locale change so t() re-reads
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { GoogleSpreadsheet } = await import('google-spreadsheet');
      const doc = new GoogleSpreadsheet(process.env.NEXT_PUBLIC_GOOGLESHEETID);
      await doc.useServiceAccountAuth({
        client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
      });
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      setReport(buildReport(rows));
      setStatus('ready');
    } catch (e) {
      console.error('[relatorios] load failed:', e);
      setError(e && e.message);
      setStatus('error');
    }
  }, []);

  // Fetch-on-mount of external data (Google Sheet) — the React-sanctioned use of
  // an effect (synchronizing with an external system). `load` is reused by the
  // retry button, so its internal status resets must stay; the setState here is
  // intentional, not a derivable value.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- external data fetch on mount; load() is also the retry handler
  useEffect(() => { load(); }, [load]);

  function exportJson() {
    if (!report) return;
    downloadBlob(
      `mapafome-relatorio-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2),
      'application/json',
    );
  }

  function exportCsv(kind) {
    if (!report) return;
    const date = new Date().toISOString().slice(0, 10);
    const serializers = {
      'categoria-mes': toCsvCategoryMonth,
      'regiao-mes': toCsvRegionMonth,
      'atendimento': toCsvAttendance,
      'dia-semana': toCsvWeekday,
      'hora-dia': toCsvHour,
      'crescimento-mensal': toCsvGrowth,
      'demanda-regiao-categoria': toCsvDemandRegionCategory,
      'distribuicao-categorias': toCsvCategoryShare,
      'vulnerabilidade-alimentar': toCsvVulnerability,
      'crescimento-mapafome': toCsvGrowthMapaFome,
    };
    const fn = serializers[kind];
    if (!fn) return;
    downloadBlob(`mapafome-${kind}-${date}.csv`, fn(report), 'text/csv');
  }

  return (
    <main className="mdf-reports">
      <Link href="/" className="mdf-reports__back">{t('page.reports.back')}</Link>
      <h1>{t('page.reports.title')}</h1>
      <p className="mdf-reports__lead">
        {t('page.reports.lead')}
      </p>
      <p className="mdf-reports__dignity">
        {t('page.reports.dignity_lead')}<em>{t('page.reports.dignity_others')}</em>{t('page.reports.dignity_tail')}
      </p>

      {status === 'loading' && <p className="mdf-reports__status">{t('page.reports.loading')}</p>}
      {status === 'error' && (
        <div className="mdf-reports__status mdf-reports__status--error" role="alert">
          {t('page.reports.error')}
          {error ? <> {t('page.reports.error_detail')} <code>{error}</code></> : null}
          <button type="button" className="mdf-reports__retry" onClick={load}>
            {t('page.reports.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && report && (
        <>
          <section className="mdf-reports__section">
            <h2>{t('page.reports.exec_title')}</h2>
            <dl className="mdf-reports__kv">
              <dt>{t('page.reports.exec_generated')}</dt>
              <dd>{new Date(report.meta.gerado_em).toLocaleString('pt-BR')}</dd>
              <dt>{t('page.reports.exec_total_reported')}</dt>
              <dd>{report.resumo_executivo.total_pontos_reportados}</dd>
              <dt>{t('page.reports.exec_total_attended')}</dt>
              <dd>{report.resumo_executivo.total_atendidos}</dd>
              <dt>{t('page.reports.exec_global_rate')}</dt>
              <dd>{report.resumo_executivo.taxa_atendimento_global_pct}%</dd>
              <dt>{t('page.reports.exec_median_time')}</dt>
              <dd>{report.resumo_executivo.tempo_mediano_atendimento_h != null ? `${report.resumo_executivo.tempo_mediano_atendimento_h} h` : '—'}</dd>
              <dt>{t('page.reports.exec_p90_time')}</dt>
              <dd>{report.resumo_executivo.tempo_p90_atendimento_h != null ? `${report.resumo_executivo.tempo_p90_atendimento_h} h` : '—'}</dd>
              <dt>{t('page.reports.exec_unattended_24h')}</dt>
              <dd>{report.resumo_executivo.pontos_sem_atendimento_24h}</dd>
            </dl>
          </section>

          <section className="mdf-reports__section mdf-reports__section--pri">
            <h2>{t('page.reports.vuln_title')}</h2>
            <p className="mdf-reports__caption">
              {t('page.reports.vuln_caption_lead')}<b>{t('page.reports.vuln_ready_food')}</b>{t('page.reports.vuln_caption_mid')}<b>{t('page.reports.vuln_basket')}</b>{t('page.reports.vuln_caption_tail')}
            </p>
            <table className="mdf-reports__table">
              <thead>
                <tr>
                  <th>{t('page.reports.col_region')}</th>
                  <th>{t('page.reports.vuln_ready_food')}</th>
                  <th>{t('page.reports.vuln_basket')}</th>
                  <th>{t('page.reports.vuln_generic')}</th>
                  <th>{t('page.reports.col_total')}</th>
                  <th>{t('page.reports.col_attended')}</th>
                  <th>{t('page.reports.col_rate')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.vulnerabilidade_alimentar_por_regiao || {}).map(([region, rec]) => (
                  <tr key={region}>
                    <td>{region}</td>
                    <td>{rec.alimento_pronto}</td>
                    <td>{rec.cesta_basica}</td>
                    <td>{rec.comida_generico}</td>
                    <td><b>{rec.total}</b></td>
                    <td>{rec.atendidos}</td>
                    <td>{(rec.taxa_atendimento * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mdf-reports__caption">
              {t('page.reports.vuln_policy_lead')}<em>{t('page.reports.vuln_policy_ready')}</em>{t('page.reports.vuln_policy_mid')}{' '}
              <em>{t('page.reports.vuln_policy_basket')}</em>{t('page.reports.vuln_policy_tail')}
            </p>
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.dist_title')}</h2>
            <p className="mdf-reports__caption">
              {t('page.reports.dist_caption')}
            </p>
            <table className="mdf-reports__table">
              <thead>
                <tr><th>{t('page.reports.col_category')}</th><th>{t('page.reports.col_total')}</th><th>{t('page.reports.col_share')}</th></tr>
              </thead>
              <tbody>
                {Object.entries(report.distribuicao_categorias).map(([cat, rec]) => (
                  <tr key={cat}>
                    <td>{report.meta.legenda_categorias[cat] || cat}</td>
                    <td>{rec.total}</td>
                    <td>{rec.share_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.growth_mf_title')}</h2>
            <p className="mdf-reports__caption">
              {t('page.reports.growth_mf_caption')}
            </p>
            {report.crescimento_mapafome && (
              <>
                <dl className="mdf-reports__kv">
                  <dt>{t('page.reports.growth_active_months')}</dt>
                  <dd>{report.crescimento_mapafome.resumo.meses_ativos}</dd>
                  <dt>{t('page.reports.growth_total_accum')}</dt>
                  <dd>{report.crescimento_mapafome.resumo.total_pontos}</dd>
                  <dt>{t('page.reports.growth_regions_reached')}</dt>
                  <dd>{report.crescimento_mapafome.resumo.regioes_ativas_total}</dd>
                  <dt>{t('page.reports.growth_total_growth')}</dt>
                  <dd>{report.crescimento_mapafome.resumo.crescimento_total_pct == null ? '—' : `${report.crescimento_mapafome.resumo.crescimento_total_pct}%`}</dd>
                </dl>
                <table className="mdf-reports__table">
                  <caption>{t('page.reports.growth_series_caption')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('page.reports.col_month')}</th>
                      <th scope="col">{t('page.reports.col_new')}</th>
                      <th scope="col">{t('page.reports.col_accum')}</th>
                      <th scope="col">{t('page.reports.col_attended')}</th>
                      <th scope="col">{t('page.reports.col_rate_short')}</th>
                      <th scope="col">{t('page.reports.col_active_regions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.crescimento_mapafome.serie_mensal.map((s) => (
                      <tr key={s.mes}>
                        <td>{s.mes}</td>
                        <td>{s.novos_pontos}</td>
                        <td><b>{s.pontos_acumulado}</b></td>
                        <td>{s.atendidos_no_mes}</td>
                        <td>{s.taxa_atendimento_mes_pct}%</td>
                        <td>{s.regioes_ativas_no_mes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.growth_mom_title')}</h2>
            <p className="mdf-reports__caption">
              {t('page.reports.growth_mom_caption')}
            </p>
            <table className="mdf-reports__table">
              <thead>
                <tr><th>{t('page.reports.col_month')}</th><th>{t('page.reports.col_total')}</th><th>{t('page.reports.col_delta_abs')}</th><th>{t('page.reports.col_delta_pct')}</th></tr>
              </thead>
              <tbody>
                {report.crescimento_mensal.map((g) => (
                  <tr key={g.mes}>
                    <td>{g.mes}</td>
                    <td>{g.total}</td>
                    <td>{g.delta == null ? '—' : (g.delta > 0 ? `+${g.delta}` : g.delta)}</td>
                    <td>{g.delta_pct == null ? '—' : `${g.delta_pct > 0 ? '+' : ''}${g.delta_pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.weekly_title')}</h2>
            <p className="mdf-reports__caption">
              {t('page.reports.weekly_caption')}
            </p>
            <table className="mdf-reports__table">
              <thead><tr><th>{t('page.reports.col_day')}</th><th>{t('page.reports.col_points')}</th></tr></thead>
              <tbody>
                {Object.entries(report.sazonalidade_dia_semana).map(([d, n]) => (
                  <tr key={d}><td>{d}</td><td>{n}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.hourly_title')}</h2>
            <p className="mdf-reports__caption">
              {t('page.reports.hourly_caption')}
            </p>
            <table className="mdf-reports__table">
              <thead><tr><th>{t('page.reports.col_hour')}</th><th>{t('page.reports.col_points')}</th></tr></thead>
              <tbody>
                {Object.entries(report.sazonalidade_hora_dia).map(([h, n]) => (
                  <tr key={h}><td>{h}:00</td><td>{n}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.demand_title')}</h2>
            <p className="mdf-reports__caption">
              {t('page.reports.demand_caption')}
            </p>
            <table className="mdf-reports__table">
              <thead><tr><th>{t('page.reports.col_region')}</th><th>{t('page.reports.col_category')}</th><th>{t('page.reports.col_points')}</th></tr></thead>
              <tbody>
                {Object.entries(report.demanda_regiao_categoria).flatMap(([region, cats]) =>
                  Object.entries(cats).map(([cat, n]) => (
                    <tr key={`${region}-${cat}`}>
                      <td>{region}</td>
                      <td>{report.meta.legenda_categorias[cat] || cat}</td>
                      <td>{n}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section mdf-reports__section--alert">
            <h2>{t('page.reports.alerts_title')}</h2>
            <p>
              {t('page.reports.alerts_24h_lead')} <b>{report.alerta_pontos_sem_atendimento.acima_de_24h}</b>
              {' '}({report.alerta_pontos_sem_atendimento.share_acima_24h_pct}{t('page.reports.alerts_24h_tail')}).
            </p>
            <p>
              {t('page.reports.alerts_72h_lead')} <b>{report.alerta_pontos_sem_atendimento.acima_de_72h}</b>{t('page.reports.alerts_72h_tail')}
            </p>
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.attend_title')}</h2>
            <table className="mdf-reports__table">
              <thead>
                <tr><th>{t('page.reports.col_region')}</th><th>{t('page.reports.col_reported')}</th><th>{t('page.reports.col_attended')}</th><th>{t('page.reports.col_rate')}</th></tr>
              </thead>
              <tbody>
                {Object.entries(report.atendimento_por_regiao).map(([region, rec]) => (
                  <tr key={region}>
                    <td>{region}</td>
                    <td>{rec.total}</td>
                    <td>{rec.atendidos}</td>
                    <td>{(rec.taxa_atendimento * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section">
            <h2>{t('page.reports.export_title')}</h2>
            <p>{t('page.reports.export_intro')}</p>
            <div className="mdf-reports__actions">
              <button type="button" onClick={exportJson}>{t('page.reports.export_json')}</button>
              <button type="button" onClick={() => exportCsv('categoria-mes')}>{t('page.reports.export_cat_month')}</button>
              <button type="button" onClick={() => exportCsv('regiao-mes')}>{t('page.reports.export_region_month')}</button>
              <button type="button" onClick={() => exportCsv('atendimento')}>{t('page.reports.export_attend_region')}</button>
              <button type="button" onClick={() => exportCsv('dia-semana')}>{t('page.reports.export_weekly')}</button>
              <button type="button" onClick={() => exportCsv('hora-dia')}>{t('page.reports.export_hourly')}</button>
              <button type="button" onClick={() => exportCsv('crescimento-mensal')}>{t('page.reports.export_growth_month')}</button>
              <button type="button" onClick={() => exportCsv('demanda-regiao-categoria')}>{t('page.reports.export_demand')}</button>
              <button type="button" onClick={() => exportCsv('distribuicao-categorias')}>{t('page.reports.export_share')}</button>
              <button type="button" onClick={() => exportCsv('vulnerabilidade-alimentar')}>{t('page.reports.export_vuln')}</button>
              <button type="button" onClick={() => exportCsv('crescimento-mapafome')}>{t('page.reports.export_growth_mf')}</button>
            </div>
          </section>

          <section className="mdf-reports__section mdf-reports__section--cite">
            <h2>{t('page.reports.cite_title')}</h2>
            <p>
              {t('page.reports.cite_lead')}{new Date(report.meta.gerado_em).toLocaleDateString('pt-BR')}{t('page.reports.cite_mid')}<code>mapafome.com.br/relatorios</code>{t('page.reports.cite_tail')}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
