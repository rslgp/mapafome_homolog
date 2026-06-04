'use client';

import React from 'react';
import './StepsHint.css';

// Cada passo aponta para a área que deve ganhar foco ao ser tocado. Os
// seletores espelham os do tour guiado (GuidedTutorial) para manter a
// referência única de "onde fica cada passo".
const STEPS = [
  { n: 1, label: 'Toque no mapa', selectors: ['.leaflet-container', '#mdf-target-map'] },
  { n: 2, label: 'Escolha a categoria', selectors: ['#CoffeeTable', '#mdf-target-controls'] },
  { n: 3, label: 'Confirme o ponto', selectors: ['#mdf-target-confirm', '.marcar-local'] },
];

// Rola a tela até o primeiro seletor encontrado, posicionando a área logo
// abaixo do header fixo (sticky) para que o passo escolhido fique visível —
// movimento nítido e distinto para cada passo, como o botão "Ver mais".
function scrollToSelectors(selectors) {
  if (typeof document === 'undefined') return;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const header = document.querySelector('.mdf-header');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const top =
        el.getBoundingClientRect().top + window.scrollY - headerH - 12;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      return;
    }
  }
}

export default function StepsHint({ activeStep = 0 }) {
  const scrollToInstall = () => {
    // Leva a pessoa até os botões de instalar (badges no InfoPanel). Quando o
    // app já está instalado as badges não renderizam, então caímos no painel.
    const target =
      document.querySelector('.ip-apps__install-badges') ||
      document.getElementById('MoreInfo');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <aside
      className="mdf-steps"
      role="region"
      aria-label="Três passos para mapear"
    >
      <ol className="mdf-steps__list">
        {STEPS.map(({ n, label, selectors }) => {
          const state =
            n < activeStep ? 'done' : n === activeStep ? 'active' : 'idle';
          return (
            <li key={n} className={`mdf-steps__item mdf-steps__item--${state}`}>
              <button
                type="button"
                className="mdf-steps__btn"
                onClick={() => scrollToSelectors(selectors)}
                aria-label={`Passo ${n}: ${label} — ir para essa área`}
              >
                <span className="mdf-steps__dot" aria-hidden="true">
                  {n}
                </span>
                <span className="mdf-steps__label">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="mdf-steps__tour"
        onClick={scrollToInstall}
        aria-label="Ver mais e instalar o aplicativo"
      >
        Ver mais
      </button>
    </aside>
  );
}
