'use client';

import React, { useEffect } from 'react';
import './OfflineToast.css';

export default function OfflineToast({ message, onDismiss, autoHideMs = 6000 }) {
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
        aria-label="Fechar aviso"
      >
        ✕
      </button>
    </div>
  );
}
