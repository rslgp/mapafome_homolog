'use client';

import React, { useEffect, useRef, useState } from 'react';
import './ReportSheet.css';
import { track } from './analytics';
import { t, useLocale } from './strings';
import { NEED_CATEGORIES, needLabel } from './needCategories';
// INTL M4b (STATE-1, point a): capture the active publish country into the
// payload AT PUBLISH TIME. This is the single stamp point BOTH publish paths
// inherit — the object flows unchanged into the interactive write AND into the
// offline queue (App.handlePublishFromSheet enqueues this very object before any
// write). The flush later validates against THIS captured country, so switching
// the flag-control after queueing can no longer invalidate the pin (STATE-1).
// activeCountryFor(INTL_ENABLED, …) — not raw getSelectedCountry() — so with the
// flag OFF the stamp is always 'br' (identical to M2.5's Pais stamp / today).
import { activeCountryFor } from '../geofence';
import * as countryStore from '../countryStore';
import { INTL_ENABLED } from '../intlConfig';
import { newIdempotencyKey } from './idempotencyKey';
import useBackToClose from './useBackToClose';

// M1 — three-step reporter flow (design_brief § three_step_promise).
// Step 1 (map click) happens outside; this sheet hosts Steps 2 and 3.
//
// Categories come from the needCategories SOT so the disaster needs added for
// the 2024 RS floods (remédios/animais/carregar) show up here automatically.
const CATEGORIES = NEED_CATEGORIES;

export default function ReportSheet({ open, coords, onClose, onPublish }) {
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState('');
  const [contact, setContact] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | publishing | success | error
  // Holds an error KEY ('at_least_one_category' | 'publish_failed' | null), not a
  // resolved string, so the inline-error copy follows a locale switch.
  const [errorKey, setErrorKey] = useState(null);
  useLocale(); // re-render this client component on locale change so t() re-reads
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
    setErrorKey(null);
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

  // Android hardware/gesture Back closes the sheet instead of leaving the site
  // (EXT-URLSTATE-01). Mirrors the Escape guard: ignore Back mid-publish.
  useBackToClose(open, () => { if (status !== 'publishing') onClose?.(); });

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
    if (errorKey === 'at_least_one_category') setErrorKey(null);
  }

  async function handlePublish() {
    if (selected.size === 0) {
      setErrorKey('at_least_one_category');
      return;
    }
    setStatus('publishing');
    setErrorKey(null);

    const categories = Array.from(selected);
    const timeFromStartMs = Date.now() - (startedAtRef.current || Date.now());

    // M5 — idempotency key survives retries so a double-tap after a 10s
    // timeout does not double-write the pin (shared SOT: ./idempotencyKey).
    const idempotencyKey = newIdempotencyKey();

    try {
      await onPublish?.({
        coords,
        categories,
        detail: detail.trim(),
        contact: contact.trim(),
        idempotency_key: idempotencyKey,
        // INTL M4b: country captured HERE, at publish time. Flows unchanged into
        // both the interactive write and the offline queue (STATE-1 fix).
        country: activeCountryFor(INTL_ENABLED, countryStore),
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
      setErrorKey('publish_failed');
    }
  }

  const buttonLabel =
    status === 'publishing' ? t('report.publishing')
    : status === 'success' ? t('report.success')
    : status === 'error' ? t('report.retry')
    : t('report.button');

  const locationLabel = coords
    ? t('page.report.location_at').replace('{lat}', coords[0].toFixed(5)).replace('{lng}', coords[1].toFixed(5))
    : t('page.report.location_tap');

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
          aria-label={t('page.report.resize_aria')}
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
            {t('report.title')}
          </h2>
          <p className="mdf-sheet__subtitle">{t('report.subtitle')}</p>
          <p className="mdf-sheet__location">{locationLabel}</p>
        </header>

        {errorKey === 'at_least_one_category' && (
          <p className="mdf-sheet__inline-error" role="alert">
            {t('errors.at_least_one_category')}
          </p>
        )}

        <div className="mdf-sheet__chips" role="group" aria-label={t('page.report.categories_aria')}>
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
                <span className="mdf-chip__label">{needLabel(cat.id)}</span>
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
          <summary>{t('page.report.add_detail')}</summary>
          <label className="mdf-sr-only" htmlFor="mdf-detail">{t('page.report.detail_label')}</label>
          <input
            id="mdf-detail"
            type="text"
            className="mdf-sheet__input"
            placeholder={t('page.report.detail_ph')}
            maxLength={140}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            disabled={status === 'publishing' || status === 'success'}
            /* UX-M23: this describes a THIRD PERSON's need, not the reporter's
               own data — autocomplete off so the browser never offers to fill
               the reporter's saved details here. enterKeyHint moves the
               on-screen keyboard's action key to the next field. */
            autoComplete="off"
            enterKeyHint="next"
          />
        </details>

        <details
          className="mdf-sheet__expander"
          open={contactOpen}
          onToggle={(e) => setContactOpen(e.target.open)}
        >
          <summary>{t('page.report.contact_summary')}</summary>
          <p className="mdf-sheet__helper">
            {t('page.report.contact_helper')}
          </p>
          <label className="mdf-sr-only" htmlFor="mdf-contact">{t('page.report.contact_label')}</label>
          <input
            id="mdf-contact"
            type="text"
            className="mdf-sheet__input"
            placeholder={t('page.report.contact_ph')}
            maxLength={60}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={status === 'publishing' || status === 'success'}
            /* UX-M23: a phone/@user/link for the REPORTED person, never the
               reporter's own — autocomplete off. enterKeyHint 'done' because
               contact is the last field before publish. */
            autoComplete="off"
            enterKeyHint="done"
          />
          <p className="mdf-sheet__consent">
            {t('page.report.consent_lead')}{' '}
            <a href="/privacy.html" target="_blank" rel="noreferrer">{t('page.report.terms_privacy')}</a>
            {t('page.report.consent_tail')}
          </p>
        </details>

        {errorKey === 'publish_failed' && (
          <p className="mdf-sheet__inline-error" role="alert">
            {t('errors.publish_failed')}
          </p>
        )}

        <div className="mdf-sheet__actions">
          <button
            type="button"
            className="mdf-sheet__cancel"
            onClick={() => onClose?.()}
            disabled={status === 'publishing'}
          >
            {t('page.report.cancel')}
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
          {t('page.report.consent2_lead')}{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer">{t('page.report.terms_privacy')}</a>
          {' '}{t('page.report.consent2_mid')}{' '}
          <a href="/terms.html" target="_blank" rel="noreferrer">{t('page.report.terms_use')}</a>.
        </p>
      </div>
    </div>
  );
}
