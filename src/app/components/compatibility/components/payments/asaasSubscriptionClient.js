// asaasSubscriptionClient.js — browser-side client for the Asaas backend.
//
// This talks ONLY to our own serverless backend (NEXT_PUBLIC_ASAAS_BACKEND_URL),
// never to Asaas directly — the Asaas secret key lives on the server, not here.
// The only "public" config is the backend URL, which is safe to ship.
//
// Pure, framework-free, and unit-testable: the fetch impl is injectable.

export const RAILS = [
  { id: 'pix', label: 'Pix', hint: 'Pix Automático — débito recorrente, sem taxa de cartão' },
  { id: 'cartao', label: 'Cartão de crédito', hint: 'Assinatura no cartão, renovação automática' },
  { id: 'boleto', label: 'Boleto', hint: 'Um boleto por mês — você paga cada um' },
  { id: 'debito', label: 'Débito automático', hint: 'Débito direto na sua conta' },
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

// Light client-side validation mirrors the server (which is authoritative).
// Returns an array of pt-BR error strings; empty array = ready to submit.
export function validateBeforeSubmit({ rail, value, name, email, cpfCnpj, creditCard }) {
  const errors = [];
  if (!RAILS.some((r) => r.id === rail)) errors.push('Escolha uma forma de pagamento.');
  if (!(Number(value) >= 5)) errors.push('O valor mínimo é R$ 5.');
  if (!name || name.trim().length < 2) errors.push('Informe seu nome.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) errors.push('Informe um e-mail válido.');
  const digits = String(cpfCnpj || '').replace(/\D/g, '');
  if (digits.length !== 11 && digits.length !== 14) errors.push('Informe um CPF ou CNPJ válido.');
  if (rail === 'cartao') {
    const c = creditCard || {};
    if (!c.number || !c.expiryMonth || !c.expiryYear || !c.ccv || !c.holderName) {
      errors.push('Preencha todos os dados do cartão.');
    }
  }
  return errors;
}
