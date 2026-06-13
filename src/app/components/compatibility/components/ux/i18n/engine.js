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
// Locale is not auto-detected: we never machine-translate dignity-sensitive copy,
// so switching locales is an explicit user decision.
//
// Dictionary structure: DICT[locale][key] = string. Components read via t(key).

const LOCALE_KEY = 'mdf_locale';
const DEFAULT_LOCALE = 'pt-BR';
export const SUPPORTED_LOCALES = ['pt-BR', 'es'];

// Display metadata for the language picker (INTL). `label` is the language's
// name IN ITS OWN language (endonym) so a speaker recognizes it regardless of
// the active UI locale; `flag` is a representative emoji. This is locale
// METADATA, not translatable copy, so it lives with SUPPORTED_LOCALES on the
// engine rather than in a per-feature DICT shard. Keep keys in sync with
// SUPPORTED_LOCALES. Re-exported by ../strings.js for LanguageControl.
export const LOCALE_LABELS = {
  'pt-BR': { label: 'Português', flag: '🇧🇷' },
  'es': { label: 'Español', flag: '🇪🇸' },
};

let currentLocale = DEFAULT_LOCALE;

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) currentLocale = stored;
  } catch (_e) { /* ignore */ }
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
  if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', locale);
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
