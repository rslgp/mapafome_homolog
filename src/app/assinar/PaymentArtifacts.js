'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchSubscriptionPayment } from '../components/compatibility/components/payments/asaasSubscriptionClient';
import { t } from '../components/compatibility/components/ux/strings';
import { copyText } from './copyText';

// PaymentArtifacts.js — the post-subscription inline payment screen, extracted
// from page.js (SRP). After a subscription is created it fetches the rail-specific
// artifacts and renders: Pix QR + copia-e-cola, boleto linha digitável + PDF, or
// the Asaas hosted-checkout redirect (card) — incl. loading/error/pending/retry.
// This cluster has zero coupling to the subscription FORM's state (a clean seam),
// so the form branch and the payment-render branch stop colliding. Carries its own
// 'use client' (hooks + DOM); page.js imports { PaymentArtifacts }.

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
export function PaymentArtifacts({ subscriptionId, rail }) {
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
