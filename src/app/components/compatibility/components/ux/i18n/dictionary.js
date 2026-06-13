// dictionary.js — pure data assembler. Composes the per-feature i18n shards into
// the single DICT[locale][key] table the engine resolves against. No React, no
// 'use client', no logic — just a spread merge. This is the only module that
// knows the full key universe; ./engine.js imports DICT from here. A NEW feature
// namespace is born by adding its shard import + spreading it below (rare); copy
// edits happen in the shard files, never here.

import * as core from './strings.core.js';
import * as assinar from './strings.assinar.js';
import * as pets from './strings.pets.js';

export const DICT = {
  'pt-BR': { ...core.pt, ...assinar.pt, ...pets.pt },
  'es':    { ...core.es, ...assinar.es, ...pets.es },
};
