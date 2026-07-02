'use client';

/*
 * useInfoPanel, InfoPanel's own PWA-install state + action.
 *
 * M10d decompose: extracted verbatim from InfoPanel.js so the 466-LOC
 * god-component keeps only presentation. This hook owns the three pieces of
 * imperative browser wiring that were tangled into the JSX:
 *   - the deferredPrompt / isInstalled / installHint state,
 *   - the beforeinstallprompt + appinstalled effect (window-bridge adoption),
 *   - the handleInstall async handler (native prompt, else a manual hint).
 *
 * Behavior-preserving: InfoPanel deliberately keeps its OWN beforeinstallprompt
 * wiring plus store badges (LBR-A: non-regression beats DRY), so this does NOT
 * fold into the shared ux/useInstallPrompt hook. It only CONSUMES that hook's
 * isIOS / isInAppBrowser flags to pick the right manual-install hint, exactly
 * as the component did before.
 */

import { useState, useEffect } from 'react';
import useInstallPrompt from './ux/useInstallPrompt';
import { t } from './ux/strings';

export default function useInfoPanel() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');

  // Platform flags from the shared single-source classifier (LBR-D). InfoPanel
  // keeps its OWN beforeinstallprompt wiring + store badges intact (LBR-A:
  // non-regression beats DRY here); it only consumes isIOS/isInAppBrowser to
  // pick the right manual-install hint instead of re-sniffing the UA.
  const { isIOS, isInAppBrowser } = useInstallPrompt();

  // Captura o evento de instalação do PWA (Chrome/Edge/Android) para oferecer
  // a instalação da versão lite direto no botão, sem passar pela loja.
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    // Adota um evento que disparou ANTES deste componente montar, capturado
    // cedo pelo bridge em layout.js (window.__mdf_install_prompt). Estes
    // setState leem estado de navegador (window.*/matchMedia) após a montagem
    // de propósito; derivar no render tocaria window e arriscaria hydration
    // mismatch neste componente client.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads window install-prompt bridge / matchMedia (external state) post-mount to avoid hydration mismatch
    if (window.__mdf_install_prompt) setDeferredPrompt(window.__mdf_install_prompt);
    if (window.__mdf_app_installed) setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // Usa o evento do state ou o capturado cedo pelo bridge (layout.js).
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__mdf_install_prompt : null);
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') window.__mdf_install_prompt = null;
      setInstallHint('');
      return;
    }
    // Sem prompt nativo (Safari/iOS, ou navegador que ainda não atingiu o
    // critério de instalabilidade): orienta a instalação manual usando a
    // classificação central (isIOS/isInAppBrowser), não um novo sniff de UA.
    if (isIOS && isInAppBrowser) {
      // Webview do Instagram/Facebook/WhatsApp não tem "Adicionar à Tela de
      // Início" (D3): orienta a abrir no Safari primeiro.
      setInstallHint(t('page.info.hint_ios_safari'));
    } else if (isIOS) {
      setInstallHint(t('page.info.hint_ios_add'));
    } else {
      setInstallHint(t('page.info.install_hint_other'));
    }
  };

  return { isInstalled, installHint, handleInstall };
}
