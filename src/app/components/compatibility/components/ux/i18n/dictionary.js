// dictionary.js — pure data assembler. Composes the per-feature i18n shards into
// the single DICT[locale][key] table the engine resolves against. No React, no
// 'use client', no logic — just a spread merge. This is the only module that
// knows the full key universe; ./engine.js imports DICT from here. A NEW feature
// namespace is born by adding its shard import + spreading it below (rare); copy
// edits happen in the shard files, never here.

import * as core from './strings.core.js';
import * as assinar from './strings.assinar.js';
import * as pets from './strings.pets.js';
// page-chrome shard (BRAND scope): the header/nav strings + the per-country brand
// tagline key the brand header resolves. Spread LAST per locale so it is purely
// additive. Only the three shipping locales are registered (SUPPORTED_LOCALES =
// pt-BR/es/en-US); the shard carries exactly the keys header.js/countryBrand.js
// reference, so parity holds and no key is dead.
import * as page from './strings.page.js';

export const DICT = {
  'pt-BR': { ...core.pt,   ...assinar.pt,   ...pets.pt,   ...page.pt },
  'es':    { ...core.es,   ...assinar.es,   ...pets.es,   ...page.es },
  // INTL M6 — en-US, the third UI locale. Each shard exports an `enUS` block at
  // FULL key parity with pt/es (asserted data-driven over SUPPORTED_LOCALES by
  // test/i18n*.test.js). Dignity-sensitive values are drafted + prefixed
  // `[REVISAR-HUMANO] ` pending human tone review (plan D7/M6.3).
  'en-US': { ...core.enUS, ...assinar.enUS, ...pets.enUS, ...page.enUS },
};
