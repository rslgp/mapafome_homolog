'use client';

import React, { useEffect, useState } from 'react';
import './ColorsHint.css';
import { t, useLocale } from './strings';

// UX-M13: one-shot color vocabulary. The pin colors are the map's core
// vocabulary and are only explained below the fold — exactly where most
// users never went (UX-M00 finding). This chip appears ONCE, above the map,
// the first time pins are on screen, and never again after dismissal
// (localStorage). Calm: plain note, dismissible, no motion.
const SEEN_KEY = 'mdf_colors_hint_seen';

const DOTS = [
  ['mdf-colorshint__dot--yellow'],
  ['mdf-colorshint__dot--blue'],
  ['mdf-colorshint__dot--red'],
  ['mdf-colorshint__dot--green'],
];

export default function ColorsHint({ hasPins }) {
  useLocale(); // re-render on locale change so t() re-reads
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasPins) return;
    try {
      if (window.localStorage.getItem(SEEN_KEY) === '1') return;
    } catch {
      return; // storage unavailable (private mode): stay quiet, never nag
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage (external state) post-mount on purpose; a render-time read would mismatch SSR hydration (house idiom, see ViewMoreCue)
    setShow(true);
  }, [hasPins]);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // storage unavailable: dismissal lasts the session only
    }
  };

  if (!show) return null;

  return (
    <div className="mdf-colorshint" role="note">
      <span className="mdf-colorshint__dots" aria-hidden="true">
        {DOTS.map(([cls]) => (
          <span key={cls} className={`mdf-colorshint__dot ${cls}`} />
        ))}
      </span>
      <span className="mdf-colorshint__text">{t('page.map.colors_hint')}</span>
      <button
        type="button"
        className="mdf-colorshint__close"
        aria-label={t('page.toast.close_notice')}
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
