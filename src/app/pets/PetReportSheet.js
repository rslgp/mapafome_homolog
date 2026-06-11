'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../components/compatibility/components/ux/ReportSheet.css';
import './pets.css';
import {
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  PET_PUBLISH_FAILURE,
  PET_PUBLISH_FAILURE_COPY,
} from './petDomain';
import { resizeImageFile, maxPhotoMb } from './petPhoto';

// /pets — reporter bottom-sheet, forked from the hunger ReportSheet.
// Key difference from the hunger flow: STATUS is a SINGLE-SELECT, REQUIRED
// radio-group (one pin = one report: perdido / encontrado / avistado), NOT the
// multi-select checkbox set used for hunger categories. Species/size are also
// single-select but optional; species defaults to 'outro'.

const DEFAULT_SPECIES = 'outro';

const ERRORS = {
  status_required: 'Escolha uma situação: perdido, encontrado ou avistado.',
};

// Resolve a cópia calma a partir do reasonCode classificado em PetsApp (PET-M1).
// Fallback para 'generic' se vier um código desconhecido — nunca deixa o usuário
// sem mensagem nem mostra "publish_failed" cru. SOT da cópia: petDomain.
function failureCopyFor(reasonCode) {
  return PET_PUBLISH_FAILURE_COPY[reasonCode] || PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.GENERIC];
}

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
  const [photos, setPhotos] = useState('');         // link https que PERSISTE (cole-uma-URL — caminho durável, PET-M14 §5)
  // PET-M15 — captura/biblioteca: o arquivo escolhido é redimensionado/comprimido
  // no cliente (petPhoto.resizeImageFile) e mostrado como PRÉVIA LOCAL. HONESTIDADE
  // (PET-M14 §4.4 #5): NÃO há endpoint de upload sem segredo neste repo, então a
  // prévia NÃO publica sozinha — o link colado acima é o que vai pro Dados. A prévia
  // guia o dono a obter um link hospedado. NUNCA gravamos base64 no Dados (§4.1).
  const [photoPreview, setPhotoPreview] = useState(null); // { previewUrl, width, height } | null
  const [photoState, setPhotoState] = useState('idle');   // idle | processing | error
  const photoInputRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [phase, setPhase] = useState('idle');       // idle | publishing | success | error
  const [errorMsg, setErrorMsg] = useState(null);   // erro de validação (status obrigatório)
  const [publishError, setPublishError] = useState(null); // { reasonCode, queued } — falha de publicação

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
    // PET-M15 — limpa a prévia de foto ao reabrir (e revoga o objectURL anterior,
    // se houver, para não vazar — classe BUG-115). O setter funcional lê o valor
    // atual sem precisar dele nas deps deste effect (que é keyed em `open`).
    setPhotoPreview((prev) => {
      if (prev && prev.previewUrl && typeof URL !== 'undefined') {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
    setPhotoState('idle');
    setMoreOpen(false);
    setContactOpen(false);
    setPhase('idle');
    setErrorMsg(null);
    setPublishError(null);
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

  // PET-M15 — revoga o objectURL da prévia ao DESMONTAR (a fechada normal já
  // revoga no reset por-open acima; este effect cobre o unmount direto). Mantém
  // um ref espelhando o state — sincronizado DENTRO de um effect (nunca durante o
  // render) — e o cleanup do mount lê esse ref para revogar a última prévia viva.
  const photoPreviewRef = useRef(null);
  useEffect(() => {
    photoPreviewRef.current = photoPreview;
  }, [photoPreview]);
  useEffect(() => {
    return () => {
      const p = photoPreviewRef.current;
      if (p && p.previewUrl && typeof URL !== 'undefined') {
        URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

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

  // PET-M15 — o dono escolheu/capturou um arquivo. Redimensiona/comprime no
  // CLIENTE (petPhoto.resizeImageFile: downscale ≤1600px, re-encode JPEG que
  // descarta EXIF/GPS — §6) e mostra como PRÉVIA LOCAL. NÃO publica e NÃO grava
  // base64 no Dados (PET-M14 §4.1). O <input> é resetado para permitir reescolher
  // o MESMO arquivo. Degrada com calma para 'error' (sem alarme) se o decode falhar.
  async function onPhotoChosen(e) {
    const file = e.target.files && e.target.files[0];
    // Permite reescolher o mesmo arquivo depois (o evento change não dispara de
    // novo para um value idêntico se não limparmos).
    e.target.value = '';
    if (!file) return;
    setPhotoState('processing');
    try {
      const result = await resizeImageFile(file);
      setPhotoPreview((prev) => {
        // Revoga a prévia anterior antes de trocar (não vaza objectURL).
        if (prev && prev.previewUrl && typeof URL !== 'undefined') {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return { previewUrl: result.previewUrl, width: result.width, height: result.height };
      });
      setPhotoState('idle');
    } catch (_err) {
      // Sem detalhe técnico na UI: só um aviso calmo (o publicar continua possível
      // sem foto — a prévia é um complemento, nunca um bloqueio).
      setPhotoState('error');
    }
  }

  function clearPhotoPreview() {
    setPhotoPreview((prev) => {
      if (prev && prev.previewUrl && typeof URL !== 'undefined') {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
    setPhotoState('idle');
  }

  async function handlePublish() {
    if (!status) {
      setErrorMsg(ERRORS.status_required);
      return;
    }
    setPhase('publishing');
    setErrorMsg(null);
    setPublishError(null);

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
      // PET-M1 — onPublish (PetsApp) classifica a causa e lança PetPublishError
      // com um reasonCode estável + flag queued. Aqui só ESCOLHEMOS a cópia
      // calma distinta; a classificação e o log (trackError com redação de
      // token) já aconteceram no chamador. Fallback para 'generic' se vier um
      // erro não-classificado (ex.: lançado fora do fluxo do PetsApp).
      const reasonCode = (err && err.reasonCode) || PET_PUBLISH_FAILURE.GENERIC;
      const queued = Boolean(err && err.queued);
      setPhase('error');
      setPublishError({ reasonCode, queued });
    }
  }

  const busy = phase === 'publishing' || phase === 'success';

  // Quando a falha foi enfileirada (offline/lento), o relato está guardado e vai
  // sozinho — o rótulo confirma "Guardado" em vez de cobrar "Tentar de novo"
  // (governador de tom: reassegura, não cobra). Em falha não-enfileirada
  // (out-of-bounds/genérica), "Tentar de novo" continua certo.
  const queuedFailure = phase === 'error' && publishError && publishError.queued;
  const buttonLabel =
    phase === 'publishing' ? 'Publicando…'
      : phase === 'success' ? 'Publicado ✓'
        : queuedFailure ? 'Guardado ✓'
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

        {/* Album — the single biggest recognition aid (PET-M13/PET-M15). Promoted
            out of the optional expander into an always-visible, emphasized field so
            a reporter actually sees it. Still optional: publishing works with no
            photo and no link.

            PET-M15 — DUAS origens convergindo na MESMA string que persiste:
              • CAPTURA/BIBLIOTECA (abaixo): redimensiona/comprime no cliente e
                mostra uma PRÉVIA local. HONESTIDADE (PET-M14 §4.4 #5): NÃO há
                endpoint de upload sem segredo neste repo, então a prévia NÃO
                publica sozinha e NÃO vira base64 no Dados (§4.1) — ela orienta o
                dono a obter um link hospedado.
              • COLE-UMA-URL (o input https): é o caminho que de fato VAI pro
                Dados.photos (barreira sanitizePhotosUrl http/https). É o fallback
                durável do PET-M14 §5.
            Quando o proxy de upload do handoff (§7) existir, a prévia alimenta-o e
            o campo https é preenchido automaticamente — a forma do Dados não muda. */}
        <div className="pet-album-field">
          <span className="pet-album-field__label">
            <span className="pet-album-field__icon" aria-hidden="true">📷</span>
            Fotos do pet — o que mais ajuda a reconhecer
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
                  ? 'Preparando a foto…'
                  : photoPreview
                    ? 'Trocar a foto'
                    : 'Tirar foto ou escolher da galeria'}
              </span>
            </label>

            {photoState === 'error' && (
              <p className="mdf-sheet__helper pet-photo-capture__error" role="alert">
                Não deu para preparar essa imagem. Tente outra foto, ou cole um link
                no campo abaixo.
              </p>
            )}

            {photoPreview && (
              <figure className="pet-photo-preview">
                {/* objectURL local de prévia (não é um asset estático otimizável;
                    revogado no cleanup). next/image não se aplica a um blob local. */}
                <img
                  className="pet-photo-preview__img"
                  src={photoPreview.previewUrl}
                  alt="Prévia da foto do pet que você escolheu"
                  width={photoPreview.width}
                  height={photoPreview.height}
                />
                <figcaption className="pet-photo-preview__cap">
                  <span>
                    Prévia pronta (reduzida no seu aparelho). Para ela aparecer no
                    relato, hospede a foto e cole o link abaixo — por enquanto, é o
                    link que publica.
                  </span>
                  <button
                    type="button"
                    className="pet-photo-preview__remove"
                    onClick={clearPhotoPreview}
                    disabled={busy}
                  >
                    Remover prévia
                  </button>
                </figcaption>
              </figure>
            )}
          </div>

          {/* PII calmo (PET-M14 §6): orienta a evitar terceiros na foto. Tom de
              cuidado, sem alarme. */}
          <p className="mdf-sheet__helper pet-photo-capture__privacy">
            Evite fotos que mostrem pessoas, placas ou o número da casa — foque no
            pet. A foto é reduzida no seu aparelho antes de qualquer coisa (até
            ~{maxPhotoMb()} MB).
          </p>

          <label className="pet-album-field__url-label" htmlFor="pet-photos">
            Link da foto (o que publica)
          </label>
          <input
            id="pet-photos"
            type="url"
            inputMode="url"
            className="mdf-sheet__input pet-input pet-album-field__input"
            placeholder="Cole aqui o link da foto ou da pasta do Google Drive"
            maxLength={500}
            value={photos}
            onChange={(e) => setPhotos(e.target.value)}
            disabled={busy}
          />
          <p className="mdf-sheet__helper pet-album-field__helper">
            Uma foto é o que mais ajuda no reencontro. Cole o link de uma foto direta
            ou de uma pasta do Google Drive (deixe como “qualquer pessoa com o link
            pode ver”). Sem foto também publica — mas com foto, muito mais gente
            reconhece.
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
          {/* PET-M3 — aviso de higiene de texto livre. Tom CALMO/informativo
              (não repreensão): orienta a não publicar dado de terceiro, placa ou
              endereço exato, porque o campo é PÚBLICO. Reforça também o primitivo
              de credibilidade (PET_CURVE §5): o "detalhe que só o dono sabe"
              GUARDA-SE, não se publica. */}
          <p className="mdf-sheet__helper pet-freetext-warning">
            Esse texto fica visível para todo mundo. Para a segurança de todos,
            não inclua dados de terceiros, placa de carro nem endereço exato. Se
            houver um detalhe que só o dono sabe (uma marca, uma manha), guarde-o
            para confirmar com calma depois — não escreva aqui.
          </p>
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
            . Seu contato nunca aparece no mapa nem na lista: ele fica escondido e
            só é mostrado quando alguém abre este pet e toca em “Mostrar contato”,
            para ajudar no reencontro.
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
