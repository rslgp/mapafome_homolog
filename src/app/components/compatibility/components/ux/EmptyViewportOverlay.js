'use client';

import React from 'react';
import './EmptyViewportOverlay.css';
import { t, useLocale } from './strings';

// M5 — "no pins in this area" overlay. Semi-transparent so the map stays
// visible underneath; the direct [Relatar] CTA is the next action.
//
// Dismissable: an X button sits next to the Report CTA, and the card can be
// swiped away (any direction past SWIPE_THRESHOLD px). Dismissal is LOCAL state
// — when the viewport leaves the empty condition and re-enters it (`visible`
// goes false -> true), the overlay reappears, so closing it is a per-empty-area
// gesture, not a permanent opt-out.

const SWIPE_THRESHOLD = 60; // px of travel that counts as a dismiss swipe

export default function EmptyViewportOverlay({ visible, onStartReport }) {
  useLocale(); // re-render on locale change so t() re-reads
  const [dismissed, setDismissed] = React.useState(false);

  // Re-arm the overlay each time the empty condition is freshly entered. This is
  // React's documented "adjust state when a prop changes during render" pattern
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes):
  // store the last `visible` in state, and when it transitions false -> true,
  // clear any prior dismissal so the overlay reappears for the new empty area.
  const [prevVisible, setPrevVisible] = React.useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setDismissed(false);
  }

  // Swipe tracking: remember the touch origin, dismiss if the gesture travels
  // past the threshold in any direction (horizontal OR vertical).
  const touchStart = React.useRef(null);
  const onTouchStart = (e) => {
    const tch = e.touches && e.touches[0];
    touchStart.current = tch ? { x: tch.clientX, y: tch.clientY } : null;
  };
  const onTouchMove = (e) => {
    if (!touchStart.current) return;
    const tch = e.touches && e.touches[0];
    if (!tch) return;
    const dx = tch.clientX - touchStart.current.x;
    const dy = tch.clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_THRESHOLD) {
      touchStart.current = null;
      setDismissed(true);
    }
  };
  const onTouchEnd = () => {
    touchStart.current = null;
  };

  if (!visible || dismissed) return null;

  return (
    <div className="mdf-empty" role="region" aria-label="Nenhum ponto por perto">
      <div
        className="mdf-empty__card"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <p className="mdf-empty__text">
          {t('empty.no_pins_in_view')}
        </p>
        <div className="mdf-empty__actions">
          <button
            type="button"
            className="mdf-empty__cta"
            onClick={onStartReport}
          >
            {t('cta.report')}
          </button>
          <button
            type="button"
            className="mdf-empty__close"
            aria-label={t('empty.close')}
            title={t('empty.close')}
            onClick={() => setDismissed(true)}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}
