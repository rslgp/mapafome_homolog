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
// billingType: PIX | CREDIT_CARD | BOLETO | DEBIT (débito automático).
// cycle: MONTHLY | WEEKLY | YEARLY ... We default to MONTHLY.

const RAIL_TO_BILLING_TYPE = {
  pix: 'PIX',
  cartao: 'CREDIT_CARD',
  boleto: 'BOLETO',
  debito: 'DEBIT',
};

function mapRail(rail) {
  const billingType = RAIL_TO_BILLING_TYPE[rail];
  if (!billingType) {
    const err = new Error(`unknown rail '${rail}' (expected pix|cartao|boleto|debito)`);
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
  creditCard,
  creditCardHolderInfo,
  remoteIp,
}) {
  const billingType = mapRail(rail);

  // Idempotency: if a subscription with this externalReference already exists, return it.
  const q = new URLSearchParams({ externalReference }).toString();
  const existing = await asaasFetch(`/subscriptions?${q}`);
  if (existing?.data?.[0]) {
    return { ...existing.data[0], _idempotent: true };
  }

  const body = {
    customer: customerId,
    billingType,
    value,
    nextDueDate,
    cycle,
    description,
    externalReference,
  };

  // Card rail: Asaas tokenizes on first charge. We forward the card data the
  // browser collected over HTTPS straight to Asaas and never persist it.
  if (billingType === 'CREDIT_CARD' && creditCard) {
    body.creditCard = creditCard;
    body.creditCardHolderInfo = creditCardHolderInfo;
    if (remoteIp) body.remoteIp = remoteIp;
  }

  return asaasFetch('/subscriptions', { method: 'POST', body });
}

async function getSubscription(id) {
  return asaasFetch(`/subscriptions/${encodeURIComponent(id)}`);
}

async function listSubscriptionPayments(id) {
  return asaasFetch(`/subscriptions/${encodeURIComponent(id)}/payments`);
}

module.exports = {
  asaasFetch,
  ensureCustomer,
  createCustomer,
  findCustomerByExternalRef,
  createSubscription,
  getSubscription,
  listSubscriptionPayments,
  mapRail,
  RAIL_TO_BILLING_TYPE,
  baseUrl,
};
