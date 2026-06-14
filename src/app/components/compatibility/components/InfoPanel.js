import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Sugestao from './googlesheets/sugestao';
import ImagemInstagram from './home/ImagemInstagram';
import Apoiadores from './home/Apoiadores';
import SponsorSlot from './ux/SponsorSlot';
import { PLACEMENTS } from './ux/sponsors';
import useInstallPrompt from './ux/useInstallPrompt';
import { LEGEND, ACKNOWLEDGEMENTS, HUNGER_TIMELINE } from './infoPanelContent';
import './InfoPanel.css';
import { t, useLocale } from './ux/strings';

// The static content data (the color legend, the acknowledgements list, and the
// hunger-timeline rows — plus the legend icon refs) moved to ./infoPanelContent
// (SRP: content vs presentation). This file owns the panel's JSX + the PWA-install
// wiring. The PWA-install hook extraction is deliberately deferred to a follow-up.

const InfoPanel = ({ rowCount }) => {
  useLocale(); // re-render on locale change so t() re-reads
  const [showAgradecimentos, setShowAgradecimentos] = useState(false);
  const [showApoiadores, setShowApoiadores] = useState(false);
  const [showTabela, setShowTabela] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');

  // Platform flags from the shared single-source classifier (LBR-D). InfoPanel
  // keeps its OWN beforeinstallprompt wiring + store badges intact (LBR-A:
  // non-regression beats DRY here); it only consumes isIOS/isInAppBrowser to
  // pick the right manual-install hint instead of re-sniffing the UA.
  const { isIOS, isInAppBrowser } = useInstallPrompt();

  // Captura o evento de instalação do PWA (Chrome/Edge/Android) para oferecer
  // a instalação da versão lite direto no botão, sem passar pela loja.
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    // Adota um evento que disparou ANTES deste componente montar — capturado
    // cedo pelo bridge em layout.js (window.__mdf_install_prompt). Estes
    // setState leem estado de navegador (window.*/matchMedia) após a montagem
    // de propósito; derivar no render tocaria window e arriscaria hydration
    // mismatch neste componente client.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads window install-prompt bridge / matchMedia (external state) post-mount to avoid hydration mismatch
    if (window.__mdf_install_prompt) setDeferredPrompt(window.__mdf_install_prompt);
    if (window.__mdf_app_installed) setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // Usa o evento do state ou o capturado cedo pelo bridge (layout.js).
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__mdf_install_prompt : null);
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') window.__mdf_install_prompt = null;
      setInstallHint('');
      return;
    }
    // Sem prompt nativo (Safari/iOS, ou navegador que ainda não atingiu o
    // critério de instalabilidade): orienta a instalação manual usando a
    // classificação central (isIOS/isInAppBrowser), não um novo sniff de UA.
    if (isIOS && isInAppBrowser) {
      // Webview do Instagram/Facebook/WhatsApp não tem "Adicionar à Tela de
      // Início" (D3): orienta a abrir no Safari primeiro.
      setInstallHint(t('page.info.hint_ios_safari'));
    } else if (isIOS) {
      setInstallHint(t('page.info.hint_ios_add'));
    } else {
      setInstallHint(t('page.info.install_hint_other'));
    }
  };

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
            {/* <a
              className="mdf-btn mdf-btn--secondary mdf-btn--channel-patreon mdf-btn--lg"
              target="_blank"
              rel="noreferrer"
              href="https://www.patreon.com/reifel/membership"
              aria-label="Apoio mensal no Patreon"
              title="Apoio mensal no Patreon"
            >
              <span aria-hidden="true">★</span>
              Apoio mensal no Patreon
            </a> */}
          </div>
        </section>

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
            aria-label="Agradecimentos"
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
            aria-label="Apoiadores"
          >
            <Apoiadores />
          </section>
        )}

        {showTabela && (
          <section
            id="ip-collapse-tabela"
            className="ip-collapse"
            aria-label="Consequências da fome ao longo do tempo"
          >
            <div className="ip-table-wrap">
              <table className="ip-table">
                <thead>
                  <tr>
                    <th scope="col">Tempo de fome</th>
                    <th scope="col">Consequências</th>
                    <th scope="col">Risco de vida</th>
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
            No MAPA FOME você pode encontrar a quem ajudar e fazer novas marcações.
            Selecione a opção que representa você ou outra pessoa, adicione um
            contato se quiser, e confirme com a localização atual ou um endereço.
          </figcaption>
        </figure>

        <section className="ip-uses" aria-label="Para que serve o MAPA FOME">
          <h3>Serve para</h3>
          <ul>
            <li>mapear pessoas que estão com fome na rua ou em casa</li>
            <li>mapear iniciativas que recebem recursos para fazer doação</li>
            <li>mostrar no mapa onde e quando tem alimento sendo distribuído</li>
            <li>mostrar lugares comerciais ou residenciais que precisam de voluntários para buscar alimentos não consumidos</li>
            <li>mapear e ajudar vítimas de desastres naturais, como na enchente do Rio Grande do Sul em 2024, quando atingidos entraram em contato e pediram o filtro <em>Esse ano</em>. Hoje também dá para filtrar o mapa por necessidades além de comida — água, abrigo, roupa, higiene, remédios, animais e carregar o celular — porque uma catástrofe desabriga pessoas independente de renda</li>
          </ul>
          <p className="ip-uses__note">
            É possível traçar uma rota ao destino: clique em <em>Ir para o destino</em> para abrir no Google Maps.
          </p>
        </section>

        <p className="ip-conclusion">
          <strong>Conclusão:</strong> faço um apelo a você para tomar medidas e ações
          solidárias recorrentes, em intervalos de 1 a 14 dias. Alivie a dor e o
          sofrimento de outro ser humano.
        </p>

        <footer className="ip-footer">
          <div className="ip-contact">
            <span className="ip-contact__label">Contato:</span>
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
          <nav className="ip-legal" aria-label="Documentos legais">
            <a target="_blank" rel="noreferrer" href="./privacy.html">Política de Privacidade</a>
            <span aria-hidden="true">·</span>
            <a target="_blank" rel="noreferrer" href="./terms.html">Termos de Uso</a>
            <span aria-hidden="true">·</span>
            <a href="/assinar">Apoie o projeto</a>
            <span aria-hidden="true">·</span>
            <a href="/relatorios">Relatórios (órgãos públicos)</a>
            <span aria-hidden="true">·</span>
            <a href="/relatorio-marketing">Relatório de marketing (parceiros)</a>
            <span aria-hidden="true">·</span>
            <a href="/parceiros">Seja parceiro</a>
            <span aria-hidden="true">·</span>
            <a href="/imprensa">Imprensa</a>
          </nav>
          <a
            className="mdf-btn mdf-btn--tertiary"
            target="_blank"
            rel="noreferrer"
            href="https://github.dev/rslgp/mapafome_homolog/src/app/components/compatibility/components/README.md"
            aria-label="Contribuir / abrir PR no GitHub"
            title="Contribuir / abrir PR no GitHub"
          >
            <img className="mdf-btn__brandmark imgGithub" src="https://brand.github.com/_next/static/media/logo-03.cc5e5332.png" alt="GitHub" />
          </a>
          <p className="ip-closing">
            Ninguém deveria passar fome ao nosso lado. Faça hoje a sua parte:
            doe, marque um ponto no mapa ou compartilhe o MAPA FOME.
          </p>
        </footer>
      </Paper>
    </Grid>
  );
};

export default InfoPanel;
