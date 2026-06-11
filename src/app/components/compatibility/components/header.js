'use client';

import React from 'react';
import Link from 'next/link';
import './ux/Header.css';
import mapaFomeMark from '../images/MapaFome_Icons_Blue.svg';
import useInstallPrompt from './ux/useInstallPrompt';
import { t, useLocale } from './ux/strings';

export default function Header({ rowCountProp, onStartTour, onStartReport }) {
  const { isInstalled, promptInstall } = useInstallPrompt();
  useLocale(); // re-render on locale change so t() re-reads

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === 'ios') {
      window.alert('No iPhone/iPad (Safari): toque em Compartilhar e escolha "Adicionar à Tela de Início" para instalar.');
    } else if (result === 'unavailable') {
      window.alert('Para instalar: abra o menu do navegador (⋮) e escolha "Instalar app" ou "Adicionar à tela inicial".');
    }
  };

  const hasCount =
    typeof rowCountProp === 'number' ||
    (typeof rowCountProp === 'string' && rowCountProp !== '');

  return (
    <header className="mdf-header" role="banner">
      <a href="#mdf-main" className="mdf-skip-link">
        Pular para o mapa
      </a>
      <div className="mdf-header__inner">
        <div className="mdf-header__brand">
          <img
            src={mapaFomeMark.src || mapaFomeMark}
            className="mdf-header__mark"
            alt=""
            aria-hidden="true"
          />
          <span className="mdf-header__wordmark">
            <span className="mdf-header__wordmark-main">MAPA FOME .com.br</span>
            <span className="mdf-header__wordmark-extra">
              <a
                className="mdf-header__backup"
                href="https://rslgp.github.io/mapafome"
              >
                {' · mapafome.com.br '}
              </a>
            </span>
          </span>
        </div>

        {hasCount && (
          <div className="mdf-header__meta" aria-live="polite">
            <span className="mdf-header__count">
              <strong>{rowCountProp}</strong>
              <span className="mdf-header__count-full"> pontos mapeados</span>
              <span className="mdf-header__count-short" aria-hidden="true"> pts</span>
            </span>
          </div>
        )}

        <div className="mdf-header__actions">
          {onStartReport && (
            <button
              type="button"
              className="mdf-header__report"
              onClick={onStartReport}
              aria-label="Relatar um ponto no mapa"
            >
              {t('cta.report')}
            </button>
          )}
          {onStartTour && (
            <button
              type="button"
              className="mdf-header__tour"
              onClick={onStartTour}
              aria-label="Ver tutorial dos três passos"
            >
              <span className="mdf-header__tour-label">{t('cta.help')}</span>
              <span className="mdf-header__tour-icon" aria-hidden="true">?</span>
            </button>
          )}
          {/* PET-M22 — discoverable cross-link from the hunger map to the
           * /pets (achados e perdidos) map. next/link (NOT a raw <a>) so it is
           * a client-side navigation and passes no-html-link-for-pages; the
           * return path is PetsApp's "← Mapa" link back to "/". Reuses the
           * secondary header-button look (surface-2 / ink / border) + the
           * shared --mdf-focus-ring; >=44px via --mdf-touch-target. The paw
           * glyph is decorative; the visible "Pets perdidos" label + aria-label
           * carry the meaning a worried owner recognizes. */}
          <Link
            href="/pets"
            className="mdf-header__pets"
            aria-label="Pets perdidos — mapa de achados e perdidos"
            title="Pets perdidos — mapa de achados e perdidos"
          >
            <span className="mdf-header__pets-icon" aria-hidden="true">🐾</span>
            <span className="mdf-header__pets-label">{t('cta.pets')}</span>
          </Link>
          {!isInstalled && (
            <button
              type="button"
              className="mdf-header__install"
              onClick={handleInstallClick}
              aria-label="Instalar o aplicativo MAPA FOME (PWA-lite)"
            >
              <svg
                className="mdf-header__install-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.42 1.42l-4 4a1 1 0 0 1-1.42 0l-4-4a1 1 0 0 1 1.42-1.42l2.29 2.3V4a1 1 0 0 1 1-1Z" />
                <path fill="currentColor" d="M5 15a1 1 0 0 1 1 1v3h12v-3a1 1 0 1 1 2 0v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
              </svg>
              <span className="mdf-header__install-label">Instalar</span>
            </button>
          )}
          <a
            className="mdf-header__donate"
            href="./assinar"
            target="_blank"
            rel="noreferrer"
            aria-label="Doar via Pix"
            title="Doar via Pix"
          >
            <img
              className="mdf-header__donate-icon"
              src="/presskit/emoji_heart.png"
              alt=""
              width="22"
              height="22"
            />
            <span className="mdf-header__donate-label">Doar</span>
          </a>
        </div>
      </div>
    </header>
  );
}
