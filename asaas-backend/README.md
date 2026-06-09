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
| `api/asaas/create-subscription.js` | POST — validates input, ensures an Asaas customer, creates a recurring subscription on the chosen rail (Pix / cartão / boleto / débito). |
| `api/asaas/webhook.js` | POST — receives Asaas payment events; **authenticated** (`asaas-access-token`) + **idempotent** (dedupes retries). |
| `lib/asaasClient.js` | Server-only Asaas REST client (reads `ASAAS_API_KEY`). |
| `lib/validate.js` | Pure input validation + CPF/CNPJ check (untrusted body → clean). |
| `lib/webhookAuth.js` | Constant-time webhook token check (fails closed). |
| `lib/http.js` | CORS + JSON helpers. |

The four supported rails map to Asaas `billingType`:
`pix → PIX`, `cartao → CREDIT_CARD`, `boleto → BOLETO`, `debito → DEBIT`.

## Local dev

```bash
cd asaas-backend
cp .env.example .env.local      # fill ASAAS_API_KEY (sandbox) + ASAAS_WEBHOOK_TOKEN
npm install -g vercel           # one-time
vercel dev                      # serves http://localhost:3000/api/asaas/*
npm test                        # runs the unit tests (node --test)
```

Point the static site at it during dev:
`NEXT_PUBLIC_ASAAS_BACKEND_URL=http://localhost:3000` in the **main** repo's `.env.local`.

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

`webhook.js` dedupes by `event:paymentId` in an **in-memory** Set — a backstop
that resets on cold start. For cross-instance correctness, replace
`defaultProcessEvent` with one that records processed event ids in a durable
store (Vercel KV / Upstash / your DB) and checks it before applying effects.
The handler already returns **500 on failure** so Asaas retries, and **200 on
dedupe** so it stops — the store just makes "processed once" durable.

## Security checklist (before going to production)

- [ ] `ASAAS_API_KEY` is the **production** key and set ONLY in the deploy env (never committed, never `NEXT_PUBLIC_`).
- [ ] `ASAAS_WEBHOOK_TOKEN` is a long random secret, identical in the deploy env and the Asaas webhook config.
- [ ] `ALLOWED_ORIGINS` lists only your real origins.
- [ ] Durable idempotency store wired into `processEvent`.
- [ ] Card data is never logged (it is only forwarded to Asaas).
