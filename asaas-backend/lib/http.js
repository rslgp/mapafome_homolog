// http.js — small request/response helpers shared by the serverless functions.
// Keeps each endpoint focused on Asaas logic, not boilerplate.

// CORS: in PRODUCTION (ASAAS_ENV=production) applyCors restricts the origin to
// allowedOrigins(): it echoes the caller's Origin only when allowlisted (with
// Vary: Origin) and otherwise fails closed to the first allowed origin, never a
// wildcard. In dev/sandbox it stays wildcard so `next dev` across :3000-:3002 is
// not broken. ASAAS_ENV is the project's existing production signal (see
// asaasClient.js / health.js); no new env var is introduced.
//
// Origins that WOULD be allowed if CORS were re-locked. The static site is the
// only first-party caller; localhost is for dev. Set ALLOWED_ORIGINS (comma-sep)
// in the server env to override — in production this is ALWAYS set, so the
// localhost fallbacks below never apply there.
//
// The dev fallback lists 3000/3001/3002 because `next dev` walks UP from :3000
// when a port is busy: with this backend already on :3001, the site commonly
// lands on :3002 (or :3001 is free and it stays on :3000). Allowing the whole
// small range means a dev never has to hand-edit ALLOWED_ORIGINS just because
// Next picked the next free port. Override via ALLOWED_ORIGINS to lock it down.
const DEV_FALLBACK_ORIGINS = [
  'https://mapafome.com.br',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

function allowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEV_FALLBACK_ORIGINS;
}

function isProduction() {
  return (process.env.ASAAS_ENV || 'sandbox').toLowerCase() === 'production';
}

function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (!isProduction()) {
    // Dev/sandbox: wildcard so `next dev` across :3000-:3002 is not broken. Safe
    // because no endpoint uses cookies/Authorization (credentialed CORS forbids
    // `*`); auth is via request-body fields, not ambient credentials.
    res.setHeader('Access-Control-Allow-Origin', '*');
    return;
  }

  // Production: restrict to the allowlist, never wildcard. Echo the caller's
  // Origin only when it is allowlisted (and Vary on Origin so caches key per
  // origin). An empty allowlist fails closed: send no ACAO header rather than
  // wildcard, and never crash.
  const allowed = allowedOrigins();
  const requestOrigin = req && req.headers ? req.headers.origin : undefined;
  res.setHeader('Vary', 'Origin');
  if (requestOrigin && allowed.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  } else if (allowed.length) {
    // Disallowed or Origin-less caller: fall back to the canonical first allowed
    // origin so a browser from any other origin is denied by CORS.
    res.setHeader('Access-Control-Allow-Origin', allowed[0]);
  }
}

// Returns true if the request was a preflight and has been answered (caller should return).
function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(204).end();
    return true;
  }
  return false;
}

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
}

// Vercel parses JSON bodies for us; Netlify/raw Node may not. Be defensive.
function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

// Derive the client IP behind Vercel's proxy. Vercel (and every reverse proxy this
// backend runs behind) sets `x-forwarded-for` as a comma-separated chain where the
// LEFT-MOST entry is the original client; the platform appends its own hops on the
// right. We take the first entry, fall back to `x-real-ip`, then the raw socket
// address for a direct (non-proxied) local run. Returns 'unknown' if nothing is
// derivable so a caller can still key on a stable string rather than crash.
//
// SECURITY NOTE: x-forwarded-for is client-SPOOFABLE in general, but on Vercel the
// platform REWRITES the left-most hop to the true edge client IP, so the first
// entry is trustworthy for this deployment. For a rate-limit key that is the right
// tradeoff: worst case a spoofer rotates the header to dodge the throttle, which is
// no worse than the no-throttle status quo, while the common abuse (one script, one
// IP, varying emails) is caught. Do NOT use this value for authorization.
function clientIp(req) {
  const headers = (req && req.headers) || {};
  const xff = headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    // First hop = original client; the rest are proxy hops.
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const xReal = headers['x-real-ip'];
  if (typeof xReal === 'string' && xReal.trim()) return xReal.trim();
  const sock = req && req.socket && req.socket.remoteAddress;
  if (sock) return sock;
  return 'unknown';
}

module.exports = { applyCors, handlePreflight, sendJson, readJsonBody, allowedOrigins, clientIp };
