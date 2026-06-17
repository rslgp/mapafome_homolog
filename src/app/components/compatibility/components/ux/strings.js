'use client';

// strings.js — stable public i18n barrel. The runtime engine moved to
// ./i18n/engine.js and the translation DATA was sharded per feature under
// ./i18n/ (strings.core.js, strings.assinar.js, strings.pets.js), assembled by
// ./i18n/dictionary.js. This file re-exports the engine's public surface
// byte-for-byte so every consumer's `import … from '…/ux/strings'` keeps working
// unchanged. 'use client' travels with the barrel because it re-exports a client
// module (useLocale uses React hooks).
//
// To EDIT copy: change the matching shard file, not this barrel.
//   • base food-map UI (report./errors./pin./empty./cta./country./lang.) → i18n/strings.core.js
//   • /assinar (assinar.*)                                          → i18n/strings.assinar.js
//   • /pets (pets.*)                                                → i18n/strings.pets.js
// A NEW namespace is added by creating a shard and wiring it in i18n/dictionary.js.

export {
  t,
  getLocale,
  setLocale,
  useLocale,
  localeKeys,
  SUPPORTED_LOCALES,
  // INTL — LanguageControl reads the language picker's display metadata
  // (endonym label + flag) from here. The data lives next to SUPPORTED_LOCALES
  // in the engine; this barrel keeps the consumer import path stable.
  LOCALE_LABELS,
  // INTL M6 — en-US locale wiring. detectLocale is the pure browser-tag matcher;
  // useAutoDetectLocale is the first-session mount-effect (R12, NOT module-load);
  // applyDocumentLang is the single <html lang>/<html dir> writer (R14).
  detectLocale,
  useAutoDetectLocale,
  applyDocumentLang,
  // INTL HUMANITARIAN EXPANSION — pure RTL predicate (true for Arabic). Exported
  // for testability and for any consumer that branches layout on text direction.
  isRtlLocale,
  // LOC-LANG — first-session location-derived UI language. resolveLocaleFromCountry
  // is the pure country->SUPPORTED-locale map; useLocationLocale is the mount-effect
  // (R12, NOT module-load) that auto-requests geolocation, reverse-geocodes (the
  // geocoder is injected by the mount host), and applies the result through
  // setLocale ONLY when no stored/manual locale exists (dark-ship invariant).
  resolveLocaleFromCountry,
  useLocationLocale,
} from './i18n/engine.js';
