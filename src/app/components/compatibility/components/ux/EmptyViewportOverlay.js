'use client';

import React from 'react';
import './EmptyViewportOverlay.css';

// M5 — "no pins in this area" overlay. Semi-transparent so the map stays
// visible underneath; the direct [Relatar] CTA is the next action.

export default function EmptyViewportOverlay({ visible, onStartReport }) {
  if (!visible) return null;
  return (
    <div className="mdf-empty" role="region" aria-label="Nenhum ponto por perto">
      <div className="mdf-empty__card">
        <p className="mdf-empty__text">
          Ninguém foi mapeado nesta área ainda. Se você viu alguém precisando, toque em Relatar.
        </p>
        <button
          type="button"
          className="mdf-empty__cta"
          onClick={onStartReport}
        >
          Relatar
        </button>
      </div>
    </div>
  );
}
