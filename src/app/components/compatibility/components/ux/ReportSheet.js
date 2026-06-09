'use client';

import React, { useEffect, useRef, useState } from 'react';
import './ReportSheet.css';
import { track } from './analytics';

// M1 — three-step reporter flow (design_brief § three_step_promise).
// Step 1 (map click) happens outside; this sheet hosts Steps 2 and 3.

const CATEGORIES = [
  { id: 'comida',  label: 'Comida',  icon: '🍞' },
  { id: 'agua',    label: 'Água',    icon: '💧' },
  { id: 'roupa',   label: 'Roupa',   icon: '👕' },
  { id: 'higiene', label: 'Higiene', icon: '🧼' },
  { id: 'abrigo',  label: 'Abrigo',  icon: '🏠' },
];

const ERRORS = {
  at_least_one_category: 'Escolha pelo menos uma necessidade.',
  publish_failed: 'Não foi possível publicar. Verifique sua conexão e tente de novo.',
};

export default function ReportSheet({ open, coords, onClose, onPublish }) {
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState('');
  const [contact, setContact] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | publishing | success | error
  const [errorMsg, setErrorMsg] = useState(null);
  const startedAtRef = useRef(null);
  const sheetRef = useRef(null);
  const firstFocusRef = useRef(null);
  const triggerRef = useRef(null);
  const dragRef = useRef(null);
  const [sheetHeightVh, setSheetHeightVh] = useState(null); // null = CSS default

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    startedAtRef.current = Date.now();
    // Reset per-open state. This effect also owns focus capture/restore, the
    // drag lifecycle and Escape handling for the sheet, so keying the component
    // to remount would disrupt the open/close animation without benefit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional per-open reset; effect also owns focus/drag/Escape lifecycle
    setSelected(new Set());
    setDetail('');
    setContact('');
    setDetailOpen(false);
    setContactOpen(false);
    setStatus('idle');
    setErrorMsg(null);
    setSheetHeightVh(null);

    // Focus first actionable control on open.
    const id = requestAnimationFrame(() => firstFocusRef.current?.focus());

    const onKey = (e) => {
      if (e.key === 'Escape' && status !== 'publishing') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onHandlePointerDown(e) {
    // Only enable drag on coarse pointers (touch) below the desktop breakpoint.
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startHeightPx = sheetRef.current?.getBoundingClientRect().height
      || (0.7 * window.innerHeight);
    dragRef.current = {
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startHeightPx,
      viewportH: window.innerHeight,
    };
  }

  function onHandlePointerMove(e) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const deltaY = d.startClientY - e.clientY; // drag up = positive
    const nextPx = d.startHeightPx + deltaY;
    const minPx = 0.4 * d.viewportH;
    const maxPx = 0.95 * d.viewportH;
    const clampedPx = Math.max(minPx, Math.min(maxPx, nextPx));
    setSheetHeightVh((clampedPx / d.viewportH) * 100);
  }

  function onHandlePointerUp(e) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) {}
    dragRef.current = null;
    // Snap to 70% (default) or 95% (expanded).
    setSheetHeightVh((h) => (h != null && h >= 82 ? 95 : 70));
  }

  if (!open) return null;

  function toggleCategory(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (errorMsg === ERRORS.at_least_one_category) setErrorMsg(null);
  }

  async function handlePublish() {
    if (selected.size === 0) {
      setErrorMsg(ERRORS.at_least_one_category);
      return;
    }
    setStatus('publishing');
    setErrorMsg(null);

    const categories = Array.from(selected);
    const timeFromStartMs = Date.now() - (startedAtRef.current || Date.now());

    // M5 — idempotency key survives retries so a double-tap after a 10s
    // timeout does not double-write the pin.
    const idempotencyKey =
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      await onPublish?.({
        coords,
        categories,
        detail: detail.trim(),
        contact: contact.trim(),
        idempotency_key: idempotencyKey,
      });

      track('pin_report_published', {
        categories,
        has_detail: detail.trim().length > 0,
        has_contact: contact.trim().length > 0,
        time_from_start_ms: timeFromStartMs,
      });

      setStatus('success');
      // Per brief: 'Publicado ✓' for 1.2s, then close.
      setTimeout(() => onClose?.('published'), 1200);
    } catch (err) {
      track('pin_report_failed', { reason: err?.message || 'unknown' });
      setStatus('error');
      setErrorMsg(ERRORS.publish_failed);
    }
  }

  const buttonLabel =
    status === 'publishing' ? 'Publicando…'
    : status === 'success' ? 'Publicado ✓'
    : status === 'error' ? 'Tentar de novo'
    : 'Publicar ponto';

  const locationLabel = coords
    ? `Ponto em: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
    : 'Toque no mapa para escolher o local';

  return (
    <div className="mdf-sheet" role="dialog" aria-modal="true" aria-labelledby="mdf-sheet-title">
      <div
        className="mdf-sheet__backdrop"
        aria-hidden="true"
        onClick={() => status !== 'publishing' && onClose?.()}
      />
      <div
        className="mdf-sheet__panel"
        ref={sheetRef}
        style={sheetHeightVh != null ? { height: `${sheetHeightVh}dvh`, maxHeight: `${sheetHeightVh}dvh` } : undefined}
      >
        <div
          className="mdf-sheet__handle"
          role="separator"
          aria-label="Arraste para redimensionar"
          aria-valuemin={40}
          aria-valuemax={95}
          aria-valuenow={Math.round(sheetHeightVh ?? 70)}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        />

        <header className="mdf-sheet__header">
          <h2 id="mdf-sheet-title" className="mdf-sheet__title">
            O que a pessoa precisa agora?
          </h2>
          <p className="mdf-sheet__subtitle">Você pode escolher mais de uma.</p>
          <p className="mdf-sheet__location">{locationLabel}</p>
        </header>

        {errorMsg === ERRORS.at_least_one_category && (
          <p className="mdf-sheet__inline-error" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="mdf-sheet__chips" role="group" aria-label="Categorias">
          {CATEGORIES.map((cat, i) => {
            const checked = selected.has(cat.id);
            return (
              <button
                ref={i === 0 ? firstFocusRef : null}
                key={cat.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={`mdf-chip${checked ? ' mdf-chip--on' : ''}`}
                onClick={() => toggleCategory(cat.id)}
                disabled={status === 'publishing' || status === 'success'}
              >
                <span className="mdf-chip__icon" aria-hidden="true">{cat.icon}</span>
                <span className="mdf-chip__label">{cat.label}</span>
                {checked && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>

        <details
          className="mdf-sheet__expander"
          open={detailOpen}
          onToggle={(e) => setDetailOpen(e.target.open)}
        >
          <summary>Adicionar detalhe (opcional)</summary>
          <label className="mdf-sr-only" htmlFor="mdf-detail">Detalhe</label>
          <input
            id="mdf-detail"
            type="text"
            className="mdf-sheet__input"
            placeholder="Ex: idoso, perto da farmácia"
            maxLength={140}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            disabled={status === 'publishing' || status === 'success'}
          />
        </details>

        <details
          className="mdf-sheet__expander"
          open={contactOpen}
          onToggle={(e) => setContactOpen(e.target.open)}
        >
          <summary>Seu contato (opcional)</summary>
          <p className="mdf-sheet__helper">
            Um voluntário pode querer confirmar com você antes de ir até o local.
          </p>
          <label className="mdf-sr-only" htmlFor="mdf-contact">Contato</label>
          <input
            id="mdf-contact"
            type="text"
            className="mdf-sheet__input"
            placeholder="Ex: (81) 99999-0000 ou @seuperfil"
            maxLength={60}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={status === 'publishing' || status === 'success'}
          />
          <p className="mdf-sheet__consent">
            Ao informar um contato, você concorda com os{' '}
            <a href="/privacy.html" target="_blank" rel="noreferrer">Termos de Privacidade</a>
            . Seu contato só é mostrado a voluntários que abrirem o ponto e só para coordenação do atendimento.
          </p>
        </details>

        {errorMsg === ERRORS.publish_failed && (
          <p className="mdf-sheet__inline-error" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="mdf-sheet__actions">
          <button
            type="button"
            className="mdf-sheet__cancel"
            onClick={() => onClose?.()}
            disabled={status === 'publishing'}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`mdf-sheet__publish mdf-sheet__publish--${status}`}
            onClick={handlePublish}
            disabled={status === 'publishing' || status === 'success'}
          >
            {status === 'publishing' && <span className="mdf-sheet__spinner" aria-hidden="true" />}
            <span>{buttonLabel}</span>
          </button>
        </div>

        <p className="mdf-sheet__consent mdf-sheet__consent--below-cta">
          Ao confirmar a inserção do ponto, você está de acordo com os{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer">Termos de Privacidade</a>
          {' '}e os{' '}
          <a href="/terms.html" target="_blank" rel="noreferrer">Termos de Uso</a>.
        </p>
      </div>
    </div>
  );
}
