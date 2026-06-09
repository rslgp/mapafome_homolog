import { describe, it, expect } from 'vitest';
import {
  RAILS,
  createSubscription,
  validateBeforeSubmit,
} from '../src/app/components/compatibility/components/payments/asaasSubscriptionClient.js';

describe('asaasSubscriptionClient — RAILS', () => {
  it('exposes the four BR rails familiar to brasileiros', () => {
    const ids = RAILS.map((r) => r.id);
    expect(ids).toEqual(['pix', 'cartao', 'boleto', 'debito']);
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

  it('requires full card data on the cartão rail', () => {
    const errs = validateBeforeSubmit({ ...valid, rail: 'cartao', creditCard: { number: '4111' } });
    expect(errs).toContain('Preencha todos os dados do cartão.');
  });

  it('accepts complete card data on the cartão rail', () => {
    const errs = validateBeforeSubmit({
      ...valid,
      rail: 'cartao',
      creditCard: { number: '4111111111111111', expiryMonth: '12', expiryYear: '2030', ccv: '123', holderName: 'Maria Silva' },
    });
    expect(errs).toEqual([]);
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
});
