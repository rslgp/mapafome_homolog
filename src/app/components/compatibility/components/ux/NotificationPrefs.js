'use client';

import React, { useEffect, useState } from 'react';
import './NotificationPrefs.css';
import LocaleSwitch from './LocaleSwitch';
import { t, useLocale } from './strings';
import useBackToClose from './useBackToClose';

// M8 — donor opt-in panel. Defaults to OFF. We only request the browser
// permission AFTER the donor has acted on at least one pin (signal = a
// 'pin_claim_started' event ever fired). Until then, the permission prompt
// is suppressed — see anti_patterns.push_notifications_by_default.

const STORAGE_KEY = 'mdf_notif_prefs';

const DEFAULT_PREFS = {
  enabled: false,
  radiusKm: 2,
  frequency: 'immediate', // 'immediate' | 'hourly' | 'daily'
};

const FREQUENCIES = [
  { id: 'immediate', labelKey: 'page.notifprefs.freq_immediate' },
  { id: 'hourly',    labelKey: 'page.notifprefs.freq_hourly' },
  { id: 'daily',     labelKey: 'page.notifprefs.freq_daily' },
];

function loadPrefs() {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch (_e) {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (_e) { /* ignore */ }
}

export default function NotificationPrefs({ open, onClose }) {
  useLocale(); // re-render on locale change so t() re-reads
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [perm, setPerm] = useState('default');

  useEffect(() => {
    if (!open) return undefined;
    // On open, load persisted prefs (localStorage) and the live browser
    // Notification permission — both external state, read post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads persisted prefs + browser permission (external state) on open
    setPrefs(loadPrefs());
    if (typeof Notification !== 'undefined') setPerm(Notification.permission);
    // Escape closes the dialog — matches the dismissal contract of the other
    // modal sheets (close button, backdrop tap, Esc).
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Android Back closes the dialog instead of leaving the site (EXT-URLSTATE-01).
  useBackToClose(open, onClose);

  if (!open) return null;

  async function requestPermission() {
    if (typeof Notification === 'undefined') return;
    const r = await Notification.requestPermission();
    setPerm(r);
  }

  function update(patch) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  }

  return (
    <div className="mdf-notif" role="dialog" aria-modal="true" aria-labelledby="mdf-notif-title">
      <div className="mdf-notif__backdrop" onClick={() => onClose?.()} aria-hidden="true" />
      <section className="mdf-notif__panel">
        <header className="mdf-notif__header">
          <h2 id="mdf-notif-title">{t('page.notifprefs.title')}</h2>
          <button type="button" className="mdf-notif__close" onClick={() => onClose?.()}>{t('page.notifprefs.close')}</button>
        </header>

        <p className="mdf-notif__intro">
          {t('page.notifprefs.intro')}
        </p>

        <label className="mdf-notif__row">
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          <span><strong>{t('page.notifprefs.receive')}</strong></span>
        </label>

        {prefs.enabled && (
          <>
            <label className="mdf-notif__row mdf-notif__row--column">
              <span>{t('page.notifprefs.radius')} <strong>{prefs.radiusKm} km</strong></span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={prefs.radiusKm}
                onChange={(e) => update({ radiusKm: Number(e.target.value) })}
              />
            </label>

            <fieldset className="mdf-notif__freq">
              <legend>{t('page.notifprefs.frequency')}</legend>
              {FREQUENCIES.map((f) => (
                <label key={f.id} className="mdf-notif__radio">
                  <input
                    type="radio"
                    name="mdf-freq"
                    value={f.id}
                    checked={prefs.frequency === f.id}
                    onChange={() => update({ frequency: f.id })}
                  />
                  <span>{t(f.labelKey)}</span>
                </label>
              ))}
            </fieldset>

            {perm !== 'granted' && (
              <button
                type="button"
                className="mdf-notif__perm"
                onClick={requestPermission}
                disabled={perm === 'denied'}
              >
                {perm === 'denied'
                  ? t('page.notifprefs.perm_blocked')
                  : t('page.notifprefs.perm_allow')}
              </button>
            )}
          </>
        )}

        <p className="mdf-notif__foot">
          {t('page.notifprefs.foot')}
        </p>

        <LocaleSwitch />
      </section>
    </div>
  );
}

// Helper exported so callers (App.js) can decide whether to show the entry point
// (only after the donor has acted on ≥ 1 pin per brief's "permission prompt fatigue" risk).
export function hasActedOnPin() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('mdf_acted_on_pin') === '1';
  } catch (_e) { return false; }
}

export function markActedOnPin() {
  try {
    window.localStorage.setItem('mdf_acted_on_pin', '1');
  } catch (_e) { /* ignore */ }
}
