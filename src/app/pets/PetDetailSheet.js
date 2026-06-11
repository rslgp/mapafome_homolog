'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const revealRef = useRef(null);

  // PET-M3 — REVEAL-ON-TAP. O contato de quem reportou NÃO é exposto ao abrir o
  // detalhe: um estranho que só passa o olho na listagem não leva o contato de
  // graça (curva §D — momento de maior vulnerabilidade do dono; ver PET_CURVE §5,
  // golpe do falso achador). O href de contato só é RESOLVIDO depois deste tap
  // explícito — antes disso, `resolveContact` nem roda sobre o dado bruto.
  const [revealed, setRevealed] = useState(false);

  // Reseta a revelação quando ABRE ou TROCA de pet, SEM um effect (que dispararia
  // o aviso react-hooks/set-state-in-effect e um render em cascata). Padrão
  // oficial do React "ajustar estado durante o render quando uma prop muda":
  // guardamos a última identidade num ref e, se ela mudou, zeramos a revelação
  // no corpo do render. Garante que a revelação de um pet jamais "vaza" para o
  // próximo aberto (forcing-function contra estado preso entre dois detalhes).
  const petKey = pet ? `${JSON.stringify(pet.coords)}|${pet.dateIso || ''}` : null;
  const lastKeyRef = useRef(null);
  const openKey = open ? petKey : null;
  if (lastKeyRef.current !== openKey) {
    lastKeyRef.current = openKey;
    if (revealed) setRevealed(false);
  }

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
    // Há um contato BRUTO no relato? (apenas presença — NÃO resolvemos o href
    // aqui; isso só acontece após o reveal, abaixo.) `hasContact` decide se o
    // botão "Mostrar contato" deve sequer aparecer, sem expor o dado.
    const hasContact = Boolean((pet.contact || '').trim());
    return {
      statusMeta,
      coords,
      dirHref: coords ? createDirectionUrl(coords) : null,
      descline: describePet(pet),
      name: (pet.name || '').trim(),
      detail: (pet.detail || '').trim(),
      photos: (pet.photos || '').trim(),
      timeSince: formatRelativeTime(pet.dateIso),
      hasContact,
    };
  }, [pet]);

  // O href só é construído DEPOIS do tap (revealed) — a barricada de PII é
  // temporal, não só visual: enquanto não revelado, o contato bruto nunca vira
  // um link clicável no DOM. Memoizado por pet+revealed para não re-resolver a
  // cada render.
  const revealedContact = useMemo(() => {
    if (!pet || !revealed) return null;
    return resolveContact(pet.contact);
  }, [pet, revealed]);

  // Após revelar, leva o foco para o contato revelado (leitor de tela e teclado
  // não ficam presos no botão que acabou de sumir). rAF: espera o DOM pintar o
  // novo nó antes de focar.
  useEffect(() => {
    if (!revealed) return undefined;
    const id = requestAnimationFrame(() => revealRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [revealed]);

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

        {/* Album — primary recognition aid (PET-M13). Elevated above the meta
            block and styled as a solid brand CTA so it reads as the first thing
            to do, clearly distinct from the secondary neutral contact pill. */}
        {derived.photos && (
          <a
            className="pet-detail__album"
            href={derived.photos}
            target="_blank"
            rel="noreferrer"
          >
            <span className="pet-detail__album-icon" aria-hidden="true">📷</span>
            <span className="pet-detail__album-text">
              <span className="pet-detail__album-title">Ver as fotos do pet</span>
              <span className="pet-detail__album-sub">o que mais ajuda a reconhecer</span>
            </span>
          </a>
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

        {/* PET-M3 — contato sob reveal-on-tap. Enquanto NÃO revelado, mostramos
            só um botão calmo + a nota de privacidade /pets-específica. O dado de
            contato não está no DOM como link clicável até o tap. */}
        {derived.hasContact && !revealed && (
          <div className="pet-detail__contact-gate">
            <button
              type="button"
              className="pet-detail__reveal-btn"
              onClick={() => setRevealed(true)}
            >
              <span aria-hidden="true">🔒</span>
              <span>Mostrar contato de quem reportou</span>
            </button>
            <p className="pet-detail__privacy-note">
              O contato fica escondido até você tocar — para proteger quem
              reportou. Combine com calma e, se puder, confirme um detalhe que só
              o dono saberia antes de qualquer acerto.
            </p>
          </div>
        )}

        {revealed && revealedContact && revealedContact.href && (
          <a
            ref={revealRef}
            className="mdf-pin-sheet__contact"
            href={revealedContact.href}
            target="_blank"
            rel="noreferrer"
          >
            <span aria-hidden="true">{revealedContact.icon}</span>
            <span>{revealedContact.label} de quem reportou</span>
          </a>
        )}

        {revealed && revealedContact && !revealedContact.href && (
          <p ref={revealRef} tabIndex={-1} className="mdf-pin-sheet__stub">
            {revealedContact.label}
          </p>
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
