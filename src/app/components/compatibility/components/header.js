'use client';

import React from 'react';
import './ux/Header.css';
import mapaFomeMark from '../images/MapaFome_Icons_Blue.svg';
import useInstallPrompt from './ux/useInstallPrompt';

export default function Header({ rowCountProp, onStartTour, onStartReport }) {
  const { isInstalled, promptInstall } = useInstallPrompt();

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
                {' — mapafome.com.br '}
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
              Relatar
            </button>
          )}
          {onStartTour && (
            <button
              type="button"
              className="mdf-header__tour"
              onClick={onStartTour}
              aria-label="Ver tutorial dos três passos"
            >
              <span className="mdf-header__tour-label">Como funciona</span>
              <span className="mdf-header__tour-icon" aria-hidden="true">?</span>
            </button>
          )}
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
            href="https://nubank.com.br/pagar/2i6kb/zRE5wsvEe2"
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
