const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidSubscriptionId,
  pickCurrentPayment,
  hasPayableCharge,
  allChargesTerminalUnpayable,
  isUnpayableAsaasError,
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

test('pickCurrentPayment — skips a terminal-unpayable (REFUNDED) charge for the payable one', () => {
  const payments = [
    { id: 'pay_refunded', status: 'REFUNDED', dueDate: '2026-06-01' },
    { id: 'pay_open', status: 'PENDING', dueDate: '2026-07-01' },
  ];
  // Even though the refunded charge is earlier by date, the payable one wins so
  // we never hand a dead charge to getPixQrCode.
  assert.equal(pickCurrentPayment(payments).id, 'pay_open');
});

// ── hasPayableCharge / allChargesTerminalUnpayable — the 409 vs pending split ──

test('hasPayableCharge — true iff some charge is PENDING/OVERDUE/AWAITING_RISK_ANALYSIS', () => {
  assert.equal(hasPayableCharge([{ status: 'PENDING' }]), true);
  assert.equal(hasPayableCharge([{ status: 'OVERDUE' }]), true);
  assert.equal(hasPayableCharge([{ status: 'AWAITING_RISK_ANALYSIS' }]), true);
  assert.equal(hasPayableCharge([{ status: 'RECEIVED' }, { status: 'REFUNDED' }]), false);
  assert.equal(hasPayableCharge([]), false);
  assert.equal(hasPayableCharge(undefined), false);
});

test('allChargesTerminalUnpayable — true only when EVERY charge is terminal-unpayable', () => {
  // The 409 case: every charge is refunded/cancelled — nothing left to pay.
  assert.equal(
    allChargesTerminalUnpayable([
      { status: 'REFUNDED' },
      { status: 'CANCELLED' },
    ]),
    true,
  );
  // A still-payable charge present → NOT the 409 case (the donor can pay it).
  assert.equal(
    allChargesTerminalUnpayable([{ status: 'REFUNDED' }, { status: 'PENDING' }]),
    false,
  );
  // Already-paid (RECEIVED/CONFIRMED) is "paid", not "unpayable" → NOT 409.
  assert.equal(allChargesTerminalUnpayable([{ status: 'RECEIVED' }]), false);
  assert.equal(allChargesTerminalUnpayable([{ status: 'CONFIRMED' }]), false);
  // Empty list is the pending case, handled separately → not "all terminal".
  assert.equal(allChargesTerminalUnpayable([]), false);
  assert.equal(allChargesTerminalUnpayable(undefined), false);
});

test('pickCurrentPayment + helpers — ALL charges unpayable signals 409, not 502', () => {
  // Mirrors the handler's decision: with no payable charge AND every charge
  // terminal, the handler returns 409 instead of calling getPixQrCode.
  const payments = [
    { id: 'pay_a', status: 'REFUNDED', dueDate: '2026-06-01' },
    { id: 'pay_b', status: 'CANCELLED', dueDate: '2026-07-01' },
  ];
  assert.equal(hasPayableCharge(payments), false);
  assert.equal(allChargesTerminalUnpayable(payments), true);
});

// ── isUnpayableAsaasError — the catch-layer 409 detector (the logged 502 bug) ──

test('isUnpayableAsaasError — true for the live Asaas "cannot be paid" 400 body', () => {
  const err = {
    status: 400,
    body: { errors: [{ code: 'invalid_action', description: 'Esta cobrança não pode mais ser paga.' }] },
  };
  assert.equal(isUnpayableAsaasError(err), true);
});

test('isUnpayableAsaasError — accent/case tolerant on the description', () => {
  const ascii = {
    status: 400,
    body: { errors: [{ code: 'invalid_action', description: 'ESTA COBRANCA NAO PODE MAIS SER PAGA' }] },
  };
  assert.equal(isUnpayableAsaasError(ascii), true);
});

test('isUnpayableAsaasError — code absent but the PT text present still matches', () => {
  const noCode = {
    status: 400,
    body: { errors: [{ description: 'Esta cobrança não pode mais ser paga.' }] },
  };
  assert.equal(isUnpayableAsaasError(noCode), true);
});

test('isUnpayableAsaasError — an UNRELATED invalid_action 400 is NOT remapped to 409', () => {
  // 'invalid_action' is a broad Asaas bucket; code alone must not over-map.
  const other = {
    status: 400,
    body: { errors: [{ code: 'invalid_action', description: 'Operação não permitida para este objeto.' }] },
  };
  assert.equal(isUnpayableAsaasError(other), false);
});

test('isUnpayableAsaasError — non-400 / empty / malformed errors are NOT unpayable', () => {
  assert.equal(isUnpayableAsaasError({ status: 404, body: { errors: [{ code: 'not_found', description: 'x' }] } }), false);
  assert.equal(isUnpayableAsaasError({ status: 500 }), false);
  assert.equal(isUnpayableAsaasError({ status: 400, body: { errors: [] } }), false);
  assert.equal(isUnpayableAsaasError({ status: 400, body: {} }), false);
  assert.equal(isUnpayableAsaasError(null), false);
  assert.equal(isUnpayableAsaasError(undefined), false);
});

// ── railOf — Asaas billingType → our rail id ────────────────────────────────

test('railOf — maps the three supported billingTypes, null otherwise', () => {
  assert.equal(railOf('PIX'), 'pix');
  assert.equal(railOf('CREDIT_CARD'), 'cartao');
  assert.equal(railOf('BOLETO'), 'boleto');
  assert.equal(railOf('UNDEFINED'), null);
  assert.equal(railOf('DEBIT'), null);
});
