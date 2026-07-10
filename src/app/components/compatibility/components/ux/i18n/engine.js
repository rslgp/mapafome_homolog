'use client';

import { useEffect, useState } from 'react';
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
// DEFAULT_LOCALE and SUPPORTED_LOCALES are the PURE locale SOT — they live in
// ./locales.js (no React, no 'use client') so SERVER metadata code can read the
// list without importing this Client Component. Re-exported here (and through
// ../strings.js) so every existing client consumer keeps its current import path.
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales.js';

// RTL_LOCALES — the set of right-to-left UI locales among SUPPORTED_LOCALES. Only
// Arabic (ar) is RTL in this set; pt-BR/es/en-US/de/fr/ru/zh/bn/uk/hi/tr are all LTR
// (Hindi is Devanagari-LTR, Turkish is Latin-LTR).
// Used by applyDocumentLang to write <html dir> alongside <html lang>, so text
// direction follows the active language everywhere with no new mount host. Kept as
// a module-level Set so isRtlLocale and applyDocumentLang share one source of truth.
const RTL_LOCALES = new Set(['ar']);

// isRtlLocale — pure predicate, true for a right-to-left locale. Exported through
// the barrel for testability (and for any consumer that needs to branch layout on
// direction); applyDocumentLang uses it for the <html dir> write.
export function isRtlLocale(locale) {
  return RTL_LOCALES.has(locale);
}

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
  'de': { label: 'Deutsch', flag: '🇩🇪' },
  'fr': { label: 'Français', flag: '🇫🇷' },
  'ru': { label: 'Русский', flag: '🇷🇺' },
  'zh': { label: '中文', flag: '🇨🇳' },
  // INTL HUMANITARIAN EXPANSION — ar/bn/uk. `label` is the endonym (the language's
  // own name); `flag` is a representative emoji. Arabic is pan-regional (Syria,
  // Sudan, refugees per the doc); 🇸🇦 is the conventional, reliably-rendered
  // picker emoji for the Arabic language. bn -> Bangladesh, uk -> Ukraine.
  'ar': { label: 'العربية', flag: '🇸🇦' },
  'bn': { label: 'বাংলা', flag: '🇧🇩' },
  'uk': { label: 'Українська', flag: '🇺🇦' },
  // INTL DEMAND EXPANSION — hi/tr. Endonym labels (हिन्दी / Türkçe); the flag is the
  // primary country each locale serves: hi -> India 🇮🇳, tr -> Turkey 🇹🇷.
  'hi': { label: 'हिन्दी', flag: '🇮🇳' },
  'tr': { label: 'Türkçe', flag: '🇹🇷' },
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
    // INTL HUMANITARIAN EXPANSION (Arabic RTL): direction follows language here, in
    // the SINGLE <html lang> writer, so every path (module-init, manual pick, auto-
    // detect) sets <html dir> too with no new mount host. ar -> rtl, all other
    // supported locales -> ltr. SSR-safe under the same `typeof document` guard.
    // NOTE: this is the dir ATTRIBUTE only; a full CSS logical-property / layout RTL
    // audit is intentionally out of scope for this pass.
    document.documentElement.setAttribute('dir', isRtlLocale(locale) ? 'rtl' : 'ltr');
  }
}

// ── Active-locale STATE, anchored on a single globalThis record ──────────────
// The active locale and the in-process subscriber set live on globalThis, NOT in
// a per-module `let`. WHY (the bug this fixes): the dev webpack build can place a
// 'use client' module behind a chunk boundary that yields TWO physical copies of
// THIS engine module. With a module-level `let currentLocale`, the copy setLocale
// mutates is not the copy the React tree's t() reads, so a language pick applied
// localStorage + <html lang> but NOT the rendered strings until a reload re-inited
// both copies from storage. Anchoring the SOT on one process-global record makes
// every duplicate copy read/write the SAME value, so the split disappears. The
// listener Set lives here too, so a subscriber registered on copy A is notified by
// a setLocale on copy B, immune to which copy a component's hook ran on. This is
// the single-source-of-truth principle made resilient to module duplication.
//
// SSR-safe: globalThis exists on the server; the record initializes to
// DEFAULT_LOCALE and no window/document/localStorage is touched until the
// browser-only init below runs.
// store() — resolve the one process-global record AT CALL TIME, never through a
// captured per-module `const`. WHY this replaced the prior `const STORE = (...)`
// (the bug the E2E probe finally isolated on a fresh `next dev --webpack`): the
// dev webpack build evaluates this 'use client' module MORE THAN ONCE (the module
// is duplicated across chunks / the RSC client boundary), so `const STORE` creates
// TWO bindings. The probe proved the `listeners` Set and the `.locale` FIELD live on
// the single `globalThis.__MDF_I18N__` object — but the engine COPY whose t() is
// captured in the header/MainControls render closure read `STORE.locale` through
// copy B's binding, which did not track the picker's write on copy A. Net split:
// SOT (globalThis) = de while every rendered string stayed pt-BR, even though the
// useSyncExternalStore subscription fired and React re-rendered. Routing EVERY read
// and write through store() — which dereferences globalThis fresh on each call —
// means there is no captured binding to go stale: every copy reads/writes the live
// global object and the same `listeners` Set. This is single-source-of-truth made
// resilient to module duplication. SSR-safe: globalThis exists on the server; the
// record initializes to DEFAULT_LOCALE and no window/document/localStorage is
// touched until the browser-only init below runs.
function store() {
  return (globalThis.__MDF_I18N__ ||= {
    locale: DEFAULT_LOCALE,
    listeners: new Set(),
  });
}

// activeLocale() — read the active locale from the live global record on EVERY call,
// never via a captured copy. The single read primitive behind t(), getSnapshot(),
// getLocale() and localeKeys()'s default, so no active-locale read can be bound to a
// stale per-copy STORE again.
function activeLocale() {
  return store().locale || DEFAULT_LOCALE;
}

// notify: fire the in-process subscriber set directly (the duplication-immune
// path). Each subscriber is the callback React handed to subscribe() via
// useSyncExternalStore — calling it tells React "the external store changed, take
// a fresh getSnapshot and re-render if it differs". The Set lives on the shared
// global STORE, so a callback registered by a useLocale() that ran on engine-copy-A
// is still invoked by a setLocale()/notify() on engine-copy-B.
//
// WHY this also dispatches the window CustomEvent and is scheduled on a MICROTASK
// (the live-switch bug the in-browser probe finally isolated): the language picker
// is a VANILLA LEAFLET DOM control (LanguageControl.js) — its option-click handler
// calls setLocale() -> notify() SYNCHRONOUSLY, OUTSIDE React's event system and its
// batching/scheduler. The probe proved the failure precisely: notify() DID iterate
// the shared Set and call all 14 React onStoreChange callbacks, yet React never
// re-read getSnapshot and never re-rendered (the header stayed frozen at its
// mount-time value through picks of de/ru/de). That signature — "subscriber fires
// but React never re-reads the snapshot" — is React 19 receiving a store change from
// a non-React (imperative Leaflet) call stack: the re-render is scheduled but never
// flushed because nothing else triggers a React tick on that stack. The cure is to
// fire the notification AFTER the synchronous Leaflet handler unwinds, on a fresh
// microtask tick, so React's scheduler registers AND flushes the re-render normally.
// The SOT write, persistence and <html lang> stay SYNCHRONOUS in setLocale (so t()/
// getLocale() read the new value immediately); only the SUBSCRIBER NOTIFICATION is
// deferred. queueMicrotask runs before the next paint/macrotask, so the re-render is
// not perceptibly delayed. (See setLocale + useLocale for the full plumbing.)
function notify() {
  // Fire the in-process subscriber Set (kept for any non-React listener) AND
  // dispatch the 'mdf-locale-change' window event, which is what useLocale()
  // subscribes to for its re-render. Synchronous: setLocale already wrote the SOT,
  // so any handler reading activeLocale() sees the new value.
  store().listeners.forEach((fn) => {
    try { fn(); } catch (_e) { /* a broken subscriber never blocks the others */ }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mdf-locale-change', { detail: { locale: activeLocale() } }));
  }
}

// ── useSyncExternalStore plumbing (the canonical external-store subscription) ──
// WHY this replaced the hand-rolled useReducer+window-event subscription (the bug
// the E2E probe caught on a fresh `next dev --webpack`): the prior useLocale() did
// `const [,force]=useReducer(c=>c+1,0)` and called force() from a listener. Under
// React 19 concurrent rendering a force-update dispatched from OUTSIDE React's view
// of an external store has no snapshot React can compare against, so React could
// bail out / coalesce it and the mounted tree never re-rendered — even though the
// global STORE.locale had flipped and listeners.size was unchanged (exactly the
// probe's evidence: SOT updated, <html lang> updated, DOM text frozen). React's
// useSyncExternalStore is built for precisely this: React owns the snapshot, so a
// subscribe() callback firing makes React re-read getSnapshot and re-render iff the
// value changed. It is also hardened against tearing and module duplication.
//
// These three functions are MODULE-SCOPE (stable identity): useSyncExternalStore
// re-subscribes whenever the `subscribe` reference changes, so it MUST NOT be a
// fresh closure per render. All three resolve the shared global record THROUGH
// store()/activeLocale() AT CALL TIME (globalThis.__MDF_I18N__) — never a captured
// local copy — so even if subscribe runs on one physical engine copy and setLocale
// on another, both touch the one process-global record and the snapshot React reads
// is the freshly-set locale.

// subscribe(onStoreChange): register React's change callback on the shared global
// listener Set AND on the 'mdf-locale-change' window event (belt-and-suspenders:
// the window path covers a dispatch from any OTHER source, e.g. App.js, that does
// not go through notify()). Returns the unsubscribe that detaches both. SSR-safe:
// the window wiring is guarded; the Set add/remove is harmless on the server.
function subscribe(onStoreChange) {
  store().listeners.add(onStoreChange);
  if (typeof window !== 'undefined') {
    window.addEventListener('mdf-locale-change', onStoreChange);
  }
  return () => {
    store().listeners.delete(onStoreChange);
    if (typeof window !== 'undefined') {
      window.removeEventListener('mdf-locale-change', onStoreChange);
    }
  };
}

// getSnapshot: read the active locale from the SHARED global SOT (not a captured
// local). Returning a stable primitive string means React's snapshot comparison is
// a plain === and never spuriously re-renders or warns about an unstable snapshot.
function getSnapshot() {
  return activeLocale();
}

// getServerSnapshot: the SSR/static-export snapshot. The server has no localStorage
// and must match the prerendered DEFAULT_LOCALE (no hydration text-mismatch, R12),
// so it returns DEFAULT_LOCALE rather than STORE.locale.
function getServerSnapshot() {
  return DEFAULT_LOCALE;
}

// Browser-only init: hydrate the active locale from localStorage (the durable SOT)
// and reflect it onto <html lang>. This runs on EVERY module evaluation, mirroring
// the original `let currentLocale = stored || DEFAULT` semantics, now writing the
// shared STORE instead of a per-module local.
//
// Why re-reading localStorage every eval is correct AND duplication-safe: a manual
// pick always routes through setLocale, which PERSISTS to localStorage before any
// later (duplicated) engine copy can evaluate. So a second copy loading after a pick
// reads the persisted value here and converges on it, with no clobber.
//
// GUARD (the second contributor the probe flagged): a stored value, when present,
// ALWAYS wins — it is the durable SOT and a real pick has already written it. But
// when there is NO stored value, this init must NOT clobber an already-picked
// in-memory locale back to DEFAULT. That clobber is exactly how a SECOND engine
// copy, evaluating AFTER a user pick, could reset .locale to pt-BR if its
// localStorage read raced or differed — re-introducing the split. So: read stored
// first; if stored is a supported locale, set it; ELSE keep whatever the live global
// record already holds (an existing pick), defaulting to DEFAULT_LOCALE only when the
// record is fresh this eval (no prior .locale). This keeps the resetModules() init
// tests deterministic (they ALWAYS set localStorage before importing, so the stored
// branch drives them) while making a second post-pick eval a no-op on .locale.
if (typeof window !== 'undefined') {
  const rec = store();
  let resolved = null;
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) resolved = stored;
  } catch (_e) { /* ignore */ }
  if (resolved) {
    rec.locale = resolved; // stored choice is the durable SOT — always wins
  } else if (!rec.locale) {
    rec.locale = DEFAULT_LOCALE; // fresh record, nothing stored -> default
  } // else: no stored value but a locale is already set -> do NOT clobber the pick
  // a11y: reflect the resolved locale onto <html lang> at init too, not only on a
  // manual pick. Guarded by `typeof window` so SSR/export keeps the layout default.
  applyDocumentLang(rec.locale);
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
    // de/fr/ru/zh are base codes themselves, so a regional tag (de-AT, fr-CA,
    // ru-RU, zh-CN/zh-TW/zh-Hans) maps to the base locale here.
    if (base === 'de') return 'de';
    if (base === 'fr') return 'fr';
    if (base === 'ru') return 'ru';
    if (base === 'zh') return 'zh';
    // INTL HUMANITARIAN EXPANSION — ar/bn/uk are base codes, so a regional tag
    // (ar-EG, ar-SY, bn-BD, bn-IN, uk-UA) maps to the base locale here.
    if (base === 'ar') return 'ar';
    if (base === 'bn') return 'bn';
    if (base === 'uk') return 'uk';
  }
  return DEFAULT_LOCALE;
}

export function getLocale() {
  return activeLocale();
}

// ── Location → locale resolver (LOC-LANG) ─────────────────────────────────────
// resolveLocaleFromCountry — PURE map from an ISO 3166-1 alpha-2 country code (the
// SAME normalized lowercase code reverseGeocodeCountry returns, via
// normalizeCountryCode) to a SUPPORTED locale. Three explicit buckets, everything
// else -> 'en-US' (the international fallback for the location path; note this
// DIFFERS from detectLocale's pt-BR default, because a device physically located
// in, e.g., France is better served by English than by Brazilian Portuguese — the
// browser-language path already covers the pt/es/en speakers there):
//   • Lusophone country -> 'pt-BR'
//   • Hispanophone country -> 'es'
//   • anything else (incl. null/unknown) -> 'en-US'
// Side-effect-free and store-free so it is unit-testable and the mount-effect host
// can call it without importing the geocoder. Returns null ONLY for a falsy/blank
// input so the caller can distinguish "no signal" (do nothing) from "resolved to a
// concrete locale" (apply it) — a non-null, non-blank but UNKNOWN country still
// resolves to the 'en-US' fallback, never null.
const LUSOPHONE_COUNTRIES = ['br', 'pt', 'ao', 'mz', 'cv', 'gw', 'st', 'tl', 'gq'];
const HISPANOPHONE_COUNTRIES = [
  'es', 'ar', 'mx', 'co', 'cl', 'pe', 've', 'ec', 'gt', 'cu', 'bo', 'do',
  'hn', 'py', 'sv', 'ni', 'cr', 'pa', 'uy', 'pr',
];

export function resolveLocaleFromCountry(code) {
  if (typeof code !== 'string') return null;
  const cc = code.trim().toLowerCase();
  if (!cc) return null;
  if (LUSOPHONE_COUNTRIES.includes(cc)) return 'pt-BR';
  if (HISPANOPHONE_COUNTRIES.includes(cc)) return 'es';
  return 'en-US';
}

// Sorted key list for a locale (defaults to the active one). Read-only view of
// the dictionary intended for parity/dead-key tests; returns [] for an unknown
// locale so callers don't have to guard.
export function localeKeys(locale = activeLocale()) {
  const dict = DICT[locale];
  return dict ? Object.keys(dict).sort() : [];
}

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  // SOT write + persistence + <html lang> stay SYNCHRONOUS so t()/getLocale() and
  // the durable store read the new value the instant setLocale returns (the picker's
  // own renderButton() and the pets/assinar t()-after-setLocale paths rely on this).
  store().locale = locale; // write the single global SOT AT CALL TIME (every copy reads it)
  try { window.localStorage.setItem(LOCALE_KEY, locale); } catch (_e) {}
  applyDocumentLang(locale); // single SOT for the <html lang> write (R14)
  // Notify subscribers on a deferred microtask tick (see notify()): the React
  // onStoreChange callbacks (the duplication-immune shared Set) AND the window
  // CustomEvent both fire there, AFTER the synchronous Leaflet pick handler unwinds,
  // so React's scheduler flushes the re-render instead of dropping a store change
  // delivered from inside a non-React imperative call stack (the live-switch bug).
  notify();
}

export function t(key) {
  const dict = DICT[activeLocale()] || DICT[DEFAULT_LOCALE];
  return (dict && dict[key]) || key;
}

// React subscription hook (useSyncExternalStore — the canonical external-store API).
// t() reads the global locale via activeLocale() at call time, so a component that
// calls t() during render will NOT re-render when setLocale fires unless it ALSO
// subscribes.
// A consumer calls useLocale() to subscribe; useSyncExternalStore re-renders the
// component when getSnapshot() returns a new locale. The returned value IS the
// active locale (unchanged public contract), so callers that read it — or key a
// memo/effect dep on it — keep working.
//
// WHY useSyncExternalStore and not the prior useReducer+force: see the plumbing
// block above. In short, React owns the snapshot here, so a subscribe-callback fire
// deterministically re-renders the tree when the locale actually changed, instead
// of a manual force() that React 19 concurrent mode could coalesce away (the live
// dev-webpack bug). subscribe/getSnapshot are module-scope (stable identity) and
// resolve the shared global record via store()/activeLocale() at call time, so the
// React tree's subscription and setLocale's notify() converge on the one
// process-global record even across duplicated engine copies. getServerSnapshot
// returns DEFAULT_LOCALE for SSR.
export function useLocale() {
  // Re-render on locale change via a plain useState bump driven by the
  // 'mdf-locale-change' window event (the SAME event setLocale dispatches). This
  // replaced a useSyncExternalStore variant that, under this app's mount (the map
  // app is a dynamic ssr:false import and the picker is a vanilla Leaflet imperative
  // control), did not re-read its snapshot when notified from outside React's view —
  // an in-browser probe proved useState+event re-renders where useSyncExternalStore
  // did not. The hook returns the active locale so callers can key memo/effect deps.
  // SSR-safe: the effect only runs in the browser.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => setTick((n) => n + 1);
    window.addEventListener('mdf-locale-change', handler);
    return () => window.removeEventListener('mdf-locale-change', handler);
  }, []);
  return activeLocale();
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
    if (match !== activeLocale()) setLocale(match);
    else applyDocumentLang(match); // already on the match: still fix <html lang>
  }, []);
}

// hasStoredLocale — the single read of the stored-locale gate (the dark-ship
// "a manual/stored choice always wins" invariant). Shared by the location-locale
// effect so the gate semantics match useAutoDetectLocale exactly (engine.js:58
// init read + engine.js:153 effect read): a stored value present at ANY check
// means "do not auto-apply a derived locale". SSR/no-storage -> treated as no
// stored value (the effect is browser-only anyway).
function hasStoredLocale() {
  try {
    return !!window.localStorage.getItem(LOCALE_KEY);
  } catch (_e) {
    return false;
  }
}

// useLocationLocale — FIRST-SESSION location-derived UI language (LOC-LANG), run
// as a MOUNT-EFFECT for the SAME R12 reason as useAutoDetectLocale: the first
// client render must still emit the prerendered DEFAULT_LOCALE (no hydration
// mismatch), and the one re-render comes via 'mdf-locale-change' that useLocale
// already subscribes to. It auto-requests device geolocation on mount, reverse-
// geocodes the coords to a country (the geocoder is INJECTED — reverseGeocode —
// so the engine never imports it and there is no module cycle), resolves the
// nearest SUPPORTED locale (resolveLocaleFromCountry), and routes it through the
// SINGLE writer setLocale (which writes <html lang> R14 + persists + re-renders).
//
// DARK-SHIP INVARIANT (a manual/stored choice ALWAYS wins): gated on
// hasStoredLocale() BEFORE the request AND RE-checked at apply time, because the
// reverse-geocode is async — between the request and its resolution the user may
// have picked a language manually, OR useAutoDetectLocale may have persisted a
// browser-language choice. Either way a stored value present at apply time means
// we DO NOT override it. This is the same precedence as the browser-language path,
// extended to the location signal.
//
// FAIL-CLOSED-TO-DEFAULT on ANY failure (denied permission, timeout, position
// error, missing geolocation/fetch, ocean/network reverse-geocode miss, an
// unmount mid-request): the effect simply does nothing — no throw, no console
// spam — so today's default locale behavior is left UNCHANGED. The recenter of
// the MAP on the same coords is owned separately by App.js's existing
// getCurrentPosition (this hook is the LANGUAGE half only).
export function useLocationLocale(reverseGeocode) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined;
    const geo = navigator.geolocation;
    if (!geo || typeof geo.getCurrentPosition !== 'function') return undefined;
    if (typeof reverseGeocode !== 'function') return undefined;
    if (hasStoredLocale()) return undefined; // stored/manual choice wins — never re-detect

    let cancelled = false;
    geo.getCurrentPosition(
      (position) => {
        const coords = position && position.coords
          ? [position.coords.latitude, position.coords.longitude]
          : null;
        if (!coords) return;
        // reverseGeocode fails OPEN (resolves null on ocean/network/throttle/parse
        // error) and never throws per its contract; still guard with .catch so a
        // future contract change cannot surface an unhandled rejection or console
        // noise. A null country or a null resolved locale => do nothing (leave the
        // default), honoring the graceful-degradation rule.
        Promise.resolve()
          .then(() => reverseGeocode(coords))
          .then((countryCode) => {
            if (cancelled) return;
            const locale = resolveLocaleFromCountry(countryCode);
            if (!locale) return;
            // RE-check the gate: a manual pick or the browser-language path may
            // have persisted a locale during the async window. Stored wins.
            if (hasStoredLocale()) return;
            if (locale !== activeLocale()) setLocale(locale);
          })
          .catch(() => { /* swallow — graceful degradation, no console spam */ });
      },
      () => { /* denied / timeout / position error -> leave default, no spam */ },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );

    return () => { cancelled = true; };
  }, [reverseGeocode]);
}
