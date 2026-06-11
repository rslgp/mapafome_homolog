'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../components/compatibility/components/ux/PinDetailSheet.css';
import './pets.css';
import { createDirectionUrl, formatRelativeTime } from '../components/compatibility/components/mapUtils';
import { resolveContact } from '../components/compatibility/components/ux/contactLink';
import { PET_STATUS_MAP, PET_SPECIES, PET_SIZES, petCoordsKey, PET_DEEPLINK_PARAM } from './petDomain';
import { flagPet } from './petsData';

// PET-M4 — estados do fluxo de denúncia (flag) na própria sheet (máquina de
// estados pequena, dois passos: ocioso → confirmar → enviando → feito/erro).
// IDLE: mostra o link discreto "Denunciar"; CONFIRM: pergunta calma + confirmar/
// cancelar; SENDING: gravando; DONE: agradece e some o controle; ERROR: cópia
// calma de "não deu, tente de novo".
const FLAG_IDLE = 'idle';
const FLAG_CONFIRM = 'confirm';
const FLAG_SENDING = 'sending';
const FLAG_DONE = 'done';
const FLAG_ERROR = 'error';

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

export default function PetDetailSheet({ open, pet, matches = [], onOpenMatch, onClose }) {
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const revealRef = useRef(null);

  // PET-M3 — REVEAL-ON-TAP. O contato de quem reportou NÃO é exposto ao abrir o
  // detalhe: um estranho que só passa o olho na listagem não leva o contato de
  // graça (curva §D — momento de maior vulnerabilidade do dono; ver PET_CURVE §5,
  // golpe do falso achador). O href de contato só é RESOLVIDO depois deste tap
  // explícito — antes disso, `resolveContact` nem roda sobre o dado bruto.
  const [revealed, setRevealed] = useState(false);

  // PET-M4 — estado do fluxo de denúncia (dois passos). Reseta junto com o
  // reveal quando o pet aberto muda (mesma forcing-function de não-vazamento).
  const [flagState, setFlagState] = useState(FLAG_IDLE);

  // PET-M9b — o hint "possível encontro" é DISPENSÁVEL (opt-in, não-intrusivo,
  // spec §2.1/§2.4): o dono pode fechá-lo sem agir. Reseta ao trocar de pet (igual
  // ao reveal/flag) para a dispensa de um detalhe não vazar para o próximo aberto.
  const [matchDismissed, setMatchDismissed] = useState(false);

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
    // PET-M4 — a denúncia de um pet jamais "vaza" para o próximo aberto.
    if (flagState !== FLAG_IDLE) setFlagState(FLAG_IDLE);
    // PET-M9b — a dispensa do hint também não vaza para o próximo pet aberto.
    if (matchDismissed) setMatchDismissed(false);
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

  // PET-M9b — "possível encontro" (opt-in, calmo, NUNCA certo). `matches` já vem
  // do predicado PURO (findPossibleMatches) com o LIMIAR DE SILÊNCIO aplicado:
  // pares fracos/coringa NUNCA chegam aqui (spec §3). Mostramos só o MELHOR
  // candidato (matches[0], já ordenado) → UMA próxima decisão calma: ver o outro
  // relato (spec §2.3). NENHUM score/porcentagem é exposto (banido §2.2); o tom é
  // "pode ser", não "encontramos" (§2.2). O link ao candidato usa a identidade
  // M18 (petCoordsKey) — a mesma SOT do deep-link, então abrir o outro relato é a
  // ação de focar AQUELE pet. Espelhamento dono/achador (§1.1): se o pet ABERTO é
  // o `perdido`, o dono vê "alguém pode ter visto seu pet"; se é um achado, o autor
  // vê "este pet pode ter dono procurando".
  const matchHint = useMemo(() => {
    if (!pet || !Array.isArray(matches) || matches.length === 0) return null;
    const best = matches[0];
    if (!best || !best.pet) return null;
    const targetKey = petCoordsKey(best.pet.coords);
    if (!targetKey) return null; // sem identidade estável → não oferece o link (degrada calmo)
    // Registro de tom espelhado (a copy LITERAL final é de uiux/PET-M23; aqui fixa-se
    // o registro "possível", calmo, sem certeza — spec §2.2/§2.4).
    const openIsLost = pet.status === 'perdido';
    const lead = openIsLost
      ? 'Pode ser que alguém tenha visto um pet parecido por perto.'
      : 'Pode ser que este pet tenha alguém procurando por ele por perto.';
    return { targetPet: best.pet, targetKey, lead, count: matches.length };
  }, [pet, matches]);

  // Após revelar, leva o foco para o contato revelado (leitor de tela e teclado
  // não ficam presos no botão que acabou de sumir). rAF: espera o DOM pintar o
  // novo nó antes de focar.
  useEffect(() => {
    if (!revealed) return undefined;
    const id = requestAnimationFrame(() => revealRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [revealed]);

  // PET-M4 — confirma e grava a denúncia. Persiste o flag no blob Dados via o
  // writer coords-keyed do PET-M2 (flagPet → updatePetByCoords → incrementPetFlag),
  // que reescreve SÓ a coluna Dados e só casa uma linha de pet (isolamento). A
  // idempotency_key é DERIVADA das coords do pet, então um re-tap ou reabrir a
  // mesma sheet não conta a denúncia duas vezes (reusa o cache de petsData).
  // Async é aceitável aqui: NÃO é uma chamada de gesto sensível (share/clipboard);
  // é uma escrita comum, então o await depois do clique não é descartado pelo
  // browser. Degrada com calma para ERROR se a gravação falhar.
  const handleFlag = async () => {
    if (!pet) return;
    setFlagState(FLAG_SENDING);
    try {
      const key = `flag:${JSON.stringify(pet.coords)}`;
      await flagPet({ coords: pet.coords, idempotency_key: key });
      setFlagState(FLAG_DONE);
    } catch (_e) {
      // Sem detalhe técnico na UI (e sem PII): só uma cópia calma de "não deu".
      setFlagState(FLAG_ERROR);
    }
  };

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

        {/* PET-M9b — hint "possível encontro": OPT-IN, calmo, NUNCA certo. Aparece
            só quando há um candidato que ROMPEU O SILÊNCIO (spec §3, já filtrado no
            predicado). Tom "pode ser" (§2.2), sem score/porcentagem (§2.2), UMA
            próxima decisão calma — ver o outro relato (§2.3) — e DISPENSÁVEL (§2.1).
            role=note (informação serena), aria-live=off (não interrompe o AT: o dono
            decide olhar). O link foca o candidato via a identidade M18 (petCoordsKey),
            sem prometer "verificado" (§5 — o match aproxima, não prova). */}
        {matchHint && !matchDismissed && (
          <div className="pet-detail__match" role="note" aria-label="Possível encontro">
            <p className="pet-detail__match-lead">
              <span className="pet-detail__match-icon" aria-hidden="true">💛</span>
              {matchHint.lead} Vale olhar com calma — pode não ser, e tudo bem.
            </p>
            <div className="pet-detail__match-actions">
              <button
                type="button"
                className="pet-detail__match-open"
                data-deeplink-param={PET_DEEPLINK_PARAM}
                data-match-key={matchHint.targetKey}
                onClick={() => onOpenMatch?.(matchHint.targetPet)}
              >
                Ver o outro relato
              </button>
              <button
                type="button"
                className="pet-detail__match-dismiss"
                onClick={() => setMatchDismissed(true)}
              >
                Agora não
              </button>
            </div>
          </div>
        )}

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

        {/* PET-M4 — denunciar (flag) um relato suspeito. Afordância CALMA e
            secundária: um botão discreto de texto que escala para um passo de
            confirmação, nunca um alarme. Persiste o flag no blob Dados (isolamento
            kind:'pet' preservado pelo writer do PET-M2). Não esconde o pin (isso é
            do servidor — handoff). Alvo >=44px, operável por teclado, rotulado. */}
        <div className="pet-detail__flag">
          {flagState === FLAG_IDLE && (
            <button
              type="button"
              className="pet-detail__flag-btn"
              onClick={() => setFlagState(FLAG_CONFIRM)}
            >
              <span aria-hidden="true">⚑</span>
              <span>Denunciar este relato</span>
            </button>
          )}

          {flagState === FLAG_CONFIRM && (
            <div className="pet-detail__flag-confirm" role="group" aria-label="Confirmar denúncia">
              <p className="pet-detail__flag-note">
                Algo parece errado com este relato? Você pode sinalizá-lo para
                revisão. Obrigado por ajudar a manter o mapa confiável.
              </p>
              <div className="pet-detail__flag-actions">
                <button
                  type="button"
                  className="pet-detail__flag-btn pet-detail__flag-btn--confirm"
                  onClick={handleFlag}
                >
                  Sim, sinalizar
                </button>
                <button
                  type="button"
                  className="pet-detail__flag-btn pet-detail__flag-btn--cancel"
                  onClick={() => setFlagState(FLAG_IDLE)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {flagState === FLAG_SENDING && (
            <p className="pet-detail__flag-note" aria-live="polite">
              Enviando sua sinalização…
            </p>
          )}

          {flagState === FLAG_DONE && (
            <p className="pet-detail__flag-note pet-detail__flag-note--done" role="status">
              Recebemos sua sinalização. Vamos revisar com calma. Obrigado por
              cuidar do mapa junto com a gente.
            </p>
          )}

          {flagState === FLAG_ERROR && (
            <p className="pet-detail__flag-note" role="status">
              Não deu para enviar a sinalização agora. Você pode tentar de novo em
              instantes.{' '}
              <button
                type="button"
                className="pet-detail__flag-retry"
                onClick={() => setFlagState(FLAG_CONFIRM)}
              >
                Tentar de novo
              </button>
            </p>
          )}
        </div>

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
