'use client';

import React from 'react';
import './LoadErrorBanner.css';
import { t, useLocale } from './strings';

// UX-M26: dignified, retryable error surface for a failed Sheets load. Before
// this, a flaky-connection failure left the map in a permanent silent
// "loading" limbo. Rendered above the map when state.loadError is set; the
// map/controls below still work for any already-cached rows. role=alert so a
// screen reader hears it; the retry button re-runs the same bootstrap.
export default function LoadErrorBanner({ visible, onRetry }) {
  useLocale(); // re-render on locale change so t() re-reads
  if (!visible) return null;
  return (
    <div className="mdf-loaderror" role="alert">
      <p className="mdf-loaderror__text">{t('page.load_error.text')}</p>
      <button
        type="button"
        className="mdf-loaderror__retry"
        onClick={onRetry}
      >
        {t('page.load_error.retry')}
      </button>
    </div>
  );
}
