'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './PinDetailSheet.css';
import { urgencyOf } from './mdfMarkers';
import { resolveContact } from './contactLink';
import { track } from './analytics';
import { t, useLocale } from './strings';
import envVariables from '../variaveisAmbiente';
import { coordsFromPin } from '../../domain/pinCoords';

// M3 — donor response surface: status, distance, time-since, soft claim,
// mark-as-attended. Reporter contact is only ever exposed as a tap-to-act
// button (never as displayable PII text) per § dignity_constraints.

const CATEGORY_LABELS = {
  comida:  { label: 'Comida',  icon: '🍞' },
  agua:    { label: 'Água',    icon: '💧' },
  roupa:   { label: 'Roupa',   icon: '👕' },
  higiene: { label: 'Higiene', icon: '🧼' },
  abrigo:  { label: 'Abrigo',  icon: '🏠' },
};

const CLAIM_TTL_MS = 30 * 60 * 1000; // 30 minutes — soft claim window.
const WALK_KMH = 5;                  // Rough walking speed for ETA math.

function formatRelativeTime(dateIso) {
  if (!dateIso) return '';
  const diffMs = Date.now() - Date.parse(dateIso);
  if (Number.isNaN(diffMs)) return '';
  const h = diffMs / 36e5;
  if (h < 1) return `há ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `há ${Math.round(h)}h`;
  return `há ${Math.round(h / 24)} dias`;
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatEta(km) {
  if (!Number.isFinite(km)) return null;
  const minutes = Math.max(1, Math.round((km / WALK_KMH) * 60));
  return `~${minutes} min a pé`;
}

function pinId(row) {
  const c = coordsFromPin(row);
  return `${row?.DateISO || ''}|${c ? c.join(',') : ''}`;
}

function activeClaims(row) {
  const raw = Array.isArray(row?.Claims) ? row.Claims : [];
  const now = Date.now();
  return raw.filter((c) => {
    const t = Date.parse(c?.claimedAt || '');
    return Number.isFinite(t) && (now - t) < CLAIM_TTL_MS;
  });
}

function statusOf(row) {
  const attended = Boolean(row?.AlimentoEntregue);
  if (attended) return 'done';
  const claims = activeClaims(row);
  if (claims.length > 0) return 'someone_going';
  const u = urgencyOf(row?.DateISO, { attended: false });
  return u === 'done' ? 'done' : 'waiting';
}

// Label resolved via t() at render so it follows a locale switch; only the
// css class is static per status.
const STATUS_COPY = {
  waiting:       { key: 'pin.waiting',        cls: 'mdf-pin-sheet__status--waiting' },
  someone_going: { key: 'pin.someone_going',  cls: 'mdf-pin-sheet__status--going' },
  done:          { key: 'pin.attended_today', cls: 'mdf-pin-sheet__status--done' },
};

function directionsUrl(coords) {
  if (!coords) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}&travelmode=walking`;
}

export default function PinDetailSheet({ open, pin, userCoords, onClose, onClaim, onMarkAttended }) {
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const [busy, setBusy] = useState(null); // 'claim' | 'attended' | null
  useLocale(); // re-render on locale change so t() re-reads

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    // Reset transient busy state on open. This effect also owns focus
    // capture/restore and Escape handling for the sheet, so keying the
    // component to remount would disrupt that without benefit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional per-open reset; effect also owns focus/Escape lifecycle
    setBusy(null);
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

  const derived = useMemo(() => {
    if (!pin) return null;
    const coords = coordsFromPin(pin);
    const distanceKm = (Array.isArray(userCoords) && userCoords.length === 2 && coords)
      ? envVariables.distanceInKmBetweenEarthCoordinates(
        userCoords[0], userCoords[1], coords[0], coords[1],
      )
      : null;
    return {
      coords,
      distanceKm,
      distanceLabel: formatDistance(distanceKm),
      etaLabel: formatEta(distanceKm),
      timeSince: formatRelativeTime(pin.DateISO),
      status: statusOf(pin),
      claims: activeClaims(pin),
      contact: resolveContact(pin?.RedeSocial),
      dirHref: directionsUrl(coords),
      categories: Array.isArray(pin?.Categorias) ? pin.Categorias : [],
      detail: typeof pin?.Detalhe === 'string' ? pin.Detalhe : '',
      attended: Boolean(pin?.AlimentoEntregue),
    };
  }, [pin, userCoords]);

  if (!open || !pin || !derived) return null;

  const status = STATUS_COPY[derived.status];
  const claimCount = derived.claims.length;

  async function handleClaim() {
    if (!onClaim || derived.attended) return;
    setBusy('claim');
    try {
      await onClaim(pin);
      track('pin_claim_started', {
        pin_id: pinId(pin),
        distance_m: Number.isFinite(derived.distanceKm) ? Math.round(derived.distanceKm * 1000) : null,
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkAttended() {
    if (!onMarkAttended) return;
    setBusy('attended');
    try {
      const lastClaim = derived.claims[derived.claims.length - 1];
      const minutesSinceClaim = lastClaim
        ? Math.round((Date.now() - Date.parse(lastClaim.claimedAt)) / 60000)
        : null;
      await onMarkAttended(pin);
      track('pin_marked_attended', {
        pin_id: pinId(pin),
        minutes_since_claim: minutesSinceClaim,
      });
    } finally {
      setBusy(null);
    }
  }

  // Has THIS browser session claimed this pin? Drives the primary action swap.
  const myClaim = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const key = `mdf_claim_${pinId(pin)}`;
      return window.localStorage.getItem(key) === '1';
    } catch (_e) {
      return false;
    }
  })();

  return (
    <div
      className={`mdf-pin-sheet${derived.attended ? ' mdf-pin-sheet--attended' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mdf-pin-title"
    >
      <div className="mdf-pin-sheet__backdrop" aria-hidden="true" onClick={() => onClose?.()} />
      <div className="mdf-pin-sheet__panel">
        <div className="mdf-pin-sheet__handle" aria-hidden="true" />

        <div className={`mdf-pin-sheet__status ${status.cls}`}>
          {t(status.key)}{derived.status === 'someone_going' ? ` (${claimCount})` : ''}
        </div>

        <h2 id="mdf-pin-title" className="mdf-pin-sheet__title">
          {derived.timeSince || 'Ponto mapeado'}
        </h2>

        <dl className="mdf-pin-sheet__meta">
          {derived.distanceLabel && (
            <>
              <dt>Distância</dt>
              <dd>{derived.distanceLabel}{derived.etaLabel ? ` · ${derived.etaLabel}` : ''}</dd>
            </>
          )}
        </dl>

        {derived.categories.length > 0 && (
          <ul className="mdf-pin-sheet__cats" aria-label="Categorias">
            {derived.categories.map((id) => {
              const meta = CATEGORY_LABELS[id] || { label: id, icon: '•' };
              return (
                <li key={id} className="mdf-pin-sheet__cat">
                  <span className="mdf-pin-sheet__cat-icon" aria-hidden="true">{meta.icon}</span>
                  <span>{meta.label}</span>
                </li>
              );
            })}
          </ul>
        )}

        {derived.detail && <p className="mdf-pin-sheet__detail">{derived.detail}</p>}

        {derived.contact && derived.contact.href && (
          <a
            className="mdf-pin-sheet__contact"
            href={derived.contact.href}
            target="_blank"
            rel="noreferrer"
          >
            <span aria-hidden="true">{derived.contact.icon}</span>
            <span>{derived.contact.label} de quem reportou</span>
          </a>
        )}

        <div className="mdf-pin-sheet__actions">
          <button
            ref={closeRef}
            type="button"
            className="mdf-pin-sheet__close"
            onClick={() => onClose?.()}
          >
            Fechar
          </button>

          {derived.dirHref && (
            <a
              className="mdf-pin-sheet__directions"
              href={derived.dirHref}
              target="_blank"
              rel="noreferrer"
            >
              {t('pin.directions')}
            </a>
          )}

          {!derived.attended && !myClaim && (
            <button
              type="button"
              className="mdf-pin-sheet__primary"
              onClick={handleClaim}
              disabled={busy === 'claim'}
            >
              {busy === 'claim' ? 'Marcando…' : t('pin.going_button')}
            </button>
          )}

          {!derived.attended && myClaim && (
            <button
              type="button"
              className="mdf-pin-sheet__primary"
              onClick={handleMarkAttended}
              disabled={busy === 'attended'}
            >
              {busy === 'attended' ? 'Registrando…' : t('pin.mark_attended')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
