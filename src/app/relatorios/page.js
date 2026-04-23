'use client';

import React, { useCallback, useEffect, useState } from 'react';
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

// Public-interest aggregate reports surface. Intended for:
//   • Ministério Público (SAN / direitos humanos)
//   • Secretarias de saúde municipais e estaduais
//   • Organizações parceiras em segurança alimentar
//
// Fetches the Google Sheet client-side using the same NEXT_PUBLIC_* creds
// the rest of the app already uses. All data shown here is aggregated —
// no PII, no raw coordinates, k-anonymized at k=5. See reports.js.

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

export default function RelatoriosPage() {
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
      <a href="/" className="mdf-reports__back">← Mapa</a>
      <h1>Relatórios agregados</h1>
      <p className="mdf-reports__lead">
        Dados agregados do MAPA FOME para uso de órgãos públicos
        (Ministério Público, secretarias de saúde, SAN e direitos humanos) em
        diagnóstico e decisão de política pública.
      </p>
      <p className="mdf-reports__dignity">
        Nenhum dado pessoal, coordenada individual ou identificador aparece
        aqui. Grupos menores que 5 foram consolidados em <em>outros</em> para
        evitar reidentificação. LGPD-aligned. Conforme nota de dignidade do
        projeto.
      </p>

      {status === 'loading' && <p className="mdf-reports__status">Carregando dados…</p>}
      {status === 'error' && (
        <div className="mdf-reports__status mdf-reports__status--error" role="alert">
          Não foi possível carregar o relatório no momento.
          {error ? <> Detalhe técnico: <code>{error}</code></> : null}
          <button type="button" className="mdf-reports__retry" onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'ready' && report && (
        <>
          <section className="mdf-reports__section">
            <h2>Resumo executivo</h2>
            <dl className="mdf-reports__kv">
              <dt>Gerado em</dt>
              <dd>{new Date(report.meta.gerado_em).toLocaleString('pt-BR')}</dd>
              <dt>Pontos reportados (total)</dt>
              <dd>{report.resumo_executivo.total_pontos_reportados}</dd>
              <dt>Total atendidos</dt>
              <dd>{report.resumo_executivo.total_atendidos}</dd>
              <dt>Taxa de atendimento global</dt>
              <dd>{report.resumo_executivo.taxa_atendimento_global_pct}%</dd>
              <dt>Tempo mediano até atendimento</dt>
              <dd>{report.resumo_executivo.tempo_mediano_atendimento_h != null ? `${report.resumo_executivo.tempo_mediano_atendimento_h} h` : '—'}</dd>
              <dt>Tempo p90 até atendimento</dt>
              <dd>{report.resumo_executivo.tempo_p90_atendimento_h != null ? `${report.resumo_executivo.tempo_p90_atendimento_h} h` : '—'}</dd>
              <dt>Pontos sem atendimento &gt; 24 h</dt>
              <dd>{report.resumo_executivo.pontos_sem_atendimento_24h}</dd>
            </dl>
          </section>

          <section className="mdf-reports__section mdf-reports__section--pri">
            <h2>Vulnerabilidade alimentar por região</h2>
            <p className="mdf-reports__caption">
              Onde estão, por região, as pessoas em vulnerabilidade que precisam
              de <b>alimento pronto</b> (refeição imediata — típico de população em
              situação de rua) versus <b>cesta básica</b> (suprimento semanal —
              insegurança alimentar familiar). Cada coluna ativa políticas
              públicas distintas.
            </p>
            <table className="mdf-reports__table">
              <thead>
                <tr>
                  <th>Região</th>
                  <th>Alimento pronto</th>
                  <th>Cesta básica</th>
                  <th>Comida (genérico)</th>
                  <th>Total</th>
                  <th>Atendidos</th>
                  <th>Taxa</th>
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
              Leitura de política pública: alta concentração de <em>alimento
              pronto</em> sinaliza população em situação de rua → resposta via
              Consultório na Rua, Centro POP, sopões. Alta concentração de{' '}
              <em>cesta básica</em> sinaliza insegurança alimentar familiar →
              Bolsa Família, Cartão Alimentação, Programa Auxílio Brasil.
            </p>
          </section>

          <section className="mdf-reports__section">
            <h2>Distribuição de necessidades (share por categoria)</h2>
            <p className="mdf-reports__caption">
              Onde concentrar orçamento e estoque. Baseado em todos os pontos já reportados.
            </p>
            <table className="mdf-reports__table">
              <thead>
                <tr><th>Categoria</th><th>Total</th><th>Share</th></tr>
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
            <h2>Crescimento do MAPA FOME</h2>
            <p className="mdf-reports__caption">
              Evolução do projeto: pontos novos, acumulado, regiões atingidas e taxa de atendimento mês a mês.
              Use como narrativa de impacto em editais, comunicação institucional e captação.
            </p>
            {report.crescimento_mapafome && (
              <>
                <dl className="mdf-reports__kv">
                  <dt>Meses ativos</dt>
                  <dd>{report.crescimento_mapafome.resumo.meses_ativos}</dd>
                  <dt>Total acumulado de pontos</dt>
                  <dd>{report.crescimento_mapafome.resumo.total_pontos}</dd>
                  <dt>Regiões atingidas</dt>
                  <dd>{report.crescimento_mapafome.resumo.regioes_ativas_total}</dd>
                  <dt>Crescimento total (primeiro mês → último)</dt>
                  <dd>{report.crescimento_mapafome.resumo.crescimento_total_pct == null ? '—' : `${report.crescimento_mapafome.resumo.crescimento_total_pct}%`}</dd>
                </dl>
                <table className="mdf-reports__table">
                  <caption>Série mensal de crescimento</caption>
                  <thead>
                    <tr>
                      <th scope="col">Mês</th>
                      <th scope="col">Novos</th>
                      <th scope="col">Acumulado</th>
                      <th scope="col">Atendidos</th>
                      <th scope="col">Taxa atend.</th>
                      <th scope="col">Regiões ativas</th>
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
            <h2>Crescimento mês a mês</h2>
            <p className="mdf-reports__caption">
              Série histórica para diagnosticar agravamento ou melhoria da insegurança alimentar no território coberto.
            </p>
            <table className="mdf-reports__table">
              <thead>
                <tr><th>Mês</th><th>Total</th><th>Δ absoluto</th><th>Δ %</th></tr>
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
            <h2>Sazonalidade semanal</h2>
            <p className="mdf-reports__caption">
              Distribuição dos reportes por dia da semana — apoio ao planejamento de plantões da rede de SAN e equipes itinerantes.
            </p>
            <table className="mdf-reports__table">
              <thead><tr><th>Dia</th><th>Pontos</th></tr></thead>
              <tbody>
                {Object.entries(report.sazonalidade_dia_semana).map(([d, n]) => (
                  <tr key={d}><td>{d}</td><td>{n}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section">
            <h2>Sazonalidade diária (hora a hora)</h2>
            <p className="mdf-reports__caption">
              Concentração por hora do dia — ajuda a dimensionar escala e dimensionamento de equipes noturnas.
            </p>
            <table className="mdf-reports__table">
              <thead><tr><th>Hora</th><th>Pontos</th></tr></thead>
              <tbody>
                {Object.entries(report.sazonalidade_hora_dia).map(([h, n]) => (
                  <tr key={h}><td>{h}:00</td><td>{n}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mdf-reports__section">
            <h2>Demanda por região e categoria</h2>
            <p className="mdf-reports__caption">
              Onde cada tipo de necessidade concentra. Dois eixos: região × categoria.
            </p>
            <table className="mdf-reports__table">
              <thead><tr><th>Região</th><th>Categoria</th><th>Pontos</th></tr></thead>
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
            <h2>Alertas</h2>
            <p>
              Pontos sem atendimento há mais de 24 h: <b>{report.alerta_pontos_sem_atendimento.acima_de_24h}</b>
              {' '}({report.alerta_pontos_sem_atendimento.share_acima_24h_pct}% do total).
            </p>
            <p>
              Pontos sem atendimento há mais de 72 h: <b>{report.alerta_pontos_sem_atendimento.acima_de_72h}</b> — sinal de saturação da rede voluntária naquela região.
            </p>
          </section>

          <section className="mdf-reports__section">
            <h2>Taxa de atendimento por região</h2>
            <table className="mdf-reports__table">
              <thead>
                <tr><th>Região</th><th>Reportados</th><th>Atendidos</th><th>Taxa</th></tr>
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
            <h2>Exportar</h2>
            <p>Formatos prontos para anexar em laudo, peça processual, relatório anual ou importar em ferramentas de análise.</p>
            <div className="mdf-reports__actions">
              <button type="button" onClick={exportJson}>Baixar JSON completo</button>
              <button type="button" onClick={() => exportCsv('categoria-mes')}>CSV — categoria × mês</button>
              <button type="button" onClick={() => exportCsv('regiao-mes')}>CSV — região × mês</button>
              <button type="button" onClick={() => exportCsv('atendimento')}>CSV — atendimento por região</button>
              <button type="button" onClick={() => exportCsv('dia-semana')}>CSV — sazonalidade semanal</button>
              <button type="button" onClick={() => exportCsv('hora-dia')}>CSV — sazonalidade horária</button>
              <button type="button" onClick={() => exportCsv('crescimento-mensal')}>CSV — crescimento mensal</button>
              <button type="button" onClick={() => exportCsv('demanda-regiao-categoria')}>CSV — demanda região × categoria</button>
              <button type="button" onClick={() => exportCsv('distribuicao-categorias')}>CSV — share por categoria</button>
              <button type="button" onClick={() => exportCsv('vulnerabilidade-alimentar')}>CSV — vulnerabilidade alimentar (pronto × cesta)</button>
              <button type="button" onClick={() => exportCsv('crescimento-mapafome')}>CSV — crescimento MAPA FOME (série mensal)</button>
            </div>
          </section>

          <section className="mdf-reports__section mdf-reports__section--cite">
            <h2>Como citar</h2>
            <p>
              MAPA FOME — Relatório agregado de pontos de insegurança alimentar,
              gerado em {new Date(report.meta.gerado_em).toLocaleDateString('pt-BR')},
              acessado via <code>mapafome.com.br/relatorios</code>.
              Dados anônimos, agregados, LGPD-aligned.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
