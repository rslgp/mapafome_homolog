// validate.js — input validation + BR-domain helpers. Pure, unit-testable.
// The serverless endpoints treat the request body as untrusted DATA: every
// field is validated here before it reaches the Asaas client.

// Asaas subscriptions only support these billingTypes (no bank-debit rail —
// DEBIT/BANK_DEBIT are rejected and DEBIT_CARD is not allowed for subscriptions).
const RAILS = ['pix', 'cartao', 'boleto'];

// Strip non-digits from a CPF/CNPJ and validate length + check digits (CPF).
function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function isValidCpf(cpf) {
  cpf = onlyDigits(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(cpf[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj) {
  cnpj = onlyDigits(cnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len) => {
    const nums = cnpj.substring(0, len);
    let pos = len - 7;
    let sum = 0;
    for (let i = len; i >= 1; i--) {
      sum += Number(nums[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function isValidCpfCnpj(v) {
  const d = onlyDigits(v);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

function isValidEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Validate a create-subscription payload. Returns { ok, errors, clean }.
// `clean` carries normalized values; never trust raw input downstream.
function validateSubscriptionInput(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: ['corpo da requisição ausente ou inválido'], clean: null };
  }

  const rail = String(body.rail || '').toLowerCase();
  if (!RAILS.includes(rail)) errors.push(`rail inválido: use ${RAILS.join(' | ')}`);

  const value = Number(body.value);
  if (!Number.isFinite(value) || value < 5) errors.push('value deve ser número ≥ 5 (R$)');

  if (!body.name || String(body.name).trim().length < 2) errors.push('name obrigatório');
  if (!isValidEmail(body.email)) errors.push('email inválido');
  if (!isValidCpfCnpj(body.cpfCnpj)) errors.push('CPF/CNPJ inválido');

  // No rail collects inline card data. The cartão rail creates a CREDIT_CARD
  // subscription WITHOUT a creditCard; Asaas issues a hosted invoice and the donor
  // enters the PAN/CVV on Asaas's checkout. So a card object is never required —
  // and (below) never forwarded — keeping PANs out of our code (no PCI scope).

  if (errors.length) return { ok: false, errors, clean: null };

  const clean = {
    rail,
    value,
    name: String(body.name).trim(),
    email: String(body.email).trim().toLowerCase(),
    cpfCnpj: onlyDigits(body.cpfCnpj),
    mobilePhone: body.mobilePhone ? onlyDigits(body.mobilePhone) : undefined,
    description: body.description ? String(body.description).slice(0, 255) : 'Apoio recorrente — MAPA FOME',
    cycle: body.cycle && ['WEEKLY', 'MONTHLY', 'YEARLY'].includes(body.cycle) ? body.cycle : 'MONTHLY',
  };
  return { ok: true, errors: [], clean };
}

module.exports = {
  RAILS,
  onlyDigits,
  isValidCpf,
  isValidCnpj,
  isValidCpfCnpj,
  isValidEmail,
  validateSubscriptionInput,
};
