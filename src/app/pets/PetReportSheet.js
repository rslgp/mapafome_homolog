'use client';

import React from 'react';
import '../components/compatibility/components/ux/ReportSheet.css';
import './pets.css';
import {
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  PET_COLORS,
} from './petDomain';
import { maxPhotoMb } from './petPhoto';
import { t } from '../components/compatibility/components/ux/strings';
import { usePetReportSheet, STATUS_REQUIRED, failureCopyFor } from './usePetReportSheet';

// /pets reporter bottom-sheet, forked from the hunger ReportSheet.
// Key difference from the hunger flow: STATUS is a SINGLE-SELECT, REQUIRED
// radio-group (one pin = one report: perdido / encontrado / avistado), NOT the
// multi-select checkbox set used for hunger categories. Species/size are also
// single-select but optional; species defaults to 'outro'.
//
// M10c: this is now a THIN renderer, all state/effects/handlers/derived values
// live in usePetReportSheet (state/handler co-location + SRP), so this function
// only maps the hook's output to the SAME JSX it always returned.

export default function PetReportSheet({ open, coords, onClose, onPublish }) {
  const {
    status,
    species, setSpecies,
    size, setSize,
    name, setName,
    colorBucket, setColorBucket,
    color, setColor,
    contact, setContact,
    detail, setDetail,
    photos, setPhotos,
    photoPreview,
    photoState,
    moreOpen, setMoreOpen,
    contactOpen, setContactOpen,
    phase,
    errorMsg,
    publishError,
    sheetHeightVh,
    photoInputRef,
    sheetRef,
    dialogRef,
    firstFocusRef,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    chooseStatus,
    onPhotoChosen,
    clearPhotoPreview,
    handlePublish,
    busy,
    buttonLabel,
    locationLabel,
  } = usePetReportSheet({ open, coords, onClose, onPublish });

  if (!open) return null;

  return (
    <div className="mdf-sheet" role="dialog" aria-modal="true" aria-labelledby="pet-sheet-title" ref={dialogRef}>
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
          aria-label={t('pets.report.handle.aria')}
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
            {t('pets.report.title')}
          </h2>
          <p className="mdf-sheet__subtitle">
            {t('pets.report.subtitle')}
          </p>
          <p className="mdf-sheet__location">{locationLabel}</p>
        </header>

        {errorMsg === STATUS_REQUIRED && (
          <p className="mdf-sheet__inline-error" role="alert">
            {t('pets.report.error.status')}
          </p>
        )}

        <fieldset className="pet-fieldset">
          <legend className="pet-legend">{t('pets.report.legend.status')}</legend>
          <div className="mdf-sheet__chips" role="radiogroup" aria-label={t('pets.report.aria.status')}>
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
                    <span className="mdf-chip__label">{t(`pets.status.${s.id}.label`)}</span>
                    {checked && <span className="pet-chip__check" aria-hidden="true">✓</span>}
                  </span>
                  <span className="pet-chip__hint">{t(`pets.status.${s.id}.hint`)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pet-fieldset">
          <legend className="pet-legend">{t('pets.report.legend.species')}</legend>
          <div className="mdf-sheet__chips" role="radiogroup" aria-label={t('pets.report.aria.species')}>
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
                  <span className="mdf-chip__label">{t(`pets.species.${s.id}.label`)}</span>
                  {checked && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pet-fieldset">
          <legend className="pet-legend">{t('pets.report.legend.size')}</legend>
          <div className="mdf-sheet__chips" role="radiogroup" aria-label={t('pets.report.aria.size')}>
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
                  <span className="mdf-chip__label">{t(`pets.size.${s.id}.label`)}</span>
                  {checked && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* COR: chip de bucket FECHADO (PET_COLORS), espelha o fieldset de porte:
            single-select radio-like, opcional. É a cor MATCHÁVEL, o finder filtra
            o mapa por estes MESMOS baldes (PetFilterBar), então escolher aqui em vez
            de digitar texto livre alinha reporter e finder no MESMO vocabulário e
            melhora os pareamentos. O texto livre de cor segue existindo no expander
            "mais detalhes" como NUANCE opcional. */}
        <fieldset className="pet-fieldset">
          <legend className="pet-legend">{t('pets.report.legend.color')}</legend>
          <div className="mdf-sheet__chips" role="radiogroup" aria-label={t('pets.report.aria.color')}>
            {PET_COLORS.map((c) => {
              const checked = colorBucket === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={`mdf-chip${checked ? ' mdf-chip--on' : ''}`}
                  onClick={() => setColorBucket(checked ? '' : c.id)}
                  disabled={busy}
                >
                  <span className="mdf-chip__label">{t(`pets.color.${c.id}.label`)}</span>
                  {checked && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Album, the single biggest recognition aid (PET-M13/PET-M15). Promoted
            out of the optional expander into an always-visible, emphasized field so
            a reporter actually sees it. Still optional: publishing works with no
            photo and no link.

            PET-M15: DUAS origens convergindo na MESMA string que persiste:
              • CAPTURA/BIBLIOTECA (abaixo): redimensiona/comprime no cliente e
                mostra uma PRÉVIA local. HONESTIDADE (PET-M14 §4.4 #5): NÃO há
                endpoint de upload sem segredo neste repo, então a prévia NÃO
                publica sozinha e NÃO vira base64 no Dados (§4.1), ela orienta o
                dono a obter um link hospedado.
              • COLE-UMA-URL (o input https): é o caminho que de fato VAI pro
                Dados.photos (barreira sanitizePhotosUrl http/https). É o fallback
                durável do PET-M14 §5.
            Quando o proxy de upload do handoff (§7) existir, a prévia alimenta-o e
            o campo https é preenchido automaticamente, a forma do Dados não muda. */}
        <div className="pet-album-field">
          <span className="pet-album-field__label">
            <span className="pet-album-field__icon" aria-hidden="true">📷</span>
            {t('pets.report.album.label')}
          </span>

          {/* Captura no celular / escolher da galeria. O input nativo é a
              afordância acessível (rotulado pelo botão-label >=44px); resize +
              prévia acontecem no cliente. */}
          <div className="pet-photo-capture">
            <input
              ref={photoInputRef}
              id="pet-photo-file"
              className="mdf-sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoChosen}
              disabled={busy || photoState === 'processing'}
            />
            <label
              htmlFor="pet-photo-file"
              className="pet-photo-capture__btn"
              aria-disabled={busy || photoState === 'processing'}
            >
              <span aria-hidden="true">📸</span>
              <span>
                {photoState === 'processing'
                  ? t('pets.report.photo.processing')
                  : photoPreview
                    ? t('pets.report.photo.change')
                    : t('pets.report.photo.choose')}
              </span>
            </label>

            {photoState === 'error' && (
              <p className="mdf-sheet__helper pet-photo-capture__error" role="alert">
                {t('pets.report.photo.error')}
              </p>
            )}

            {photoPreview && (
              <figure className="pet-photo-preview">
                {/* objectURL local de prévia (não é um asset estático otimizável;
                    revogado no cleanup). next/image não se aplica a um blob local. */}
                <img
                  className="pet-photo-preview__img"
                  src={photoPreview.previewUrl}
                  alt={t('pets.report.photo.previewAlt')}
                  width={photoPreview.width}
                  height={photoPreview.height}
                />
                <figcaption className="pet-photo-preview__cap">
                  <span>
                    {t('pets.report.photo.previewCap')}
                  </span>
                  <button
                    type="button"
                    className="pet-photo-preview__remove"
                    onClick={clearPhotoPreview}
                    disabled={busy}
                  >
                    {t('pets.report.photo.removePreview')}
                  </button>
                </figcaption>
              </figure>
            )}
          </div>

          {/* PII calmo (PET-M14 §6): orienta a evitar terceiros na foto. Tom de
              cuidado, sem alarme. */}
          <p className="mdf-sheet__helper pet-photo-capture__privacy">
            {t('pets.report.photo.privacy').replace('{mb}', String(maxPhotoMb()))}
          </p>

          <label className="pet-album-field__url-label" htmlFor="pet-photos">
            {t('pets.report.photo.urlLabel')}
          </label>
          <input
            id="pet-photos"
            type="url"
            inputMode="url"
            className="mdf-sheet__input pet-input pet-album-field__input"
            placeholder={t('pets.report.photo.urlPlaceholder')}
            maxLength={500}
            value={photos}
            onChange={(e) => setPhotos(e.target.value)}
            disabled={busy}
          />
          <p className="mdf-sheet__helper pet-album-field__helper">
            {t('pets.report.photo.urlHelper')}
          </p>
        </div>

        <details
          className="mdf-sheet__expander"
          open={moreOpen}
          onToggle={(e) => setMoreOpen(e.target.open)}
        >
          <summary>{t('pets.report.more.summary')}</summary>

          <label className="mdf-sr-only" htmlFor="pet-name">{t('pets.report.field.name')}</label>
          <input
            id="pet-name"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder={t('pets.report.field.name')}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />

          <label className="mdf-sr-only" htmlFor="pet-color">{t('pets.report.field.color')}</label>
          <input
            id="pet-color"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder={t('pets.report.field.color')}
            maxLength={40}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={busy}
          />
          {/* O CHIP de cor acima é a cor MATCHÁVEL (o que o finder filtra); este
              campo é nuance OPCIONAL (ex.: "caramelo bem clarinho, peito branco"). */}
          <p className="mdf-sheet__helper">
            {t('pets.report.field.color.help')}
          </p>

          <label className="mdf-sr-only" htmlFor="pet-detail">{t('pets.report.field.detail')}</label>
          <input
            id="pet-detail"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder={t('pets.report.field.detail')}
            maxLength={140}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            disabled={busy}
          />
          {/* PET-M3: aviso de higiene de texto livre. Tom CALMO/informativo
              (não repreensão): orienta a não publicar dado de terceiro, placa ou
              endereço exato, porque o campo é PÚBLICO. Reforça também o primitivo
              de credibilidade (PET_CURVE §5): o "detalhe que só o dono sabe"
              GUARDA-SE, não se publica. */}
          <p className="mdf-sheet__helper pet-freetext-warning">
            {t('pets.report.freetext.warning')}
          </p>
        </details>

        <details
          className="mdf-sheet__expander"
          open={contactOpen}
          onToggle={(e) => setContactOpen(e.target.open)}
        >
          <summary>{t('pets.report.contact.summary')}</summary>
          <p className="mdf-sheet__helper">
            {t('pets.report.contact.help')}
          </p>
          <label className="mdf-sr-only" htmlFor="pet-contact">{t('pets.report.field.contact')}</label>
          <input
            id="pet-contact"
            type="text"
            className="mdf-sheet__input pet-input"
            placeholder={t('pets.report.field.contact')}
            maxLength={60}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={busy}
          />
          <p className="mdf-sheet__consent">
            {t('pets.report.consent.pre')}{' '}
            <a href="/privacy.html" target="_blank" rel="noreferrer">{t('pets.report.consent.privacyLink')}</a>
            {t('pets.report.consent.post')}
          </p>
        </details>

        {publishError && (
          /* role="alert" já implica aria-live assertivo: o leitor de tela anuncia
             a cópia calma assim que ela aparece (o público está em estresse agudo
             e precisa ouvir o resultado). Sem aria-live explícito para não
             duplicar o anúncio em alguns leitores. */
          <p
            className={`mdf-sheet__inline-error${publishError.queued ? ' mdf-sheet__inline-error--queued' : ''}`}
            role="alert"
          >
            {failureCopyFor(publishError.reasonCode)}
          </p>
        )}

        <div className="mdf-sheet__actions">
          <button
            type="button"
            className="mdf-sheet__cancel"
            onClick={() => onClose?.()}
            disabled={phase === 'publishing'}
          >
            {t('pets.report.cancel')}
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
          {t('pets.report.consent.below.pre')}{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer">{t('pets.report.consent.privacyLink')}</a>
          {' '}{t('pets.report.consent.below.mid')}{' '}
          <a href="/terms.html" target="_blank" rel="noreferrer">{t('pets.report.consent.below.terms')}</a>.
        </p>
      </div>
    </div>
  );
}
