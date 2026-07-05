// Relative-time formatting — SOT for "há N dias / semanas / meses / anos".
//
// Replaces the `javascript-time-ago` package with the built-in
// Intl.RelativeTimeFormat (zero dependencies, shipped by every modern engine
// and Node). v5 § dependency_injection.stable_vs_volatile: the platform is the
// most stable dependency available; § KISS: one small pure function.
//
// Behavior contract preserved from the old library output (the substrings other
// code keys on must survive):
//   - cleanold.js tests dateMarked.includes("semana") / .includes("mes")
// numeric:'always' keeps the "há {n} {unidade}" shape (never the idiomatic
// "ontem"/"semana passada"), so "semana"/"meses" appear exactly as before.
// NOTE (FILTRO_TEMPO Lane B): shouldApplyFilter() NO LONGER reads this string -
// the period filter compares the marker's real DateISO via isWithinTimeThreshold,
// not dateMarked.includes("ano"). cleanold.js is now the only substring consumer.
//
// I18N-01: the DISPLAY callers (markers, pet list, MarkerGroup) must format in the
// user's ACTIVE locale — a de/ru/zh user should not see "há 2 dias". So the format
// now takes a `locale` that DEFAULTS to the active locale (getLocale()). The ONE
// substring consumer, cleanold.js, passes 'pt-BR' EXPLICITLY so its
// includes("semana")/includes("mes") age-GC logic is byte-for-byte unchanged,
// decoupled from whatever the UI locale happens to be.

import { getLocale, DEFAULT_LOCALE } from './ux/i18n/engine';

// One Intl.RelativeTimeFormat per locale, built lazily and cached (constructing it
// is not free, and the same handful of locales recur). numeric:'always' keeps the
// "há {n} {unidade}" shape in every language (never the idiomatic "ontem"). A bad
// locale tag falls back to DEFAULT_LOCALE rather than throwing.
const rtfCache = new Map();
function rtfFor(locale) {
  const key = locale || DEFAULT_LOCALE;
  let rtf = rtfCache.get(key);
  if (!rtf) {
    try {
      rtf = new Intl.RelativeTimeFormat(key, { numeric: 'always' });
    } catch {
      rtf = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: 'always' });
    }
    rtfCache.set(key, rtf);
  }
  return rtf;
}

// Canonical MDN gradation: divide the duration down the unit ladder until it
// fits, then format with that unit. amount = how many of THIS unit make ONE of
// the next. (week→month uses the average 4.34524 weeks/month.)
const DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

/**
 * Formats an ISO date string as relative time in the given locale (e.g.
 * "há 2 dias" in pt-BR, "vor 2 Tagen" in de). Display callers omit `locale` to
 * get the ACTIVE UI locale; cleanold.js passes 'pt-BR' explicitly to keep its
 * substring age-GC contract stable.
 * @param {string} dateISO - ISO date string
 * @param {string} [locale] - BCP-47 tag; defaults to the active UI locale
 * @returns {string} Relative time, or '' for missing/invalid input
 */
export function formatRelativeTime(dateISO, locale = getLocale()) {
  if (!dateISO) return '';
  const timestamp = new Date(dateISO).getTime();
  if (Number.isNaN(timestamp)) return '';

  const rtf = rtfFor(locale);

  // Negative = in the past, which is the overwhelmingly common case here.
  let duration = (timestamp - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return '';
}
