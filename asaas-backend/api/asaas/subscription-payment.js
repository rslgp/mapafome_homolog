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

function pickCurrentPayment(payments) {
  const list = Array.isArray(payments) ? [...payments] : [];
  if (!list.length) return null;
  list.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  return list.find((p) => PAYABLE.has(p.status)) || list[0];
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
    const payment = pickCurrentPayment(paymentsPage?.data);

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
module.exports.railOf = railOf;
