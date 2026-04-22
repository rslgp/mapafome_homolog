'use client';

import React from 'react';
import './ux/Header.css';
import mapaFomeMark from '../images/MapaFome_Icons_Blue.svg';

export default function Header({ rowCountProp, onStartTour, onStartReport }) {
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
        </div>
      </div>
    </header>
  );
}
