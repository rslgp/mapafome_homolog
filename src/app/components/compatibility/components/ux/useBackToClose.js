'use client';

/*
 * useBackToClose — make the Android hardware/gesture BACK dismiss an open
 * sheet/modal instead of navigating away from the site (EXT-URLSTATE-01).
 *
 * Problem: none of the sheets touched history, so on Android (the PWA's target
 * device class) pressing Back while a report sheet was open left the site and
 * DISCARDED whatever the user had typed. Escape-to-close existed for desktop
 * keyboards; the hardware Back button did not.
 *
 * Contract:
 *   • When `open` flips true, push ONE history entry tagged { mdfSheet: true }.
 *   • On popstate (Back pressed) while open, call onClose() — the browser has
 *     already popped our entry, so we must NOT call history.back() again.
 *   • On a NORMAL close (X / backdrop / Escape → `open` flips false while our
 *     entry is still on top), pop our own entry with history.back() so it does
 *     not leak (otherwise the next Back press would be swallowed doing nothing).
 *
 * The `poppedByBack` ref disambiguates the two close paths so we never double-
 * pop (which would navigate the user away — the exact bug we are fixing) and
 * never leave a dangling entry.
 *
 * SSR-safe: no-ops when window/history is unavailable.
 */

import { useEffect, useRef } from 'react';

export default function useBackToClose(open, onClose) {
  // Keep the latest onClose without re-subscribing the popstate listener each
  // render (a new closure every render would thrash addEventListener).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // True only for the window between "Back popped our entry" and the resulting
  // `open === false` effect run, so the close cleanup knows not to pop again.
  const poppedByBack = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    if (typeof window === 'undefined' || !window.history) return undefined;

    poppedByBack.current = false;
    // Push a dedicated entry we own. Same URL, only the state marker differs.
    window.history.pushState({ mdfSheet: true }, '');

    const onPop = () => {
      // Back was pressed: our entry is already gone. Just close; do not pop.
      poppedByBack.current = true;
      onCloseRef.current?.();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      // Normal close (not via Back): our pushed entry is still on the stack —
      // remove it so Back is not silently consumed later. Guard with the flag
      // AND the state marker so we never over-pop past our own entry.
      if (!poppedByBack.current && window.history.state && window.history.state.mdfSheet) {
        window.history.back();
      }
    };
  }, [open]);
}
