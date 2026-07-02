// POST /api/asaas/create-subscription
//
// First-party endpoint the static site calls to start a recurring "assinatura
// de apoio". It validates the (untrusted) body, ensures an Asaas customer, and
// creates a subscription on the chosen BR rail (Pix / cartão / boleto).
//
// The Asaas key never leaves this server. No card data is ever collected,
// forwarded, logged, or stored here: the cartão rail uses Asaas's hosted
// checkout, so no PAN/CVV crosses this server (no PCI scope).

const { handlePreflight, applyCors, sendJson, readJsonBody } = require('../../lib/http');
const { validateSubscriptionInput } = require('../../lib/validate');
const {
  ensureCustomer: defaultEnsureCustomer,
  createSubscription: defaultCreateSubscription,
} = require('../../lib/asaasClient');

// A stable external reference makes the whole flow idempotent: the same person
// + rail maps to the same customer/subscription, so a double-submit doesn't
// create two charges. (Email+rail is sufficient for this support use-case.)
function externalRef(email, rail) {
  return `mapafome:${rail}:${email}`;
}

// Asaas wants nextDueDate as YYYY-MM-DD. First charge: today (server clock).
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// The Asaas collaborators are injectable seams (Dependency Inversion), exactly
// like webhook.js's processEvent/store: the handler depends on the
// { ensureCustomer, createSubscription } INTERFACE, not on the concrete client.
// Defaults wire the real implementations, so production behavior is unchanged;
// tests inject fakes to exercise the handler with no live Asaas call.
module.exports = async function handler(
  req,
  res,
  deps = { ensureCustomer: defaultEnsureCustomer, createSubscription: defaultCreateSubscription }
) {
  const { ensureCustomer, createSubscription } = deps;

  if (handlePreflight(req, res)) return;
  applyCors(req, res);

  // ── GATEWAY DESLIGADO — migração de gateway de pagamento (02/07/2026) ───────
  // Este endpoint está DESATIVADO enquanto migramos o gateway. Enquanto a flag
  // estiver true ele NÃO cria assinaturas/cobranças no Asaas: responde 503 para
  // todo request (após CORS, para o navegador receber uma resposta limpa). Toda
  // a lógica original segue intacta abaixo. Para REATIVAR: mude a flag para false
  // (ou remova este bloco).
  const GATEWAY_DISABLED = true;
  if (GATEWAY_DISABLED) {
    return sendJson(res, 503, {
      error: 'gateway_disabled',
      message:
        'Doações por assinatura estão temporariamente indisponíveis durante a migração de gateway.',
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'method_not_allowed', message: 'use POST' });
  }

  const body = readJsonBody(req);
  const { ok, errors, clean } = validateSubscriptionInput(body);
  if (!ok) {
    return sendJson(res, 400, { error: 'validation_failed', messages: errors });
  }

  const ref = externalRef(clean.email, clean.rail);

  try {
    const customer = await ensureCustomer({
      name: clean.name,
      email: clean.email,
      cpfCnpj: clean.cpfCnpj,
      mobilePhone: clean.mobilePhone,
      externalReference: ref,
    });

    const sub = await createSubscription({
      customerId: customer.id,
      rail: clean.rail,
      value: clean.value,
      nextDueDate: todayISO(),
      cycle: clean.cycle,
      description: clean.description,
      externalReference: ref,
    });

    // Return only what the client needs to render the next step. For Pix/boleto
    // the client then fetches the first payment's QR code / bankSlip URL via the
    // payment link Asaas exposes; we keep this response lean and PII-light.
    return sendJson(res, 200, {
      ok: true,
      subscriptionId: sub.id,
      rail: clean.rail,
      status: sub.status,
      value: sub.value,
      cycle: sub.cycle,
      idempotent: Boolean(sub._idempotent),
      // For Pix/boleto Asaas issues the first invoice; the client uses this to
      // direct the donor to pay. invoiceUrl is the hosted Asaas checkout.
      invoiceUrl: sub.invoiceUrl || null,
    });
  } catch (err) {
    // Surface Asaas validation errors (e.g. declined card) as 422 with their
    // message; everything else is a 502 (upstream failure). Never leak the key.
    const status = err.status === 400 || err.status === 422 ? 422 : 502;
    const asaasMessages =
      err.body?.errors?.map((e) => e.description) || [err.message || 'erro ao falar com o Asaas'];
    return sendJson(res, status, { error: 'asaas_error', messages: asaasMessages });
  }
};
