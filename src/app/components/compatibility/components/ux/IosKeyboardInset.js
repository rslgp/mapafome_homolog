'use client';

import { useEffect } from 'react';

// iOS keyboard pushes content: when the soft keyboard opens, iOS shrinks
// window.visualViewport.height but leaves window.innerHeight unchanged.
// Fixed-position bottom sheets and toasts therefore sit behind the keyboard.
// This effect exposes the "hidden" area as a CSS custom property —
// `--mdf-keyboard-inset` (in px) — on :root, so layouts can reserve space
// dynamically via `padding-bottom: calc(... + var(--mdf-keyboard-inset, 0px))`.
//
// Android Chrome resizes window.innerHeight directly, so the CSS fallback is 0
// (no extra padding needed) which is correct.
export default function IosKeyboardInset() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const vv = window.visualViewport;
        if (!vv) return;

        const root = document.documentElement;
        const update = () => {
            const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            root.style.setProperty('--mdf-keyboard-inset', hidden + 'px');
        };

        update();
        // Only resize matters here — fires when the soft keyboard opens or
        // closes. visualViewport.scroll fires on every page scroll, causing
        // CSS-var thrashing on Android during normal scrolling.
        vv.addEventListener('resize', update);
        return () => {
            vv.removeEventListener('resize', update);
            root.style.removeProperty('--mdf-keyboard-inset');
        };
    }, []);

    return null;
}
