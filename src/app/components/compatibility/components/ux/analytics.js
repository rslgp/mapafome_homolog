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

export function peekBufferedEvents() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_err) {
    return [];
  }
}
