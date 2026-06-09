'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RAILS,
  createSubscription,
  fetchSubscriptionPayment,
  validateBeforeSubmit,
} from '../components/compatibility/components/payments/asaasSubscriptionClient';
import { t, useLocale } from '../components/compatibility/components/ux/strings';
import { useRovingRadioGroup } from './useRovingRadioGroup';
import './assinar.css';

// Interpolate a single {value} placeholder into a translated string. Keeps the
// number formatting in JS so only the surrounding words are translated.
function withValue(key, value) {
  return t(key).replace('{value}', value);
}

// Copy text to the clipboard with a graceful fallback for older/insecure
// contexts (no navigator.clipboard). Returns a Promise<boolean> success flag.
async function copyText(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// A button that copies `text` and briefly swaps its label to a "copied!" state.
function CopyButton({ text, label, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="mdf-assinar__cta mdf-pay__copy"
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

// Fetch state for a subscription's payment artifacts. Returns { state, pay,
// retry }. The fetch lives INSIDE the effect (not a setState-calling callback
// invoked from it) so the state setters run in the async continuation, guarded
// by `cancelled` — which is what keeps react-hooks/set-state-in-effect happy.
function usePaymentArtifacts(subscriptionId) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [pay, setPay] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // User-initiated reload (event handler, not an effect): back to 'loading' +
  // bump the key so the effect re-runs the fetch.
  const retry = useCallback(() => {
    setState('loading');
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSubscriptionPayment(subscriptionId).then(
      (res) => {
        if (cancelled) return;
        if (res.ok) { setPay(res); setState('ready'); } else { setState('error'); }
      },
      () => { if (!cancelled) setState('error'); },
    );
    return () => { cancelled = true; };
  }, [subscriptionId, reloadKey]);

  return { state, pay, retry };
}

// A short status line + a retry button (error / pending screens).
function PayNotice({ message, alert, onRetry }) {
  return (
    <div className="mdf-pay">
      <p className="mdf-assinar__sub" role={alert ? 'alert' : 'status'}>{message}</p>
      <button type="button" className="mdf-assinar__cta" onClick={onRetry}>
        {t('assinar.pay.retry')}
      </button>
    </div>
  );
}

// Pix: QR image + the copy-and-paste "copia e cola" payload.
function PixPayment({ pix }) {
  return (
    <div className="mdf-pay">
      <h2 className="mdf-pay__title">{t('assinar.pay.pix.title')}</h2>
      <p className="mdf-assinar__sub">{t('assinar.pay.pix.help')}</p>
      {pix.qrImage && (
        // base64 data URL from Asaas; next/image can't optimize a data: URL and
        // the site is output:export, so a plain <img> is correct here.
        <img className="mdf-pay__qr" src={pix.qrImage} alt={t('assinar.pay.pix.qrAlt')} width="220" height="220" />
      )}
      {pix.payload && (
        <>
          <code className="mdf-pay__code">{pix.payload}</code>
          <CopyButton text={pix.payload} label={t('assinar.pay.pix.copy')} copiedLabel={t('assinar.pay.pix.copied')} />
        </>
      )}
    </div>
  );
}

// Boleto: linha digitável (copyable) + a link to the PDF bank slip.
function BoletoPayment({ boleto }) {
  return (
    <div className="mdf-pay">
      <h2 className="mdf-pay__title">{t('assinar.pay.boleto.title')}</h2>
      <p className="mdf-assinar__sub">{t('assinar.pay.boleto.help')}</p>
      {boleto.line && (
        <>
          <span className="mdf-pay__label">{t('assinar.pay.boleto.line')}</span>
          <code className="mdf-pay__code">{boleto.line}</code>
          <CopyButton text={boleto.line} label={t('assinar.pay.boleto.copy')} copiedLabel={t('assinar.pay.boleto.copied')} />
        </>
      )}
      {boleto.bankSlipUrl && (
        <p>
          <a className="mdf-assinar__cta" href={boleto.bankSlipUrl} target="_blank" rel="noopener noreferrer">
            {t('assinar.pay.boleto.open')}
          </a>
        </p>
      )}
    </div>
  );
}

// Card (or any rail with only a hosted invoice): redirect to the Asaas hosted
// checkout. The card data is collected THERE — it never reaches our code.
function CardPayment({ invoiceUrl }) {
  return (
    <div className="mdf-pay">
      <h2 className="mdf-pay__title">{t('assinar.pay.card.title')}</h2>
      <p className="mdf-assinar__sub">{t('assinar.pay.card.help')}</p>
      <p>
        <a className="mdf-assinar__cta" href={invoiceUrl} target="_blank" rel="noopener noreferrer">
          {t('assinar.pay.card.cta')}
        </a>
      </p>
    </div>
  );
}

// After a subscription is created, fetch and render the rail-specific payment
// artifacts: Pix QR + copy-and-paste, boleto linha digitável + PDF, or (card) a
// redirect to the Asaas hosted checkout.
function PaymentArtifacts({ subscriptionId, rail }) {
  const { state, pay, retry } = usePaymentArtifacts(subscriptionId);

  if (state === 'loading') {
    return <p className="mdf-assinar__sub" role="status">{t('assinar.pay.loading')}</p>;
  }
  if (state === 'error') {
    return <PayNotice message={t('assinar.pay.error')} alert onRetry={retry} />;
  }
  // Subscription created but Asaas hasn't issued the first invoice yet.
  if (pay?.pending) {
    return <PayNotice message={t('assinar.pay.pending')} onRetry={retry} />;
  }

  // The resolved rail comes from the server (authoritative); fall back to the
  // rail the form submitted.
  const r = pay?.rail || rail;
  if (r === 'pix' && pay?.pix) return <PixPayment pix={pay.pix} />;
  if (r === 'boleto' && pay?.boleto) return <BoletoPayment boleto={pay.boleto} />;
  if (pay?.invoiceUrl) return <CardPayment invoiceUrl={pay.invoiceUrl} />;

  // Nothing payable surfaced (e.g. an already-active subscription with no open
  // charge). Reassure the donor the recurring charge is set up.
  return <p className="mdf-assinar__sub">{t('assinar.success.active')}</p>;
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

  // Card-only fields (rendered only for the cartão rail).
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState(''); // MM/AA
  const [cardCcv, setCardCcv] = useState('');

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

        {rail === 'cartao' && (
          <fieldset className="mdf-field mdf-card">
            <legend>{t('assinar.card.legend')}</legend>
            <label className="mdf-field">
              <span>{t('assinar.card.number')}</span>
              <input type="text" inputMode="numeric" autoComplete="cc-number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
            </label>
            <label className="mdf-field">
              <span>{t('assinar.card.name')}</span>
              <input type="text" autoComplete="cc-name" value={cardName} onChange={(e) => setCardName(e.target.value)} />
            </label>
            <div className="mdf-card__row">
              <label className="mdf-field">
                <span>{t('assinar.card.expiry')}</span>
                <input type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
              </label>
              <label className="mdf-field">
                <span>{t('assinar.card.cvv')}</span>
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
