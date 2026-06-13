'use client';

// LocaleAutoDetect — the single mount host for first-session browser-language
// auto-detection (INTL M6.2). Rendered once at the app root (layout.js) so EVERY
// route gets the detection without each page wiring it. It renders nothing and
// does all its work in a mount-effect (useAutoDetectLocale), so:
//   • SSR / static export prerenders the DEFAULT_LOCALE (pt-BR) HTML, this
//     component contributes no markup, and the first client render matches the
//     prerendered HTML => no hydration mismatch (R12), notably on /assinar which
//     calls ~30 t() in render without ssr:false.
//   • detection only runs when there is no stored mdf_locale; a manual pick (or a
//     prior auto-detected, now-persisted choice) always wins.
// The effect routes through setLocale, so it also writes <html lang> (R14) and
// fires 'mdf-locale-change', which useLocale subscribers re-render on.

import { useAutoDetectLocale } from './compatibility/components/ux/strings';

export default function LocaleAutoDetect() {
  useAutoDetectLocale();
  return null;
}
