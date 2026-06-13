'use client';

import { useEffect, useReducer } from 'react';
import { DICT } from './dictionary.js';

// engine.js — the runtime i18n engine: locale state + resolution + React
// subscription. The translation DATA lives in the per-feature shards under this
// i18n/ directory and is assembled by ./dictionary.js; this file owns only the
// behavior. The public surface is re-exported byte-for-byte by the stable barrel
// at ../strings.js, so all consumer import paths stay unchanged.
//
// M9 — i18n scaffolding. Portuguese remains the primary language per the brief.
// Dignity-sensitive copy is never machine-translated, so a NEW locale's sensitive
// strings ship only after human review (en-US drafts carry a [REVISAR-HUMANO]
// prefix in the shards). INTL M6 adds en-US as a third UI locale AND first-session
// browser-language auto-detection — but the detection runs in a MOUNT-EFFECT
// (useAutoDetectLocale), never at module load, so SSR/static-export prerenders the
// DEFAULT_LOCALE and there is no hydration mismatch on /assinar (R12). A manual
// pick always wins and persists.
//
// Dictionary structure: DICT[locale][key] = string. Components read via t(key).

const LOCALE_KEY = 'mdf_locale';
const DEFAULT_LOCALE = 'pt-BR';
export const SUPPORTED_LOCALES = ['pt-BR', 'es', 'en-US'];

// Display metadata for the language picker (INTL). `label` is the language's
// name IN ITS OWN language (endonym) so a speaker recognizes it regardless of
// the active UI locale; `flag` is a representative emoji. This is locale
// METADATA, not translatable copy, so it lives with SUPPORTED_LOCALES on the
// engine rather than in a per-feature DICT shard. Keep keys in sync with
// SUPPORTED_LOCALES. Re-exported by ../strings.js for LanguageControl.
export const LOCALE_LABELS = {
  'pt-BR': { label: 'Português', flag: '🇧🇷' },
  'es': { label: 'Español', flag: '🇪🇸' },
  'en-US': { label: 'English', flag: '🇺🇸' },
};

// applyDocumentLang — the SINGLE writer of <html lang> (R14, WCAG 3.1.1). Called
// from BOTH the module-load init (the persisted choice) AND setLocale (manual pick
// + the auto-detect path, which routes through setLocale), so a returning es user
// and an auto-detected en-US/es device are announced under the right phonemes on
// the first session, not only after reopening the picker. SSR-safe: a no-op when
// `document` is undefined, so the static export resolves DEFAULT_LOCALE on the
// server without touching the DOM. The SSR default <html lang="pt-BR"> in
// layout.js stays unchanged (suppressHydrationWarning covers the client fix-up).
export function applyDocumentLang(locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale);
  }
}

let currentLocale = DEFAULT_LOCALE;

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) currentLocale = stored;
  } catch (_e) { /* ignore */ }
  // a11y: reflect the resolved locale onto <html lang> at init too, not only on a
  // manual pick. Guarded by `typeof window` so SSR/export keeps the layout default.
  applyDocumentLang(currentLocale);
}

// detectLocale — pure matcher from a list of browser language tags (BCP-47) to a
// SUPPORTED locale. Tries an EXACT tag match first (e.g. 'pt-BR', 'en-US'), then a
// base-language match (en-* -> en-US, pt-* -> pt-BR, es-* -> es); no match returns
// DEFAULT_LOCALE (pt-BR). Pure + side-effect-free so it is unit-testable and so the
// mount-effect host can call it without importing `navigator` itself. Accepts an
// array (navigator.languages) or a single tag string (navigator.language).
export function detectLocale(languages) {
  const tags = Array.isArray(languages) ? languages : (languages ? [languages] : []);
  for (const raw of tags) {
    if (typeof raw !== 'string' || !raw) continue;
    // Exact supported tag (case-insensitive on region, e.g. 'EN-us' -> 'en-US').
    const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;
  }
  for (const raw of tags) {
    if (typeof raw !== 'string' || !raw) continue;
    const base = raw.toLowerCase().split('-')[0];
    if (base === 'en') return 'en-US';
    if (base === 'pt') return 'pt-BR';
    if (base === 'es') return 'es';
  }
  return DEFAULT_LOCALE;
}

export function getLocale() {
  return currentLocale;
}

// Sorted key list for a locale (defaults to the active one). Read-only view of
// the dictionary intended for parity/dead-key tests; returns [] for an unknown
// locale so callers don't have to guard.
export function localeKeys(locale = currentLocale) {
  const dict = DICT[locale];
  return dict ? Object.keys(dict).sort() : [];
}

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  currentLocale = locale;
  try { window.localStorage.setItem(LOCALE_KEY, locale); } catch (_e) {}
  applyDocumentLang(locale); // single SOT for the <html lang> write (R14)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mdf-locale-change', { detail: { locale } }));
  }
}

export function t(key) {
  const dict = DICT[currentLocale] || DICT[DEFAULT_LOCALE];
  return (dict && dict[key]) || key;
}

// React subscription hook. t() reads the module-level currentLocale at call
// time, so a component that calls t() during render will NOT re-render when
// setLocale fires. A consumer calls useLocale() to subscribe to the
// 'mdf-locale-change' CustomEvent (dispatched by setLocale) and force a
// re-render — then its t() calls re-read the new locale. The returned value is
// the active locale, so it can also key memo/effect deps. SSR-safe: the effect
// only runs in the browser, and getLocale() returns the default on the server.
export function useLocale() {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => force();
    window.addEventListener('mdf-locale-change', handler);
    return () => window.removeEventListener('mdf-locale-change', handler);
  }, []);
  return getLocale();
}

// useAutoDetectLocale — first-session browser-language auto-detection (INTL M6.2),
// run as a MOUNT-EFFECT, never at module load (R12). WHY a mount-effect: t() reads
// the module-level currentLocale at render call-time, and /assinar is a
// 'use client' route WITHOUT ssr:false that calls ~30 t() in render, so it
// prerenders DEFAULT_LOCALE at build. If detection flipped currentLocale to
// en-US/es BEFORE the first client render, that render would emit the detected
// locale against pt-BR HTML => a genuine hydration text-mismatch. Running it in a
// mount-effect means the FIRST render still emits DEFAULT_LOCALE (== prerendered
// HTML), and the one re-render comes via the 'mdf-locale-change' event that
// useLocale already subscribes to. Routing through setLocale also writes
// <html lang> (R14) and persists the choice. Gated on `!mdf_locale`, so a manual
// pick (or a prior auto-detected, now-persisted choice) always wins; we never
// re-detect over a stored value. Mount this ONCE near the app root
// (LocaleAutoDetect) — it renders nothing.
export function useAutoDetectLocale() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    let stored = null;
    try { stored = window.localStorage.getItem(LOCALE_KEY); } catch (_e) { /* ignore */ }
    if (stored) return; // a saved choice (manual or prior auto-detect) wins
    const langs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : navigator.language;
    const match = detectLocale(langs);
    if (match !== currentLocale) setLocale(match);
    else applyDocumentLang(match); // already on the match: still fix <html lang>
  }, []);
}
