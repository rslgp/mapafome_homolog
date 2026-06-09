# MAPA FOME — Asaas backend (serverless)

The recurring-payment ("assinatura de apoio") **server half**. It exists because
the main site is a static export (`output: 'export'`, GitHub Pages) with **no
server runtime** — so the Asaas secret key and the webhook receiver cannot live
there. This is a tiny, separate deploy whose only job is to hold the key and
talk to Asaas.

> **Why separate:** `NEXT_PUBLIC_*` env vars are inlined into the static bundle
> and shipped to every browser. An Asaas key in the bundle = anyone can create
> or refund charges on the account. The key lives here as a plain server env var
> and never reaches a browser.

## What's here

| File | Role |
|---|---|
| `api/asaas/create-subscription.js` | POST — validates input, ensures an Asaas customer, creates a recurring subscription on the chosen rail (Pix / cartão / boleto). |
| `api/asaas/subscription-payment.js` | GET `?subscriptionId=` — returns the **payable artifacts** for the current charge so the site can render its own payment screen: Pix `{payload, qrImage}`, boleto `{bankSlipUrl, line, barCode}`, and the hosted `invoiceUrl` (card redirects to this; no PAN touches us). Read-only. |
| `api/asaas/webhook.js` | POST — receives Asaas payment events; **authenticated** (`asaas-access-token`) + **idempotent** (dedupes retries). |
| `lib/asaasClient.js` | Server-only Asaas REST client (reads `ASAAS_API_KEY`). |
| `lib/validate.js` | Pure input validation + CPF/CNPJ check (untrusted body → clean). |
| `lib/webhookAuth.js` | Constant-time webhook token check (fails closed). |
| `lib/http.js` | CORS + JSON helpers. |

The supported rails map to Asaas `billingType`:
`pix → PIX`, `cartao → CREDIT_CARD`, `boleto → BOLETO`.
(There is **no** bank-debit rail: Asaas's subscription `billingType` enum is
`PIX | CREDIT_CARD | BOLETO | UNDEFINED` — `DEBIT`/`BANK_DEBIT` are rejected and
`DEBIT_CARD` is "not permitted for subscriptions".)

## Local dev

**Recommended — no Vercel CLI, zero new deps** (uses Node's built-in `http`):

```bash
cd asaas-backend
cp .env.example .env.local      # fill ASAAS_API_KEY (sandbox) + ASAAS_WEBHOOK_TOKEN
npm run dev                     # serves http://localhost:3001/api/asaas/*  (PORT to override)
npm test                        # runs the unit tests (node --test)
npm run smoke                   # optional: prove the sandbox key reaches Asaas
npm run smoke:sub               # optional: prove the full Pix subscription path + idempotency
```

`npm run dev` mounts the **same** `api/asaas/*.js` handlers behind a tiny local server
(`scripts/dev-server.mjs`) that loads `.env.local` and shims the Vercel `req.body` / `res.status` /
`res.send` contract. It runs on **port 3001** by default — deliberately off `:3000` so it doesn't
collide with the site's `next dev`.

Point the static site at it during dev (in the **main** repo's `.env.local`):
`NEXT_PUBLIC_ASAAS_BACKEND_URL=http://localhost:3001`.

**Alternative — Vercel CLI** (closest to production runtime):

```bash
npm install -g vercel           # one-time
vercel dev                      # serves http://localhost:3000/api/asaas/*  (set the URL to :3000)
```

## Deploy (Vercel — recommended)

1. `cd asaas-backend && vercel` (first run links/creates the project).
2. In the Vercel dashboard → Settings → Environment Variables, set:
   `ASAAS_API_KEY`, `ASAAS_ENV` (`sandbox` then `production`),
   `ASAAS_WEBHOOK_TOKEN`, `ALLOWED_ORIGINS`.
3. `vercel --prod`. Note the URL, e.g. `https://mapafome-asaas.vercel.app`.
4. In the **main** repo set `NEXT_PUBLIC_ASAAS_BACKEND_URL` to that URL and rebuild.
   *(Only the URL is public — the key stays server-side here.)*

### Register the webhook in Asaas

Asaas dashboard → Configurações → **Webhooks** → add:
- **URL:** `https://<your-deploy>/api/asaas/webhook`
- **Token de autenticação:** the same value as `ASAAS_WEBHOOK_TOKEN`
- Events: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`.

## Idempotency note

`webhook.js` dedupes by `event:paymentId` through an **injectable idempotency
store** (`lib/idempotencyStore.js`) — the handler depends on the
`{ isProcessed, markProcessed }` interface, not on a concrete KV (Dependency
Inversion, same as the existing `processEvent` seam). The key is marked **after**
`processEvent` succeeds, so a failed effect stays unmarked and Asaas's retry
re-runs it. The handler returns **500 on failure** (Asaas retries) and **200 on
dedupe** (Asaas stops); the store makes "processed once" survive cold starts.

**Store selection** (`selectIdempotencyStore()`, at module load):

| Condition | Store | Durable? |
|---|---|---|
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` set (or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) | Upstash Redis over REST (`fetch`, no npm dep) | **yes** — survives cold starts + spans instances |
| neither set | in-memory `Set` fallback | **no** — resets on cold start; logs a one-time `DURABLE IDEMPOTENCY OFF` warning |

- Keys are namespaced `asaas:webhook:idem:<event>:<paymentId>` and written with a
  **60-day TTL** (`DEFAULT_TTL_SECONDS`) — long enough to outlast any Asaas retry
  window, short enough that the keyspace never grows unbounded.
- **Production:** create a Vercel KV / Upstash database and set its REST URL + token
  env vars (Vercel KV exposes `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically
  when you link a KV store to the project). Without them the backend still boots and
  works — just **not durably**, which is fine for a first cutover but should be set
  before relying on at-most-once effects.
- A store outage (`isProcessed`/`markProcessed` throws) is treated as a processing
  failure → **500**, so Asaas retries rather than risk a silent double/zero apply.
- For the side effect itself, inject `processEvent` (or replace `defaultProcessEvent`)
  to update your DB / grant access. Both seams are injected by the tests, so the
  handler runs under `node --test` with no live KV.

## Security checklist (before going to production)

- [ ] `ASAAS_API_KEY` is the **production** key and set ONLY in the deploy env (never committed, never `NEXT_PUBLIC_`).
- [ ] `ASAAS_WEBHOOK_TOKEN` is a long random secret, identical in the deploy env and the Asaas webhook config.
- [ ] `ALLOWED_ORIGINS` lists only your real origins.
- [ ] Durable idempotency store configured (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or the `UPSTASH_REDIS_REST_*` pair) — no `DURABLE IDEMPOTENCY OFF` warning in prod logs.
- [ ] Card data is never logged (it is only forwarded to Asaas).
