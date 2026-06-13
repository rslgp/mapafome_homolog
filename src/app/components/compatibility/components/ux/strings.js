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
//   • base food-map UI (report./errors./pin./empty./cta./country.) → i18n/strings.core.js
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
} from './i18n/engine.js';
