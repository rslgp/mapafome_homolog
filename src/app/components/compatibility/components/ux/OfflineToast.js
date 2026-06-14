'use client';

import React, { useEffect } from 'react';
import './OfflineToast.css';
import { t, useLocale } from './strings';

export default function OfflineToast({ message, onDismiss, autoHideMs = 6000 }) {
  useLocale(); // re-render on locale change so t() re-reads
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDismiss?.(), autoHideMs);
    return () => clearTimeout(id);
  }, [message, onDismiss, autoHideMs]);

  if (!message) return null;

  return (
    <div className="mdf-toast" role="status" aria-live="polite">
      <span className="mdf-toast__text">{message}</span>
      <button
        type="button"
        className="mdf-toast__dismiss"
        onClick={() => onDismiss?.()}
        aria-label={t('page.toast.close_notice')}
      >
        ✕
      </button>
    </div>
  );
}
