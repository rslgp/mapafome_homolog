'use client';

import React from 'react';
import './StepsHint.css';

const STEPS = [
  { n: 1, label: 'Toque no mapa' },
  { n: 2, label: 'Escolha a categoria' },
  { n: 3, label: 'Confirme o ponto' },
];

export default function StepsHint({ activeStep = 0, onStartTour }) {
  return (
    <aside
      className="mdf-steps"
      role="region"
      aria-label="Três passos para mapear"
    >
      <ol className="mdf-steps__list">
        {STEPS.map(({ n, label }) => {
          const state =
            n < activeStep ? 'done' : n === activeStep ? 'active' : 'idle';
          return (
            <li key={n} className={`mdf-steps__item mdf-steps__item--${state}`}>
              <span className="mdf-steps__dot" aria-hidden="true">
                {n}
              </span>
              <span className="mdf-steps__label">{label}</span>
            </li>
          );
        })}
      </ol>
      {onStartTour && (
        <button
          type="button"
          className="mdf-steps__tour"
          onClick={onStartTour}
          aria-label="Ver tutorial dos três passos"
        >
          Ver tutorial
        </button>
      )}
    </aside>
  );
}
