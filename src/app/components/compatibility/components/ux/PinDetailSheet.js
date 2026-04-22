'use client';

import React, { useEffect, useRef } from 'react';
import './PinDetailSheet.css';
import { urgencyOf } from './mdfMarkers';

// M2 placeholder — shows urgency + category icons + time-since.
// Full donor actions (claim, mark as attended) land in M3.

const CATEGORY_LABELS = {
  comida:  { label: 'Comida',  icon: '🍞' },
  agua:    { label: 'Água',    icon: '💧' },
  roupa:   { label: 'Roupa',   icon: '👕' },
  higiene: { label: 'Higiene', icon: '🧼' },
  abrigo:  { label: 'Abrigo',  icon: '🏠' },
};

const STATUS_COPY = {
  fresh:   { label: 'Aguardando',  cls: 'mdf-pin-sheet__status--fresh' },
  waiting: { label: 'Aguardando',  cls: 'mdf-pin-sheet__status--waiting' },
  stale:   { label: 'Aguardando',  cls: 'mdf-pin-sheet__status--stale' },
  done:    { label: 'Atendido hoje', cls: 'mdf-pin-sheet__status--done' },
};

function formatRelativeTime(dateIso) {
  if (!dateIso) return '';
  const diffMs = Date.now() - Date.parse(dateIso);
  if (Number.isNaN(diffMs)) return '';
  const h = diffMs / 36e5;
  if (h < 1) return `há ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `há ${Math.round(h)}h`;
  return `há ${Math.round(h / 24)} dias`;
}

export default function PinDetailSheet({ open, pin, onClose }) {
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const id = requestAnimationFrame(() => closeRef.current?.focus());

    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open || !pin) return null;

  const attended = Boolean(pin.AlimentoEntregue);
  const urgency = urgencyOf(pin.DateISO, { attended });
  const status = STATUS_COPY[urgency];
  const categories = Array.isArray(pin.Categorias) ? pin.Categorias : [];
  const detail = typeof pin.Detalhe === 'string' ? pin.Detalhe : '';

  return (
    <div className="mdf-pin-sheet" role="dialog" aria-modal="true" aria-labelledby="mdf-pin-title">
      <div className="mdf-pin-sheet__backdrop" aria-hidden="true" onClick={() => onClose?.()} />
      <div className="mdf-pin-sheet__panel">
        <div className="mdf-pin-sheet__handle" aria-hidden="true" />

        <div className={`mdf-pin-sheet__status ${status.cls}`}>
          {status.label}
        </div>

        <h2 id="mdf-pin-title" className="mdf-pin-sheet__title">
          {formatRelativeTime(pin.DateISO) || 'Ponto mapeado'}
        </h2>

        {categories.length > 0 ? (
          <ul className="mdf-pin-sheet__cats" aria-label="Categorias">
            {categories.map((id) => {
              const meta = CATEGORY_LABELS[id] || { label: id, icon: '•' };
              return (
                <li key={id} className="mdf-pin-sheet__cat">
                  <span className="mdf-pin-sheet__cat-icon" aria-hidden="true">{meta.icon}</span>
                  <span>{meta.label}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mdf-pin-sheet__empty">Sem categorias informadas.</p>
        )}

        {detail && (
          <p className="mdf-pin-sheet__detail">{detail}</p>
        )}

        <p className="mdf-pin-sheet__stub">
          Ações de voluntário chegam em breve.
        </p>

        <div className="mdf-pin-sheet__actions">
          <button
            ref={closeRef}
            type="button"
            className="mdf-pin-sheet__close"
            onClick={() => onClose?.()}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
