'use client';

import { useState } from 'react';

// CopyControls.js — the clipboard interaction layer for /imprensa, extracted from
// page.js (SRP): the useCopy hook + the CopyButton and Swatch presentational
// components that depend on it. Owns navigator.clipboard + the copied/failed label
// state machine. Carries its own 'use client' (useState + clipboard). Internal to
// the route folder; page.js imports { CopyButton, Swatch } from here.

// Shared clipboard hook: copies text and flips the label for a few seconds.
// Falls back to a "select manually" hint when the Clipboard API is blocked
// (insecure context, permissions) so the action never silently no-ops.
function useCopy() {
  const [state, setState] = useState('idle'); // idle | copied | failed
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      setTimeout(() => setState('idle'), 3000);
    } catch (_e) {
      setState('failed');
      setTimeout(() => setState('idle'), 4000);
    }
  };
  return [state, copy];
}

export function CopyButton({ text, idleLabel = 'Copiar', ariaLabel, ghost = false }) {
  const [state, copy] = useCopy();
  const label = state === 'copied' ? 'Copiado ✓' : state === 'failed' ? 'Selecione e copie' : idleLabel;
  return (
    <button
      type="button"
      className={`mdf-press__copy${ghost ? ' mdf-press__copy--ghost' : ''}`}
      onClick={() => copy(text)}
      aria-label={ariaLabel || idleLabel}
    >
      <span aria-live="polite">{label}</span>
    </button>
  );
}

export function Swatch({ c }) {
  const [state, copy] = useCopy();
  const status = state === 'copied' ? 'Copiado ✓' : state === 'failed' ? 'Copie manualmente' : '';
  return (
    <button
      type="button"
      className={`mdf-press__swatch${c.light ? ' mdf-press__swatch--light' : ''}`}
      onClick={() => copy(c.hex)}
      aria-label={`Copiar hex ${c.hex} — ${c.name}`}
    >
      <span className="mdf-press__swatch-band" style={{ background: c.cssVar || c.hex }} aria-hidden="true" />
      <span className="mdf-press__swatch-body">
        <span className="mdf-press__swatch-name">{c.name}</span>
        <code className="mdf-press__swatch-hex">{c.hex}</code>
        {c.token && <code className="mdf-press__swatch-token">{c.token}</code>}
        <span className={`mdf-press__swatch-role${c.warn ? ' mdf-press__swatch-role--warn' : ''}`}>{c.role}</span>
        <span className="mdf-press__swatch-status" aria-live="polite">{status}</span>
      </span>
    </button>
  );
}
