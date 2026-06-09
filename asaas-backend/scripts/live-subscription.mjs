// live-subscription.mjs — proves the FULL recurring-payment path against Asaas
// sandbox: ensure customer -> create Pix subscription -> assert idempotency.
// Creates a recurring subscription in SANDBOX only (no real money).
//
//   cd asaas-backend && node scripts/live-subscription.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { loadEnv } = require('../lib/loadEnv.js');
loadEnv(join(__dir, '..', '.env.local'));

const { ensureCustomer, createSubscription, getSubscription } = require('../lib/asaasClient.js');

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

(async () => {
  const cust = await ensureCustomer({
    name: 'MAPA FOME — sub smoke',
    email: 'sub-smoke@mapafome.com.br',
    cpfCnpj: '52998224725',
    externalReference: 'mapafome:smoke:sub',
  });
  console.log('PASS  ensureCustomer — id:', cust.id);

  const ref = 'mapafome:smoke:sub:pix';
  const sub = await createSubscription({
    customerId: cust.id,
    rail: 'pix',
    value: 10,
    nextDueDate: todayISO(),
    cycle: 'MONTHLY',
    description: 'Apoio recorrente — smoke',
    externalReference: ref,
  });
  console.log(
    `PASS  createSubscription — id: ${sub.id} status: ${sub.status} billingType: ${sub.billingType}`
  );

  // Second identical call must be idempotent: same id, flagged _idempotent.
  const again = await createSubscription({
    customerId: cust.id,
    rail: 'pix',
    value: 10,
    nextDueDate: todayISO(),
    cycle: 'MONTHLY',
    description: 'dup',
    externalReference: ref,
  });
  if (again.id === sub.id && again._idempotent) {
    console.log('PASS  idempotency — same subscription returned, no duplicate created');
  } else {
    console.error('FAIL  idempotency — got', again.id, 'idempotent:', !!again._idempotent);
    process.exit(1);
  }

  const fetched = await getSubscription(sub.id);
  console.log('PASS  getSubscription — value: R$', fetched.value, 'cycle:', fetched.cycle);
  console.log('\nRESULT: PASS — full Pix recurring-subscription path works on sandbox.');
})().catch((e) => {
  console.error('FAIL:', e.status || '', e.message, e.body ? JSON.stringify(e.body) : '');
  process.exit(1);
});
