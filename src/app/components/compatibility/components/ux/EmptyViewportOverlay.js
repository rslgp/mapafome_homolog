'use client';

import React from 'react';
import './EmptyViewportOverlay.css';
import { t, useLocale } from './strings';

// M5 — "no pins in this area" overlay. Semi-transparent so the map stays
// visible underneath; the direct [Relatar] CTA is the next action.

export default function EmptyViewportOverlay({ visible, onStartReport }) {
  useLocale(); // re-render on locale change so t() re-reads
  if (!visible) return null;
  return (
    <div className="mdf-empty" role="region" aria-label="Nenhum ponto por perto">
      <div className="mdf-empty__card">
        <p className="mdf-empty__text">
          {t('empty.no_pins_in_view')}
        </p>
        <button
          type="button"
          className="mdf-empty__cta"
          onClick={onStartReport}
        >
          {t('cta.report')}
        </button>
      </div>
    </div>
  );
}
