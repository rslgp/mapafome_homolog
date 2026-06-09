const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidCpf,
  isValidCnpj,
  isValidCpfCnpj,
  validateSubscriptionInput,
  RAILS,
} = require('../lib/validate');

test('RAILS are the four BR rails', () => {
  assert.deepEqual(RAILS, ['pix', 'cartao', 'boleto', 'debito']);
});

test('CPF check digits', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('111.111.111-11'), false); // repeated digits
  assert.equal(isValidCpf('529.982.247-24'), false); // wrong check digit
});

test('CNPJ check digits', () => {
  assert.equal(isValidCnpj('11.222.333/0001-81'), true);
  assert.equal(isValidCnpj('11.222.333/0001-80'), false);
});

test('isValidCpfCnpj accepts either length', () => {
  assert.equal(isValidCpfCnpj('52998224725'), true);
  assert.equal(isValidCpfCnpj('11222333000181'), true);
  assert.equal(isValidCpfCnpj('123'), false);
});

test('validateSubscriptionInput — valid pix payload normalizes', () => {
  const { ok, clean } = validateSubscriptionInput({
    rail: 'PIX',
    value: 25,
    name: '  Maria  ',
    email: 'Maria@Example.com',
    cpfCnpj: '529.982.247-25',
  });
  assert.equal(ok, true);
  assert.equal(clean.rail, 'pix');
  assert.equal(clean.name, 'Maria');
  assert.equal(clean.email, 'maria@example.com');
  assert.equal(clean.cpfCnpj, '52998224725');
  assert.equal(clean.cycle, 'MONTHLY');
});

test('validateSubscriptionInput — rejects bad rail / value / docs', () => {
  const r = validateSubscriptionInput({ rail: 'crypto', value: 2, name: 'A', email: 'no', cpfCnpj: '1' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('rail inválido')));
  assert.ok(r.errors.some((e) => e.includes('value')));
  assert.ok(r.errors.some((e) => e.includes('email')));
  assert.ok(r.errors.some((e) => e.includes('CPF/CNPJ')));
});

test('validateSubscriptionInput — cartão requires card data', () => {
  const r = validateSubscriptionInput({
    rail: 'cartao',
    value: 25,
    name: 'Maria',
    email: 'maria@example.com',
    cpfCnpj: '52998224725',
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('cartão')));
});
