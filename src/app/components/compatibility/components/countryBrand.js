// countryBrand.js — INTL per-country BRAND ADAPTATION layer ("like Coca-Cola").
//
// ONE global MAPA FOME identity with a thin, per-country localized layer on top.
// Coke keeps its mark everywhere; only the wordmark casing, a tagline, an accent
// hue and the local flag badge adapt. This module is the DATA SOT for that layer:
// getCountryBrand(code) -> a pure brand DESCRIPTOR the Header renders, GATED by
// INTL_ENABLED at the call site (flag OFF -> the caller never calls this and the
// header is byte-identical to today; the dark-ship invariant, rollbackDrill.test).
//
// DESIGN — three deliberate seams so the right owner fills each value:
//   • wordmark  — the canonical 'MAPA FOME' identity. Brazil KEEPS it (Coke does
//     not rename itself per market). isCanonicalWordmark lets the Header fall back
//     to t('page.header.wordmark') so the default string SOT is not duplicated.
//   • taglineKey — an i18n KEY, NOT a literal. User-visible localized copy lives in
//     the dictionary (strings.page.js), behind FULL 7-locale parity + the no-dead-
//     key scan (test/i18n.test.js). Returning a key keeps this module a PURE
//     function of its input (no t(), no engine import -> SSR-safe, testable without
//     window). null = no country tagline (the global fallback).
//   • accent — a CSS custom-property VALUE to assign to --mdf-brand at runtime, NOT
//     a hex picked here. HUE OWNERSHIP IS THE COLOR SPECIALIST'S: every non-fallback
//     country's accent is the sentinel ACCENT_TODO until they fill a real,
//     WCAG-AA-checked hue into BRAND_ACCENT below. The fallback accent is null =
//     "apply no override", so the base --mdf-brand (#D64545, tokens.css) shows
//     through. The Header MUST NOT apply an override when accent is the sentinel or
//     null, so an unfilled hue can never break the build.
//
// FALLBACK DISCIPLINE — mirrors getCountry(): any unknown / garbage / non-launch
// code returns the GLOBAL FALLBACK descriptor and NEVER throws. Only countries with
// a real per-country brand entry diverge from the global identity.

import { normalizeCountryCode } from './countries';

// Canonical, market-independent identity. Brazil and the global fallback both use
// it; the Header maps it back to t('page.header.wordmark') (see isCanonicalWordmark).
export const CANONICAL_WORDMARK = 'MAPA FOME';

// ── ACCENT SEAM (color specialist owns the VALUES) ──────────────────────────
//
// Sentinel for "a per-country accent is INTENDED here, but the hue is not chosen
// yet." The Header treats this EXACTLY like null: no --mdf-brand override, base
// brand shows through. The color specialist replaces each sentinel below with a
// real CSS color value (a hex or a token reference) that passes WCAG AA contrast
// against the header surface; no re-architecture needed — just swap the value.
export const ACCENT_TODO = 'TODO_COLOR_SPECIALIST';

// Per-country accent override values, keyed by ISO-3166 alpha-2 code. VALUES are
// owned by the color specialist. Until filled they are ACCENT_TODO (no override).
// The GLOBAL FALLBACK is intentionally NOT in this map: its accent is null, meaning
// "use the base --mdf-brand from tokens.css unchanged" (#D64545).
//
//   TODO(color-specialist): replace ACCENT_TODO with a real, AA-contrast CSS color
//   value (hex or token) per launch country. Adding a country = one row here plus a
//   brand entry in COUNTRY_BRANDS; nothing else changes.
const BRAND_ACCENT = {
  // Brazil accent — "Verde-rubro" deepened brand red #C8102E. Same warm-red family
  // as the base --mdf-brand #D64545 (H≈350 vs 0; an adaptation, not a new brand),
  // but darker/more saturated so it carries WHITE text: --mdf-brand-ink #FFFFFF is
  // 5.88:1 on it (AA normal text ≥4.5, vs the base's failing 4.38:1). As the focus
  // ring it clears SC 1.4.11 non-text 3:1 on both adjacent surfaces — 5.63:1 on
  // --mdf-surface-0 #FAFAF7 and 5.88:1 on --mdf-surface-1 #FFFFFF.
  br: '#C8102E',
};

// Per-country brand entries. ONLY countries that genuinely diverge from the global
// identity appear here; every other code falls back. Brazil keeps the canonical
// wordmark (identity is global) and carries the localized pt-BR tagline KEY + the
// flag badge. accent is read from BRAND_ACCENT (the color-specialist seam).
const COUNTRY_BRANDS = {
  br: {
    wordmark: CANONICAL_WORDMARK,
    taglineKey: 'page.brand.tagline.br',
    showFlagBadge: true,
  },
};

// The GLOBAL FALLBACK descriptor (frozen so a consumer can never mutate the shared
// object). Canonical wordmark, NO country tagline, NO accent override (base brand),
// flag badge optional/off. This is what Coke shows in a market with no local layer.
const GLOBAL_FALLBACK = Object.freeze({
  code: null,
  wordmark: CANONICAL_WORDMARK,
  isCanonicalWordmark: true,
  taglineKey: null,
  accent: null, // null => Header applies NO --mdf-brand override (base hue stays)
  showFlagBadge: false,
});

// getCountryBrand(code) -> a brand descriptor, ALWAYS renderable, NEVER throws.
//   { code, wordmark, isCanonicalWordmark, taglineKey, accent, showFlagBadge }
// A known launch-brand code returns its per-country layer; any unknown / garbage /
// non-launch code returns the GLOBAL_FALLBACK (mirrors getCountry's normalize+
// fallback). Pure function of its input: no window, no engine, SSR-safe.
export function getCountryBrand(code) {
  const cc = normalizeCountryCode(code);
  const entry = cc ? COUNTRY_BRANDS[cc] : null;
  if (!entry) return GLOBAL_FALLBACK;
  const wordmark = entry.wordmark || CANONICAL_WORDMARK;
  return {
    code: cc,
    wordmark,
    isCanonicalWordmark: wordmark === CANONICAL_WORDMARK,
    taglineKey: entry.taglineKey || null,
    // ACCENT_TODO is normalized to null here so the ONLY value the Header ever sees
    // for "no real hue yet" is null — it never has to special-case the sentinel.
    accent: BRAND_ACCENT[cc] && BRAND_ACCENT[cc] !== ACCENT_TODO ? BRAND_ACCENT[cc] : null,
    showFlagBadge: entry.showFlagBadge === true,
  };
}

// resolveHeaderBrand(enabled, code) — the GATE the Header uses. Pure + the single
// place the dark-ship invariant lives: with the INTL flag OFF it returns null, so
// the Header renders EXACTLY today's JSX (no brand layer). With the flag ON it
// returns getCountryBrand(code). Kept separate from getCountryBrand so a test can
// assert the gate WITHOUT depending on the ambient INTL_ENABLED value.
export function resolveHeaderBrand(enabled, code) {
  if (!enabled) return null;
  return getCountryBrand(code);
}
