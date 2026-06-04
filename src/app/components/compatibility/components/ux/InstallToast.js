'use client';

/*
 * InstallToast — a calm, auto-appearing PWA-lite install invitation on the
 * landing page. Complements the explicit install badges in InfoPanel: this
 * surfaces the SAME native install prompt WITHOUT the user having to find a
 * button. Follows pwa_lite_builder.yaml PWAL-BRIDGE (capture beforeinstallprompt,
 * call .prompt() from a real user gesture) and the calm-tone governor:
 *   • appears only when the app is actually installable (event captured),
 *   • shows once, after a short settle delay (no pounce on first paint),
 *   • a dismiss backs off for 14 days (no nagging),
 *   • never shows once installed / running standalone,
 *   • reduced-motion safe (CSS animation collapses).
 * The beforeinstallprompt event is captured early by the bridge in layout.js
 * (window.__mdf_install_prompt), so it is never missed if it fired pre-mount.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './InstallToast.css';

const DISMISS_KEY = 'mdf_install_dismissed_until';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days — don't nag
const SHOW_DELAY_MS = 1500;                  // let the map settle before inviting

function dismissedRecently() {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Boolean(until) && Date.now() < until;
  } catch (e) {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch (e) {
    /* storage blocked (private mode) — fine, it just won't persist */
  }
}

const InstallToast = () => {
  const [promptEvent, setPromptEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Already installed / running standalone → never invite.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      window.__mdf_app_installed === true;
    if (standalone) return undefined;
    if (dismissedRecently()) return undefined;

    const reveal = (e) => {
      setPromptEvent(e);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    // The event may have been captured by the early bridge in layout.js before
    // this component mounted.
    if (window.__mdf_install_prompt) reveal(window.__mdf_install_prompt);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      window.__mdf_install_prompt = e;
      reveal(e);
    };
    const onInstalled = () => {
      clearTimeout(timerRef.current);
      setVisible(false);
      setPromptEvent(null);
      window.__mdf_install_prompt = null;
      window.__mdf_app_installed = true;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const ev = promptEvent || (typeof window !== 'undefined' ? window.__mdf_install_prompt : null);
    if (!ev) {
      setVisible(false);
      return;
    }
    ev.prompt(); // must run inside this click's user-activation window
    try {
      const { outcome } = await ev.userChoice;
      if (outcome !== 'accepted') rememberDismiss(); // declined → back off
    } catch (e) {
      /* prompt() threw (gesture race) — ignore, just hide */
    }
    if (typeof window !== 'undefined') window.__mdf_install_prompt = null;
    setPromptEvent(null);
    setVisible(false);
  }, [promptEvent]);

  const handleDismiss = useCallback(() => {
    rememberDismiss();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="mdf-install-toast"
      role="dialog"
      aria-live="polite"
      aria-label="Instalar o aplicativo MAPA FOME"
    >
      <img className="mdf-install-toast__icon" src="/logo192.png" alt="" width="40" height="40" />
      <div className="mdf-install-toast__body">
        <strong className="mdf-install-toast__title">Instalar o MAPA FOME</strong>
        <span className="mdf-install-toast__sub">
          Adicione à tela inicial: abre rápido, funciona offline e ocupa 0 espaço.
        </span>
      </div>
      <div className="mdf-install-toast__actions">
        <button
          type="button"
          className="mdf-install-toast__btn mdf-install-toast__btn--install"
          onClick={handleInstall}
        >
          Instalar
        </button>
        <button
          type="button"
          className="mdf-install-toast__btn mdf-install-toast__btn--later"
          onClick={handleDismiss}
        >
          Agora não
        </button>
      </div>
    </div>
  );
};

export default InstallToast;
