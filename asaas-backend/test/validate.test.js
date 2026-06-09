const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  onlyDigits,
  isValidCpf,
  isValidCnpj,
  isValidCpfCnpj,
  isValidEmail,
  validateSubscriptionInput,
  RAILS,
} = require('../lib/validate');

// A real, check-digit-valid CPF/CNPJ pair reused across characterizations.
const VALID_CPF = '52998224725';
const VALID_CNPJ = '11222333000181';

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

// ── P20 characterization — capture current real behavior, no source change ──

// --- onlyDigits ---

test('onlyDigits — strips mask, coerces non-strings, falsy-guards', () => {
  assert.equal(onlyDigits('529.982.247-25'), '52998224725');
  assert.equal(onlyDigits('(11) 99999-8888'), '11999998888');
  assert.equal(onlyDigits(null), '');
  assert.equal(onlyDigits(undefined), '');
  assert.equal(onlyDigits(123), '123');
  // QUIRK (current behavior): the `String(s || '')` guard treats a literal
  // numeric 0 as falsy, so onlyDigits(0) === '' (not '0'). Harmless for
  // CPF/CNPJ/phone (never the bare number 0); documented so it can't surprise.
  assert.equal(onlyDigits(0), '');
});

// --- CPF check digits ---

test('isValidCpf — valid, masked, all-same-digit, length + non-string', () => {
  assert.equal(isValidCpf(VALID_CPF), true);
  assert.equal(isValidCpf('529.982.247-25'), true); // masked normalized
  assert.equal(isValidCpf('52998224724'), false); // wrong second check digit
  assert.equal(isValidCpf('00000000000'), false); // all-same-digit rejected
  assert.equal(isValidCpf('99999999999'), false); // all-same-digit rejected
  assert.equal(isValidCpf('529982247250'), false); // 12 digits — wrong length
  assert.equal(isValidCpf('5299822472'), false); // 10 digits — wrong length
  assert.equal(isValidCpf(null), false);
  assert.equal(isValidCpf(52998224725), true); // numeric coerced via onlyDigits
});

test('isValidCpf — FIRST check digit (calc(9)) failure is its own rejection branch', () => {
  // The validator ANDs both check digits; the existing wrong-digit cases above all
  // trip the SECOND digit. This isolates the FIRST: 52998224735 keeps the correct
  // second digit (5) but flips the first (2 -> 3), so only calc(9) !== cpf[9] fails.
  assert.equal(isValidCpf('52998224735'), false);
});

// --- CNPJ check digits ---

test('isValidCnpj — valid, masked, all-same-digit, length', () => {
  assert.equal(isValidCnpj(VALID_CNPJ), true);
  assert.equal(isValidCnpj('11.222.333/0001-81'), true); // masked normalized
  assert.equal(isValidCnpj('11222333000180'), false); // wrong last check digit
  assert.equal(isValidCnpj('00000000000000'), false); // all-same-digit rejected
  assert.equal(isValidCnpj('1122233300018'), false); // 13 digits — wrong length
});

test('isValidCnpj — FIRST check digit (d1) failure is its own rejection branch', () => {
  // Mirrors the CPF case: 11222333000191 flips the first check digit (8 -> 9) and
  // keeps the second (1), so only d1 !== cnpj[12] trips. Pins the calc(12) branch.
  assert.equal(isValidCnpj('11222333000191'), false);
});

test('isValidCpfCnpj — a length that is neither 11 nor 14 falls through to false', () => {
  // The dispatcher only routes 11-digit -> CPF and 14-digit -> CNPJ; every other
  // length (here 12, and empty) hits the final `return false` without calling either.
  assert.equal(isValidCpfCnpj('123456789012'), false); // 12 digits
  assert.equal(isValidCpfCnpj(''), false);
  assert.equal(isValidCpfCnpj(null), false);
});

// --- isValidEmail ---

test('isValidEmail — requires non-string-safe local@domain.tld, rejects spaces', () => {
  assert.equal(isValidEmail('a@b.co'), true);
  assert.equal(isValidEmail('maria@example.com'), true);
  assert.equal(isValidEmail('a@b'), false); // no TLD dot
  assert.equal(isValidEmail('nope'), false);
  assert.equal(isValidEmail(null), false); // non-string fails the typeof guard
  assert.equal(isValidEmail(123), false);
  // The regex forbids whitespace anywhere, so a padded email is INVALID — the
  // .trim() inside clean.email only runs on already-valid emails (see below).
  assert.equal(isValidEmail('  a@b.co  '), false);
});

// --- validateSubscriptionInput: body-shape guard ---

test('validateSubscriptionInput — rejects null/undefined/string body with the corpo error', () => {
  for (const bad of [null, undefined, 'hello', 42, true]) {
    const r = validateSubscriptionInput(bad);
    assert.equal(r.ok, false, `body ${String(bad)} should be rejected`);
    assert.equal(r.clean, null);
    assert.deepEqual(r.errors, ['corpo da requisição ausente ou inválido']);
  }
});

test('validateSubscriptionInput — empty {} reports every required field', () => {
  const r = validateSubscriptionInput({});
  assert.equal(r.ok, false);
  assert.equal(r.clean, null);
  // rail, value, name, email, cpfCnpj — five required-field errors.
  assert.equal(r.errors.length, 5);
});

test('validateSubscriptionInput — an array body is treated as an object (typeof quirk)', () => {
  // typeof [] === 'object', so [] passes the early corpo guard and instead
  // fails each field check. Captured so a future refactor that adds an
  // Array.isArray rejection is a conscious behavior change, not an accident.
  const r = validateSubscriptionInput([]);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('rail inválido')));
  assert.equal(r.errors.length, 5);
});

// --- validateSubscriptionInput: value coercion + floor ---

test('validateSubscriptionInput — value coerces numeric strings and enforces the R$5 floor', () => {
  const base = { rail: 'pix', name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF };
  // Numeric STRING is accepted (Number('25') === 25) and lands as a number.
  const ok = validateSubscriptionInput({ ...base, value: '25' });
  assert.equal(ok.ok, true);
  assert.equal(ok.clean.value, 25);
  assert.equal(typeof ok.clean.value, 'number');
  // Exact floor passes; just under fails.
  assert.equal(validateSubscriptionInput({ ...base, value: 5 }).ok, true);
  const low = validateSubscriptionInput({ ...base, value: 4.99 });
  assert.equal(low.ok, false);
  assert.ok(low.errors.some((e) => e.includes('value')));
  // Non-numeric value -> NaN -> not finite -> rejected.
  assert.equal(validateSubscriptionInput({ ...base, value: 'abc' }).ok, false);
});

// --- validateSubscriptionInput: name/email/cpf coercion + normalization ---

test('validateSubscriptionInput — name is coerced+trimmed; a numeric name is accepted', () => {
  const base = { rail: 'pix', value: 25, email: 'm@e.com', cpfCnpj: VALID_CPF };
  // Single-char name rejected (< 2 after trim).
  assert.equal(validateSubscriptionInput({ ...base, name: 'A' }).ok, false);
  assert.equal(validateSubscriptionInput({ ...base, name: '   ' }).ok, false);
  // SURPRISE worth locking in: a NUMERIC name is String()-coerced to '4242'
  // (length 4 >= 2) and ACCEPTED. Current behavior — see report note.
  const num = validateSubscriptionInput({ ...base, name: 4242 });
  assert.equal(num.ok, true);
  assert.equal(num.clean.name, '4242');
});

test('validateSubscriptionInput — clean normalizes email/cpf/phone and applies defaults', () => {
  const r = validateSubscriptionInput({
    rail: 'PIX',
    value: 25,
    name: '  Maria Silva  ',
    email: 'Maria@Example.COM',
    cpfCnpj: '529.982.247-25',
    mobilePhone: '(11) 99999-8888',
  });
  assert.equal(r.ok, true);
  assert.equal(r.clean.rail, 'pix'); // lowercased
  assert.equal(r.clean.name, 'Maria Silva'); // trimmed
  assert.equal(r.clean.email, 'maria@example.com'); // trimmed + lowercased
  assert.equal(r.clean.cpfCnpj, '52998224725'); // digits only
  assert.equal(r.clean.mobilePhone, '11999998888'); // digits only
  // defaults
  assert.equal(r.clean.cycle, 'MONTHLY');
  assert.equal(r.clean.description, 'Apoio recorrente — MAPA FOME');
});

test('validateSubscriptionInput — omitted mobilePhone stays undefined (msg-safe, not 0/empty)', () => {
  const r = validateSubscriptionInput({ rail: 'pix', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF });
  assert.equal(r.ok, true);
  assert.equal(r.clean.mobilePhone, undefined);
});

test('validateSubscriptionInput — description truncates to 255; invalid cycle falls back to MONTHLY', () => {
  const r = validateSubscriptionInput({
    rail: 'pix', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF,
    description: 'x'.repeat(300),
    cycle: 'DAILY', // not in the allow-list -> default
  });
  assert.equal(r.ok, true);
  assert.equal(r.clean.description.length, 255);
  assert.equal(r.clean.cycle, 'MONTHLY');
  // A valid cycle is honored.
  const wk = validateSubscriptionInput({ rail: 'pix', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF, cycle: 'WEEKLY' });
  assert.equal(wk.clean.cycle, 'WEEKLY');
});

// --- validateSubscriptionInput: untrusted-body cleaning + prototype pollution ---

test('validateSubscriptionInput — clean is a fresh whitelist; unknown keys are dropped', () => {
  const r = validateSubscriptionInput({
    rail: 'pix', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF,
    evil: 'x', isAdmin: true, role: 'admin', extraNested: { a: 1 },
  });
  assert.equal(r.ok, true);
  // Only the documented fields survive — no caller-supplied key leaks through.
  assert.deepEqual(Object.keys(r.clean).sort(), [
    'cpfCnpj', 'creditCard', 'creditCardHolderInfo', 'cycle',
    'description', 'email', 'mobilePhone', 'name', 'rail', 'value',
  ]);
  assert.equal(r.clean.evil, undefined);
  assert.equal(r.clean.isAdmin, undefined);
  assert.equal(r.clean.role, undefined);
});

test('validateSubscriptionInput — a __proto__ payload cannot pollute (whitelist rebuild)', () => {
  // Real attack vector: a JSON body with an own "__proto__" key. The validator
  // rebuilds `clean` as a fresh object literal of named fields, so the malicious
  // key is never copied and Object.prototype is never touched.
  const malicious = JSON.parse(
    '{"rail":"pix","value":25,"name":"Maria","email":"m@e.com","cpfCnpj":"52998224725","__proto__":{"polluted":"yes"}}'
  );
  const r = validateSubscriptionInput(malicious);
  assert.equal(r.ok, true);
  assert.equal(({}).polluted, undefined); // global prototype intact
  assert.equal(r.clean.polluted, undefined); // not present on clean
  assert.equal(Object.prototype.hasOwnProperty.call(r.clean, '__proto__'), false);
});

// --- validateSubscriptionInput: cartão rail card handling ---

test('validateSubscriptionInput — cartão accepts complete card and carries it on clean', () => {
  const card = { number: '4111111111111111', expiryMonth: '12', expiryYear: '2030', ccv: '123', holderName: 'Maria' };
  const r = validateSubscriptionInput({
    rail: 'cartao', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF,
    creditCard: card, creditCardHolderInfo: { name: 'Maria' },
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.clean.creditCard, card);
  assert.deepEqual(r.clean.creditCardHolderInfo, { name: 'Maria' });
});

test('validateSubscriptionInput — non-cartão rails do not carry card fields on clean', () => {
  const r = validateSubscriptionInput({
    rail: 'pix', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF,
    creditCard: { number: '4111', expiryMonth: '12', expiryYear: '2030', ccv: '123', holderName: 'M' },
  });
  assert.equal(r.ok, true);
  // A card sent on a pix/boleto/debito request is discarded — not forwarded.
  assert.equal(r.clean.creditCard, undefined);
  assert.equal(r.clean.creditCardHolderInfo, undefined);
});

test('validateSubscriptionInput — cartão with a PARTIAL card (one field missing) is rejected', () => {
  // The all-missing case is covered above; this trips the `||` chain on a single
  // absent field (ccv) so the partial-card rejection branch is exercised too.
  const r = validateSubscriptionInput({
    rail: 'cartao', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF,
    creditCard: { number: '4111', expiryMonth: '12', expiryYear: '2030', holderName: 'M' }, // no ccv
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('cartão')));
});

test('validateSubscriptionInput — cartão with a complete card but no holderInfo: clean.creditCardHolderInfo is undefined', () => {
  // creditCardHolderInfo is optional: a valid card without it passes, and the field
  // lands undefined (not {} / null) on clean — msg-safe, mirrors omitted mobilePhone.
  const r = validateSubscriptionInput({
    rail: 'cartao', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF,
    creditCard: { number: '4111', expiryMonth: '12', expiryYear: '2030', ccv: '123', holderName: 'M' },
  });
  assert.equal(r.ok, true);
  assert.equal(r.clean.creditCardHolderInfo, undefined);
});

test('validateSubscriptionInput — cartão forwards the card object RAW (no field whitelist)', () => {
  // REPORT note: on the cartão rail the validator checks card-field PRESENCE
  // only, then passes the whole `body.creditCard` object through to `clean`
  // verbatim — extra/unknown keys included. Locked in as current behavior; the
  // downstream Asaas client/server is responsible for what it forwards.
  const r = validateSubscriptionInput({
    rail: 'cartao', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: VALID_CPF,
    creditCard: { number: '4111', expiryMonth: '12', expiryYear: '2030', ccv: '123', holderName: 'M', junk: 'passthrough' },
  });
  assert.equal(r.ok, true);
  assert.equal(r.clean.creditCard.junk, 'passthrough');
});
