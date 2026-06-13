'use client';

// intlAnalytics.js — INTL M5 (MISS-2). Validation funnel for the
// internationalized FOOD marking, layered over the EXISTING analytics.track
// seam (analytics.js). It adds ZERO new transport infra: it imports the same
// track() the rest of the app uses (window.gtag → window.dataLayer →
// sessionStorage) and only DEFINES the shape of the intl publish event here.
// The transport SOT stays analytics.js; this module owns the vocabulary of the
// intl publish funnel (event name + allow-listed properties), exactly the same
// split petAnalytics.js made for /pets (analytics TRANSPORTS, this DEFINES).
//
// ─── HONEST NOTE: the sink may be INERT in production (INTERNATIONAL_PLAN §3
//     analytics.js note / §5 M5 "M5-publish-intl-analytics-pipeline") ───
// track() dispatches to window.gtag if it is a function, else window.dataLayer
// if it is an array, else a per-tab sessionStorage buffer (MAX_BUFFERED=200).
// The ONLY GA bootstrap in the repo (G-DHZR5VH2Q7) lives in
// public/index.html:21-28 — the DEAD CRA shell — NOT in the App Router head
// (layout.js). So in the deployed Next app window.gtag/window.dataLayer do NOT
// exist and track() ALWAYS falls into the volatile sessionStorage buffer. This
// wiring is therefore correct (the event fires with the right shape, no-op-safe)
// but the SINK IS CURRENTLY INERT for population analytics: events are only
// inspectable per-tab via peekBufferedEvents(), not aggregated. Making the
// prediction below actually measurable requires porting the gtag bootstrap into
// layout.js as next/script (M5 step (a)) OR deriving the offshore-rejection
// count server-side — both are out of scope for this dark-ship pass (the flag
// stays OFF). Do NOT claim "analytics works" end-to-end on this state.
//
// ─── FALSIFIABLE ROLLOUT PREDICTION (INTERNATIONAL_PLAN §5 M5 (d) / §7
//     falsifiable_prediction) ───
// When the flag is flipped ON in a future pass (NOT this one) AND the gtag sink
// is wired (M5 (a)), the rollout bet is:
//   "In week 1 after the ON build: publish_intl events with country !== 'br'
//    number > 50, AND the offshore share (offshore_heuristic === 'rejected_*'
//    derived server-side / from the guard) stays < 5% of intl publishes, AND
//    the per-country write volume + moderation_intl delete/verify rate stay
//    within the curated-subset ceiling (R16). Else: ROLLBACK (rebuild OFF +
//    redeploy, the M5 drill). If the gtag sink is NOT wired, re-anchor this
//    trigger on the SERVER-SIDE offshore-rejection count from the M4.5 guard
//    (NOT on peekBufferedEvents(), which is a per-tester readout, never a
//    population metric)."

import { track } from './analytics';

// Stable event-name SOT for the intl funnel (one place; a dashboard filters the
// whole funnel by this name, nobody writes the literal spread around).
export const INTL_EVENT = {
  PUBLISH: 'publish_intl',
  MODERATION: 'moderation_intl',
};

// Fail-soft build-version cache (INTERNATIONAL_PLAN §5 M5 (c) — "id de build no
// evento"). The build id lives only in public/version.json (written by
// stamp-sw-version.mjs at prebuild) and is fetched ASYNC by VersionFooter on
// mount. Rather than fire a NEW fetch in the publish path (which is unreliable —
// publishPinFromMap calls window.location.reload() right after the write), we
// REUSE VersionFooter's existing fetch: it calls rememberBuildVersion() when its
// fetch resolves, and the publish event reads the cached value here. If the
// cache is not yet warm (fetch in flight / dev without a stamp), the `build`
// field is simply OMITTED — never blocks, never throws. Zero new network.
let _buildVersion = null;

export function rememberBuildVersion(v) {
  if (typeof v === 'string' && v) _buildVersion = v;
}

export function readBuildVersion() {
  return _buildVersion || undefined;
}

// Test seam: reset the cache between cases. Never called in prod.
export function __resetIntlAnalyticsForTests() {
  _buildVersion = null;
}

// Normalize a country code to a stable lowercase 2-letter id, or 'br' default
// (the same default §4.4/§4.6.1 use for a missing country). A funnel must never
// carry a raw/garbage value; an absent/blank code attributes to the legacy BR.
function safeCountry(code) {
  const s = typeof code === 'string' ? code.trim().toLowerCase() : '';
  return s || 'br';
}

// Drop undefined keys so the event stays lean and never emits a null property
// (mirrors analytics.js / petAnalytics.js hygiene). PURE.
function compact(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// trackPublishIntl — emitted when a mark is published on the intl-relevant FOOD
// path (publishPinFromMap), capturing:
//   • country            — the country the pin was MARKED IN (the active country
//                           the publish was gated to; 'br' with the flag OFF).
//   • inSelectedBbox      — did the pin fall inside that country's publish bbox?
//                           (computed at the callsite via the SAME isInsideCountry
//                           predicate M1 unified; true on the normal publish path
//                           since the upstream gate already passed).
//   • offshoreHeuristic   — the M4.5 reverse-geocode guard's verdict for this pin:
//                           'passed' (guard ran and allowed), 'allow_open'
//                           (guard ran, could-not-determine → fail-open: ocean /
//                           network / throttle), or 'not_run' (flag OFF / no guard
//                           in deps). A CONFIDENT mismatch never reaches here — it
//                           throws upstream before publish (reverseGeocodeGuard).
// Builds the payload by ALLOW-LIST (never spreads a raw object) and delegates to
// the existing track() seam, which is itself no-op-safe (guards typeof window and
// an empty name). With the flag OFF the event still fires, with country='br' and
// offshore_heuristic='not_run' — the OFF behavior is unchanged, the event is
// just an extra observability emission that the inert sink buffers.
export function trackPublishIntl({ country, inSelectedBbox, offshoreHeuristic } = {}) {
  // NO-OP-SAFE (HARD constraint, INTERNATIONAL_PLAN M5): a broken/inert analytics
  // sink must NEVER cost a user their publish. track() is already internally
  // guarded (SSR + gtag try/catch), but we belt-and-suspenders the whole emission
  // so even an unexpected throw (e.g. a future transport edit) cannot escape into
  // the publish path. Observability is best-effort; the mark is not.
  try {
    track(INTL_EVENT.PUBLISH, compact({
      country: safeCountry(country),
      in_selected_bbox: typeof inSelectedBbox === 'boolean' ? inSelectedBbox : undefined,
      offshore_heuristic: typeof offshoreHeuristic === 'string' ? offshoreHeuristic : undefined,
      build: readBuildVersion(),
    }));
  } catch (_err) { /* never let analytics break a publish */ }
}

// trackModerationIntl — the moderation channels (removerPonto/verificarPonto,
// MOD-1) per-country, so the rollout's VOLUME axis (R16) is observable, not just
// the offshore share. `kind` is a closed enum ('delete' | 'verify'); anything
// else is omitted. No free text, no contact, no coords.
export function trackModerationIntl({ country, kind } = {}) {
  const safeKind = kind === 'delete' || kind === 'verify' ? kind : undefined;
  try {
    track(INTL_EVENT.MODERATION, compact({
      country: safeCountry(country),
      kind: safeKind,
      build: readBuildVersion(),
    }));
  } catch (_err) { /* never let analytics break a moderation action */ }
}
