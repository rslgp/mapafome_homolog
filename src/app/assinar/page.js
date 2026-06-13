'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  RAILS,
  createSubscription,
  validateBeforeSubmit,
} from '../components/compatibility/components/payments/asaasSubscriptionClient';
import { t, useLocale } from '../components/compatibility/components/ux/strings';
import { useRovingRadioGroup } from './useRovingRadioGroup';
import { PaymentArtifacts } from './PaymentArtifacts';
import './assinar.css';

// The post-subscription inline payment screen (Pix QR / boleto / card redirect)
// and its clipboard util were extracted to ./PaymentArtifacts and ./copyText —
// a clean seam with zero coupling to this form's state. This file owns the
// subscription FORM (rail + value + donor fields) and renders PaymentArtifacts
// once a subscription is created.

// Interpolate a single {value} placeholder into a translated string. Keeps the
// number formatting in JS so only the surrounding words are translated.
function withValue(key, value) {
  return t(key).replace('{value}', value);
}

// Assinatura de apoio recorrente (Asaas). Brazilians recognize these rails:
// Pix Automático, cartão (assinatura), boleto. (Asaas subscriptions have no
// bank-debit billingType, so there is no "débito automático" rail.) The secret
// Asaas key lives in a separate serverless backend — this page only talks to
// that backend over NEXT_PUBLIC_ASAAS_BACKEND_URL, never to Asaas directly.

const PRESET_VALUES = [10, 25, 50, 100];

export default function AssinarPage() {
  useLocale(); // re-render on locale switch so t() re-reads the active locale
  const [rail, setRail] = useState('pix');
  const [value, setValue] = useState(25);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');

  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);

  // Roving-tabindex + arrow-key navigation for the two single-select pickers.
  // Both are real radiogroups (mutually-exclusive choices), so they get the full
  // APG keyboard contract, not just the role. The preset picker's "selected" id
  // is the value as a string; when a custom amount is typed no preset matches
  // (presetSelected === null) and the group is left with no checked radio, which
  // a radiogroup tolerates and the arrow keys re-enter at an end.
  const railIds = RAILS.map((r) => r.id);
  const onRailKeyDown = useRovingRadioGroup(railIds, rail, setRail);

  const presetIds = PRESET_VALUES.map(String);
  const presetSelected = presetIds.includes(String(value)) ? String(value) : null;
  const onPresetKeyDown = useRovingRadioGroup(presetIds, presetSelected, (id) =>
    setValue(Number(id)),
  );

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
    // The cartão rail no longer collects card data here: we create the CREDIT_CARD
    // subscription WITHOUT a creditCard, Asaas issues a hosted invoice, and the
    // donor enters the PAN/CVV on Asaas's checkout (via the invoiceUrl link). No
    // card data ever reaches our code = no PCI scope.
    return input;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const input = buildInput();
    const localErrors = validateBeforeSubmit(input);
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
      setErrors(res.messages || [t('assinar.error.fallback')]);
      setStatus('error');
    }
  }

  if (status === 'success' && result) {
    // Split the translated sentence on {value} so the amount renders inside a
    // <strong> while the surrounding words stay translatable as one string.
    const [subPrefix, subSuffix] = t('assinar.success.sub').split('{value}');
    return (
      <main className="mdf-assinar-ok">
        <Link href="/" className="mdf-assinar__back">{t('assinar.back')}</Link>
        <h1>{t('assinar.success.title')}</h1>
        <p className="mdf-assinar__sub">
          {subPrefix}<strong>R$ {Number(result.value).toFixed(2)}</strong>{subSuffix}
        </p>
        {/* Render the rail-specific payment screen inline. It fetches the Pix QR
            / boleto / card-redirect artifacts for the subscription's first
            charge. The card rail only ever links out to Asaas (no PAN here). */}
        {result.subscriptionId ? (
          <PaymentArtifacts subscriptionId={result.subscriptionId} rail={result.rail || rail} />
        ) : (
          <p className="mdf-assinar__sub">{t('assinar.success.active')}</p>
        )}
      </main>
    );
  }

  return (
    <main className="mdf-assinar">
      <Link href="/" className="mdf-assinar__back">{t('assinar.back')}</Link>
      <h1>{t('assinar.title')}</h1>
      <p className="mdf-assinar__sub">
        {t('assinar.sub')}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="mdf-field">
          <legend>{t('assinar.legend.rail')}</legend>
          <div
            className="mdf-rails"
            role="radiogroup"
            aria-label={t('assinar.legend.rail')}
            onKeyDown={onRailKeyDown}
          >
            {RAILS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={rail === r.id}
                tabIndex={rail === r.id ? 0 : -1}
                data-radio-id={r.id}
                className={`mdf-rail ${rail === r.id ? 'is-on' : ''}`}
                onClick={() => setRail(r.id)}
              >
                <span className="mdf-rail__label">{t(r.labelKey)}</span>
                <span className="mdf-rail__hint">{t(r.hintKey)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mdf-field">
          <legend>{t('assinar.legend.value')}</legend>
          <div
            className="mdf-chips"
            role="radiogroup"
            aria-label={t('assinar.value.presets')}
            onKeyDown={onPresetKeyDown}
          >
            {PRESET_VALUES.map((v, i) => {
              const checked = Number(value) === v;
              // Roving tabindex: the checked preset is tabbable. When a custom
              // amount is typed (no preset checked) keep the group reachable by
              // making the first chip the tab stop.
              const tabbable = checked || (presetSelected === null && i === 0);
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={tabbable ? 0 : -1}
                  data-radio-id={String(v)}
                  className={`mdf-chip ${checked ? 'is-on' : ''}`}
                  onClick={() => setValue(v)}
                >
                  R$ {v}
                </button>
              );
            })}
          </div>
          <label className="mdf-amount">
            <span>{t('assinar.value.other')}</span>
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
          <span>{t('assinar.field.name')}</span>
          <input type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>

        <label className="mdf-field">
          <span>{t('assinar.field.email')}</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label className="mdf-field">
          <span>{t('assinar.field.cpfcnpj')}</span>
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
          <span>{t('assinar.field.phone')}</span>
          <input type="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </label>

        {status === 'error' && errors.length > 0 && (
          <div className="mdf-errors" role="alert">
            {errors.map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}

        <button type="submit" className="mdf-assinar__cta" disabled={status === 'submitting'}>
          {status === 'submitting'
            ? t('assinar.cta.submitting')
            : withValue('assinar.cta.support', Number(value).toFixed(2))}
        </button>

        <p className="mdf-assinar__note">
          {t('assinar.note')}
        </p>
      </form>
    </main>
  );
}
