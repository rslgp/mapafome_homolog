// http.js — small request/response helpers shared by the serverless functions.
// Keeps each endpoint focused on Asaas logic, not boilerplate.

// Origins allowed to call this backend from the browser. The static site is the
// only first-party caller; localhost is for dev. Set ALLOWED_ORIGINS (comma-sep)
// in the server env to override.
function allowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length
    ? fromEnv
    : ['https://mapafome.com.br', 'http://localhost:3000'];
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

module.exports = { applyCors, handlePreflight, sendJson, readJsonBody, allowedOrigins };
