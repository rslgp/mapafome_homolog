import { describe, it, expect, afterEach } from 'vitest';
import {
  RAILS,
  ASSINAR_I18N_KEYS,
  backendUrl,
  backendUrls,
  createSubscription,
  fetchSubscriptionPayment,
  validateBeforeSubmit,
} from '../src/app/components/compatibility/components/payments/asaasSubscriptionClient.js';

describe('asaasSubscriptionClient — RAILS', () => {
  it('exposes the BR rails Asaas supports for subscriptions', () => {
    // No "débito automático": Asaas's subscription billingType enum has no
    // bank-debit value (DEBIT/BANK_DEBIT rejected, DEBIT_CARD not allowed).
    const ids = RAILS.map((r) => r.id);
    expect(ids).toEqual(['pix', 'cartao', 'boleto']);
  });

  // Robust to the concurrent i18n pass: a rail MUST carry an id + display label +
  // hint. We assert on STRUCTURE (id present, label/hint non-empty strings), not
  // on exact copy, so adding labelKey/hintKey (or editing the pt-BR fallback)
  // doesn't break this characterization.
  it('every rail has an id and non-empty label/hint (i18n-shape robust)', () => {
    for (const r of RAILS) {
      expect(typeof r.id).toBe('string');
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.label).toBe('string');
      expect(r.label.length).toBeGreaterThan(0);
      expect(typeof r.hint).toBe('string');
      expect(r.hint.length).toBeGreaterThan(0);
    }
  });

  // --- P20 characterization: the labelKey/hintKey i18n additions ---

  // Each rail carries the i18n keys that page.js renders via t(). The keys follow
  // the `assinar.rail.<id>.{label,hint}` convention; pinning the derivation makes a
  // future rename a conscious change (and keeps the keys discoverable by the
  // dictionary's no-dead-keys scan).
  it('every rail carries labelKey/hintKey derived from its id', () => {
    for (const r of RAILS) {
      expect(r.labelKey).toBe(`assinar.rail.${r.id}.label`);
      expect(r.hintKey).toBe(`assinar.rail.${r.id}.hint`);
    }
  });
});

describe('asaasSubscriptionClient — ASSINAR_I18N_KEYS registry', () => {
  it('is a non-empty array of unique assinar.* namespaced string keys', () => {
    expect(Array.isArray(ASSINAR_I18N_KEYS)).toBe(true);
    expect(ASSINAR_I18N_KEYS.length).toBeGreaterThan(0);
    for (const k of ASSINAR_I18N_KEYS) {
      expect(typeof k).toBe('string');
      expect(k.startsWith('assinar.')).toBe(true);
    }
    // No duplicate literals — a dupe would silently mask a dropped key.
    expect(new Set(ASSINAR_I18N_KEYS).size).toBe(ASSINAR_I18N_KEYS.length);
  });

  // The per-rail keys live on RAILS (not in this flat registry) by design — the
  // comment on ASSINAR_I18N_KEYS says "RAILS rail keys are listed above on the
  // rails". Pin that split so the two key sources stay disjoint and intentional.
  it('does NOT duplicate the per-rail keys that already live on RAILS', () => {
    for (const r of RAILS) {
      expect(ASSINAR_I18N_KEYS).not.toContain(r.labelKey);
      expect(ASSINAR_I18N_KEYS).not.toContain(r.hintKey);
    }
  });
});

describe('validateBeforeSubmit', () => {
  const valid = {
    rail: 'pix',
    value: 25,
    name: 'Maria Silva',
    email: 'maria@example.com',
    cpfCnpj: '529.982.247-25', // valid CPF
  };

  it('passes a valid Pix input', () => {
    expect(validateBeforeSubmit(valid)).toEqual([]);
  });

  it('rejects value below R$5', () => {
    expect(validateBeforeSubmit({ ...valid, value: 3 })).toContain('O valor mínimo é R$ 5.');
  });

  it('rejects a bad email', () => {
    expect(validateBeforeSubmit({ ...valid, email: 'nope' })).toContain('Informe um e-mail válido.');
  });

  it('rejects a malformed CPF/CNPJ length', () => {
    expect(validateBeforeSubmit({ ...valid, cpfCnpj: '123' })).toContain('Informe um CPF ou CNPJ válido.');
  });

  it('passes the cartão rail with NO card data (hosted checkout collects it)', () => {
    // The cartão rail no longer collects inline card data: the CREDIT_CARD
    // subscription is created card-less and the donor enters the PAN/CVV on the
    // Asaas hosted checkout. So an otherwise-valid cartão input with no card MUST
    // pass — there is no longer a "Preencha todos os dados do cartão" error.
    expect(validateBeforeSubmit({ ...valid, rail: 'cartao' })).toEqual([]);
  });

  it('does not error on the cartão rail even if a stray card object is passed', () => {
    // Robustness: a leftover/garbage creditCard must not change the result — the
    // validator ignores card data entirely now.
    const errs = validateBeforeSubmit({ ...valid, rail: 'cartao', creditCard: { number: '4111' } });
    expect(errs).toEqual([]);
  });

  // --- P20 characterization: remaining rails + edges ---

  it('passes each rail with otherwise-valid input (pix, cartao, boleto)', () => {
    for (const rail of ['pix', 'cartao', 'boleto']) {
      expect(validateBeforeSubmit({ ...valid, rail })).toEqual([]);
    }
  });

  it('rejects an unknown rail with the choose-a-method message', () => {
    expect(validateBeforeSubmit({ ...valid, rail: 'crypto' })).toContain('Escolha uma forma de pagamento.');
    expect(validateBeforeSubmit({ ...valid, rail: undefined })).toContain('Escolha uma forma de pagamento.');
  });

  it('accepts a CNPJ-length document (14 digits), not just CPF', () => {
    // length-only check on the client: 14 digits is accepted regardless of the
    // check digit (the server is authoritative on the real check-digit math).
    expect(validateBeforeSubmit({ ...valid, cpfCnpj: '11.222.333/0001-81' })).toEqual([]);
  });

  it('rejects a missing name', () => {
    expect(validateBeforeSubmit({ ...valid, name: ' ' })).toContain('Informe seu nome.');
    expect(validateBeforeSubmit({ ...valid, name: undefined })).toContain('Informe seu nome.');
  });

  it('accepts the exact R$5 floor', () => {
    expect(validateBeforeSubmit({ ...valid, value: 5 })).toEqual([]);
    expect(validateBeforeSubmit({ ...valid, value: '5' })).toEqual([]); // numeric string coerced
  });

  it('returns multiple errors at once for a fully-bad input', () => {
    const errs = validateBeforeSubmit({ rail: 'crypto', value: 1, name: '', email: 'no', cpfCnpj: '1' });
    expect(errs.length).toBeGreaterThanOrEqual(4);
  });

  it('handles undefined optional fields without throwing', () => {
    // cpfCnpj/email/creditCard omitted entirely — the guards null-coalesce.
    expect(() => validateBeforeSubmit({ rail: 'pix', value: 25, name: 'Maria' })).not.toThrow();
  });
});

describe('createSubscription (injected fetch — no network)', () => {
  it('posts to the backend and returns the success shape', async () => {
    let captured = null;
    const fetchImpl = async (url, opts) => {
      captured = { url, body: JSON.parse(opts.body) };
      return {
        ok: true,
        json: async () => ({ ok: true, subscriptionId: 'sub_1', rail: 'pix', status: 'ACTIVE', value: 25, cycle: 'MONTHLY', invoiceUrl: 'https://asaas/x' }),
      };
    };
    const res = await createSubscription(
      { rail: 'pix', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: '52998224725' },
      { fetchImpl, baseUrl: 'https://backend.test' }
    );
    expect(captured.url).toBe('https://backend.test/api/asaas/create-subscription');
    expect(captured.body.rail).toBe('pix');
    expect(res.ok).toBe(true);
    expect(res.subscriptionId).toBe('sub_1');
    expect(res.invoiceUrl).toBe('https://asaas/x');
  });

  it('maps a cartão subscription response carrying the hosted invoiceUrl', async () => {
    // The cartão rail sends NO card data; Asaas returns a hosted-checkout
    // invoiceUrl that PaymentArtifacts/CardPayment render as the "Pagar no Asaas"
    // link. Assert the client carries that invoiceUrl through, and that no card
    // data was ever sent in the request body.
    let captured = null;
    const fetchImpl = async (url, opts) => {
      captured = { url, body: JSON.parse(opts.body) };
      return {
        ok: true,
        json: async () => ({ ok: true, subscriptionId: 'sub_c', rail: 'cartao', status: 'ACTIVE', value: 25, cycle: 'MONTHLY', invoiceUrl: 'https://asaas/checkout/c' }),
      };
    };
    const res = await createSubscription(
      { rail: 'cartao', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: '52998224725' },
      { fetchImpl, baseUrl: 'https://backend.test' }
    );
    expect(captured.body.rail).toBe('cartao');
    expect(captured.body.creditCard).toBeUndefined();
    expect(captured.body.creditCardHolderInfo).toBeUndefined();
    expect(res.ok).toBe(true);
    expect(res.rail).toBe('cartao');
    expect(res.invoiceUrl).toBe('https://asaas/checkout/c');
  });

  it('surfaces backend validation messages on failure', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'validation_failed', messages: ['CPF/CNPJ inválido'] }),
    });
    const res = await createSubscription(
      { rail: 'pix', value: 25, name: 'X', email: 'x@e.com', cpfCnpj: '1' },
      { fetchImpl, baseUrl: 'https://backend.test' }
    );
    expect(res.ok).toBe(false);
    expect(res.messages).toContain('CPF/CNPJ inválido');
  });

  it('returns a friendly message when the backend is unreachable', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    const res = await createSubscription(
      { rail: 'pix', value: 25, name: 'X', email: 'x@e.com', cpfCnpj: '52998224725' },
      { fetchImpl, baseUrl: 'https://backend.test' }
    );
    expect(res.ok).toBe(false);
    expect(res.messages[0]).toMatch(/servidor de pagamentos/i);
  });

  // --- P20 characterization: response-mapping branches ---

  const input = { rail: 'pix', value: 25, name: 'Maria', email: 'm@e.com', cpfCnpj: '52998224725' };

  it('maps the full success shape including idempotent + value/cycle/rail', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, subscriptionId: 's9', rail: 'pix', status: 'ACTIVE', value: 25, cycle: 'MONTHLY', invoiceUrl: 'https://pay/x', idempotent: true }),
    });
    const res = await createSubscription(input, { fetchImpl, baseUrl: 'https://b.test' });
    expect(res).toEqual({
      ok: true, subscriptionId: 's9', rail: 'pix', status: 'ACTIVE',
      value: 25, cycle: 'MONTHLY', invoiceUrl: 'https://pay/x', idempotent: true,
    });
  });

  it('defaults invoiceUrl to null and idempotent to false when absent', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, subscriptionId: 's10' }) });
    const res = await createSubscription(input, { fetchImpl, baseUrl: 'https://b.test' });
    expect(res.ok).toBe(true);
    expect(res.invoiceUrl).toBe(null);
    expect(res.idempotent).toBe(false);
  });

  it('treats HTTP 200 with {ok:false} as a failure (envelope flag overrides status)', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ ok: false, message: 'upstream rejected' }) });
    const res = await createSubscription(input, { fetchImpl, baseUrl: 'https://b.test' });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(200);
    expect(res.messages).toEqual(['upstream rejected']);
  });

  it('falls back to data.message when no messages array is present', async () => {
    const fetchImpl = async () => ({ ok: false, status: 422, json: async () => ({ message: 'single message' }) });
    const res = await createSubscription(input, { fetchImpl, baseUrl: 'https://b.test' });
    expect(res.ok).toBe(false);
    expect(res.messages).toEqual(['single message']);
  });

  it('uses the default pt-BR message when the error body has no message/messages', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const res = await createSubscription(input, { fetchImpl, baseUrl: 'https://b.test' });
    expect(res.ok).toBe(false);
    expect(res.messages[0]).toMatch(/Não foi possível criar a assinatura/i);
  });

  it('handles a non-JSON body on an ok response (json() throws -> default message)', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => { throw new Error('not json'); } });
    const res = await createSubscription(input, { fetchImpl, baseUrl: 'https://b.test' });
    // data === null, so data?.ok is falsy -> failure branch with the default copy.
    expect(res.ok).toBe(false);
    expect(res.status).toBe(200);
    expect(res.messages[0]).toMatch(/Não foi possível criar a assinatura/i);
  });

  it('handles a non-JSON body on an error response', async () => {
    const fetchImpl = async () => ({ ok: false, status: 502, json: async () => { throw new Error('html error page'); } });
    const res = await createSubscription(input, { fetchImpl, baseUrl: 'https://b.test' });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(502);
    expect(res.messages[0]).toMatch(/Não foi possível criar a assinatura/i);
  });

  it('throws a clear error when no fetch impl is available and none is global', async () => {
    const savedFetch = globalThis.fetch;
    // Force the "no fetch" path: no opts.fetchImpl and no global fetch.
    delete globalThis.fetch;
    try {
      await expect(createSubscription(input, { baseUrl: 'https://b.test' })).rejects.toThrow(/fetch indisponível/i);
    } finally {
      if (savedFetch !== undefined) globalThis.fetch = savedFetch;
    }
  });
});

describe('backendUrl / backendUrls (internal-first resolution)', () => {
  const saved = process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL;
  const savedInternal = process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL;
    else process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = saved;
    if (savedInternal === undefined) delete process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL;
    else process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL = savedInternal;
  });

  it('returns the configured public URL with any trailing slash stripped', () => {
    process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = 'https://api.test/';
    expect(backendUrl()).toBe('https://api.test');
    process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = 'https://api.test';
    expect(backendUrl()).toBe('https://api.test');
  });

  it('throws a pt-BR config error when the public env var is unset', () => {
    delete process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL;
    expect(() => backendUrl()).toThrow(/NEXT_PUBLIC_ASAAS_BACKEND_URL/);
  });

  it('backendUrls() lists the internal candidate (localhost:3005) first, then the public URL', () => {
    delete process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL; // use the http://localhost:3005 default
    process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = 'https://env.test';
    expect(backendUrls()).toEqual(['http://localhost:3005', 'https://env.test']);
  });

  it('createSubscription tries the INTERNAL backend (localhost:3005) first when no baseUrl', async () => {
    // Internal-first: with no opts.baseUrl and no NEXT_PUBLIC_ASAAS_INTERNAL_URL
    // override, the first attempt targets the default internal http://localhost:3005.
    delete process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL;
    process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = 'https://env.test/';
    let capturedUrl = null;
    const fetchImpl = async (u) => { capturedUrl = u; return { ok: true, json: async () => ({ ok: true, subscriptionId: 's' }) }; };
    await createSubscription({ rail: 'pix', value: 25, name: 'M', email: 'm@e.com', cpfCnpj: '52998224725' }, { fetchImpl });
    expect(capturedUrl).toBe('http://localhost:3005/api/asaas/create-subscription');
  });

  it('falls back to the public URL when the internal hop is unreachable (network throw only)', async () => {
    // Internal localhost throws (not running) -> fall through to the public URL and
    // succeed there. Only a fetch THROW triggers fallback, never an HTTP error.
    delete process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL;
    process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = 'https://env.test';
    const seen = [];
    const fetchImpl = async (u) => {
      seen.push(u);
      if (u.startsWith('http://localhost:3005')) throw new TypeError('Failed to fetch');
      return { ok: true, json: async () => ({ ok: true, subscriptionId: 's2' }) };
    };
    const res = await createSubscription({ rail: 'pix', value: 25, name: 'M', email: 'm@e.com', cpfCnpj: '52998224725' }, { fetchImpl });
    expect(seen[0]).toBe('http://localhost:3005/api/asaas/create-subscription');
    expect(seen[1]).toBe('https://env.test/api/asaas/create-subscription');
    expect(res.ok).toBe(true);
    expect(res.subscriptionId).toBe('s2');
  });

  it('NEXT_PUBLIC_ASAAS_INTERNAL_URL="" disables the internal hop (resolves straight to the public URL)', async () => {
    process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL = '';
    process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = 'https://env.test/';
    let capturedUrl = null;
    const fetchImpl = async (u) => { capturedUrl = u; return { ok: true, json: async () => ({ ok: true, subscriptionId: 's' }) }; };
    await createSubscription({ rail: 'pix', value: 25, name: 'M', email: 'm@e.com', cpfCnpj: '52998224725' }, { fetchImpl });
    expect(capturedUrl).toBe('https://env.test/api/asaas/create-subscription');
  });

  it('an explicit opts.baseUrl pins the target and skips the internal-first fallback', async () => {
    delete process.env.NEXT_PUBLIC_ASAAS_INTERNAL_URL;
    process.env.NEXT_PUBLIC_ASAAS_BACKEND_URL = 'https://env.test';
    let capturedUrl = null;
    const fetchImpl = async (u) => { capturedUrl = u; return { ok: true, json: async () => ({ ok: true, subscriptionId: 's' }) }; };
    await createSubscription({ rail: 'pix', value: 25, name: 'M', email: 'm@e.com', cpfCnpj: '52998224725' }, { fetchImpl, baseUrl: 'https://pinned.test' });
    expect(capturedUrl).toBe('https://pinned.test/api/asaas/create-subscription');
  });
});

describe('fetchSubscriptionPayment', () => {
  const baseUrl = 'https://b.test';

  it('GETs the subscription-payment endpoint with the id in the query', async () => {
    let capturedUrl = null;
    let capturedMethod = null;
    const fetchImpl = async (u, init) => {
      capturedUrl = u;
      capturedMethod = init?.method;
      return { ok: true, json: async () => ({ ok: true, rail: 'pix', status: 'ACTIVE', pix: { payload: 'p', qrImage: 'data:image/png;base64,x' } }) };
    };
    const res = await fetchSubscriptionPayment('sub_abc123', { fetchImpl, baseUrl });
    expect(capturedMethod).toBe('GET');
    expect(capturedUrl).toBe('https://b.test/api/asaas/subscription-payment?subscriptionId=sub_abc123');
    expect(res.ok).toBe(true);
    expect(res.rail).toBe('pix');
    expect(res.pix.payload).toBe('p');
  });

  it('url-encodes the subscription id', async () => {
    let capturedUrl = null;
    const fetchImpl = async (u) => { capturedUrl = u; return { ok: true, json: async () => ({ ok: true }) }; };
    await fetchSubscriptionPayment('sub_a b', { fetchImpl, baseUrl });
    expect(capturedUrl).toContain('subscriptionId=sub_a%20b');
  });

  it('surfaces a pending subscription (no invoice issued yet)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ ok: true, rail: 'pix', status: 'ACTIVE', pending: true }) });
    const res = await fetchSubscriptionPayment('sub_x', { fetchImpl, baseUrl });
    expect(res.ok).toBe(true);
    expect(res.pending).toBe(true);
  });

  it('maps boleto artifacts through (line + bankSlipUrl)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ ok: true, rail: 'boleto', status: 'ACTIVE', boleto: { line: '4619...', bankSlipUrl: 'https://x/pdf', barCode: '4619' }, invoiceUrl: 'https://x/i' }) });
    const res = await fetchSubscriptionPayment('sub_b', { fetchImpl, baseUrl });
    expect(res.boleto.line).toBe('4619...');
    expect(res.boleto.bankSlipUrl).toBe('https://x/pdf');
    expect(res.invoiceUrl).toBe('https://x/i');
  });

  it('returns ok:false with server messages on a non-2xx', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({ error: 'asaas_error', messages: ['assinatura não encontrada'] }) });
    const res = await fetchSubscriptionPayment('sub_missing', { fetchImpl, baseUrl });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.messages[0]).toMatch(/não encontrada/i);
  });

  it('returns a friendly message when the backend is unreachable', async () => {
    const fetchImpl = async () => { throw new TypeError('network'); };
    const res = await fetchSubscriptionPayment('sub_x', { fetchImpl, baseUrl });
    expect(res.ok).toBe(false);
    expect(res.messages[0]).toMatch(/buscar os dados de pagamento/i);
  });
});
