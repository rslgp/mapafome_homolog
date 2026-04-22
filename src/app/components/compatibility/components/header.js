'use client';

import React from 'react';
import './ux/Header.css';
import mapaFomeMark from '../images/MapaFome_Icons_Blue.svg';

export default function Header({ rowCountProp, onStartTour }) {
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
          <span className="mdf-header__wordmark">MAPA FOME - mapafome.com.br <a href="https://rslgp.github.io/mapafome">versao antiga</a></span>
        </div>
        <div className="mdf-header__meta" aria-live="polite">
          {typeof rowCountProp === 'number' || (typeof rowCountProp === 'string' && rowCountProp !== '') ? (
            <span className="mdf-header__count">
              <strong>{rowCountProp}</strong> pontos mapeados
            </span>
          ) : null}
        </div>
        {onStartTour && (
          <button
            type="button"
            className="mdf-header__tour"
            onClick={onStartTour}
            aria-label="Ver tutorial dos três passos"
          >
            Como funciona
          </button>
        )}
      </div>
    </header>
  );
}
