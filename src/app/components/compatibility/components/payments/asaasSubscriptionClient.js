// asaasSubscriptionClient.js — browser-side client for the Asaas backend.
//
// This talks ONLY to our own serverless backend (NEXT_PUBLIC_ASAAS_BACKEND_URL),
// never to Asaas directly — the Asaas secret key lives on the server, not here.
// The only "public" config is the backend URL, which is safe to ship.
//
// Pure, framework-free, and unit-testable: the fetch impl is injectable.

// RAILS is the structural source of truth: the rail ids + their stable order are
// authoritative here (and asserted by asaasSubscriptionClient.test.js). The
// pt-BR label/hint remain as a non-i18n fallback, but the rendered display copy
// is pulled from the i18n dictionary via labelKey/hintKey — so strings.js stays
// the single translation SOT and pt-BR/es parity is testable.
export const RAILS = [
  { id: 'pix', labelKey: 'assinar.rail.pix.label', hintKey: 'assinar.rail.pix.hint', label: 'Pix', hint: 'Pix Automático — débito recorrente, sem taxa de cartão' },
  { id: 'cartao', labelKey: 'assinar.rail.cartao.label', hintKey: 'assinar.rail.cartao.hint', label: 'Cartão de crédito', hint: 'Assinatura no cartão, renovação automática' },
  { id: 'boleto', labelKey: 'assinar.rail.boleto.label', hintKey: 'assinar.rail.boleto.hint', label: 'Boleto', hint: 'Um boleto por mês — você paga cada um' },
  // NOTE: there is no "débito automático" rail — Asaas's subscription billingType
  // enum is only PIX | CREDIT_CARD | BOLETO | UNDEFINED; DEBIT/BANK_DEBIT are
  // rejected ("billingType deve ser informado") and DEBIT_CARD is "not permitted
  // for subscriptions". So bank-debit cannot be a recurring rail here.
];

// i18n key registry for the /assinar page. Co-located with the payments feature
// so the dictionary's "no dead keys" guard (i18n.test.js scans the compatibility
// tree) sees every key as a live literal even though the page lives outside it.
// page.js renders each via t(); RAILS rail keys are listed above on the rails.
export const ASSINAR_I18N_KEYS = [
  'assinar.back',
  'assinar.title',
  'assinar.sub',
  'assinar.legend.rail',
  'assinar.legend.value',
  'assinar.value.presets',
  'assinar.value.other',
  'assinar.field.name',
  'assinar.field.email',
  'assinar.field.cpfcnpj',
  'assinar.field.phone',
  'assinar.cta.submitting',
  'assinar.cta.support',
  'assinar.note',
  'assinar.error.fallback',
  'assinar.success.title',
  'assinar.success.sub',
  'assinar.success.active',
  // Inline payment screen (Pix QR / boleto / card redirect) shown after the
  // subscription is created. page.js renders each via t().
  'assinar.pay.loading',
  'assinar.pay.error',
  'assinar.pay.retry',
  'assinar.pay.pix.title',
  'assinar.pay.pix.help',
  'assinar.pay.pix.copy',
  'assinar.pay.pix.copied',
  'assinar.pay.pix.qrAlt',
  'assinar.pay.boleto.title',
  'assinar.pay.boleto.help',
  'assinar.pay.boleto.line',
  'assinar.pay.boleto.copy',
  'assinar.pay.boleto.copied',
  'assinar.pay.boleto.open',
  'assinar.pay.card.title',
  'assinar.pay.card.help',
  'assinar.pay.card.cta',
  'assinar.pay.pending',
];

export function backendUrl() {
  const url = process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_ASAAS_BACKEND_URL não está configurado — defina a URL do backend de pagamentos.'
    );
  }
  return url.replace(/\/$/, '');
}

/**
 * Start a recurring support subscription.
 *
 * @param {object} input  { rail, value, name, email, cpfCnpj, mobilePhone?, cycle?, creditCard?, creditCardHolderInfo? }
 * @param {object} [opts] { fetchImpl?, baseUrl? } — for tests/SSR.
 * @returns {Promise<{ok:boolean, subscriptionId?, status?, invoiceUrl?, messages?}>}
 */
export async function createSubscription(input, opts = {}) {
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) throw new Error('fetch indisponível neste ambiente');
  const base = opts.baseUrl || backendUrl();

  let res;
  try {
    res = await fetchImpl(`${base}/api/asaas/create-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    // Network/CORS failure — backend unreachable.
    return { ok: false, messages: ['Não foi possível falar com o servidor de pagamentos. Tente novamente.'] };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.ok) {
    const messages =
      data?.messages || [data?.message || 'Não foi possível criar a assinatura. Verifique os dados.'];
    return { ok: false, status: res.status, messages };
  }

  return {
    ok: true,
    subscriptionId: data.subscriptionId,
    rail: data.rail,
    status: data.status,
    value: data.value,
    cycle: data.cycle,
    invoiceUrl: data.invoiceUrl || null,
    idempotent: Boolean(data.idempotent),
  };
}

/**
 * Fetch the payable artifacts for a created subscription's current charge, so
 * the page can render its own Pix QR / boleto / card-redirect screen.
 *
 * @param {string} subscriptionId  the id returned by createSubscription
 * @param {object} [opts] { fetchImpl?, baseUrl? }
 * @returns {Promise<{ok:boolean, rail?, status?, pending?, invoiceUrl?, pix?, boleto?, messages?}>}
 *   pix    → { payload, qrImage (data: URL), expiresAt }
 *   boleto → { bankSlipUrl, line, barCode }
 *   pending:true → the subscription exists but Asaas hasn't issued the first
 *                  invoice yet (caller may retry).
 */
export async function fetchSubscriptionPayment(subscriptionId, opts = {}) {
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) throw new Error('fetch indisponível neste ambiente');
  const base = opts.baseUrl || backendUrl();
  const url = `${base}/api/asaas/subscription-payment?subscriptionId=${encodeURIComponent(subscriptionId)}`;

  let res;
  try {
    res = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch {
    return { ok: false, messages: ['Não foi possível buscar os dados de pagamento. Tente novamente.'] };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.ok) {
    const messages = data?.messages || [data?.message || 'Não foi possível obter o pagamento.'];
    return { ok: false, status: res.status, messages };
  }

  return {
    ok: true,
    rail: data.rail,
    status: data.status,
    pending: Boolean(data.pending),
    paymentStatus: data.paymentStatus,
    value: data.value,
    dueDate: data.dueDate || null,
    invoiceUrl: data.invoiceUrl || null,
    pix: data.pix || null,
    boleto: data.boleto || null,
  };
}

// Light client-side validation mirrors the server (which is authoritative).
// Returns an array of pt-BR error strings; empty array = ready to submit.
// The cartão rail no longer requires inline card data: the CREDIT_CARD
// subscription is created card-less and Asaas collects the PAN/CVV on its hosted
// checkout (invoiceUrl), so there is no card-field check here.
export function validateBeforeSubmit({ rail, value, name, email, cpfCnpj }) {
  const errors = [];
  if (!RAILS.some((r) => r.id === rail)) errors.push('Escolha uma forma de pagamento.');
  if (!(Number(value) >= 5)) errors.push('O valor mínimo é R$ 5.');
  if (!name || name.trim().length < 2) errors.push('Informe seu nome.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) errors.push('Informe um e-mail válido.');
  const digits = String(cpfCnpj || '').replace(/\D/g, '');
  if (digits.length !== 11 && digits.length !== 14) errors.push('Informe um CPF ou CNPJ válido.');
  return errors;
}
