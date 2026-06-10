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

// Backend resolution is INTERNAL-FIRST: on a local/kiosk device the Asaas backend
// runs on localhost, so we try it FIRST (fast, no public round-trip) and fall back
// to the public deploy URL only when localhost is unreachable (e.g. the page is
// opened from a remote browser). See backendUrls() + requestWithFallback().
//
//   internal (tried first): NEXT_PUBLIC_ASAAS_INTERNAL_URL, default http://localhost:3005
//                           (set it to empty to disable the internal hop)
//   public   (fallback):    NEXT_PUBLIC_ASAAS_BACKEND_URL   e.g. https://055190.xyz:3006
//
// Modern browsers treat http://localhost as a secure context, so an https page may
// still call it without a mixed-content block.
const DEFAULT_INTERNAL_BACKEND_URL = 'http://localhost:3005';

function trimUrl(u) {
  return String(u || '').replace(/\/$/, '');
}

// The PUBLIC backend URL (the documented, ship-safe config). Kept as the named
// export callers may rely on; it is the fallback candidate in backendUrls().
export function backendUrl() {
  const url = process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_ASAAS_BACKEND_URL não está configurado — defina a URL do backend de pagamentos.'
    );
  }
  return trimUrl(url);
}

// Ordered base URLs to try for a request: internal (localhost) FIRST, then the
// public URL. Empties dropped, duplicates collapsed. Pass opts.baseUrl to a
// request helper to bypass this entirely (tests/SSR).
export function backendUrls() {
  const internalRaw = process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL;
  const internal = trimUrl(internalRaw === undefined ? DEFAULT_INTERNAL_BACKEND_URL : internalRaw);
  let publicUrl = '';
  try {
    publicUrl = backendUrl();
  } catch {
    publicUrl = ''; // public not configured — the internal candidate may still carry it
  }
  return [...new Set([internal, publicUrl].filter(Boolean))];
}

// --- Connection diagnostics --------------------------------------------------
// A failed fetch to the backend surfaces as an opaque "TypeError: Failed to
// fetch" with zero detail — which URL? backend down? CORS? wrong origin? mixed
// content? These helpers annotate the attempt + failure in the browser console
// so a connection error is actually debuggable from DevTools. On by default in
// the browser/dev; silence with NEXT_PUBLIC_ASAAS_DEBUG=off. Quiet under the
// test runner (NODE_ENV=test) so the unreachable-backend characterization tests
// don't spam output. Logs URLs only — never the request body (it carries PII:
// name/email/CPF).
const ASAAS_DEBUG =
  process.env.NEXT_PUBLIC_ASAAS_DEBUG !== 'off' && process.env.NODE_ENV !== 'test';

function asaasLog(...args) {
  if (ASAAS_DEBUG && typeof console !== 'undefined') console.log('[asaas]', ...args);
}

function logConnectionFailure(url, err) {
  if (!ASAAS_DEBUG || typeof console === 'undefined') return;
  console.error(
    `[asaas] connection FAILED → ${url}\n` +
      `  ${err?.name || 'Error'}: ${err?.message ?? err}\n` +
      '  likely cause: backend not running on that host/port, a wrong ' +
      'NEXT_PUBLIC_ASAAS_BACKEND_URL, the page origin not in the backend ' +
      'ALLOWED_ORIGINS (CORS preflight blocked), or http→https mixed content.'
  );
}

// Run a request against the ordered backend candidates (internal first, then
// public), falling to the next ONLY when the fetch itself fails (network / CORS /
// mixed-content) — never when the backend returns an HTTP error, which is a real
// answer. Returns { res, url } for the first Response obtained. Throws an Error
// with .connectionFailed=true when EVERY candidate is unreachable, or a plain
// Error for misconfig / no global fetch (same throw contract as before).
async function requestWithFallback(method, path, init, opts, logLabel = '') {
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) throw new Error('fetch indisponível neste ambiente');

  // A pinned baseUrl (tests/SSR) bypasses the internal-first fallback entirely.
  const bases = opts.baseUrl ? [trimUrl(opts.baseUrl)] : backendUrls();
  if (!bases.length) {
    throw new Error(
      'NEXT_PUBLIC_ASAAS_BACKEND_URL não está configurado — defina a URL do backend de pagamentos.'
    );
  }

  let lastErr = null;
  for (let i = 0; i < bases.length; i++) {
    const url = `${bases[i]}${path}`;
    asaasLog(method, url, logLabel);
    try {
      return { res: await fetchImpl(url, init), url };
    } catch (err) {
      lastErr = err;
      logConnectionFailure(url, err);
      if (i < bases.length - 1) asaasLog(`backend unreachable — trying fallback ${bases[i + 1]}`);
    }
  }
  const e = new Error('all_backends_unreachable');
  e.connectionFailed = true;
  e.cause = lastErr;
  throw e;
}

/**
 * Start a recurring support subscription.
 *
 * @param {object} input  { rail, value, name, email, cpfCnpj, mobilePhone?, cycle?, creditCard?, creditCardHolderInfo? }
 * @param {object} [opts] { fetchImpl?, baseUrl? } — for tests/SSR.
 * @returns {Promise<{ok:boolean, subscriptionId?, status?, invoiceUrl?, messages?}>}
 */
export async function createSubscription(input, opts = {}) {
  let res;
  try {
    ({ res } = await requestWithFallback(
      'POST',
      '/api/asaas/create-subscription',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      opts,
      `(rail=${input?.rail ?? '?'})`
    ));
  } catch (err) {
    if (err?.connectionFailed) {
      // Every backend (internal localhost + public) was unreachable.
      return { ok: false, messages: ['Não foi possível falar com o servidor de pagamentos. Tente novamente.'] };
    }
    throw err; // misconfig / fetch indisponível — unchanged throw contract
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
  const path = `/api/asaas/subscription-payment?subscriptionId=${encodeURIComponent(subscriptionId)}`;
  let res;
  try {
    ({ res } = await requestWithFallback(
      'GET',
      path,
      { method: 'GET', headers: { Accept: 'application/json' } },
      opts
    ));
  } catch (err) {
    if (err?.connectionFailed) {
      return { ok: false, messages: ['Não foi possível buscar os dados de pagamento. Tente novamente.'] };
    }
    throw err;
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
