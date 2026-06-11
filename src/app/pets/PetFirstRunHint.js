'use client';

// PetFirstRunHint.js — PET-M20: a dismissible ONE-TIME first-visit hint.
//
// Stage A of the curve (welcoming arrival, PET_CURVE §1-A): a single calm,
// one-glance line that teaches the core flow — "toque no mapa onde viu o pet,
// depois Relatar um pet" — then is dismissed forever (localStorage flag, owned
// by petMapLoadState). It is NOT a guided multi-step tour (that's excluded) and
// NOT a nag: shown once, dismissed, gone.
//
// a11y: role=status (announced calmly on arrival, not an alert) + a real >=44px
// keyboard-operable "Entendi" dismiss button. Calm-tone: a quiet token-only
// surface, no urgency. pt-BR (es parity rides PET-M23).
//
// The localStorage read/write is the parent's job (PetsApp owns the seen flag via
// readFirstRunHintSeen/markFirstRunHintSeen) so this component stays a pure
// presentational unit (open + onDismiss) — easy to render and assert in jsdom.

import React from 'react';
import PropTypes from 'prop-types';
import { t, useLocale } from '../components/compatibility/components/ux/strings';

export default function PetFirstRunHint({ open, onDismiss }) {
  // PET-M23 — re-render on a locale switch so every t() re-reads.
  useLocale();
  if (!open) return null;
  return (
    <aside className="pet-firsthint" role="status" aria-label={t('pets.hint.aria')}>
      <p className="pet-firsthint__text">
        <span className="pet-firsthint__icon" aria-hidden="true">👆</span>
        {t('pets.hint.text.pre')} <b>{t('pets.hint.text.cta')}</b>.
      </p>
      <button
        type="button"
        className="pet-firsthint__dismiss"
        onClick={onDismiss}
      >
        {t('pets.hint.dismiss')}
      </button>
    </aside>
  );
}

PetFirstRunHint.propTypes = {
  open: PropTypes.bool,
  onDismiss: PropTypes.func,
};
