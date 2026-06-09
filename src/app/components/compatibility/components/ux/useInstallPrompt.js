'use client';

/*
 * useInstallPrompt — shared PWA-lite install state + action.
 *
 * Reads the beforeinstallprompt event captured early by the bridge in
 * layout.js (window.__mdf_install_prompt) so any surface — the Header
 * "Instalar" button, the InfoPanel store badges, the InstallToast — can offer
 * installation without ever missing the event. Follows pwa_lite_builder.yaml
 * PWAL-BRIDGE: capture beforeinstallprompt, call .prompt() from a real user
 * gesture; iOS Safari never fires it (Apple policy) → caller shows manual
 * Add-to-Home-Screen instructions.
 */

import { useState, useEffect, useCallback } from 'react';

export default function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      window.__mdf_app_installed === true;
    if (standalone) {
      // Reads matchMedia / navigator.standalone (external/browser install
      // state) post-mount on purpose: deriving it during render would touch
      // window and risk an SSR hydration mismatch in this client hook.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser install state (matchMedia/navigator) post-mount to avoid hydration mismatch
      setIsInstalled(true);
      return undefined;
    }

    // Adopt an event captured before this mounted.
    if (window.__mdf_install_prompt) setCanInstall(true);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      window.__mdf_install_prompt = e;
      setCanInstall(true);
    };
    const onInstalled = () => {
      window.__mdf_install_prompt = null;
      window.__mdf_app_installed = true;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Fires the native install dialog when possible.
  // Returns: 'accepted' | 'dismissed' | 'ios' | 'unavailable'.
  const promptInstall = useCallback(async () => {
    const ev = typeof window !== 'undefined' ? window.__mdf_install_prompt : null;
    if (ev) {
      ev.prompt(); // must run inside the caller's click user-activation window
      let outcome = 'dismissed';
      try {
        const choice = await ev.userChoice;
        outcome = choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
      } catch (e) {
        /* gesture race — treat as dismissed */
      }
      window.__mdf_install_prompt = null;
      setCanInstall(false);
      if (outcome === 'accepted') setIsInstalled(true);
      return outcome;
    }

    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    if (/iphone|ipad|ipod/i.test(ua) || (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua))) {
      return 'ios';
    }
    return 'unavailable';
  }, []);

  return { canInstall, isInstalled, promptInstall };
}
