// asaasClient.js — server-only Asaas REST client.
//
// SECURITY: this module reads ASAAS_API_KEY from the *server* environment
// (process.env). It MUST NEVER be imported into the Next.js static bundle —
// it only runs inside the serverless functions in this asaas-backend deploy.
// The key is the bearer for every Asaas write; leaking it = anyone can create
// or refund charges on the account. That is why the whole payments backend
// lives outside the `output: 'export'` site.

const ENVS = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
};

function baseUrl() {
  const env = (process.env.ASAAS_ENV || 'sandbox').toLowerCase();
  const url = ENVS[env];
  if (!url) throw new Error(`ASAAS_ENV must be 'sandbox' or 'production', got '${env}'`);
  return url;
}

function apiKey() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('ASAAS_API_KEY is not set in the server environment');
  return key;
}

/**
 * Low-level Asaas request. Returns parsed JSON on 2xx; throws an Error whose
 * `.status` and `.body` carry the Asaas error payload on non-2xx.
 */
async function asaasFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(baseUrl() + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey(),
      'User-Agent': 'mapafome-asaas/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(`Asaas ${method} ${path} -> ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// ── Customers ──────────────────────────────────────────────────────────────
// Asaas requires a customer (with CPF/CNPJ) before any charge. We look up by
// externalReference (our stable id) to stay idempotent across retries.

async function findCustomerByExternalRef(externalReference) {
  const q = new URLSearchParams({ externalReference }).toString();
  const page = await asaasFetch(`/customers?${q}`);
  return page?.data?.[0] || null;
}

async function createCustomer({ name, email, cpfCnpj, mobilePhone, externalReference }) {
  return asaasFetch('/customers', {
    method: 'POST',
    body: { name, email, cpfCnpj, mobilePhone, externalReference },
  });
}

async function ensureCustomer(input) {
  const existing = await findCustomerByExternalRef(input.externalReference);
  if (existing) return existing;
  return createCustomer(input);
}

// ── Subscriptions (the recurring rail) ─────────────────────────────────────
// billingType: PIX | CREDIT_CARD | BOLETO. (Asaas's subscription billingType
// enum also allows UNDEFINED, but NOT a bank-debit value — DEBIT/BANK_DEBIT are
// rejected as "billingType deve ser informado" and DEBIT_CARD is "not permitted
// for subscriptions" — so there is no "débito automático" recurring rail.)
// cycle: MONTHLY | WEEKLY | YEARLY ... We default to MONTHLY.

const RAIL_TO_BILLING_TYPE = {
  pix: 'PIX',
  cartao: 'CREDIT_CARD',
  boleto: 'BOLETO',
};

function mapRail(rail) {
  const billingType = RAIL_TO_BILLING_TYPE[rail];
  if (!billingType) {
    const err = new Error(`unknown rail '${rail}' (expected pix|cartao|boleto)`);
    err.status = 400;
    throw err;
  }
  return billingType;
}

/**
 * Create a recurring subscription. `externalReference` makes this idempotent
 * from our side — the caller passes a stable id; if Asaas already has a
 * subscription with it we surface that instead of double-charging.
 */
async function createSubscription({
  customerId,
  rail,
  value,
  nextDueDate,
  cycle = 'MONTHLY',
  description,
  externalReference,
}) {
  const billingType = mapRail(rail);

  // Idempotency: if a subscription with this externalReference already exists, return it.
  const q = new URLSearchParams({ externalReference }).toString();
  const existing = await asaasFetch(`/subscriptions?${q}`);
  if (existing?.data?.[0]) {
    return { ...existing.data[0], _idempotent: true };
  }

  // No card path here, by design. The cartão rail creates a CREDIT_CARD
  // subscription WITHOUT any PAN/CVV: Asaas issues a hosted invoice and the donor
  // enters their card on Asaas's own checkout. So this client NEVER accepts or
  // forwards creditCard/creditCardHolderInfo — no card data crosses our server
  // (no PCI scope). The body below is identical for every rail.
  const body = {
    customer: customerId,
    billingType,
    value,
    nextDueDate,
    cycle,
    description,
    externalReference,
  };

  return asaasFetch('/subscriptions', { method: 'POST', body });
}

async function getSubscription(id) {
  return asaasFetch(`/subscriptions/${encodeURIComponent(id)}`);
}

// Payments under a subscription, newest first — the first DUE charge is the one
// the donor pays now. `order=desc` matches the dashboard; we pick the earliest
// still-payable one in the endpoint.
async function listSubscriptionPayments(id) {
  return asaasFetch(`/subscriptions/${encodeURIComponent(id)}/payments`);
}

// Pix payable artifacts for a single payment: { success, encodedImage (base64
// PNG of the QR), payload (the copy-and-paste "Pix copia e cola" string),
// expirationDate }. Asaas generates these per payment, not per subscription.
async function getPixQrCode(paymentId) {
  return asaasFetch(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
}

// Boleto "linha digitável" + bank barcode for a single payment:
// { identificationField, nossoNumero, barCode }. The PDF itself is the
// payment's bankSlipUrl (no extra call needed for that).
async function getIdentificationField(paymentId) {
  return asaasFetch(`/payments/${encodeURIComponent(paymentId)}/identificationField`);
}

module.exports = {
  asaasFetch,
  ensureCustomer,
  createCustomer,
  findCustomerByExternalRef,
  createSubscription,
  getSubscription,
  listSubscriptionPayments,
  getPixQrCode,
  getIdentificationField,
  mapRail,
  RAIL_TO_BILLING_TYPE,
  baseUrl,
};
