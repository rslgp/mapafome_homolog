import React, { useState } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Sugestao from './googlesheets/sugestao';
import ImagemInstagram from './home/ImagemInstagram';
import Apoiadores from './home/Apoiadores';
import SponsorSlot from './ux/SponsorSlot';
import { PLACEMENTS } from './ux/sponsors';
import useInfoPanel from './useInfoPanel';
import { LEGEND, ACKNOWLEDGEMENTS, HUNGER_TIMELINE } from './infoPanelContent';
import './InfoPanel.css';
import { t, useLocale } from './ux/strings';

// The static content data (the color legend, the acknowledgements list, and the
// hunger-timeline rows, plus the legend icon refs) moved to ./infoPanelContent
// (SRP: content vs presentation). The PWA-install state, effect, and handler
// moved to ./useInfoPanel (SRP: browser-install logic vs presentation, M10d).
// This file now owns only the panel's JSX + its trivial collapse-toggle UI state.

const InfoPanel = ({ rowCount }) => {
  useLocale(); // re-render on locale change so t() re-reads
  const [showAgradecimentos, setShowAgradecimentos] = useState(false);
  const [showApoiadores, setShowApoiadores] = useState(false);
  const [showTabela, setShowTabela] = useState(false);

  // PWA-install state + action live in the extracted hook (M10d). InfoPanel is
  // now a pure presentation shell over this + the collapse booleans above.
  const { isInstalled, installHint, handleInstall } = useInfoPanel();

  return (
    <Grid size={{ xs: 12, sm: 12 }}>
      <Paper id="MoreInfo" className="ip-panel" elevation={0}>
        <header className="ip-share">
          <a
            className="mdf-btn mdf-btn--secondary"
            title={t('page.info.share_whatsapp')}
            href="whatsapp://send?text=No MAPA FOME dá pra ver no mapa quem está com fome e ajudar agora. Faça a sua parte: www.mapafome.com.br"
          >
            <img className="mdf-btn__ico" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" />
            <span>{t('page.info.share_whatsapp')}</span>
          </a>
          <a
            target="_blank"
            rel="noreferrer"
            className="mdf-btn mdf-btn--icon mdf-btn--channel-tg"
            title={t('page.info.share_telegram')}
            aria-label={t('page.info.share_telegram')}
            href="https://t.me/share?url=www.mapafome.com.br&text=Para%20marcar%20no%20mapa%20e%20alimentar%20quem%20tem%20fome%2C%20achei%20esse%20site%3A"
          >
            <img className="mdf-btn__ico" src="https://telegram.org/img/WidgetButton_LogoSmall.png" alt="" />
          </a>
        </header>

        <div className="ip-stats" aria-live="polite">
          <strong>{rowCount || 0}</strong>
          <span>{t('page.info.stats_points')}</span>
        </div>

        {/* Quem a plataforma atende — fatos fornecidos pelo mantenedor
            (2026-07-03): ativa desde 2022; atende vitimas de desastres
            naturais, pessoas refugiadas, familias de baixa renda e pessoas
            em situacao de rua; reduz desperdicio de alimentos e aproxima
            voluntarios da causa. Tom calmo: lista digna, sem apelo de pena
            ("pessoas em situacao de rua" e o termo digno, nao "morador de
            rua" — governador de tom do produto). */}
        <section className="ip-serve" aria-labelledby="ip-serve-title">
          <h3 id="ip-serve-title" className="ip-serve__title">
            {t('page.info.serve_title')}
          </h3>
          <p className="ip-serve__since">{t('page.info.serve_since')}</p>
          <ul className="ip-serve__list">
            <li className="ip-serve__chip">{t('page.info.serve_disasters')}</li>
            <li className="ip-serve__chip">{t('page.info.serve_refugees')}</li>
            <li className="ip-serve__chip">{t('page.info.serve_lowincome')}</li>
            <li className="ip-serve__chip">{t('page.info.serve_homeless')}</li>
          </ul>
          <p className="ip-serve__impact">{t('page.info.serve_impact')}</p>
        </section>

        {/* UX-M15: color legend hoisted directly under the audience section so
            the map's core vocabulary (what the pin colors mean) is the FIRST
            thing a scroller meets in the panel, ahead of install badges and
            secondary links. The Art.135 acknowledgement framing below is
            INTENTIONAL and untouched. */}
        <ul className="ip-legend" aria-label={t('page.info.legend_aria')}>
          {LEGEND.map((item) => (
            <li
              key={item.key}
              className={`ip-legend__item ip-legend__item--${item.span}`}
            >
              <span className={`ip-legend__chip ${item.chipClass}`}>
                <img src={item.icon} alt="" width="22" height="22" />
                {t(item.labelKey)}
              </span>
              <p className="ip-legend__text">{t(item.descKey)}</p>
            </li>
          ))}
        </ul>

        <div className="ip-apps">
          {!isInstalled && (
            <div className="ip-apps__install-badges" role="group" aria-label={t('page.info.install_group')}>
              <button
                type="button"
                className="mdf-btn mdf-btn--badge"
                onClick={handleInstall}
                aria-label={t('page.info.install_play')}
              >
                <img className="imgGooglePlay" alt="Disponível no Google Play" src="https://play.google.com/intl/en_us/badges/static/images/badges/pt_badge_web_generic.png" />
              </button>
              <button
                type="button"
                className="mdf-btn mdf-btn--badge"
                onClick={handleInstall}
                aria-label={t('page.info.install_appstore')}
              >
                <img alt="Baixar na App Store" src="https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/servicos/app-store-selo.png" />
              </button>
            </div>
          )}

          <a
            className="mdf-btn mdf-btn--secondary mdf-btn--lg mdf-btn--rich"
            target="_blank"
            rel="noreferrer"
            href="https://mapafome.com.br/solone/"
            aria-label={t('page.info.game_aria')}
          >
            <img
              className="mdf-btn__media"
              src="https://rslgp.github.io/games/charleslike/icons/icon-512.png"
              alt=""
              width="44"
              height="44"
            />
            <span className="mdf-btn__label-wrap">
              <strong className="mdf-btn__title">{t('page.info.game_title')}</strong>
              <small className="mdf-btn__sub">{t('page.info.game_sub')}</small>
            </span>
          </a>
          {/* PET-M22 — /pets is an internal app route: use next/link (NOT a raw
           * <a href="/pets">, which trips eslint no-html-link-for-pages and forces
           * a full reload). The header now carries the primary discovery entry;
           * this stays as the in-panel secondary affordance. */}
          <Link
            className="mdf-btn mdf-btn--secondary mdf-btn--lg"
            href="/pets"
            aria-label={t('page.info.pets_aria')}
            title={t('page.info.pets_aria')}
          >
            <span className="mdf-btn__emoji" aria-hidden="true">🐾</span>
            <span>{t('page.info.pets_label')}</span>
          </Link>
          <a
            className="mdf-btn mdf-btn--secondary mdf-btn--lg"
            target="_blank"
            rel="noreferrer"
            href="https://www.youtube.com/watch?v=h30BO_6kFNM"
            aria-label={t('page.info.globo_aria')}
          >
            <span className="mdf-btn__emoji" aria-hidden="true">📺</span>
            <span>Ilha das Flores</span>
          </a>
          <a
            className="mdf-btn mdf-btn--badge mdf-btn--framed ip-apps__globo"
            target="_blank"
            rel="noreferrer"
            href="https://globoplay.globo.com/v/10350537/"
            aria-label={t('page.info.globo_aria')}
          >
            <img alt="Globo" src="https://cdn.guiademarcas.globo/capa_globo_corporativa_bf2z6hY.png" />
          </a>
          <a
            className="mdf-btn mdf-btn--badge"
            target="_blank"
            rel="noreferrer"
            href="https://instagram.com/mapafome"
            aria-label={t('page.info.instagram_aria')}
          >
            <ImagemInstagram />
          </a>
          {/* <a
            className="mdf-btn mdf-btn--primary mdf-btn--lg"
            target="_blank"
            rel="noreferrer"
            href="https://nubank.com.br/pagar/2i6kb/zRE5wsvEe2"
            aria-label="Doar via Pix"
            title="Doar via Pix"
          >
            <span className="mdf-btn__logo-chip">
              <img
                src="https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png"
                alt="Pix"
              />
            </span>
            <span>Doar agora</span>
          </a> */}
        </div>
        {installHint && (
          <p className="ip-apps__hint" role="status">{installHint}</p>
        )}

        <p className="ip-intro">
          {t('page.info.intro_lead')}{' '}
          (<a target="_blank" rel="noreferrer" href="https://g1.globo.com/pe/pernambuco/noticia/2022/02/10/site-criado-por-estudante-da-ufpe-aproxima-pessoas-que-estao-passando-fome-e-doadores-de-comida.ghtml">{t('page.info.intro_globo')}</a>{' '}
          · <a target="_blank" rel="noreferrer" href="https://globoplay.globo.com/v/10350537/">Jornal Hoje</a> · <a target="_blank" rel="noreferrer" href="https://mapafome.com.br/solone/">SOLONE</a>)
        </p>

        <section className="ip-support" aria-label={t('page.info.support_aria')}>
          <h3>{t('page.info.support_heading')}</h3>
          <div className="ip-support__actions">
            <a
              className="mdf-btn mdf-btn--secondary mdf-btn--brand-outline mdf-btn--lg"
              href="/assinar"
              aria-label={t('page.info.subscribe_aria')}
              title={t('page.info.subscribe_aria')}
            >
              <span className="mdf-btn__logo-chip">
                <img
                  src="https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png"
                  alt="Pix"
                />
              </span>
              {t('page.info.subscribe_label')}
            </a>
            <a
              className="mdf-btn mdf-btn--secondary mdf-btn--channel-paypal mdf-btn--lg"
              target="_blank"
              rel="noreferrer"
              href="https://www.paypal.com/donate/?business=M5WSKX9GDVMS4&no_recurring=0&currency_code=USD"
              aria-label="Apoio mensal no paypal"
              title="Apoio mensal no paypal"
            >
              <span aria-hidden="true">★</span>
              Paypal(USD)
            </a>

            <p align="center">
              <img
                src="/presskit/MapaFome_banner.png"
                alt="Banner"
                width="100%"
              />
            </p>
          
          </div>
        </section>

        <div className="ip-actions">
          <button
            type="button"
            className="mdf-btn mdf-btn--secondary"
            onClick={() => setShowAgradecimentos((v) => !v)}
            aria-expanded={showAgradecimentos}
            aria-controls="ip-collapse-agradecimentos"
          >
            {showAgradecimentos ? t('page.info.hide_thanks') : t('page.info.show_thanks')}
          </button>
          <button
            type="button"
            className="mdf-btn mdf-btn--secondary"
            onClick={() => setShowApoiadores((v) => !v)}
            aria-expanded={showApoiadores}
            aria-controls="ip-collapse-apoiadores"
          >
            {showApoiadores ? t('page.info.hide_supporters') : t('page.info.show_supporters')}
          </button>
          <button
            type="button"
            className="mdf-btn mdf-btn--secondary"
            onClick={() => setShowTabela((v) => !v)}
            aria-expanded={showTabela}
            aria-controls="ip-collapse-tabela"
          >
            {showTabela ? t('page.info.hide_conseq') : t('page.info.show_conseq')}
          </button>
        </div>

        {showAgradecimentos && (
          <section
            id="ip-collapse-agradecimentos"
            className="ip-collapse"
            aria-label={t('page.info.thanks_aria')}
          >
            <ul className="ip-bullets">
              {ACKNOWLEDGEMENTS.map((ack, i) => (
                <li key={`ack-${i}`}>
                  {ack.links ? (
                    <>
                      {t(ack.docLeadKey)}{' '}
                      <a target="_blank" rel="noreferrer" href={ack.links[0].href}>{ack.links[0].label}</a>.{' '}
                      <a target="_blank" rel="noreferrer" href={ack.links[1].href}>{ack.links[1].label}</a>
                    </>
                  ) : (
                    t(ack.key)
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {showApoiadores && (
          <section
            id="ip-collapse-apoiadores"
            className="ip-collapse"
            aria-label={t('page.info.supporters_aria')}
          >
            <Apoiadores />
          </section>
        )}

        {showTabela && (
          <section
            id="ip-collapse-tabela"
            className="ip-collapse"
            aria-label={t('page.info.conseq_aria')}
          >
            <div className="ip-table-wrap">
              <table className="ip-table">
                <thead>
                  <tr>
                    <th scope="col">{t('page.info.conseq_th_time')}</th>
                    <th scope="col">{t('page.info.conseq_th_conseq')}</th>
                    <th scope="col">{t('page.info.conseq_th_risk')}</th>
                  </tr>
                </thead>
                <tbody>
                  {HUNGER_TIMELINE.map((row) => (
                    <tr key={row.timeKey}>
                      <th scope="row">{t(row.timeKey)}</th>
                      <td>{t(row.conseqKey)}</td>
                      <td>
                        <span className={`ip-risk ip-risk--${row.risk.replace(/\s+/g, '-')}`}>
                          {row.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <figure className="ip-ods">
          <img
            className="ods"
            alt="ODS 2 da ONU, Fome Zero e Agricultura Sustentável"
            src="https://brasil.un.org/profiles/undg_country/themes/custom/undg/images/SDGs/pt-br/SDG-2.svg"
          />
          <figcaption>
            {t('page.info.ods_caption')}
          </figcaption>
        </figure>

        <section className="ip-uses" aria-label={t('page.info.uses_aria')}>
          <h3>{t('page.info.uses_heading')}</h3>
          <ul>
            <li>{t('page.info.uses_li1')}</li>
            <li>{t('page.info.uses_li2')}</li>
            <li>{t('page.info.uses_li3')}</li>
            <li>{t('page.info.uses_li4')}</li>
            <li>{t('page.info.uses_disaster_lead')}<em>{t('page.info.uses_disaster_filter')}</em>{t('page.info.uses_disaster_tail')}</li>
          </ul>
          <p className="ip-uses__note">
            {t('page.info.uses_note_lead')}<em>{t('page.info.uses_note_link')}</em>{t('page.info.uses_note_tail')}
          </p>
        </section>

        <p className="ip-conclusion">
          <strong>{t('page.info.conclusion_label')}</strong> {t('page.info.conclusion_body')}
        </p>

        <footer className="ip-footer">
          <div className="ip-contact">
            <span className="ip-contact__label">{t('page.info.contact_label')}</span>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://mail.google.com/mail/u/0/?fs=1&to=rslgp@cin.ufpe.br&tf=cm"
            >
              rslgp@cin.ufpe.br
            </a>
            <a target="_blank" rel="noreferrer" href="https://wa.me/5583996157234">
              (83) 9.9615-7234
            </a>
          </div>
          <Sugestao />
          <SponsorSlot placement={PLACEMENTS.INFO_PANEL_FOOTER} />
          <nav className="ip-legal" aria-label={t('page.info.legal_aria')}>
            <a target="_blank" rel="noreferrer" href="./privacy.html">{t('page.info.legal_privacy')}</a>
            <span aria-hidden="true">·</span>
            <a target="_blank" rel="noreferrer" href="./terms.html">{t('page.info.legal_terms')}</a>
            <span aria-hidden="true">·</span>
            <a href="/assinar">{t('page.info.legal_support')}</a>
            <span aria-hidden="true">·</span>
            <a href="/relatorios">{t('page.info.legal_reports')}</a>
            <span aria-hidden="true">·</span>
            <a href="/relatorio-marketing">{t('page.info.legal_marketing')}</a>
            <span aria-hidden="true">·</span>
            <a href="/parceiros">{t('page.info.legal_partner')}</a>
            <span aria-hidden="true">·</span>
            <a href="/imprensa">{t('page.info.legal_press')}</a>
          </nav>
          <a
            className="mdf-btn mdf-btn--tertiary"
            target="_blank"
            rel="noreferrer"
            href="https://github.dev/rslgp/mapafome_homolog/src/app/components/compatibility/components/README.md"
            aria-label={t('page.info.github_aria')}
            title={t('page.info.github_aria')}
          >
            <img className="mdf-btn__brandmark imgGithub" src="https://brand.github.com/_next/static/media/logo-03.cc5e5332.png" alt="GitHub" />
          </a>
          <p className="ip-closing">
            {t('page.info.closing')}
          </p>
        </footer>
      </Paper>
    </Grid>
  );
};

export default InfoPanel;
