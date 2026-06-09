'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import './relatorio-marketing.css';
import {
  buildMarketingReport,
  toCsvCampanhas,
} from '../components/compatibility/components/ux/marketingReports';

// Marketing report — destined for sponsor/advertiser companies. Separate
// from /relatorios (public-policy) because the audience and framing differ.

function downloadBlob(filename, content, mime) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const STATUS_LABEL = {
  ativo: 'Ativo',
  expirado: 'Expirado',
  'aguardando-inicio': 'Agendado',
};

export default function RelatorioMarketingPage() {
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
      <Link href="/" className="mdf-mkt__back">← Mapa</Link>
      <h1>Relatório de marketing</h1>
      <p className="mdf-mkt__lead">
        Relatório de campanha para empresas que patrocinam o espaço do MAPA FOME.
        Mostra alcance potencial (pontos de necessidade reportados dentro do raio
        e da janela de tempo contratada) e alcance engajado (desses pontos,
        quantos foram atendidos por um voluntário).
      </p>
      <p className="mdf-mkt__ethics">
        <strong>Zero rastreamento individual.</strong> Nenhum identificador de
        usuário, device id ou pixel de terceiros é usado. Os números abaixo são
        agregados de pontos reportados no território da campanha — uma métrica
        honesta de <em>contexto e dignidade</em>, não de vigilância.
      </p>

      {status === 'loading' && <p className="mdf-mkt__status">Carregando dados…</p>}
      {status === 'error' && (
        <div className="mdf-mkt__status mdf-mkt__status--error" role="alert">
          Não foi possível carregar o relatório.
          {error ? <> Detalhe técnico: <code>{error}</code></> : null}
          <button type="button" className="mdf-mkt__retry" onClick={load}>Tentar novamente</button>
        </div>
      )}

      {status === 'ready' && report && (
        <>
          <section className="mdf-mkt__section">
            <h2>Resumo</h2>
            <dl className="mdf-mkt__kv">
              <dt>Campanhas ativas agora</dt><dd>{report.resumo.patrocinios_ativos}</dd>
              <dt>Campanhas agendadas</dt><dd>{report.resumo.patrocinios_agendados}</dd>
              <dt>Campanhas expiradas</dt><dd>{report.resumo.patrocinios_expirados}</dd>
              <dt>Audiência potencial total (período contratado)</dt>
              <dd>{report.resumo.audiencia_potencial_total}</dd>
              <dt>Audiência engajada (pontos atendidos)</dt>
              <dd>{report.resumo.audiencia_engajada_total}</dd>
            </dl>
          </section>

          <section className="mdf-mkt__section">
            <h2>Campanhas</h2>
            {report.campanhas.length === 0 ? (
              <p>Nenhuma campanha cadastrada no momento.</p>
            ) : (
              <table className="mdf-mkt__table">
                <caption>Campanhas ativas, agendadas e expiradas com alcance estimado</caption>
                <thead>
                  <tr>
                    <th scope="col">Campanha</th>
                    <th scope="col">Status</th>
                    <th scope="col">Janela</th>
                    <th scope="col">Raio</th>
                    <th scope="col">Audiência potencial</th>
                    <th scope="col">Engajada</th>
                    <th scope="col">Até agora</th>
                  </tr>
                </thead>
                <tbody>
                  {report.campanhas.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b>{c.label}</b>
                        <br />
                        <span className="mdf-mkt__meta">
                          {c.placements.length > 0 ? c.placements.join(' · ') : 'sem placement'}
                        </span>
                      </td>
                      <td>
                        <span className={`mdf-mkt__badge mdf-mkt__badge--${c.status}`}>
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                      </td>
                      <td>
                        {c.inicio || '—'}<br />
                        <small>até {c.fim || '—'}</small>
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
            <h2>Exportar</h2>
            <p>Formatos prontos para incluir em media kit, relatório de fim de campanha ou importar em planilha.</p>
            <div className="mdf-mkt__actions">
              <button type="button" onClick={exportJson}>Baixar JSON completo</button>
              <button type="button" onClick={exportCsv}>CSV — campanhas</button>
            </div>
          </section>

          <section className="mdf-mkt__section mdf-mkt__section--cite">
            <h2>Metodologia para a marca</h2>
            <p>
              Ao contratar um slot, a marca define um <em>centro</em> geográfico,
              um <em>raio</em> em km e uma <em>janela de tempo</em>. Contamos o
              número de pontos de necessidade reportados na plataforma MAPA FOME
              dentro desse retângulo (tempo × espaço) — é a <em>audiência potencial</em>
              da campanha, uma medida honesta de quantas vezes o banner esteve ao
              lado de um pedido de ajuda real na região.
            </p>
            <p>
              <em>Audiência engajada</em> = dos pontos potenciais, quantos foram
              atendidos por um voluntário. É um indicador de contexto: quanto
              maior, mais a marca esteve exposta junto a uma comunidade ativa.
            </p>
            <p>
              Não fazemos <em>retargeting</em>, não vendemos dados, não mostramos
              histórico de navegação. O MAPA FOME é uma ferramenta humanitária;
              o patrocínio existe para sustentar a operação, não para vigiar
              vulneráveis.
            </p>
          </section>

          <section className="mdf-mkt__section">
            <h2>Como citar / atribuição</h2>
            <p>
              Empresa patrocinadora pode divulgar o apoio citando:
              &quot;<b>Apoiador do MAPA FOME — {new Date(report.meta.gerado_em).toLocaleDateString('pt-BR')}</b>&quot;.
              Logomarca conjunta e kit de divulgação disponíveis sob solicitação.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
