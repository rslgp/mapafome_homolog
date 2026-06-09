const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidSubscriptionId,
  pickCurrentPayment,
  railOf,
} = require('../api/asaas/subscription-payment');

// ── isValidSubscriptionId — untrusted query param shape check ───────────────

test('isValidSubscriptionId — accepts a well-formed sub_ id', () => {
  assert.equal(isValidSubscriptionId('sub_kz270e3sljysdvml'), true);
});

test('isValidSubscriptionId — rejects garbage, wrong prefix, and non-strings', () => {
  assert.equal(isValidSubscriptionId(''), false);
  assert.equal(isValidSubscriptionId('pay_123'), false); // a payment id, not a sub
  assert.equal(isValidSubscriptionId('sub_'), false); // prefix only
  assert.equal(isValidSubscriptionId('sub_abc def'), false); // space
  assert.equal(isValidSubscriptionId('sub_abc;DROP'), false); // injection-ish
  assert.equal(isValidSubscriptionId(undefined), false);
  assert.equal(isValidSubscriptionId(null), false);
  assert.equal(isValidSubscriptionId(42), false);
});

// ── pickCurrentPayment — choose the charge the donor pays now ───────────────

test('pickCurrentPayment — picks the earliest PAYABLE charge (by dueDate)', () => {
  const payments = [
    { id: 'pay_c', status: 'PENDING', dueDate: '2026-08-01' },
    { id: 'pay_a', status: 'PENDING', dueDate: '2026-06-01' },
    { id: 'pay_b', status: 'PENDING', dueDate: '2026-07-01' },
  ];
  assert.equal(pickCurrentPayment(payments).id, 'pay_a');
});

test('pickCurrentPayment — skips already-paid charges, picks the open one', () => {
  const payments = [
    { id: 'pay_paid', status: 'RECEIVED', dueDate: '2026-06-01' },
    { id: 'pay_open', status: 'PENDING', dueDate: '2026-07-01' },
  ];
  assert.equal(pickCurrentPayment(payments).id, 'pay_open');
});

test('pickCurrentPayment — OVERDUE and AWAITING_RISK_ANALYSIS count as payable', () => {
  assert.equal(
    pickCurrentPayment([{ id: 'p1', status: 'OVERDUE', dueDate: '2026-06-01' }]).id,
    'p1',
  );
  assert.equal(
    pickCurrentPayment([{ id: 'p2', status: 'AWAITING_RISK_ANALYSIS', dueDate: '2026-06-01' }]).id,
    'p2',
  );
});

test('pickCurrentPayment — no payable charge: falls back to the earliest by date', () => {
  const payments = [
    { id: 'pay_late', status: 'RECEIVED', dueDate: '2026-07-01' },
    { id: 'pay_early', status: 'RECEIVED', dueDate: '2026-06-01' },
  ];
  assert.equal(pickCurrentPayment(payments).id, 'pay_early');
});

test('pickCurrentPayment — empty / missing list returns null', () => {
  assert.equal(pickCurrentPayment([]), null);
  assert.equal(pickCurrentPayment(undefined), null);
  assert.equal(pickCurrentPayment(null), null);
});

// ── railOf — Asaas billingType → our rail id ────────────────────────────────

test('railOf — maps the three supported billingTypes, null otherwise', () => {
  assert.equal(railOf('PIX'), 'pix');
  assert.equal(railOf('CREDIT_CARD'), 'cartao');
  assert.equal(railOf('BOLETO'), 'boleto');
  assert.equal(railOf('UNDEFINED'), null);
  assert.equal(railOf('DEBIT'), null);
});
