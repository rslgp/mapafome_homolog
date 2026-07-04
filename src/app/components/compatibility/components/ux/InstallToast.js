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
import useInstallPrompt from './useInstallPrompt';
import './InstallToast.css';
import { t, useLocale } from './strings';

const DISMISS_KEY = 'mdf_install_dismissed_until';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days — don't nag
const SHOW_DELAY_MS = 1500;                  // let the map settle before inviting
const VISIT_KEY = 'mdf_visit_count';         // UX-M34: earn the invite

// UX-M34 — value-timed invite. A native install prompt on the FIRST paint of a
// stranger's FIRST visit is pure noise that trains the dismiss reflex; the
// invitation should arrive AFTER the app has proved useful. Gate the reveal on
// EITHER of two earned signals:
//   • the visitor has been here before (2nd+ visit — this load bumps the count),
//   • the visitor has acted on a pin this session (mdf_acted_on_pin, set by the
//     report/act flow — a first-visit power user still gets invited).
// Storage-blocked (private mode) returns false for both, so the toast simply
// stays quiet rather than nagging.
function actedOnPin() {
  try {
    return window.localStorage.getItem('mdf_acted_on_pin') === '1';
  } catch (e) {
    return false;
  }
}

// Bump the per-load visit count ONCE and report whether the invite is earned
// (returning visitor OR acted on a pin). Guarded by a module-load-scoped ref in
// the caller so the two install effects (native + iOS) share ONE bump, never
// double-count a single page load.
function computeInviteEarned() {
  let returning = false;
  try {
    const n = Number(window.localStorage.getItem(VISIT_KEY) || 0) + 1;
    window.localStorage.setItem(VISIT_KEY, String(n));
    returning = n >= 2;
  } catch (e) {
    returning = false;
  }
  return returning || actedOnPin();
}

// Single switch to turn swipe-to-dismiss off. When false, the toast is only
// dismissed via the "Agora não" button (the native install flow is unaffected).
const SWIPE_DISMISS_ENABLED = true;

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
  useLocale(); // re-render on locale change so t() re-reads
  const [promptEvent, setPromptEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  // iOS variant: 'add' = Safari Share -> Adicionar à Tela de Início (D1);
  // 'safari' = in-app webview, instruct to open in Safari first (D3). Empty
  // string = no iOS invite. Set post-mount from the shared platform info.
  const [iosMode, setIosMode] = useState('');
  const timerRef = useRef(null);
  const iosTimerRef = useRef(null);
  const toastRef = useRef(null);
  const dragRef = useRef({ x: 0, y: 0, dragging: false });

  // UX-M34: resolve the "invite earned?" gate exactly once per mount (the bump
  // must not run twice across the native + iOS effects). Lazy-init the ref so
  // window is only touched post-mount; both effects read the same value.
  const earnedRef = useRef(null);
  const isInviteEarned = () => {
    if (earnedRef.current === null) {
      earnedRef.current =
        typeof window === 'undefined' ? false : computeInviteEarned();
    }
    return earnedRef.current;
  };

  // Single source of platform truth (LBR-D). The native-prompt branch below is
  // unchanged (LBR-A); these flags only gate the NEW iOS branch.
  const { isIOS, isStandalone, isInAppBrowser } = useInstallPrompt();

  // iOS branch — runs only when the pure classifier says real iOS, not already
  // standalone, and not within the recent 14-day dismiss back-off. iOS Safari
  // never fires beforeinstallprompt (D1), so we surface manual guidance on the
  // SAME calm-tone settle delay + back-off as the native toast. In-app webviews
  // (D3) get the "open in Safari" variant instead of unworkable Share steps.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!isIOS || isStandalone) return undefined;
    if (dismissedRecently()) return undefined;
    if (!isInviteEarned()) return undefined; // UX-M34: earn the invite

    const mode = isInAppBrowser ? 'safari' : 'add';
    clearTimeout(iosTimerRef.current);
    iosTimerRef.current = setTimeout(() => {
      // setState inside a timer callback (not during render) — no hydration risk.
      setIosMode(mode);
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(iosTimerRef.current);
  }, [isIOS, isStandalone, isInAppBrowser]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Already installed / running standalone → never invite.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      window.__mdf_app_installed === true;
    if (standalone) return undefined;
    if (dismissedRecently()) return undefined;

    // UX-M34: only invite once the app has earned it (returning visitor OR
    // acted on a pin). isInviteEarned() records THIS visit once, so a
    // first-timer crosses the threshold on their next load. The prompt event
    // is still captured either way — we just hold the reveal.
    if (!isInviteEarned()) return undefined;

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

  // ── Swipe-to-dismiss (touch) ────────────────────────────────────────────
  // Drag the toast and release past a threshold to dismiss (same 14-day
  // back-off as "Agora não"); snap back if the drag is short. CSS sets
  // touch-action:none so the gesture is ours — no preventDefault needed, and
  // button taps still fire (a tap is just a sub-threshold drag → snap back).
  const finishSwipe = (dx, dy) => {
    const el = toastRef.current;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const THRESHOLD = 72;
    const shouldDismiss = horizontal ? Math.abs(dx) > THRESHOLD : dy > THRESHOLD;

    if (!shouldDismiss) {
      if (el) {
        el.style.transition = 'transform 160ms ease-out, opacity 160ms ease-out';
        el.style.transform = '';
        el.style.opacity = '';
      }
      return;
    }

    rememberDismiss();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduce) {
      setVisible(false);
      return;
    }
    // Fly out in the gesture's direction, then unmount.
    const offX = horizontal ? Math.sign(dx) * ((window.innerWidth || 400) * 0.9) : 0;
    const offY = horizontal ? 0 : 260;
    el.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
    el.style.transform = `translate(calc(-50% + ${offX}px), ${offY}px)`;
    el.style.opacity = '0';
    window.setTimeout(() => setVisible(false), 170);
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    dragRef.current = { x: t.clientX, y: t.clientY, dragging: true };
    if (toastRef.current) toastRef.current.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    const d = dragRef.current;
    if (!d.dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - d.x;
    const dy = t.clientY - d.y;
    const el = toastRef.current;
    if (!el) return;
    const resistedDy = dy > 0 ? dy : dy * 0.25; // bottom toast: resist upward drag
    el.style.transform = `translate(calc(-50% + ${dx}px), ${resistedDy}px)`;
    const travel = Math.max(Math.abs(dx), Math.max(0, dy));
    el.style.opacity = String(Math.max(0.35, 1 - travel / 260));
  };

  const onTouchEnd = (e) => {
    const d = dragRef.current;
    if (!d.dragging) return;
    d.dragging = false;
    const t = e.changedTouches[0];
    finishSwipe(t.clientX - d.x, t.clientY - d.y);
  };

  if (!visible) return null;

  // A native install event takes precedence: when one exists we render the
  // ORIGINAL Android/Chromium toast unchanged (LBR-A). The iOS variant is only
  // rendered when there is NO native event and the iOS branch revealed a mode.
  const hasNativeEvent =
    Boolean(promptEvent) ||
    (typeof window !== 'undefined' && Boolean(window.__mdf_install_prompt));
  const showIOS = !hasNativeEvent && iosMode !== '';

  const wrapperProps = {
    ref: toastRef,
    className: `mdf-install-toast${SWIPE_DISMISS_ENABLED ? ' mdf-install-toast--swipeable' : ''}`,
    role: 'dialog',
    'aria-live': 'polite',
    onTouchStart: SWIPE_DISMISS_ENABLED ? onTouchStart : undefined,
    onTouchMove: SWIPE_DISMISS_ENABLED ? onTouchMove : undefined,
    onTouchEnd: SWIPE_DISMISS_ENABLED ? onTouchEnd : undefined,
  };

  if (showIOS) {
    // iOS has NO programmatic install API (D1), so there is no "Instalar"
    // button — only manual guidance. 'safari' = in-app webview that can't add to
    // home screen (D3): tell the user to open in Safari first. 'add' = Safari →
    // Share → Adicionar à Tela de Início.
    const isSafariHint = iosMode === 'safari';
    const title = isSafariHint
      ? t('page.install.ios_safari_title')
      : t('page.install.ios_add_title');
    const sub = isSafariHint
      ? t('page.install.ios_safari_sub')
      : t('page.install.ios_add_sub');
    return (
      <div
        {...wrapperProps}
        aria-label={t('page.install.ios_aria')}
      >
        <img className="mdf-install-toast__icon" src="/logo192.png" alt="" width="40" height="40" />
        <div className="mdf-install-toast__body">
          <strong className="mdf-install-toast__title">{title}</strong>
          <span className="mdf-install-toast__sub">{sub}</span>
        </div>
        <div className="mdf-install-toast__actions">
          <button
            type="button"
            className="mdf-install-toast__btn mdf-install-toast__btn--later"
            onClick={handleDismiss}
          >
            {t('page.install.got_it')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...wrapperProps}
      aria-label={t('page.install.aria')}
    >
      <img className="mdf-install-toast__icon" src="/logo192.png" alt="" width="40" height="40" />
      <div className="mdf-install-toast__body">
        <strong className="mdf-install-toast__title">{t('page.install.title')}</strong>
        <span className="mdf-install-toast__sub">
          {t('page.install.sub')}
        </span>
      </div>
      <div className="mdf-install-toast__actions">
        <button
          type="button"
          className="mdf-install-toast__btn mdf-install-toast__btn--install"
          onClick={handleInstall}
        >
          {t('page.install.btn')}
        </button>
        <button
          type="button"
          className="mdf-install-toast__btn mdf-install-toast__btn--later"
          onClick={handleDismiss}
        >
          {t('page.install.later')}
        </button>
      </div>
    </div>
  );
};

export default InstallToast;
