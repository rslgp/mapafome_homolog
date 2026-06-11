'use client';

// PetMapLoadStates.js — PET-M20: the three explicit MAP-LOAD surfaces.
//
// One presentational component that renders EXACTLY ONE of:
//   • LOADING — a calm SKELETON region (aria-busy="true"), NOT a spinner-only
//     affordance. Screen-reader announced via role=status; the shimmer is CSS
//     and is suppressed under prefers-reduced-motion (no animation when reduced).
//   • EMPTY  — a hopeful "Nenhum pet reportado por aqui ainda — seja o primeiro a
//     ajudar" with an arrow POINTING DOWN to the fixed "Relatar um pet" FAB.
//     role=status (calm information, not an error).
//   • ERROR  — upgrades the old flat role=alert banner: same calm pt-BR copy PLUS
//     a keyboard-operable >=44px "Tentar de novo" that RE-RUNS fetchPets (the
//     parent passes onRetry) WITHOUT a full page reload.
//   • READY  — renders nothing (returns null); the parent shows the map/list.
//
// Calm-tone governor (PET_CURVE §2): no alarm-red tokens, no urgency. The empty
// state is hopeful, not sad; the error state reassures ("você ainda pode relatar")
// instead of scolding. All copy pt-BR (es parity rides PET-M23).
//
// This component is PURE/presentational and renders in jsdom (no Leaflet), so it
// is unit-covered. The load-state DECISION lives in petMapLoadState.mapLoadState.

import React from 'react';
import PropTypes from 'prop-types';
import { PET_MAP_LOAD_STATE } from './petMapLoadState';

// LOADING — a skeleton region, announced as busy. Three placeholder bars stand
// in for the incoming pins/rows so the wait reads as "loading content", not a
// blank void. aria-busy + role=status: an assistive-tech user hears it is
// working. The bars are aria-hidden (decorative); the sr-only line carries the
// words. Shimmer is a CSS animation gated off under prefers-reduced-motion.
function LoadingState() {
  return (
    <div
      className="pet-mapstate pet-mapstate--loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="mdf-sr-only">Carregando os pets do mapa…</span>
      <div className="pet-skeleton" aria-hidden="true">
        <span className="pet-skeleton__bar pet-skeleton__bar--wide" />
        <span className="pet-skeleton__bar" />
        <span className="pet-skeleton__bar pet-skeleton__bar--narrow" />
      </div>
    </div>
  );
}

// EMPTY — hopeful, points to the Relatar FAB. role=status so it is announced
// (the page just resolved to "nothing here yet"). The arrow is decorative
// (aria-hidden); the sentence already says "seja o primeiro a ajudar", which is
// the call to action in words.
function EmptyState() {
  return (
    <div className="pet-mapstate pet-mapstate--empty" role="status">
      <p className="pet-mapstate__lead">
        <span className="pet-mapstate__icon" aria-hidden="true">🐾</span>
        Nenhum pet reportado por aqui ainda — seja o primeiro a ajudar.
      </p>
      <p className="pet-mapstate__point">
        Toque em <b>Relatar um pet</b>, logo abaixo.{' '}
        <span className="pet-mapstate__arrow" aria-hidden="true">↓</span>
      </p>
    </div>
  );
}

// ERROR + RETRY — role=alert (assertive: the failure must be heard), calm copy,
// and a real >=44px keyboard-operable button that re-runs the fetch. No reload:
// onRetry is the parent's fetchPets re-runner.
function ErrorState({ onRetry }) {
  return (
    <div className="pet-mapstate pet-mapstate--error" role="alert">
      <p className="pet-mapstate__lead">
        Não foi possível carregar os pets agora. Você ainda pode relatar um —
        e pode tentar carregar de novo.
      </p>
      <button
        type="button"
        className="pet-mapstate__retry"
        onClick={onRetry}
      >
        <span aria-hidden="true">↻</span> Tentar de novo
      </button>
    </div>
  );
}

ErrorState.propTypes = { onRetry: PropTypes.func };

export default function PetMapLoadStates({ state, onRetry }) {
  switch (state) {
    case PET_MAP_LOAD_STATE.LOADING:
      return <LoadingState />;
    case PET_MAP_LOAD_STATE.EMPTY:
      return <EmptyState />;
    case PET_MAP_LOAD_STATE.ERROR:
      return <ErrorState onRetry={onRetry} />;
    default:
      // READY (or unknown): the parent renders the map/list; nothing here.
      return null;
  }
}

PetMapLoadStates.propTypes = {
  state: PropTypes.string,
  onRetry: PropTypes.func,
};
