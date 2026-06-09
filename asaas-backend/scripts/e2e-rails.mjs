// e2e-rails.mjs — drives the RUNNING dev server (npm run dev) the way the
// browser form does: POST /api/asaas/create-subscription for each rail against
// the Asaas SANDBOX. Proves the link works end-to-end. SANDBOX only — no money.
//
//   Terminal A: cd asaas-backend && npm run dev
//   Terminal B: cd asaas-backend && node scripts/e2e-rails.mjs
//
// Request bodies mirror what asaasSubscriptionClient.js buildInput() sends.
const BASE = process.env.BACKEND_URL || 'http://localhost:3001';
const SITE_ORIGIN = 'http://localhost:3000';

// Distinct CPFs per rail so each maps to its own customer/subscription
// (externalRef is email+rail; distinct emails keep the rails independent).
const stamp = process.argv[2] || 't1';

function body(rail, extra = {}) {
  return {
    rail,
    value: 10,
    name: `MAPA FOME e2e ${rail}`,
    email: `e2e-${rail}-${stamp}@mapafome.com.br`,
    cpfCnpj: '52998224725', // valid sandbox CPF
    cycle: 'MONTHLY',
    ...extra,
  };
}

// Asaas sandbox approved test card (from Asaas docs).
const CARD = {
  creditCard: {
    holderName: 'MAPA FOME e2e',
    number: '5162306219378829',
    expiryMonth: '05',
    expiryYear: '2030',
    ccv: '318',
  },
  creditCardHolderInfo: {
    name: 'MAPA FOME e2e',
    email: `e2e-cartao-${stamp}@mapafome.com.br`,
    cpfCnpj: '52998224725',
    postalCode: '01310930',
    addressNumber: '100',
    phone: '11999999999',
  },
};

async function post(payload) {
  const res = await fetch(`${BASE}/api/asaas/create-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: SITE_ORIGIN },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function preflight() {
  const res = await fetch(`${BASE}/api/asaas/create-subscription`, {
    method: 'OPTIONS',
    headers: { Origin: SITE_ORIGIN, 'Access-Control-Request-Method': 'POST' },
  });
  const allow = res.headers.get('access-control-allow-origin');
  return { status: res.status, allow };
}

let failed = false;
function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed = true;
}

(async () => {
  console.log(`→ Driving ${BASE} (origin ${SITE_ORIGIN}), stamp=${stamp}\n`);

  // CORS preflight — the browser sends this before the POST.
  const pf = await preflight();
  check('CORS preflight', pf.status === 204 && pf.allow === SITE_ORIGIN,
    `status ${pf.status}, allow-origin ${pf.allow}`);

  // PIX
  const pix = await post(body('pix'));
  check('pix create', pix.status === 200 && pix.data?.ok,
    `id ${pix.data?.subscriptionId} status ${pix.data?.status} invoiceUrl ${pix.data?.invoiceUrl ? 'yes' : 'no'}`);

  // PIX idempotency — identical resend must return the same subscription.
  const pix2 = await post(body('pix'));
  check('pix idempotent', pix2.data?.ok && pix2.data?.subscriptionId === pix.data?.subscriptionId && pix2.data?.idempotent === true,
    `same id ${pix2.data?.subscriptionId === pix.data?.subscriptionId}, idempotent ${pix2.data?.idempotent}`);

  // CARTÃO
  const cartao = await post(body('cartao', CARD));
  check('cartao create', cartao.status === 200 && cartao.data?.ok,
    `id ${cartao.data?.subscriptionId} status ${cartao.data?.status}` +
    (cartao.data?.ok ? '' : ` :: ${JSON.stringify(cartao.data?.messages)}`));

  // BOLETO
  const boleto = await post(body('boleto'));
  check('boleto create', boleto.status === 200 && boleto.data?.ok,
    `id ${boleto.data?.subscriptionId} status ${boleto.data?.status} invoiceUrl ${boleto.data?.invoiceUrl ? 'yes' : 'no'}`);

  // (No "débito automático" rail: Asaas subscriptions have no bank-debit
  // billingType. A debito POST is expected to be REJECTED at validation now.)
  const debito = await post(body('debito'));
  check('debito rejected (no such rail)', debito.status === 400,
    `status ${debito.status} :: ${JSON.stringify(debito.data?.messages || debito.data)}`);

  console.log(`\nRESULT: ${failed ? 'FAIL — see above' : 'PASS — all three supported rails created via the running backend'}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('FAIL (driver threw):', e.message);
  process.exit(1);
});
