'use client';

// Lightweight analytics scaffold — one vertical slice of the events_required
// pipeline described in LLM_BRAIN/design_brief.yaml § metrics.
//
// Transport order: window.gtag (if present) → window.dataLayer → sessionStorage.
// sessionStorage fallback keeps events inspectable during local dev and never
// blocks a user action on a network call.

const SESSION_KEY = 'mdf_analytics_events';
const MAX_BUFFERED = 200;

function nowIso() {
  return new Date().toISOString();
}

function persistFallback(event) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(event);
    while (list.length > MAX_BUFFERED) list.shift();
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(list));
  } catch (_err) {
    // sessionStorage may be unavailable (Safari private mode). Drop silently.
  }
}

export function track(name, properties = {}) {
  if (typeof window === 'undefined' || !name) return;

  const event = {
    name,
    ts: nowIso(),
    properties: { ...properties },
  };

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', name, event.properties);
    } catch (_err) { /* no-op */ }
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: name, ...event.properties });
  }

  persistFallback(event);
}

// Typed helpers per design_brief.yaml § metrics.events_required.

export function trackReportStarted({ entryPoint }) {
  track('pin_report_started', {
    entry_point: entryPoint,
    device: deviceClass(),
    has_gps_permission: hasGpsPermission(),
  });
}

function deviceClass() {
  if (typeof window === 'undefined') return 'unknown';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

function hasGpsPermission() {
  if (typeof navigator === 'undefined' || !navigator.permissions) return 'unknown';
  return 'checking'; // Permissions API is async; callers may enrich later.
}

export function trackSponsorImpression({ id, region, placement }) {
  track('sponsor_impression', { sponsor_id: id, region, placement });
}

export function trackSponsorClick({ id, region, placement }) {
  track('sponsor_click', { sponsor_id: id, region, placement });
}

// VM7 — structured failure events. Replaces silent catch blocks across
// App.js sheet I/O and any other publish path. Per v5 § observability +
// § best_practices.error_handling — never swallow exceptions silently.
export function trackError(category, error, props = {}) {
  const message = (error && (error.message || String(error))) || 'unknown';
  // Strip anything that looks like a token before persisting/dispatching.
  const safeMessage = message.replace(/(token|secret|key)\s*[=:]\s*[^\s]+/gi, '$1=[redacted]');
  track('error', {
    category,           // e.g. 'pin_publish', 'pin_update', 'sheet_read'
    error_message: safeMessage.slice(0, 240),
    ...props,
  });
  // Mirror to console.error so debug builds still see it; dashboards aggregate.
  if (typeof console !== 'undefined' && console.error) {
    // eslint-disable-next-line no-console
    console.error(`[${category}]`, error, props);
  }
}

// ─── Map-tap pipeline observability ───────────────────────────────────────
// MC-16+ in LLM_BRAIN/map_click_compatibility.yaml — six iterations of the
// tap fix shipped without data. Going forward, every tap (and every
// suppressed tap) emits a structured event so future bug reports come with
// hard signal: ask the user to run sessionStorage.getItem('mdf_analytics_events')
// and read the actual lat/lng + pointerType + reason instead of guessing.

export function trackMapTap({ lat, lng, pointerType, durationMs }) {
  track('map_tap', {
    lat: round6(lat),
    lng: round6(lng),
    pointer_type: pointerType || 'unknown',
    duration_ms: clamp(Math.round(durationMs), 0, 5000),
  });
}

export function trackMapLongPress({ lat, lng, source, pointerType }) {
  track('map_long_press', {
    lat: round6(lat),
    lng: round6(lng),
    source,                   // 'timer' (touch path) | 'contextmenu' (mouse right-click)
    pointer_type: pointerType || 'unknown',
  });
}

export function trackMapTapSkipped({ reason, pointerType }) {
  // Reason values:
  //   'leaflet_interactive' — tap target was a marker/cluster/popup (F6 contract)
  //   'non_primary_button'  — right/middle mouse click (handled by contextmenu)
  //   'movement'            — finger moved > 10 px before release (pan)
  //   'duration'            — pointerdown→up exceeded 500 ms (slow lift, treated as held)
  //   'pointer_cancel'      — pointercancel fired (gesture interrupted)
  //   'contextmenu_dedup'   — contextmenu within long-press dedup window (F8)
  track('map_tap_skipped', {
    reason,
    pointer_type: pointerType || 'unknown',
  });
}

function round6(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n * 1e6) / 1e6;
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function peekBufferedEvents() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_err) {
    return [];
  }
}
