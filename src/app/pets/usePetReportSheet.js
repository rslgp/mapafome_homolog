'use client';

// usePetReportSheet.js: the state/effects/handlers/derived-values of the /pets
// reporter bottom-sheet, extracted from PetReportSheet (M10c).
//
// WHY THIS EXISTS
//   PetReportSheet was a ~673-LOC god-component: fourteen useState machines, the
//   per-open reset effect that also owns focus capture/restore + Escape + the
//   drag lifecycle, the preview-revoke unmount effect, the pointer drag-resize
//   handlers, the photo-choose/clear handlers, and the publish path all inline in
//   one render function. This hook OWNS that logic so PetReportSheet is a thin
//   renderer of the SAME JSX. Behavior-preserving relocation ONLY: every state
//   name, effect body, handler, and derived value is moved VERBATIM, so the
//   petReportSheet.dom.test.js characterization net keeps passing unchanged.
//
//   The hook returns exactly what the JSX reads: the ref handles it binds, the
//   controlled-input state + setters, the derived labels/flags, and the event
//   handlers. Nothing new is computed and nothing is dropped.

import { useEffect, useRef, useState } from 'react';
import {
  PET_PUBLISH_FAILURE,
  petColorBucketLabelPtBR,
} from './petDomain';
import { resizeImageFile } from './petPhoto';
import { t, useLocale } from '../components/compatibility/components/ux/strings';
import { newIdempotencyKey } from '../components/compatibility/components/ux/idempotencyKey';

const DEFAULT_SPECIES = 'outro';

// PET-M23: the validation error is now keyed (the petDomain ids stay the SOT;
// the visible copy is i18n'd). A stable sentinel marks "status missing"; the
// rendered text resolves via t() so a locale switch updates it.
export const STATUS_REQUIRED = 'status_required';

// Resolve a cópia calma a partir do reasonCode classificado em PetsApp (PET-M1).
// Fallback para 'generic' se vier um código desconhecido, nunca deixa o usuário
// sem mensagem nem mostra "publish_failed" cru. A cópia é i18n (pets.publish.*).
export function failureCopyFor(reasonCode) {
  const key = `pets.publish.failed.${reasonCode}`;
  const resolved = t(key);
  return resolved === key ? t(`pets.publish.failed.${PET_PUBLISH_FAILURE.GENERIC}`) : resolved;
}

export function usePetReportSheet({ open, coords, onClose, onPublish }) {
  // PET-M23: re-render this sheet on a locale switch so every t() re-reads.
  useLocale();
  const [status, setStatus] = useState(null);       // 'perdido' | 'encontrado' | 'avistado'
  const [species, setSpecies] = useState(DEFAULT_SPECIES);
  const [size, setSize] = useState('');
  const [name, setName] = useState('');
  // COR: o CHIP de bucket (id de PET_COLORS ou '') é a cor MATCHÁVEL que o finder
  // filtra; `color` (texto livre, abaixo) é nuance OPCIONAL. Single-select como o
  // porte. Ao publicar, o bucket vira o token pt-BR canônico que round-trips de
  // volta pelo normalizePetColorToBucket → o reporter e o finder falam UMA língua.
  const [colorBucket, setColorBucket] = useState('');
  const [color, setColor] = useState('');
  const [contact, setContact] = useState('');
  const [detail, setDetail] = useState('');
  const [photos, setPhotos] = useState('');         // link https que PERSISTE (cole-uma-URL, caminho durável, PET-M14 §5)
  // PET-M15: captura/biblioteca, o arquivo escolhido é redimensionado/comprimido
  // no cliente (petPhoto.resizeImageFile) e mostrado como PRÉVIA LOCAL. HONESTIDADE
  // (PET-M14 §4.4 #5): NÃO há endpoint de upload sem segredo neste repo, então a
  // prévia NÃO publica sozinha, o link colado acima é o que vai pro Dados. A prévia
  // guia o dono a obter um link hospedado. NUNCA gravamos base64 no Dados (§4.1).
  const [photoPreview, setPhotoPreview] = useState(null); // { previewUrl, width, height } | null
  const [photoState, setPhotoState] = useState('idle');   // idle | processing | error
  const photoInputRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [phase, setPhase] = useState('idle');       // idle | publishing | success | error
  const [errorMsg, setErrorMsg] = useState(null);   // erro de validação (status obrigatório)
  const [publishError, setPublishError] = useState(null); // { reasonCode, queued }, falha de publicação

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
    setColorBucket('');
    setColor('');
    setContact('');
    setDetail('');
    setPhotos('');
    // PET-M15: limpa a prévia de foto ao reabrir (e revoga o objectURL anterior,
    // se houver, para não vazar, classe BUG-115). O setter funcional lê o valor
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

  // PET-M15: revoga o objectURL da prévia ao DESMONTAR (a fechada normal já
  // revoga no reset por-open acima; este effect cobre o unmount direto). Mantém
  // um ref espelhando o state, sincronizado DENTRO de um effect (nunca durante o
  // render), e o cleanup do mount lê esse ref para revogar a última prévia viva.
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

  function chooseStatus(id) {
    setStatus(id);
    if (errorMsg === STATUS_REQUIRED) setErrorMsg(null);
  }

  // PET-M15: o dono escolheu/capturou um arquivo. Redimensiona/comprime no
  // CLIENTE (petPhoto.resizeImageFile: downscale ≤1600px, re-encode JPEG que
  // descarta EXIF/GPS, §6) e mostra como PRÉVIA LOCAL. NÃO publica e NÃO grava
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
      // sem foto, a prévia é um complemento, nunca um bloqueio).
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
      setErrorMsg(STATUS_REQUIRED);
      return;
    }
    setPhase('publishing');
    setErrorMsg(null);
    setPublishError(null);

    // COR persistida (texto livre pt-BR, o schema do blob NÃO muda). Regra de
    // precedência que GARANTE o round-trip de volta ao bucket escolhido:
    //   • bucket + detalhe → "<TokenPtBR> · <detalhe>": o token canônico do bucket
    //     lidera, então normalizePetColorToBucket casa a 1ª keyword (a do bucket)
    //     e ignora o que vem depois → mapeia de volta ao bucket escolhido;
    //   • só bucket → o token pt-BR canônico;
    //   • só texto livre (reporter pulou o chip) → o texto como antes (back-compat:
    //     o normalize ADIVINHA o bucket na leitura, como sempre);
    //   • nenhum → '' (sanitizeFreeText em buildPetDados apara/capa de novo).
    const bucketLabel = colorBucket ? petColorBucketLabelPtBR(colorBucket) : '';
    const detail2 = color.trim();
    const finalColor = bucketLabel
      ? (detail2 ? `${bucketLabel} · ${detail2}` : bucketLabel)
      : detail2;

    try {
      await onPublish?.({
        coords,
        status,
        species,
        size,
        color: finalColor,
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
      // PET-M1: onPublish (PetsApp) classifica a causa e lança PetPublishError
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
  // sozinho, o rótulo confirma "Guardado" em vez de cobrar "Tentar de novo"
  // (governador de tom: reassegura, não cobra). Em falha não-enfileirada
  // (out-of-bounds/genérica), "Tentar de novo" continua certo.
  const queuedFailure = phase === 'error' && publishError && publishError.queued;
  const buttonLabel =
    phase === 'publishing' ? t('pets.report.btn.publishing')
      : phase === 'success' ? t('pets.report.btn.success')
        : queuedFailure ? t('pets.report.btn.queued')
          : phase === 'error' ? t('pets.report.btn.retry')
            : t('pets.report.btn.publish');

  const locationLabel = coords
    ? t('pets.report.location.set').replace('{coords}', `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`)
    : t('pets.report.location.none');

  return {
    // controlled-input state + setters (read by the JSX)
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
    // refs the JSX binds
    photoInputRef,
    sheetRef,
    firstFocusRef,
    // handlers
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    chooseStatus,
    onPhotoChosen,
    clearPhotoPreview,
    handlePublish,
    // derived values
    busy,
    buttonLabel,
    locationLabel,
  };
}
