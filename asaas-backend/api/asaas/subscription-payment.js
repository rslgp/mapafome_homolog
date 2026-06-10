// GET /api/asaas/subscription-payment?subscriptionId=sub_xxx
//
// Returns the PAYABLE artifacts for a subscription's current (first due) charge
// so the static site can render its OWN payment screen instead of bouncing the
// donor to the Asaas hosted page:
//
//   pix    → { payload (copy-and-paste), qrImage (base64 PNG data) }
//   boleto → { bankSlipUrl (PDF), line (linha digitável), barCode }
//   all    → invoiceUrl (the Asaas hosted checkout; the card rail uses ONLY this,
//            so no PAN ever touches us — see the card note in page.js)
//
// READ-ONLY. The Asaas key stays server-side. We expose only the donor-facing
// pay artifacts of THIS subscription's charge — no customer PII, no card data.
// The subscriptionId is an opaque Asaas id the donor's own browser already holds
// from create-subscription; we still treat it as untrusted input and validate
// its shape before calling Asaas.

const { handlePreflight, applyCors, sendJson } = require('../../lib/http');
const {
  getSubscription,
  listSubscriptionPayments,
  getPixQrCode,
  getIdentificationField,
} = require('../../lib/asaasClient');

// Asaas subscription ids look like `sub_<alphanumeric>`. Validate shape (not
// existence) to reject obvious garbage before spending an upstream call.
function isValidSubscriptionId(id) {
  return typeof id === 'string' && /^sub_[A-Za-z0-9]+$/.test(id);
}

// From the subscription's payments, pick the one the donor should pay NOW: the
// earliest still-payable charge (PENDING/OVERDUE/AWAITING_RISK_ANALYSIS), else
// just the earliest. Asaas returns them newest-first, so sort ascending by date.
const PAYABLE = new Set(['PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS']);

// Statuses that are DEFINITIONALLY terminal — a charge in one of these can never
// become payable, so we must never hand it to getPixQrCode. We list the ones
// Asaas documents as dead/settled-not-by-us; CANCELLED/DELETED normally vanish
// (filtered or 404) but are listed defensively in case a list ever surfaces one.
//
// NOTE (knowledge-in-the-world, do not invent): an Asaas PIX charge whose QR has
// EXPIRED does NOT carry a distinct "EXPIRED" payment status — it stays PENDING/
// OVERDUE, and the un-payability only surfaces when getPixQrCode is called
// ("Esta cobrança não pode mais ser paga."). So the status layer CANNOT catch the
// expired-PIX case the production 502 came from; that is handled in the catch via
// isUnpayableAsaasError below. This set only lets the handler tell "every charge
// is terminal" apart from "no charge issued yet" (pending) — it is not a cure for
// PIX expiry. EXPIRED/CANCELLED/DELETED are kept here defensively, not as a claim
// that Asaas emits them on a stale PIX.
const TERMINAL_UNPAYABLE = new Set([
  'REFUNDED',
  'REFUND_REQUESTED',
  'REFUND_IN_PROGRESS',
  'RECEIVED_IN_CASH',
  'CHARGEBACK_REQUESTED',
  'CHARGEBACK_DISPUTE',
  'AWAITING_CHARGEBACK_REVERSAL',
  'DUNNING_REQUESTED',
  'DUNNING_RECEIVED',
  'CANCELLED',
  'DELETED',
  'EXPIRED',
]);

function pickCurrentPayment(payments) {
  const list = Array.isArray(payments) ? [...payments] : [];
  if (!list.length) return null;
  list.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  // Prefer the earliest PAYABLE charge; fall back to the earliest overall so the
  // all-settled (e.g. every charge RECEIVED) case still returns a charge to show.
  return list.find((p) => PAYABLE.has(p.status)) || list[0];
}

// Does this list contain a charge the donor could actually pay now? Lets the
// handler distinguish three states the static client must render differently:
//   - a PAYABLE charge exists  → return its pay artifacts (the happy path);
//   - the list is non-empty but EVERY charge is terminal-unpayable (refunded/
//     cancelled/etc.) → 409 "start a fresh subscription", not 502;
//   - the list is empty        → pending:true (Asaas hasn't issued the invoice yet).
// A RECEIVED/CONFIRMED charge is "already paid", not "unpayable" — it is neither
// PAYABLE nor TERMINAL_UNPAYABLE, so an all-paid sub is NOT treated as the 409
// case here (the existing earliest-fallback covers showing it).
function hasPayableCharge(payments) {
  const list = Array.isArray(payments) ? payments : [];
  return list.some((p) => PAYABLE.has(p.status));
}

function allChargesTerminalUnpayable(payments) {
  const list = Array.isArray(payments) ? payments : [];
  return list.length > 0 && list.every((p) => TERMINAL_UNPAYABLE.has(p.status));
}

// Defense in depth for the documented 502: a PIX charge can expire BETWEEN
// pickCurrentPayment and getPixQrCode, and Asaas reports "this charge can no
// longer be paid" as an HTTP-400 error body, not a clean status. We map THAT to
// 409 (not 502) so a returning donor on a dead PIX link gets an actionable
// "re-subscribe" signal instead of a "server broke".
//
// Match on the Asaas error CODE first (errors[].code === 'invalid_action'), which
// is necessary but NOT sufficient — 'invalid_action' is Asaas's broad bucket for
// many "can't do that in this object's state" cases, so code alone would over-map
// unrelated 400s. We AND it with a tolerant match on the description so only the
// "cannot be paid" subclass is remapped (Postel: liberal in text FORM — accent-/
// case-insensitive substring — strict on which SEMANTIC condition we remap).
function isUnpayableAsaasError(err) {
  if (!err || err.status !== 400) return false;
  const errors = Array.isArray(err.body?.errors) ? err.body.errors : [];
  if (!errors.length) return false;
  return errors.some((e) => {
    const code = String(e?.code || '');
    const desc = normalizeText(e?.description || '');
    const codeMatches = code === 'invalid_action';
    // Tolerant PT match: "Esta cobrança não pode mais ser paga." and close
    // variants. We don't anchor the whole sentence (Asaas may reword it); the
    // "não pode ... ser paga" core is the load-bearing phrase.
    const textMatches = desc.includes('nao pode') && desc.includes('ser paga');
    // Code is the strong signal; text disambiguates the invalid_action bucket.
    // If the code is ever absent/renamed, the text alone still catches it.
    return (codeMatches && textMatches) || (!code && textMatches);
  });
}

// Lowercase + strip diacritics so the PT match is accent/case tolerant
// ("não/nao", "paga/PAGA"). Pure, no locale dependency.
function normalizeText(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD') // decompose accented letters into base + combining mark
    .replace(/[̀-ͯ]/g, ''); // strip the Combining Diacritical Marks block
}

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'method_not_allowed', message: 'use GET' });
  }

  // Vercel populates req.query; the dev server / raw Node do not, so parse the URL.
  const url = new URL(req.url, 'http://localhost');
  const subscriptionId = (req.query && req.query.subscriptionId) || url.searchParams.get('subscriptionId');

  if (!isValidSubscriptionId(subscriptionId)) {
    return sendJson(res, 400, { error: 'validation_failed', messages: ['subscriptionId inválido'] });
  }

  try {
    const sub = await getSubscription(subscriptionId);
    const paymentsPage = await listSubscriptionPayments(subscriptionId);
    const payments = paymentsPage?.data;
    const payment = pickCurrentPayment(payments);

    // Subscription exists but Asaas hasn't generated the first invoice yet
    // (it's async). The client polls/retries; tell it the sub is active.
    if (!payment) {
      return sendJson(res, 200, {
        ok: true,
        subscriptionId,
        rail: railOf(sub.billingType),
        status: sub.status,
        pending: true, // no payable charge issued yet
      });
    }

    // Layer (a): charges exist but NONE is payable and every one is terminal
    // (refunded/cancelled/etc.). Don't call getPixQrCode on a dead charge — that
    // is exactly what produced the production 502. Signal 409 so the client
    // prompts a fresh subscription. (RECEIVED/CONFIRMED = already paid is NOT
    // this branch; hasPayableCharge stays false but allChargesTerminalUnpayable
    // is false too, so an all-paid sub still renders its charge below.)
    if (!hasPayableCharge(payments) && allChargesTerminalUnpayable(payments)) {
      return sendJson(res, 409, {
        ok: false,
        error: 'charge_unpayable',
        subscriptionId,
        rail: railOf(sub.billingType),
        status: sub.status,
        messages: ['Esta cobrança não pode mais ser paga. Inicie uma nova assinatura.'],
      });
    }

    const out = {
      ok: true,
      subscriptionId,
      rail: railOf(sub.billingType),
      status: sub.status,
      paymentId: payment.id,
      paymentStatus: payment.status,
      value: payment.value,
      dueDate: payment.dueDate,
      // The hosted Asaas checkout — works for every rail and is the ONLY path
      // used for the card rail (keeps card data off our surface entirely).
      invoiceUrl: payment.invoiceUrl || null,
    };

    if (sub.billingType === 'PIX') {
      const qr = await getPixQrCode(payment.id);
      out.pix = {
        payload: qr?.payload || null, // "Pix copia e cola"
        qrImage: qr?.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null,
        expiresAt: qr?.expirationDate || null,
      };
    } else if (sub.billingType === 'BOLETO') {
      const idf = await getIdentificationField(payment.id);
      out.boleto = {
        bankSlipUrl: payment.bankSlipUrl || null, // PDF
        line: idf?.identificationField || null, // linha digitável
        barCode: idf?.barCode || null,
      };
    }
    // CREDIT_CARD: nothing extra — the client redirects to invoiceUrl.

    return sendJson(res, 200, out);
  } catch (err) {
    // Layer (b), defense in depth: a PIX charge can expire BETWEEN
    // pickCurrentPayment and getPixQrCode. Asaas reports "this charge can no
    // longer be paid" as an HTTP-400 error body (not a clean status), so the old
    // "everything non-404 → 502" mapping surfaced a normal donor situation as a
    // hard 502. Map THAT one condition to 409 (Conflict) — the subscription still
    // exists (so not 410 Gone); only THIS charge's pay window has closed and the
    // donor must start a fresh one. ok:false + a clear, actionable message.
    if (isUnpayableAsaasError(err)) {
      const messages = err.body?.errors?.map((e) => e.description) || [
        'Esta cobrança não pode mais ser paga. Inicie uma nova assinatura.',
      ];
      return sendJson(res, 409, { ok: false, error: 'charge_unpayable', messages });
    }

    // 404 from Asaas (unknown id) → 404; other upstream failures → 502. Never leak the key.
    const status = err.status === 404 ? 404 : 502;
    const messages = err.body?.errors?.map((e) => e.description) || [
      err.message || 'erro ao buscar o pagamento',
    ];
    return sendJson(res, status, { error: 'asaas_error', messages });
  }
};

// Map Asaas billingType back to our rail id for the client.
function railOf(billingType) {
  switch (billingType) {
    case 'PIX':
      return 'pix';
    case 'CREDIT_CARD':
      return 'cartao';
    case 'BOLETO':
      return 'boleto';
    default:
      return null;
  }
}

// Pure helpers exported for unit tests (the HTTP path is covered by the live
// e2e driver against the sandbox).
module.exports.isValidSubscriptionId = isValidSubscriptionId;
module.exports.pickCurrentPayment = pickCurrentPayment;
module.exports.hasPayableCharge = hasPayableCharge;
module.exports.allChargesTerminalUnpayable = allChargesTerminalUnpayable;
module.exports.isUnpayableAsaasError = isUnpayableAsaasError;
module.exports.railOf = railOf;
