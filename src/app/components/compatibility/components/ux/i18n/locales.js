// locales.js — the PURE locale SOT: the canonical default locale and the ordered
// list of supported UI locales, with NO React and NO 'use client' boundary. This
// module exists so SERVER-side code (Next App Router `metadata`, sitemap.js,
// structuredData.js) can read the locale list WITHOUT importing engine.js, which
// is a Client Component ('use client' + react hooks). Importing engine.js from a
// server module dragged the client boundary across the server/client seam and made
// the minified `SUPPORTED_LOCALES` export resolve as a non-array at build-collect
// time (`d.SUPPORTED_LOCALES.filter is not a function` on /imprensa). engine.js and
// ../strings.js RE-EXPORT these so every existing client consumer is unchanged.

// The ONE canonical default locale. Consumers reference this instead of
// re-hardcoding 'pt-BR'.
export const DEFAULT_LOCALE = 'pt-BR';

// Twelve UI locales. The first seven mirror the SOLONE game's language set (ptbr,
// en, es, de, fr, ru, cn->zh); INTL HUMANITARIAN EXPANSION adds ar/bn/uk (per
// INTERNATIONAL_EXPANSION.md, ordered by humanitarian return: Arabic, Bengali,
// Ukrainian). INTL DEMAND EXPANSION adds hi (Hindi -> India) and tr (Turkish ->
// Turkey, the world's largest refugee-hosting country): both high-need geographies
// whose primary language sat outside the prior set. de/fr/ru/zh/ar/bn/uk/hi/tr ship
// with dignity-sensitive copy drafted (`[REVISAR-HUMANO] `) pending human tone review.
export const SUPPORTED_LOCALES = ['pt-BR', 'es', 'en-US', 'de', 'fr', 'ru', 'zh', 'ar', 'bn', 'uk', 'hi', 'tr'];
