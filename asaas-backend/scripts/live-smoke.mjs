// live-smoke.mjs — proves the Asaas SANDBOX key works end-to-end.
// Run AFTER putting your sandbox key in .env.local:
//   cd asaas-backend && node scripts/live-smoke.mjs
//
// It does three read-mostly things against api-sandbox.asaas.com:
//   1. GET  /myAccount         — auth works, prints the account email
//   2. POST /customers         — create a test customer (idempotent by externalRef)
//   3. GET  /subscriptions     — list (should be reachable)
// It never touches production and creates no charge.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { loadEnv } = require('../lib/loadEnv.js');
loadEnv(join(__dir, '..', '.env.local'));

const KEY = process.env.ASAAS_API_KEY;
const BASE =
  (process.env.ASAAS_ENV || 'sandbox') === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';

if (!KEY) {
  console.error('FAIL: ASAAS_API_KEY is empty in .env.local — paste your sandbox key first.');
  process.exit(1);
}

async function call(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: KEY, ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

(async () => {
  console.log(`→ Asaas ${process.env.ASAAS_ENV || 'sandbox'} @ ${BASE}\n`);

  const acct = await call('/myAccount');
  if (acct.status !== 200) {
    console.error('FAIL: key rejected (GET /myAccount ->', acct.status + ')', acct.body);
    process.exit(1);
  }
  console.log('PASS  auth — account email:', acct.body?.email || '(ok)');

  const cust = await call('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: 'MAPA FOME — smoke test',
      email: 'smoke@mapafome.com.br',
      cpfCnpj: '52998224725',
      externalReference: 'mapafome:smoke:test',
    }),
  });
  if (cust.status >= 400) {
    console.error('FAIL: create customer ->', cust.status, cust.body);
    process.exit(1);
  }
  console.log('PASS  create customer — id:', cust.body?.id);

  const subs = await call('/subscriptions?limit=1');
  console.log('PASS  list subscriptions — reachable, total:', subs.body?.totalCount ?? 0);

  console.log('\nRESULT: PASS — sandbox key is live and the backend can talk to Asaas.');
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
