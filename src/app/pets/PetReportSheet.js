'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../components/compatibility/components/ux/ReportSheet.css';
import './pets.css';
import { PET_STATUSES, PET_SPECIES, PET_SIZES } from './petDomain';

// /pets — reporter bottom-sheet, forked from the hunger ReportSheet.
// Key difference from the hunger flow: STATUS is a SINGLE-SELECT, REQUIRED
// radio-group (one pin = one report: perdido / encontrado / avistado), NOT the
// multi-select checkbox set used for hunger categories. Species/size are also
// single-select but optional; species defaults to 'outro'.

const DEFAULT_SPECIES = 'outro';

const ERRORS = {
  status_required: 'Escolha uma situação: perdido, encontrado ou avistado.',
  publish_failed: 'Não foi possível publicar. Verifique sua conexão e tente de novo.',
};

function newIdempotencyKey() {
  // Survives retries so a double-tap after a slow publish does not double-write.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function PetReportSheet({ open, coords, onClose, onPublish }) {
  const [status, setStatus] = useState(null);       // 'perdido' | 'encontrado' | 'avistado'
  const [species, setSpecies] = useState(DEFAULT_SPECIES);
  const [size, setSize] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [contact, setContact] = useState('');
  const [detail, setDetail] = useState('');
  const [photos, setPhotos] = useState('');         // link do Google Drive com fotos (opcional)
  const [moreOpen, setMoreOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [phase, setPhase] = useState('idle');       // idle | publishing | success | error
  const [errorMsg, setErrorMsg] = useState(null);

  const sheetRef = useRef(null);
  const firstFocusRef = useRef(null);
  const triggerRef = useRef(null);
  const dragRef = useRef(null);
  const [sheetHeightVh, setSheetHeightVh] = useState(null); // null = CSS default

  useEffect(() => {
    if (!open) return undefined;
    triggerRef.current = document.activeElement;
    // Reset per-open state so a reopened sheet never shows stale input. This
    // effect also owns focus capture/restore + Escape + drag lifecycle, so
    // keying the component to remount would disrupt the open/close animation.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional per-open reset; effect also owns focus/drag/Escape lifecycle
    setStatus(null);
    setSpecies(DEFAULT_SPECIES);
    setSize('');
    setName('');
    setColor('');
    setContact('');
    setDetail('');
    setPhotos('');
    setMoreOpen(false);
    setContactOpen(false);
    setPhase('idle');
    setErrorMsg(null);
    setSheetHeightVh(null);

    const id = requestAnimationFrame(() => firstFocusRef.current?.focus());

    const onKey = (e) => {
      if (e.key === 'Escape' && phase !== 'publishing') onClose?.();
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
    // Drag-resize only on coarse pointers below the desktop breakpoint.
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
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_err) { /* ignore */ }
    dragRef.current = null;
    setSheetHeightVh((h) => (h != null && h >= 82 ? 95 : 70));
  }

  if (!open) return null;

  function chooseStatus(id) {
    setStatus(id);
    if (errorMsg === ERRORS.status_required) setErrorMsg(null);
  }

  async function handlePublish() {
    if (!status) {
      setErrorMsg(ERRORS.status_required);
      return;
    }
    setPhase('publishing');
    setErrorMsg(null);

    try {
      await onPublish?.({
        coords,
        status,
        species,
        size,
        color: color.trim(),
        name: name.trim(),
        contact: contact.trim(),
        detail: detail.trim(),
        photos: photos.trim(),
        idempotency_key: newIdempotencyKey(),
      });
      setPhase('success');
      // 'Publicado ✓' for ~1.2s, then close.
      setTimeout(() => onClose?.('published'), 1200);
    } catch (err) {
      // Surface the real reason (missing config, out-of-bounds coords, network)
      // to the console — the inline copy stays calm/generic, but a swallowed
      // error makes a failed publish undiagnosable. Mirrors the hunger flow's
      // need to distinguish causes (see PETS_MILESTONES: richer error + offline queue).
      console.error('[pets] publish failed:', err && err.message ? err.message : err);
      setPhase('error');
      setErrorMsg(ERRORS.publish_failed);
    }
  }

  const busy = phase === 'publishing' || phase === 'success';

  const buttonLabel =
    phase === 'publishing' ? 'Publicando…'
      : phase === 'success' ? 'Publicado ✓'
        : phase === 'error' ? 'Tentar de novo'
          : 'Publicar pet';

  const locationLabel = coords
    ? `Ponto em: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
    : 'Toque no mapa para escolher o local';

  return (
    <div className="mdf-sheet" role="dialog" aria-modal="true" aria-labelledby="pet-sheet-title">
      <div
        className="mdf-sheet__backdrop"
        aria-hidden="true"
        onClick={() => !busy && onClose?.()}
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
          <h2 id="pet-sheet-title" className="mdf-sheet__title">
            Reportar um pet
          </h2>
          <p className="mdf-sheet__subtitle">
            Um detalhe ajuda — mas o essencial é marcar o local e a situação.
          </p>
          <p className="mdf-sheet__location">{locationLabel}</p>
        </header>

        {errorMsg === ERRORS.status_required && (
          <p className="mdf-sheet__inline-error" role="alert">
            {errorMsg}
          </p>
        )}

        <fieldset className="pet-fieldset">
          <legend className="pet-legend">Qual é a situação?</legend>
          <div className="mdf-sheet__chips" role="radiogroup" aria-label="Situação do pet">
            {PET_STATUSES.map((s, i) => {
              const checked = status === s.id;
              return (
                <button
                  ref={i === 0 ? firstFocusRef : null}
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={`pet-chip pet-chip--${s.id}${checked ? ' pet-chip--on' : ''}`}
                  onClick={() => chooseStatus(s.id)}
                  disabled={busy}
                >
                  <span className="pet-chip__top">
                    <span className="mdf-chip__icon" aria-hidden="true">{s.icon}</span>
                    <span className="mdf-chip__label">{s.label}</span>
                    {checked && <span className="pet-chip__check" aria-hidden="true">✓</span>}
                  </span>
                  <span className="pet-chip__hint">{s.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pet-fieldset">
          <legend className="pet-legend">Espécie</legend>
          <div className="mdf-sheet__chips" role="radiogroup" aria-label="Espécie do pet">
            {PET_SPECIES.map((s) => {
              const checked = species === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={`mdf-chip${checked ? ' mdf-chip--on' : ''}`}
                  onClick={() => setSpecies(s.id)}
                  disabled={busy}
                >
                  <span className="mdf-chip__icon" aria-hidden="true">{s.icon}</span>
                  <span className="mdf-chip__label">{s.label}</span>
                  {checked && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pet-fieldset">
          <legend className="pet-legend">Porte (opcional)</legend>
          <div className="mdf-sheet__chips" role="radiogroup" aria-label="Porte do pet">
            {PET_SIZES.map((s) => {
              const checked = size === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={`mdf-chip${checked ? ' mdf-chip--on' : ''}`}
                  onClick={() => setSize(checked ? '' : s.id)}
                  disabled={busy}
                >
                  <span className="mdf-chip__label">{s.label}</span>
                  {checked && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Album — the single biggest recognition aid (PET-M13). Promoted out of
            the optional expander into an always-visible, emphasized field so a
            reporter actually sees it. Still optional: publishing works with no link. */}
        <div className="pet-album-field">
          <label className="pet-album-field__label" htmlFor="pet-photos">
            <span className="pet-album-field__icon" aria-hidden="true">📷</span>
            Fotos do pet — o que mais ajuda a reconhecer
          </label>
          <input
            id="pet-photos"
            type="url"
            inputMode="url"
            className="mdf-sheet__input pet-input pet-album-field__input"
            placeholder="Cole aqui o link da pasta do Google Drive"
            maxLength={500}
            value={photos}
            onChange={(e) => setPhotos(e.target.value)}
            disabled={busy}
          />
          <p className="mdf-sheet__helper pet-album-field__helper">
            Uma foto é o que mais ajuda no reencontro. Cole o link de uma pasta do
            Google Drive e deixe-a como “qualquer pessoa com o link pode ver”. Sem
            foto também publica — mas com foto, muito mais gente reconhece.
          </p>
        </div>

        <details
          className="mdf-sheet__expander"
          open={moreOpen}
          onToggle={(e) => setMoreOpen(e.target.open)}
        >
          <summary>Mais sobre o pet (opcional)</summary>

          <label className="mdf-sr-only" htmlFor="pet-name">Nome do pet (se souber)</label>
          <input
            id="pet-name"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder="Nome do pet (se souber)"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />

          <label className="mdf-sr-only" htmlFor="pet-color">Cor / pelagem</label>
          <input
            id="pet-color"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder="Cor / pelagem"
            maxLength={40}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={busy}
          />

          <label className="mdf-sr-only" htmlFor="pet-detail">Detalhe — onde, coleira, comportamento</label>
          <input
            id="pet-detail"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder="Detalhe — onde, coleira, comportamento"
            maxLength={140}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            disabled={busy}
          />
        </details>

        <details
          className="mdf-sheet__expander"
          open={contactOpen}
          onToggle={(e) => setContactOpen(e.target.open)}
        >
          <summary>Seu contato (opcional)</summary>
          <p className="mdf-sheet__helper">
            Quem encontrar (ou reconhecer) o pet pode falar direto com você.
          </p>
          <label className="mdf-sr-only" htmlFor="pet-contact">Seu contato — WhatsApp/@ (opcional)</label>
          <input
            id="pet-contact"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder="Seu contato — WhatsApp/@ (opcional)"
            maxLength={60}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={busy}
          />
          <p className="mdf-sheet__consent">
            Ao informar um contato, você concorda com os{' '}
            <a href="/privacy.html" target="_blank" rel="noreferrer">Termos de Privacidade</a>
            . Seu contato só aparece para quem abrir este pet, para ajudar no reencontro.
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
            disabled={phase === 'publishing'}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`mdf-sheet__publish mdf-sheet__publish--${phase}`}
            onClick={handlePublish}
            disabled={busy}
          >
            {phase === 'publishing' && <span className="mdf-sheet__spinner" aria-hidden="true" />}
            <span>{buttonLabel}</span>
          </button>
        </div>

        <p className="mdf-sheet__consent mdf-sheet__consent--below-cta">
          Ao confirmar, você está de acordo com os{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer">Termos de Privacidade</a>
          {' '}e os{' '}
          <a href="/terms.html" target="_blank" rel="noreferrer">Termos de Uso</a>.
        </p>
      </div>
    </div>
  );
}
