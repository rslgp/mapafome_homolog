'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import './parceiros.css';
import { t, useLocale } from '../components/compatibility/components/ux/strings';

// Inbound surface for companies that want to sponsor MAPA FOME. No backend —
// submission composes a mailto: so the company's intent lands directly in the
// project's inbox. Keeps the /parceiros surface stateless and deployable as
// pure static output.

const RECIPIENT = 'dev.rafaelleao+mapafome_imprensa@gmail.com';

// Tier display copy is resolved at render time via t() so it follows the active
// locale; the ids stay the source of truth for selection logic + mailto payload.
const TIER_IDS = ['bairro', 'cidade', 'estadual', 'nacional', 'contrapartida'];

export default function ParceirosPage() {
  useLocale(); // re-render on locale change so t() re-reads
  const [empresa, setEmpresa] = useState('');
  const [contato, setContato] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [tier, setTier] = useState('cidade');
  const [mensagem, setMensagem] = useState('');
  // B17: when the user has no mail client configured (common on iOS where
  // Mail can be uninstalled), the mailto: link silently no-ops. We monitor
  // page focus after the click — if focus never leaves the tab within
  // 1.5s, we surface a copy-paste fallback so the prospect still gets the
  // message out.
  const [showFallback, setShowFallback] = useState(false);
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const blurredRef = useRef(false);
  // The composed mail body snapshotted at CTA-click time. Held in state (not a
  // ref) because it is read during render for the fallback <textarea>; reading a
  // ref's .current during render is not tracked by React and the textarea would
  // not reliably reflect the latest value (react-hooks/refs).
  const [composedBody, setComposedBody] = useState('');

  const composed = useMemo(() => {
    const subject = `Interesse em patrocínio — ${empresa || '[empresa]'} (${tier})`;
    const body = [
      'Olá, equipe MAPA FOME,',
      '',
      `Empresa: ${empresa}`,
      `Contato: ${contato} — ${cargo}`,
      `E-mail: ${email}`,
      `WhatsApp: ${whatsapp}`,
      `Tier de interesse: ${tier}`,
      '',
      'Mensagem:',
      mensagem,
      '',
      '—',
      'Enviado de mapafome.com.br/parceiros',
    ].join('\n');
    const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { subject, body, href: `mailto:${RECIPIENT}?${q}` };
  }, [empresa, contato, cargo, email, whatsapp, tier, mensagem]);

  const mailtoHref = composed.href;
  const canSubmit = empresa.trim() && email.trim();

  function handleCtaClick() {
    if (!canSubmit) return;
    blurredRef.current = false;
    setShowFallback(false);
    setCopyState('idle');
    setComposedBody(`Para: ${RECIPIENT}\nAssunto: ${composed.subject}\n\n${composed.body}`);
    const onBlur = () => { blurredRef.current = true; };
    const onVisChange = () => { if (document.hidden) blurredRef.current = true; };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisChange);
    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisChange);
      if (!blurredRef.current) setShowFallback(true);
    }, 1500);
    // Default <a href=mailto:> still navigates; this handler only monitors.
  }

  async function copyComposed() {
    try {
      await navigator.clipboard.writeText(composedBody || '');
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 3000);
    } catch (_e) {
      setCopyState('failed');
    }
  }

  return (
    <main className="mdf-parc">
      <Link href="/" className="mdf-parc__back">{t('page.partners.back')}</Link>
      <h1>{t('page.partners.title')}</h1>
      <p className="mdf-parc__lead">
        {t('page.partners.lead')}
      </p>

      <section className="mdf-parc__section">
        <h2>{t('page.partners.how_title')}</h2>
        <ol>
          <li>{t('page.partners.how_step1')}</li>
          <li>{t('page.partners.how_step2')}</li>
          <li>{t('page.partners.how_step3')}</li>
          <li>{t('page.partners.how_step4_lead')}<a href="/relatorio-marketing">{t('page.partners.how_step4_link')}</a>{t('page.partners.how_step4_tail')}</li>
        </ol>
      </section>

      <section className="mdf-parc__section">
        <h2>{t('page.partners.tiers_title')}</h2>
        <p className="mdf-parc__caption">{t('page.partners.tiers_caption')}</p>
        <div className="mdf-parc__tiers">
          {TIER_IDS.map((id) => (
            <article key={id} className={`mdf-parc__tier${tier === id ? ' mdf-parc__tier--selected' : ''}`}>
              <header>
                <h3>{t(`page.partners.tier_${id}_label`)}</h3>
                <span className="mdf-parc__tier-ref">{t(`page.partners.tier_${id}_ref`)}</span>
              </header>
              <dl>
                <dt>{t('page.partners.tier_field_scope')}</dt><dd>{t(`page.partners.tier_${id}_scope`)}</dd>
                <dt>{t('page.partners.tier_field_window')}</dt><dd>{t(`page.partners.tier_${id}_window`)}</dd>
                <dt>{t('page.partners.tier_field_slots')}</dt><dd>{t(`page.partners.tier_${id}_slots`)}</dd>
                <dt>{t('page.partners.tier_field_who')}</dt><dd>{t(`page.partners.tier_${id}_who`)}</dd>
              </dl>
              <button
                type="button"
                onClick={() => setTier(id)}
                aria-pressed={tier === id}
              >
                {tier === id ? t('page.partners.tier_selected') : t('page.partners.tier_choose')}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mdf-parc__section">
        <h2>{t('page.partners.dignity_title')}</h2>
        <ul>
          <li>{t('page.partners.dignity_1')}</li>
          <li>{t('page.partners.dignity_2')}</li>
          <li>{t('page.partners.dignity_3')}</li>
          <li>{t('page.partners.dignity_4')}</li>
          <li>{t('page.partners.dignity_5')}</li>
        </ul>
      </section>

      <section className="mdf-parc__section mdf-parc__section--form">
        <h2>{t('page.partners.form_title')}</h2>
        <p>{t('page.partners.form_intro_lead')}<code>{RECIPIENT}</code>{t('page.partners.form_intro_tail')}</p>
        <div className="mdf-parc__grid">
          <label><span>{t('page.partners.field_company')}</span>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={80} />
          </label>
          <label><span>{t('page.partners.field_contact')}</span>
            <input value={contato} onChange={(e) => setContato(e.target.value)} maxLength={80} placeholder={t('page.partners.field_contact_ph')} />
          </label>
          <label><span>{t('page.partners.field_role')}</span>
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={80} placeholder={t('page.partners.field_role_ph')} />
          </label>
          <label><span>{t('page.partners.field_email')}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
          </label>
          <label><span>{t('page.partners.field_whatsapp')}</span>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={40} placeholder="(83) 9 9999-0000" />
          </label>
          <label><span>{t('page.partners.field_tier')}</span>
            <select value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIER_IDS.map((id) => <option key={id} value={id}>{t(`page.partners.tier_${id}_label`)}</option>)}
            </select>
          </label>
          <label className="mdf-parc__grid--wide"><span>{t('page.partners.field_message')}</span>
            <textarea
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={1000}
              placeholder={t('page.partners.field_message_ph')}
            />
          </label>
        </div>

        <p className="mdf-parc__consent">
          {t('page.partners.consent_lead')}{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer">{t('page.partners.terms_privacy')}</a>{' '}
          {t('page.partners.consent_mid')}{' '}
          <a href="/terms.html" target="_blank" rel="noreferrer">{t('page.partners.terms_use')}</a>{t('page.partners.consent_tail')}
        </p>

        <a
          className={`mdf-parc__cta${canSubmit ? '' : ' mdf-parc__cta--disabled'}`}
          href={canSubmit ? mailtoHref : undefined}
          aria-disabled={!canSubmit}
          onClick={handleCtaClick}
        >
          {t('page.partners.cta_send')}
        </a>

        {showFallback && (
          <div className="mdf-parc__fallback-card" role="status" aria-live="polite">
            <p>
              <strong>{t('page.partners.fallback_q')}</strong> {t('page.partners.fallback_copy_lead')}<a href={`mailto:${RECIPIENT}`}>{RECIPIENT}</a>{t('page.partners.fallback_copy_tail')}
            </p>
            <textarea
              readOnly
              rows={8}
              className="mdf-parc__fallback-text"
              value={composedBody}
            />
            <button type="button" onClick={copyComposed} className="mdf-parc__fallback-copy">
              {copyState === 'copied' ? t('page.partners.copy_done') : copyState === 'failed' ? t('page.partners.copy_failed') : t('page.partners.copy_msg')}
            </button>
          </div>
        )}

        <p className="mdf-parc__fallback">
          {t('page.partners.direct_lead')}{' '}
          <a href={`mailto:${RECIPIENT}`}>{RECIPIENT}</a>.
        </p>
      </section>

      <section className="mdf-parc__section">
        <h2>{t('page.partners.faq_title')}</h2>
        <details>
          <summary>{t('page.partners.faq1_q')}</summary>
          <p>{t('page.partners.faq1_a_lead')}<strong>{t('page.partners.tier_bairro_label')}</strong>{t('page.partners.faq1_a_tail')}</p>
        </details>
        <details>
          <summary>{t('page.partners.faq2_q')}</summary>
          <p>{t('page.partners.faq2_a_lead')}<a href="/relatorio-marketing">/relatorio-marketing</a>{t('page.partners.faq2_a_tail')}</p>
        </details>
        <details>
          <summary>{t('page.partners.faq3_q')}</summary>
          <p>{t('page.partners.faq3_a')}</p>
        </details>
        <details>
          <summary>{t('page.partners.faq4_q')}</summary>
          <p>{t('page.partners.faq4_a_lead')}<strong>{t('page.partners.tier_contrapartida_label')}</strong>{t('page.partners.faq4_a_tail')}</p>
        </details>
        <details>
          <summary>{t('page.partners.faq5_q')}</summary>
          <p>{t('page.partners.faq5_a')}</p>
        </details>
      </section>
    </main>
  );
}
