'use client';

import React from 'react';
import '../components/compatibility/components/ux/PinDetailSheet.css';
import './pets.css';
import { PET_DEEPLINK_PARAM, PET_CLOSURE_REASON } from './petDomain';
import { t } from '../components/compatibility/components/ux/strings';
import {
  usePetDetailSheet,
  FLAG_IDLE,
  FLAG_CONFIRM,
  FLAG_SENDING,
  FLAG_DONE,
  FLAG_ERROR,
  LC_IDLE,
  LC_CONFIRM_REUNIDO,
  LC_CONFIRM_ENCERRADO,
  LC_SENDING,
  LC_DONE_REUNIDO,
  LC_DONE_ENCERRADO,
  LC_ERROR,
} from './usePetDetailSheet';

// /pets, read-only detail sheet, forked from PinDetailSheet. Shows the report a
// person published: status badge, species/size/color line, name (or fallback),
// detail text, relative time, a tap-to-act contact link, and "Como chegar".
// No claim/attend actions, a lost pet has no "I'm going now" verb.
//
// M10b, este componente é agora um RENDERER FINO: toda a lógica (as cinco máquinas
// de estado que resetam ao trocar de pet, os três effects de foco, os três memos e
// os três handlers) mora no hook usePetDetailSheet; aqui só chamamos o hook e
// devolvemos o MESMO JSX. Os POR QUÊS de cada estado/handler viajam com o código, no
// hook. O `pet` cru ainda é lido no JSX (pet.resolved decide se as ações de
// fechamento aparecem).
export default function PetDetailSheet(props) {
  const { open, pet, onOpenMatch, onResolved, onClose } = props;
  const {
    visible,
    derived,
    refs,
    revealed,
    setRevealed,
    revealedContact,
    matchHint,
    matchDismissed,
    setMatchDismissed,
    flagState,
    setFlagState,
    lifecycleState,
    setLifecycleState,
    photoLoadState,
    setPhotoLoadState,
    handleFlag,
    handleResolve,
    handleShare,
  } = usePetDetailSheet(props);

  if (!visible) return null;

  const { closeRef, dialogRef, revealRef, lifecycleDoneRef } = refs;
  const { statusMeta } = derived;
  const statusClass = statusMeta ? `pet-detail__status--${statusMeta.id}` : '';
  const statusLabel = statusMeta ? t(`pets.status.${statusMeta.id}.label`) : t('pets.detail.status.fallback');
  const displayName = derived.name || t('pets.detail.name.fallback');

  return (
    <div
      className="mdf-pin-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-detail-title"
      ref={dialogRef}
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

        {/* PET-M15, exibição da FOTO (o que mais ajuda a reconhecer). Três casos,
            decididos pela forma da URL (já passada por sanitizePhotosUrl no parse):
              1. IMAGEM DIRETA (looksLikeDirectImageUrl) → renderiza um <img> de
                 verdade com alt acessível + estado de carga (skeleton). Se a URL
                 quebrar/sumir (takedown, link morto), o onError degrada para o
                 placeholder calmo, NUNCA um <img> quebrado (PET-M14 §4.5).
              2. ÁLBUM/PASTA (URL não-direta, ex.: pasta do Drive) → mantém o link
                 "Ver as fotos do pet" (um <img> ali seria quebrado).
              3. SEM FOTO → um placeholder discreto com o glifo da espécie (o
                 tratamento de COR/skeleton final é do PET-M16; aqui é a base
                 funcional, nunca um ícone de imagem quebrada).
            O placeholder/skeleton visual fino é escopo do PET-M16, aqui entregamos
            o COMPORTAMENTO (os três estados existem e degradam com elegância). */}
        {derived.isDirectImage && photoLoadState !== 'error' ? (
          <div className="pet-detail__photo">
            {photoLoadState === 'loading' && (
              <div
                className="pet-detail__photo-skeleton"
                aria-hidden="true"
                data-testid="pet-photo-skeleton"
              />
            )}
            {/* foto remota de host externo (PET-M14); next/image exigiria config
                de domínio e esta rota é ssr:false, um <img> nativo é o correto. */}
            <img
              className={`pet-detail__photo-img${photoLoadState === 'loaded' ? ' pet-detail__photo-img--ready' : ''}`}
              src={derived.photos}
              alt={t('pets.detail.photo.alt').replace('{desc}', `${derived.speciesLabel}${derived.name ? `, ${derived.name}` : ''}`)}
              loading="lazy"
              onLoad={() => setPhotoLoadState('loaded')}
              onError={() => setPhotoLoadState('error')}
            />
          </div>
        ) : derived.photos && !derived.isDirectImage ? (
          <a
            className="pet-detail__album"
            href={derived.photos}
            target="_blank"
            rel="noreferrer"
          >
            <span className="pet-detail__album-icon" aria-hidden="true">📷</span>
            <span className="pet-detail__album-text">
              <span className="pet-detail__album-title">{t('pets.detail.album.title')}</span>
              <span className="pet-detail__album-sub">{t('pets.detail.album.sub')}</span>
            </span>
          </a>
        ) : (
          /* SEM foto (ou imagem direta que falhou ao carregar): placeholder calmo
             com o glifo da espécie. NUNCA um <img> quebrado. role/alt textual para
             o leitor de tela entender que não há foto, sem soar como erro. */
          <div className="pet-detail__photo-placeholder" role="img" aria-label={t('pets.detail.photo.noneAria')}>
            <span className="pet-detail__photo-placeholder-glyph" aria-hidden="true">
              {derived.speciesGlyph}
            </span>
            <span className="pet-detail__photo-placeholder-text">{t('pets.detail.photo.noneText')}</span>
          </div>
        )}

        <dl className="mdf-pin-sheet__meta">
          {derived.timeSince && (
            <>
              <dt>{t('pets.detail.reported')}</dt>
              <dd>{derived.timeSince}</dd>
            </>
          )}
        </dl>

        {derived.detail && <p className="mdf-pin-sheet__detail">{derived.detail}</p>}

        {/* PET-M9b, hint "possível encontro": OPT-IN, calmo, NUNCA certo. Aparece
            só quando há um candidato que ROMPEU O SILÊNCIO (spec §3, já filtrado no
            predicado). Tom "pode ser" (§2.2), sem score/porcentagem (§2.2), UMA
            próxima decisão calma, ver o outro relato (§2.3), e DISPENSÁVEL (§2.1).
            role=note (informação serena), aria-live=off (não interrompe o AT: o dono
            decide olhar). O link foca o candidato via a identidade M18 (petCoordsKey),
            sem prometer "verificado" (§5, o match aproxima, não prova). */}
        {matchHint && !matchDismissed && (
          <div className="pet-detail__match" role="note" aria-label={t('pets.detail.match.aria')}>
            <p className="pet-detail__match-lead">
              <span className="pet-detail__match-icon" aria-hidden="true">💛</span>
              {matchHint.lead} {t('pets.detail.match.lead.tail')}
            </p>
            <div className="pet-detail__match-actions">
              <button
                type="button"
                className="pet-detail__match-open"
                data-deeplink-param={PET_DEEPLINK_PARAM}
                data-match-key={matchHint.targetKey}
                onClick={() => onOpenMatch?.(matchHint.targetPet)}
              >
                {t('pets.detail.match.open')}
              </button>
              <button
                type="button"
                className="pet-detail__match-dismiss"
                onClick={() => setMatchDismissed(true)}
              >
                {t('pets.detail.match.dismiss')}
              </button>
            </div>
          </div>
        )}

        {/* PET-M3, contato sob reveal-on-tap. Enquanto NÃO revelado, mostramos
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
              <span>{t('pets.detail.reveal')}</span>
            </button>
            <p className="pet-detail__privacy-note">
              {t('pets.detail.privacy.note')}
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
            <span>{revealedContact.label} {t('pets.detail.contact.suffix')}</span>
          </a>
        )}

        {revealed && revealedContact && !revealedContact.href && (
          <p ref={revealRef} tabIndex={-1} className="mdf-pin-sheet__stub">
            {revealedContact.label}
          </p>
        )}

        {/* PET-M7b, ações de FECHAMENTO (estágio E da curva, PET_CURVE §1-E): as
            PRIMEIRAS ações de escrita da sheet. "Marcar como reunido" (o desfecho
            mais esperançoso) e "Encerrar busca" (um fechamento DIGNO e consciente,
            sem culpa). Cada uma é um fluxo de DOIS passos gentil (ESPELHA a máquina
            da denúncia): tocar → confirmação calma → grava via resolvePet (PET-M2,
            isolamento kind:'pet') → estado MORNO-mas-não-spiked. SEM confete, SEM
            pico celebratório (governador §2, regra do não-spike). <=2 taps; cada
            alvo >=44px, operável por teclado. role/aria-live em cada estado para o
            AT (público em estresse não caça feedback sutil). */}
        {(pet.resolved && lifecycleState === LC_IDLE) ? null : (
        <div className="pet-detail__lifecycle">
          {lifecycleState === LC_IDLE && (
            <div className="pet-detail__lifecycle-actions" role="group" aria-label={t('pets.detail.lifecycle.aria')}>
              <button
                type="button"
                className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--reunido"
                onClick={() => setLifecycleState(LC_CONFIRM_REUNIDO)}
              >
                <span aria-hidden="true">🐾</span>
                <span>{t('pets.detail.lifecycle.reunido')}</span>
              </button>
              <button
                type="button"
                className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--encerrar"
                onClick={() => setLifecycleState(LC_CONFIRM_ENCERRADO)}
              >
                {t('pets.detail.lifecycle.encerrar')}
              </button>
            </div>
          )}

          {lifecycleState === LC_CONFIRM_REUNIDO && (
            <div className="pet-detail__lifecycle-confirm" role="group" aria-label={t('pets.detail.lifecycle.confirmReunido.aria')}>
              <p className="pet-detail__lifecycle-note">
                {t('pets.detail.lifecycle.confirmReunido.note')}
              </p>
              <div className="pet-detail__lifecycle-confirm-actions">
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--confirm"
                  onClick={() => handleResolve(PET_CLOSURE_REASON.REUNIDO)}
                >
                  {t('pets.detail.lifecycle.confirmReunido.yes')}
                </button>
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--cancel"
                  onClick={() => setLifecycleState(LC_IDLE)}
                >
                  {t('pets.detail.lifecycle.back')}
                </button>
              </div>
            </div>
          )}

          {lifecycleState === LC_CONFIRM_ENCERRADO && (
            <div className="pet-detail__lifecycle-confirm" role="group" aria-label={t('pets.detail.lifecycle.confirmEncerrado.aria')}>
              <p className="pet-detail__lifecycle-note">
                {t('pets.detail.lifecycle.confirmEncerrado.note')}
              </p>
              <div className="pet-detail__lifecycle-confirm-actions">
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--confirm"
                  onClick={() => handleResolve(PET_CLOSURE_REASON.ENCERRADO)}
                >
                  {t('pets.detail.lifecycle.confirmEncerrado.yes')}
                </button>
                <button
                  type="button"
                  className="pet-detail__lifecycle-btn pet-detail__lifecycle-btn--cancel"
                  onClick={() => setLifecycleState(LC_IDLE)}
                >
                  {t('pets.detail.lifecycle.back')}
                </button>
              </div>
            </div>
          )}

          {lifecycleState === LC_SENDING && (
            <p className="pet-detail__lifecycle-note" aria-live="polite">
              {t('pets.detail.lifecycle.saving')}
            </p>
          )}

          {/* Sucesso MORNO, não um pico (governador §2): registro calmo
              "que bom, bom reencontro 🐾". role=status anuncia ao AT; tabIndex+ref
              levam o foco para cá após a transição (sem foco preso). */}
          {lifecycleState === LC_DONE_REUNIDO && (
            <p
              ref={lifecycleDoneRef}
              tabIndex={-1}
              className="pet-detail__lifecycle-note pet-detail__lifecycle-note--done"
              role="status"
            >
              <span aria-hidden="true">🐾</span> {t('pets.detail.lifecycle.done.reunido')}
            </p>
          )}

          {/* Encerramento DIGNO: sem culpa, sem "tem certeza que quer desistir?". */}
          {lifecycleState === LC_DONE_ENCERRADO && (
            <p
              ref={lifecycleDoneRef}
              tabIndex={-1}
              className="pet-detail__lifecycle-note pet-detail__lifecycle-note--done"
              role="status"
            >
              {t('pets.detail.lifecycle.done.encerrado')}
            </p>
          )}

          {lifecycleState === LC_ERROR && (
            <p className="pet-detail__lifecycle-note" role="status">
              {t('pets.detail.lifecycle.error')}{' '}
              <button
                type="button"
                className="pet-detail__lifecycle-retry"
                onClick={() => setLifecycleState(LC_IDLE)}
              >
                {t('pets.detail.lifecycle.retry')}
              </button>
            </p>
          )}
        </div>
        )}

        {/* PET-M4, denunciar (flag) um relato suspeito. Afordância CALMA e
            secundária: um botão discreto de texto que escala para um passo de
            confirmação, nunca um alarme. Persiste o flag no blob Dados (isolamento
            kind:'pet' preservado pelo writer do PET-M2). Não esconde o pin (isso é
            do servidor, handoff). Alvo >=44px, operável por teclado, rotulado. */}
        <div className="pet-detail__flag">
          {flagState === FLAG_IDLE && (
            <button
              type="button"
              className="pet-detail__flag-btn"
              onClick={() => setFlagState(FLAG_CONFIRM)}
            >
              <span aria-hidden="true">⚑</span>
              <span>{t('pets.detail.flag.btn')}</span>
            </button>
          )}

          {flagState === FLAG_CONFIRM && (
            <div className="pet-detail__flag-confirm" role="group" aria-label={t('pets.detail.flag.aria')}>
              <p className="pet-detail__flag-note">
                {t('pets.detail.flag.note')}
              </p>
              <div className="pet-detail__flag-actions">
                <button
                  type="button"
                  className="pet-detail__flag-btn pet-detail__flag-btn--confirm"
                  onClick={handleFlag}
                >
                  {t('pets.detail.flag.yes')}
                </button>
                <button
                  type="button"
                  className="pet-detail__flag-btn pet-detail__flag-btn--cancel"
                  onClick={() => setFlagState(FLAG_IDLE)}
                >
                  {t('pets.detail.flag.cancel')}
                </button>
              </div>
            </div>
          )}

          {flagState === FLAG_SENDING && (
            <p className="pet-detail__flag-note" aria-live="polite">
              {t('pets.detail.flag.sending')}
            </p>
          )}

          {flagState === FLAG_DONE && (
            <p className="pet-detail__flag-note pet-detail__flag-note--done" role="status">
              {t('pets.detail.flag.done')}
            </p>
          )}

          {flagState === FLAG_ERROR && (
            <p className="pet-detail__flag-note" role="status">
              {t('pets.detail.flag.error')}{' '}
              <button
                type="button"
                className="pet-detail__flag-retry"
                onClick={() => setFlagState(FLAG_CONFIRM)}
              >
                {t('pets.detail.flag.retry')}
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
            {t('pets.detail.close')}
          </button>

          {/* PET-M19, Compartilhar. O onClick é um handler de GESTO 100% síncrono:
              monta a mensagem + o deep-link M18 e dispara navigator.share / wa.me NO
              MESMO TICK (sem await antes, ver handleShare). <button> nativo →
              operável por teclado de graça; aria-label explícito para o AT; a
              geometria >=44px vem de .pet-detail__share-btn (min-height token). */}
          <button
            type="button"
            className="pet-detail__share-btn"
            aria-label={t('pets.detail.share.aria')}
            onClick={handleShare}
          >
            <span aria-hidden="true">📤</span>
            <span>{t('pets.detail.share')}</span>
          </button>

          {derived.dirHref && (
            <a
              className="mdf-pin-sheet__directions"
              href={derived.dirHref}
              target="_blank"
              rel="noreferrer"
            >
              {t('pets.detail.directions')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
