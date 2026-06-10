'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import '../components/compatibility/components/ux/PinDetailSheet.css';
import './pets.css';
import { createDirectionUrl, formatRelativeTime } from '../components/compatibility/components/mapUtils';
import { resolveContact } from '../components/compatibility/components/ux/contactLink';
import { PET_STATUS_MAP, PET_SPECIES, PET_SIZES } from './petDomain';

// /pets — read-only detail sheet, forked from PinDetailSheet. Shows the report a
// person published: status badge, species/size/color line, name (or fallback),
// detail text, relative time, a tap-to-act contact link, and "Como chegar".
// No claim/attend actions — a lost pet has no "I'm going now" verb.

const SPECIES_MAP = PET_SPECIES.reduce((map, s) => { map[s.id] = s; return map; }, {});
const SIZE_MAP = PET_SIZES.reduce((map, s) => { map[s.id] = s; return map; }, {});

function describePet(pet) {
  // "Cão · Médio · caramelo" — only the parts we actually have, joined by · .
  const parts = [];
  const sp = SPECIES_MAP[pet.species];
  if (sp) parts.push(sp.label);
  const sz = SIZE_MAP[pet.size];
  if (sz) parts.push(sz.label);
  const color = (pet.color || '').trim();
  if (color) parts.push(color);
  return parts.join(' · ');
}

export default function PetDetailSheet({ open, pet, onClose }) {
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
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

  const derived = useMemo(() => {
    if (!pet) return null;
    const statusMeta = PET_STATUS_MAP[pet.status] || null;
    const coords = Array.isArray(pet.coords) && pet.coords.length === 2 ? pet.coords : null;
    return {
      statusMeta,
      coords,
      dirHref: coords ? createDirectionUrl(coords) : null,
      descline: describePet(pet),
      name: (pet.name || '').trim(),
      detail: (pet.detail || '').trim(),
      timeSince: formatRelativeTime(pet.dateIso),
      contact: resolveContact(pet.contact),
    };
  }, [pet]);

  if (!open || !pet || !derived) return null;

  const { statusMeta } = derived;
  const statusClass = statusMeta ? `pet-detail__status--${statusMeta.id}` : '';
  const statusLabel = statusMeta ? statusMeta.label : 'Pet';
  const displayName = derived.name || 'Pet sem nome';

  return (
    <div
      className="mdf-pin-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-detail-title"
    >
      <div className="mdf-pin-sheet__backdrop" aria-hidden="true" onClick={() => onClose?.()} />
      <div className="mdf-pin-sheet__panel">
        <div className="mdf-pin-sheet__handle" aria-hidden="true" />

        <div className={`mdf-pin-sheet__status pet-detail__status ${statusClass}`}>
          {statusMeta && (
            <span className="pet-detail__status-icon" aria-hidden="true">{statusMeta.icon}</span>
          )}
          {statusLabel}
        </div>

        <h2 id="pet-detail-title" className="mdf-pin-sheet__title">
          {displayName}
        </h2>

        {derived.descline && (
          <p className="pet-detail__descline">{derived.descline}</p>
        )}

        <dl className="mdf-pin-sheet__meta">
          {derived.timeSince && (
            <>
              <dt>Reportado</dt>
              <dd>{derived.timeSince}</dd>
            </>
          )}
        </dl>

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

        {derived.contact && !derived.contact.href && (
          <p className="mdf-pin-sheet__stub">{derived.contact.label}</p>
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
              Como chegar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
