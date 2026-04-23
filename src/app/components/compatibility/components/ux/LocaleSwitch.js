'use client';

import React, { useState } from 'react';
import { getLocale, setLocale, SUPPORTED_LOCALES } from './strings';

const LABELS = {
  'pt-BR': 'PT',
  'es': 'ES',
};

export default function LocaleSwitch() {
  const [loc, setLoc] = useState(getLocale());

  function pick(next) {
    setLocale(next);
    setLoc(next);
  }

  return (
    <div className="mdf-locale-switch" role="group" aria-label="Idioma">
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={loc === l}
          className={`mdf-locale-switch__btn${loc === l ? ' mdf-locale-switch__btn--on' : ''}`}
          onClick={() => pick(l)}
        >
          {LABELS[l] || l}
        </button>
      ))}
    </div>
  );
}
