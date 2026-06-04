// Relative-time formatting — SOT for "há N dias / semanas / meses / anos".
//
// Replaces the `javascript-time-ago` package with the built-in
// Intl.RelativeTimeFormat (zero dependencies, shipped by every modern engine
// and Node). v5 § dependency_injection.stable_vs_volatile: the platform is the
// most stable dependency available; § KISS: one small pure function.
//
// Behavior contract preserved from the old library output (the substrings other
// code keys on must survive):
//   - shouldApplyFilter() in mapUtils.js tests dateMarked.includes("ano")
//   - cleanold.js tests dateMarked.includes("semana") / .includes("mes")
// numeric:'always' keeps the "há {n} {unidade}" shape (never the idiomatic
// "ontem"/"semana passada"), so "ano"/"semana"/"meses" appear exactly as before.

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' });

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
 * Formats an ISO date string as relative time in pt-BR (e.g. "há 2 dias").
 * @param {string} dateISO - ISO date string
 * @returns {string} Relative time, or '' for missing/invalid input
 */
export function formatRelativeTime(dateISO) {
  if (!dateISO) return '';
  const timestamp = new Date(dateISO).getTime();
  if (Number.isNaN(timestamp)) return '';

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
