# Payment rails contract (cross-repo)

The set of supported recurring-donation payment rails is ONE contract shared by two
separate deploy units. There is no shared package between them, so the same list is
written down in two places and can silently drift. This document is the canonical
statement of that contract, and a parity test enforces it.

## Canonical rail set

The canonical rail ids, in this exact order, are:

1. `pix`
2. `cartao`
3. `boleto`

There is no bank-debit rail. Asaas subscriptions only support the billingTypes
`PIX | CREDIT_CARD | BOLETO | UNDEFINED`. `DEBIT` / `BANK_DEBIT` are rejected and
`DEBIT_CARD` is not permitted for subscriptions, so débito cannot be a recurring rail.

## The two homes of the list

| Deploy unit | File | Shape |
|---|---|---|
| Front-end (Next app) | `src/app/components/compatibility/components/payments/asaasSubscriptionClient.js` | `export const RAILS` (array of objects; the `id` field is authoritative) |
| Backend (asaas-backend) | `asaas-backend/lib/validate.js` | `const RAILS = ['pix', 'cartao', 'boleto']` (string ids) |

## The rule

Both deploy units MUST carry the same rail ids in the same order. The front-end RAILS
order drives the rendered rail buttons; the backend RAILS list is the server-side
allowlist that validates the request body. If the two drift, a rail can render in the
form yet be rejected by the server (or vice versa), so they are one contract, not two.

## Enforcement

`test/railsParity.test.js` reads the front-end RAILS ids in order and reads the backend
RAILS array literal out of `asaas-backend/lib/validate.js`, then asserts the two id
lists are identical and in the same order. Change both lists together, or the parity
test fails.
