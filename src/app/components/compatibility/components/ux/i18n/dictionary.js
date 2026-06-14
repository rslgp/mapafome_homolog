// dictionary.js — pure data assembler. Composes the per-feature i18n shards into
// the single DICT[locale][key] table the engine resolves against. No React, no
// 'use client', no logic — just a spread merge. This is the only module that
// knows the full key universe; ./engine.js imports DICT from here. A NEW feature
// namespace is born by adding its shard import + spreading it below (rare); copy
// edits happen in the shard files, never here.

import * as core from './strings.core.js';
import * as assinar from './strings.assinar.js';
import * as pets from './strings.pets.js';
// page-chrome shard: the migrated formerly-inline UI strings (header, sheets,
// tutorial, filters, info panel). Spread LAST per locale so it is purely additive.
import * as page from './strings.page.js';

export const DICT = {
  'pt-BR': { ...core.pt,   ...assinar.pt,   ...pets.pt,   ...page.pt },
  'es':    { ...core.es,   ...assinar.es,   ...pets.es,   ...page.es },
  // INTL M6 — en-US, the third UI locale. Each shard exports an `enUS` block at
  // FULL key parity with pt/es (asserted data-driven over SUPPORTED_LOCALES by
  // test/i18n*.test.js). Dignity-sensitive values are drafted + prefixed
  // `[REVISAR-HUMANO] ` pending human tone review (plan D7/M6.3).
  'en-US': { ...core.enUS, ...assinar.enUS, ...pets.enUS, ...page.enUS },
  // INTL — de/fr/ru/zh, locales 4 to 7, bringing MapaFome to the SOLONE game's
  // 7-language set (ptbr, en, es, de, fr, ru, cn->zh). Each shard exports a block
  // per locale at FULL key parity (asserted data-driven over SUPPORTED_LOCALES).
  // Dignity-sensitive values carry `[REVISAR-HUMANO] ` for human tone review
  // before ship, mirroring the en-US draft set exactly; mechanical copy is final.
  'de':    { ...core.de,   ...assinar.de,   ...pets.de,   ...page.de },
  'fr':    { ...core.fr,   ...assinar.fr,   ...pets.fr,   ...page.fr },
  'ru':    { ...core.ru,   ...assinar.ru,   ...pets.ru,   ...page.ru },
  'zh':    { ...core.zh,   ...assinar.zh,   ...pets.zh,   ...page.zh },
};
