// e2e-payment.mjs — drives the RUNNING dev server the way the /assinar success
// screen does: create a subscription, then GET /api/asaas/subscription-payment
// and assert the rail-specific payable artifacts come back. SANDBOX only.
//
//   Terminal A: cd asaas-backend && PORT=3005 npm run dev
//   Terminal B: cd asaas-backend && node scripts/e2e-payment.mjs
const BASE = process.env.BACKEND_URL || 'http://localhost:3005';
const SITE_ORIGIN = 'http://localhost:3000';
const stamp = process.argv[2] || 'pay1';

function subBody(rail, extra = {}) {
  return { rail, value: 10, name: `pay e2e ${rail}`, email: `pay-${rail}-${stamp}@mapafome.com.br`, cpfCnpj: '52998224725', cycle: 'MONTHLY', ...extra };
}
const CARD = {
  creditCard: { holderName: 'pay e2e', number: '5162306219378829', expiryMonth: '05', expiryYear: '2030', ccv: '318' },
  creditCardHolderInfo: { name: 'pay e2e', email: `pay-cartao-${stamp}@mapafome.com.br`, cpfCnpj: '52998224725', postalCode: '01310930', addressNumber: '100', phone: '11999999999' },
};

async function createSub(payload) {
  const r = await fetch(`${BASE}/api/asaas/create-subscription`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: SITE_ORIGIN }, body: JSON.stringify(payload) });
  return (await r.json().catch(() => null));
}
async function getPayment(subscriptionId) {
  const r = await fetch(`${BASE}/api/asaas/subscription-payment?subscriptionId=${encodeURIComponent(subscriptionId)}`, { headers: { Origin: SITE_ORIGIN } });
  return { status: r.status, data: await r.json().catch(() => null) };
}

let failed = false;
function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed = true;
}

// Asaas issues the first invoice asynchronously; poll a few times for pix/boleto.
async function getPaymentReady(subId, want) {
  for (let i = 0; i < 6; i++) {
    const res = await getPayment(subId);
    if (res.data?.ok && !res.data.pending && (!want || res.data[want])) return res;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return getPayment(subId);
}

(async () => {
  console.log(`→ Driving ${BASE}, stamp=${stamp}\n`);

  // Bad id → 400
  const bad = await getPayment('not-a-sub');
  check('rejects invalid subscriptionId', bad.status === 400, `status ${bad.status}`);

  // PIX: create → fetch → expect QR image + copy-paste payload
  const pixSub = await createSub(subBody('pix'));
  check('pix subscription created', pixSub?.ok, `id ${pixSub?.subscriptionId}`);
  const pixPay = await getPaymentReady(pixSub.subscriptionId, 'pix');
  const pix = pixPay.data?.pix;
  check('pix payment artifacts', pixPay.data?.ok && !!pix?.payload && !!pix?.qrImage,
    `payload ${pix?.payload ? pix.payload.slice(0, 24) + '…' : 'none'}, qrImage ${pix?.qrImage ? pix.qrImage.slice(0, 22) + '… (' + pix.qrImage.length + ' chars)' : 'none'}`);

  // BOLETO: create → fetch → expect linha digitável + bankSlipUrl (PDF)
  const bSub = await createSub(subBody('boleto'));
  check('boleto subscription created', bSub?.ok, `id ${bSub?.subscriptionId}`);
  const bPay = await getPaymentReady(bSub.subscriptionId, 'boleto');
  const bol = bPay.data?.boleto;
  check('boleto payment artifacts', bPay.data?.ok && !!bol?.line && !!bol?.bankSlipUrl,
    `line ${bol?.line ? bol.line.slice(0, 20) + '…' : 'none'}, pdf ${bol?.bankSlipUrl || 'none'}`);

  // CARTÃO: create → fetch → expect a hosted invoiceUrl to redirect to (no card artifacts here)
  const cSub = await createSub(subBody('cartao', CARD));
  check('cartao subscription created', cSub?.ok, `id ${cSub?.subscriptionId}`);
  const cPay = await getPaymentReady(cSub.subscriptionId, 'invoiceUrl');
  check('cartao redirect artifact (invoiceUrl, no card data)', cPay.data?.ok && !!cPay.data?.invoiceUrl && !cPay.data?.pix && !cPay.data?.boleto,
    `invoiceUrl ${cPay.data?.invoiceUrl || 'none'}`);

  console.log(`\nRESULT: ${failed ? 'FAIL — see above' : 'PASS — pix QR + boleto barcode + card redirect all served via the running backend'}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FAIL (driver threw):', e.message); process.exit(1); });
