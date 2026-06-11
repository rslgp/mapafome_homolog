'use client';

// PetPublishClosure.js — PET-M20 / PET_CURVE §4: the post-publish CLOSURE
// micro-state. The single "reward/closure" point of the loop (stage B), and the
// easiest to ruin. This is REASSURANCE, not a spike.
//
// Contract (PET_CURVE §4, audited leg-by-leg):
//   1. DISCERNIBLE + LOCATED confirmation: a calm "seu pet está no mapa" message;
//      the parent recenters/highlights the just-dropped pin (resolveClosurePin)
//      so the confirmation is SPATIAL, not an abstract toast. Announced to AT via
//      role=status + aria-live (the audience is in acute stress — feedback must
//      be heard, not hunted).
//   2. REASSURANCE, NOT NAG: the copy communicates REACH ("qualquer pessoa por
//      perto pode reconhecê-lo") — what deflates stage B. BANNED here (governor
//      §2): any clock, "volte amanhã", streak, badge, countdown, or confetti.
//   3. EXACTLY ONE next-decision: a single calm action — "Ver no mapa" (close and
//      look at the highlighted pin). M19 "Compartilhar" may not exist yet, so the
//      safe single next-step is ver-no-mapa/dismiss. NOT a menu, NOT two
//      competing CTAs, NOT a third "convide amigos".
//   4. DISMISSIBLE + SILENT AFTER: closes on the button or Escape and does NOT
//      reappear or remind. A rest, not a hook.
//
// Calm-tone: tokens only, no alarm color, no celebratory accent (the warm-but-not
// -spiked rule). All copy pt-BR (es parity rides PET-M23).
//
// Presentational + jsdom-renderable (no Leaflet), so it is unit-covered. The pin
// identity/recenter happens in the parent (PetsApp) via resolveClosurePin.

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { t, useLocale } from '../components/compatibility/components/ux/strings';

export default function PetPublishClosure({ open, onSeeOnMap, onDismiss }) {
  // PET-M23 — re-render on a locale switch so every t() re-reads.
  useLocale();
  const panelRef = useRef(null);
  const primaryRef = useRef(null);
  const triggerRef = useRef(null);

  // Focus capture/restore + Escape-to-dismiss — the same modal discipline the
  // report/detail sheets use. On open we remember the previously focused element
  // and move focus to the primary next-decision so a keyboard/AT user lands on
  // the one calm action; on close we restore focus to the trigger so they are
  // not stranded. Escape dismisses (a dismissal path). setState lives only in the
  // handler/cleanup, never the synchronous effect body.
  useEffect(() => {
    if (!open) return undefined;
    triggerRef.current = document.activeElement;
    const id = requestAnimationFrame(() => primaryRef.current?.focus());
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    // role=status + aria-live=polite: the confirmation is announced calmly (not
    // an alert — this is good news, not an error). aria-labelledby ties the
    // region to its heading for AT.
    <div
      className="pet-closure"
      role="status"
      aria-live="polite"
      aria-labelledby="pet-closure-title"
      ref={panelRef}
    >
      <div className="pet-closure__card">
        <p className="pet-closure__icon" aria-hidden="true">🐾</p>
        <h2 id="pet-closure-title" className="pet-closure__title">
          {t('pets.closure.title')}
        </h2>
        <p className="pet-closure__lead">
          {t('pets.closure.lead')}
        </p>
        <div className="pet-closure__actions">
          {/* EXACTLY ONE next-decision: ver no mapa (close + look at the
              highlighted pin). The dismiss link below is a dismissal path, not a
              second competing CTA. */}
          <button
            ref={primaryRef}
            type="button"
            className="pet-closure__primary"
            onClick={onSeeOnMap}
          >
            {t('pets.closure.seeOnMap')}
          </button>
          <button
            type="button"
            className="pet-closure__dismiss"
            onClick={onDismiss}
          >
            {t('pets.closure.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}

PetPublishClosure.propTypes = {
  open: PropTypes.bool,
  onSeeOnMap: PropTypes.func,
  onDismiss: PropTypes.func,
};
