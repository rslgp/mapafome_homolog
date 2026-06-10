// dev-server.mjs — local dev server for the Asaas backend.
//
// WHY this exists: the serverless functions in api/asaas/*.js are written for a
// Vercel/Netlify runtime — there is NO `vercel dev` here and the project rule is
// "no clean npm reinstalls", so we don't pull in the Vercel CLI just to test
// locally. This mounts the EXISTING, UNCHANGED handlers behind Node's built-in
// http server (zero new dependencies) and reproduces the small slice of the
// Vercel request/response contract the handlers rely on:
//
//   • req.body         — Vercel pre-parses JSON; raw Node does not, so we read
//                        and JSON-parse the body before calling the handler
//                        (matches lib/http.js readJsonBody, which expects an
//                        already-parsed object or a JSON string).
//   • res.status(n)    — Vercel/Express add this; raw http.ServerResponse has
//   • res.send(body)     only statusCode/setHeader/end. We shim status()+send().
//
// It also loads .env.local through the same loadEnv the live-* scripts use, so
// ASAAS_API_KEY / ASAAS_ENV / ALLOWED_ORIGINS / ASAAS_WEBHOOK_TOKEN are present
// exactly as they would be in the deploy env. The Asaas key still never leaves
// the server — this process is the server.
//
//   cd asaas-backend && npm run dev          # serves http://localhost:3001/api/asaas/*
//   PORT=4000 npm run dev                     # override the port
//
// This is a DEV server. It is NOT the production entry point — production is the
// serverless deploy described in README.md. Nothing here is imported by the
// static site bundle.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load .env.local exactly like the live-* scripts (literal values, no $-expansion,
// existing process.env wins). Without this the handlers throw "ASAAS_API_KEY is
// not set". Real deploy env vars still override the file.
const { loadEnv } = require('../lib/loadEnv.js');
loadEnv(join(__dir, '..', '.env.local'));

// Mount the REAL handlers, unchanged. Same modules the deploy runs.
const createSubscription = require('../api/asaas/create-subscription.js');
const subscriptionPayment = require('../api/asaas/subscription-payment.js');
const webhook = require('../api/asaas/webhook.js');
const health = require('../api/asaas/health.js');

// allowedOrigins() is the SAME CORS source-of-truth the handlers use. We read it
// here only to LOG whether an incoming request's Origin is allowed — a blocked
// origin is the #1 silent cause of a browser "connection error": the browser's
// CORS check rejects the response, so the client only sees an opaque
// "TypeError: Failed to fetch" with no hint that it was CORS.
const { allowedOrigins } = require('../lib/http.js');

const PORT = Number(process.env.PORT || 3006);

// Map a request path to its handler. Mirrors the file-system routing Vercel
// derives from api/asaas/*.js, so the URLs match production 1:1.
const ROUTES = {
  '/api/asaas/create-subscription': createSubscription,
  '/api/asaas/subscription-payment': subscriptionPayment,
  '/api/asaas/webhook': webhook,
  '/api/asaas/health': health,
};

// Read the raw request body and parse it as JSON into req.body — the one piece
// of the Vercel contract the handlers assume is already done for them. A body
// that isn't valid JSON is left undefined; readJsonBody/validate then reject it
// with a 400, which is the correct behavior for garbage input.
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined); // not JSON → handler validation returns 400
      }
    });
    req.on('error', () => resolve(undefined));
  });
}

// Add the Express/Vercel response sugar the handlers call (status/send) on top of
// the raw Node response. send() ends the response; status() is chainable.
function decorateRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (payload) => {
    if (payload === undefined || payload === null) return res.end();
    res.end(typeof payload === 'string' ? payload : String(payload));
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const start = Date.now();
const url = new URL(req.url, `http://localhost:${PORT}`);
  const handler = ROUTES[url.pathname];

  // Per-request access log. URLs/method/origin/status/timing only — NEVER the
  // body (it carries PII: name/email/CPF). The Origin annotation makes a CORS
  // rejection visible from the server side: a "(origin NOT allowed)" line means
  // the browser will block the response and the client will report a generic
  // connection failure even though the request reached us with a 2xx.
  const origin = req.headers.origin || null;
  const corsNote = !origin
    ? '' // non-browser caller (curl/script) — no CORS check applies
    : allowedOrigins().includes(origin)
      ? ` origin=${origin} (allowed)`
      : ` origin=${origin} (NOT allowed → browser will block; add it to ALLOWED_ORIGINS)`;
  console.log(`[dev-server] → ${req.method} ${url.pathname}${corsNote}`);
  res.on('finish', () => {
    console.log(`[dev-server] ← ${res.statusCode} ${req.method} ${url.pathname} (${Date.now() - start}ms)`);
  });

  decorateRes(res);

  if (!handler) {
    res.status(404).setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify({ error: 'not_found', message: `no route ${url.pathname}` }));
  }

  // GET/POST handlers read req.body; only parse it for methods that carry one.
  if (req.method === 'POST') {
    req.body = await readBody(req);
  }

  try {
    await handler(req, res);
  } catch (err) {
    // A handler that throws (vs. returning a JSON error) shouldn't hang the socket.
    console.error(`[dev-server] ${url.pathname} threw:`, err?.message);
    if (!res.writableEnded) {
      res.status(500).setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ error: 'internal_error' }));
    }
  }
});

// A failed bind (almost always the port already being in use) otherwise dumps a
// raw stack trace — turn it into a one-line, actionable diagnosis. This is a
// frequent cause of "I can't connect to localhost:<port>": the server never came
// up because a previous dev-server (or another process) already holds the port.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[dev-server] ✖ port ${PORT} is already in use — another dev-server is ` +
        `running, or pick a free port:  PORT=<n> npm run dev`
    );
  } else {
    console.error('[dev-server] ✖ server failed to start:', err?.message || err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  const env = process.env.ASAAS_ENV || 'sandbox';
  const keySet = process.env.ASAAS_API_KEY ? 'set' : 'MISSING';
  console.log(`[dev-server] Asaas backend on http://localhost:${PORT}`);
  console.log(`[dev-server]   ASAAS_ENV=${env}  ASAAS_API_KEY=${keySet}`);
  console.log(`[dev-server]   allowed CORS origins: ${allowedOrigins().join(', ')}`);
  console.log(`[dev-server]   POST /api/asaas/create-subscription`);
  console.log(`[dev-server]   GET  /api/asaas/subscription-payment?subscriptionId=...`);
  console.log(`[dev-server]   POST /api/asaas/webhook`);
  console.log(`[dev-server]   GET  /api/asaas/health`);
  if (!process.env.ASAAS_API_KEY) {
    console.warn('[dev-server]   ⚠  ASAAS_API_KEY missing — fill asaas-backend/.env.local');
  }
});
