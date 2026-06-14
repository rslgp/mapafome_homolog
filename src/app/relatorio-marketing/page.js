'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import './relatorio-marketing.css';
import {
  buildMarketingReport,
  toCsvCampanhas,
} from '../components/compatibility/components/ux/marketingReports';
import { downloadBlob } from '../components/compatibility/components/ux/downloadBlob';
import { t, useLocale } from '../components/compatibility/components/ux/strings';

// Marketing report — destined for sponsor/advertiser companies. Separate
// from /relatorios (public-policy) because the audience and framing differ.

// Campaign-status -> full i18n key. The visible label is resolved via t() at
// render time so it follows the active locale (the ids stay the SOT). Full keys
// are kept here as literals so the no-dead-key scan sees each one referenced.
const STATUS_KEY = {
  ativo: 'page.mktreport.status_active',
  expirado: 'page.mktreport.status_expired',
  'aguardando-inicio': 'page.mktreport.status_scheduled',
};

export default function RelatorioMarketingPage() {
  useLocale(); // re-render on locale change so t() re-reads
  const [status, setStatus] = useState('loading');
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
      setReport(buildMarketingReport(rows));
      setStatus('ready');
    } catch (e) {
      console.error('[relatorio-marketing] load failed:', e);
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
      `mapafome-relatorio-marketing-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2),
      'application/json',
    );
  }

  function exportCsv() {
    if (!report) return;
    downloadBlob(
      `mapafome-campanhas-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsvCampanhas(report),
      'text/csv',
    );
  }

  return (
    <main className="mdf-mkt">
      <Link href="/" className="mdf-mkt__back">{t('page.mktreport.back')}</Link>
      <h1>{t('page.mktreport.title')}</h1>
      <p className="mdf-mkt__lead">
        {t('page.mktreport.lead')}
      </p>
      <p className="mdf-mkt__ethics">
        <strong>{t('page.mktreport.ethics_strong')}</strong> {t('page.mktreport.ethics_lead')}<em>{t('page.mktreport.ethics_em')}</em>{t('page.mktreport.ethics_tail')}
      </p>

      {status === 'loading' && <p className="mdf-mkt__status">{t('page.mktreport.loading')}</p>}
      {status === 'error' && (
        <div className="mdf-mkt__status mdf-mkt__status--error" role="alert">
          {t('page.mktreport.error')}
          {error ? <> {t('page.mktreport.error_detail')} <code>{error}</code></> : null}
          <button type="button" className="mdf-mkt__retry" onClick={load}>{t('page.mktreport.retry')}</button>
        </div>
      )}

      {status === 'ready' && report && (
        <>
          <section className="mdf-mkt__section">
            <h2>{t('page.mktreport.summary_title')}</h2>
            <dl className="mdf-mkt__kv">
              <dt>{t('page.mktreport.summary_active')}</dt><dd>{report.resumo.patrocinios_ativos}</dd>
              <dt>{t('page.mktreport.summary_scheduled')}</dt><dd>{report.resumo.patrocinios_agendados}</dd>
              <dt>{t('page.mktreport.summary_expired')}</dt><dd>{report.resumo.patrocinios_expirados}</dd>
              <dt>{t('page.mktreport.summary_potential')}</dt>
              <dd>{report.resumo.audiencia_potencial_total}</dd>
              <dt>{t('page.mktreport.summary_engaged')}</dt>
              <dd>{report.resumo.audiencia_engajada_total}</dd>
            </dl>
          </section>

          <section className="mdf-mkt__section">
            <h2>{t('page.mktreport.campaigns_title')}</h2>
            {report.campanhas.length === 0 ? (
              <p>{t('page.mktreport.campaigns_empty')}</p>
            ) : (
              <table className="mdf-mkt__table">
                <caption>{t('page.mktreport.campaigns_caption')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('page.mktreport.col_campaign')}</th>
                    <th scope="col">{t('page.mktreport.col_status')}</th>
                    <th scope="col">{t('page.mktreport.col_window')}</th>
                    <th scope="col">{t('page.mktreport.col_radius')}</th>
                    <th scope="col">{t('page.mktreport.col_potential')}</th>
                    <th scope="col">{t('page.mktreport.col_engaged')}</th>
                    <th scope="col">{t('page.mktreport.col_so_far')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.campanhas.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b>{c.label}</b>
                        <br />
                        <span className="mdf-mkt__meta">
                          {c.placements.length > 0 ? c.placements.join(' · ') : t('page.mktreport.no_placement')}
                        </span>
                      </td>
                      <td>
                        <span className={`mdf-mkt__badge mdf-mkt__badge--${c.status}`}>
                          {STATUS_KEY[c.status] ? t(STATUS_KEY[c.status]) : c.status}
                        </span>
                      </td>
                      <td>
                        {c.inicio || '—'}<br />
                        <small>{t('page.mktreport.until')} {c.fim || '—'}</small>
                      </td>
                      <td>{c.raio_km != null ? `${c.raio_km} km` : '—'}</td>
                      <td><b>{c.audiencia_potencial_no_periodo}</b></td>
                      <td>{c.audiencia_engajada_no_periodo}</td>
                      <td>{c.ate_agora_no_periodo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mdf-mkt__section">
            <h2>{t('page.mktreport.export_title')}</h2>
            <p>{t('page.mktreport.export_intro')}</p>
            <div className="mdf-mkt__actions">
              <button type="button" onClick={exportJson}>{t('page.mktreport.export_json')}</button>
              <button type="button" onClick={exportCsv}>{t('page.mktreport.export_csv')}</button>
            </div>
          </section>

          <section className="mdf-mkt__section mdf-mkt__section--cite">
            <h2>{t('page.mktreport.method_title')}</h2>
            <p>
              {t('page.mktreport.method_p1_a')}<em>{t('page.mktreport.method_center')}</em>{t('page.mktreport.method_p1_b')}<em>{t('page.mktreport.method_radius')}</em>{t('page.mktreport.method_p1_c')}<em>{t('page.mktreport.method_window')}</em>{t('page.mktreport.method_p1_d')}<em>{t('page.mktreport.method_potential')}</em>{t('page.mktreport.method_p1_e')}
            </p>
            <p>
              <em>{t('page.mktreport.method_engaged')}</em>{t('page.mktreport.method_p2')}
            </p>
            <p>
              {t('page.mktreport.method_p3_a')}<em>{t('page.mktreport.method_retargeting')}</em>{t('page.mktreport.method_p3_b')}
            </p>
          </section>

          <section className="mdf-mkt__section">
            <h2>{t('page.mktreport.cite_title')}</h2>
            <p>
              {t('page.mktreport.cite_lead')}
              &quot;<b>{t('page.mktreport.cite_quote')} {new Date(report.meta.gerado_em).toLocaleDateString('pt-BR')}</b>&quot;{t('page.mktreport.cite_tail')}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
