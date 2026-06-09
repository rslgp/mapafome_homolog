'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RAILS,
  createSubscription,
  validateBeforeSubmit,
} from '../components/compatibility/components/payments/asaasSubscriptionClient';
import './assinar.css';

// Assinatura de apoio recorrente (Asaas). Brazilians recognize these four rails:
// Pix Automático, cartão (assinatura), boleto, débito automático. The secret
// Asaas key lives in a separate serverless backend — this page only talks to
// that backend over NEXT_PUBLIC_ASAAS_BACKEND_URL, never to Asaas directly.

const PRESET_VALUES = [10, 25, 50, 100];

export default function AssinarPage() {
  const [rail, setRail] = useState('pix');
  const [value, setValue] = useState(25);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');

  // Card-only fields (rendered only for the cartão rail).
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState(''); // MM/AA
  const [cardCcv, setCardCcv] = useState('');

  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);

  function buildInput() {
    const input = {
      rail,
      value: Number(value),
      name: nome.trim(),
      email: email.trim(),
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      mobilePhone: telefone.replace(/\D/g, '') || undefined,
      cycle: 'MONTHLY',
    };
    if (rail === 'cartao') {
      const [mm, aa] = cardExpiry.split('/').map((s) => (s || '').trim());
      input.creditCard = {
        holderName: cardName.trim(),
        number: cardNumber.replace(/\s/g, ''),
        expiryMonth: mm,
        expiryYear: aa && aa.length === 2 ? `20${aa}` : aa,
        ccv: cardCcv.trim(),
      };
      input.creditCardHolderInfo = {
        name: nome.trim(),
        email: email.trim(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        mobilePhone: telefone.replace(/\D/g, '') || undefined,
      };
    }
    return input;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const input = buildInput();
    const localErrors = validateBeforeSubmit({ ...input, creditCard: input.creditCard });
    if (localErrors.length) {
      setErrors(localErrors);
      setStatus('error');
      return;
    }
    setErrors([]);
    setStatus('submitting');
    const res = await createSubscription(input);
    if (res.ok) {
      setResult(res);
      setStatus('success');
    } else {
      setErrors(res.messages || ['Não foi possível concluir. Tente novamente.']);
      setStatus('error');
    }
  }

  if (status === 'success' && result) {
    return (
      <main className="mdf-assinar-ok">
        <Link href="/" className="mdf-assinar__back">← Voltar ao mapa</Link>
        <h1>Obrigado pelo apoio 💛</h1>
        <p className="mdf-assinar__sub">
          Sua assinatura de <strong>R$ {Number(result.value).toFixed(2)}</strong> por mês foi criada.
        </p>
        {result.invoiceUrl ? (
          <p>
            <a className="mdf-assinar__cta" href={result.invoiceUrl} target="_blank" rel="noopener noreferrer">
              {rail === 'pix' ? 'Pagar com Pix agora' : rail === 'boleto' ? 'Abrir o boleto' : 'Concluir pagamento'}
            </a>
          </p>
        ) : (
          <p className="mdf-assinar__sub">A cobrança recorrente já está ativa.</p>
        )}
      </main>
    );
  }

  return (
    <main className="mdf-assinar">
      <Link href="/" className="mdf-assinar__back">← Voltar ao mapa</Link>
      <h1>Apoie o MAPA FOME</h1>
      <p className="mdf-assinar__sub">
        Uma contribuição mensal ajuda a manter o mapa no ar. Escolha a forma que preferir.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="mdf-field">
          <legend>Forma de pagamento</legend>
          <div className="mdf-rails" role="radiogroup" aria-label="Forma de pagamento">
            {RAILS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={rail === r.id}
                className={`mdf-rail ${rail === r.id ? 'is-on' : ''}`}
                onClick={() => setRail(r.id)}
              >
                <span className="mdf-rail__label">{r.label}</span>
                <span className="mdf-rail__hint">{r.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mdf-field">
          <legend>Valor mensal</legend>
          <div className="mdf-chips">
            {PRESET_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={Number(value) === v}
                className={`mdf-chip ${Number(value) === v ? 'is-on' : ''}`}
                onClick={() => setValue(v)}
              >
                R$ {v}
              </button>
            ))}
          </div>
          <label className="mdf-amount">
            <span>Outro valor (R$)</span>
            <input
              type="number"
              min="5"
              step="1"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        </fieldset>

        <label className="mdf-field">
          <span>Nome completo</span>
          <input type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>

        <label className="mdf-field">
          <span>E-mail</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label className="mdf-field">
          <span>CPF ou CNPJ</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            required
          />
        </label>

        <label className="mdf-field">
          <span>Celular (opcional)</span>
          <input type="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </label>

        {rail === 'cartao' && (
          <fieldset className="mdf-field mdf-card">
            <legend>Dados do cartão</legend>
            <label className="mdf-field">
              <span>Número do cartão</span>
              <input type="text" inputMode="numeric" autoComplete="cc-number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
            </label>
            <label className="mdf-field">
              <span>Nome impresso no cartão</span>
              <input type="text" autoComplete="cc-name" value={cardName} onChange={(e) => setCardName(e.target.value)} />
            </label>
            <div className="mdf-card__row">
              <label className="mdf-field">
                <span>Validade (MM/AA)</span>
                <input type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
              </label>
              <label className="mdf-field">
                <span>CVV</span>
                <input type="text" inputMode="numeric" autoComplete="cc-csc" value={cardCcv} onChange={(e) => setCardCcv(e.target.value)} />
              </label>
            </div>
          </fieldset>
        )}

        {status === 'error' && errors.length > 0 && (
          <div className="mdf-errors" role="alert">
            {errors.map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}

        <button type="submit" className="mdf-assinar__cta" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Processando…' : `Apoiar com R$ ${Number(value).toFixed(2)}/mês`}
        </button>

        <p className="mdf-assinar__note">
          Pagamento processado pela Asaas. Você pode cancelar quando quiser.
        </p>
      </form>
    </main>
  );
}
