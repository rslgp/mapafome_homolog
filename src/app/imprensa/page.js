'use client';

import React from 'react';
import Link from 'next/link';
import './imprensa.css';
import {
  RECIPIENT,
  LAST_UPDATED,
  CREDIT,
  QUICK,
  REFUSALS,
  ASSETS,
  COLORS,
  BOILERPLATE,
  FACTS,
  LICENSE_DO,
  LICENSE_DONT,
  LOGO_DO,
  LOGO_DONT,
  QUOTES,
  MEDIA,
  RELATED,
} from './pressKitContent';
import { CopyButton, Swatch } from './CopyControls';
import { t, useLocale } from '../components/compatibility/components/ux/strings';

// Press kit (kit de imprensa) for MAPA FOME. A self-serve page so journalists,
// creators and partners can grab everything they need — assets, paste-ready
// copy, brand colors, fact sheet, usage rules — without emailing first. Pure
// static output (Next output:'export'): no backend, plain <img>, clipboard via
// navigator.clipboard with a manual-selection fallback. Brand voice is
// dignity-first and anti-surveillance — never savior/pity framing.
//
// The static CONTENT DATA lives in ./pressKitContent (so press-copy edits don't
// collide with the UI), and the clipboard interaction layer (useCopy + CopyButton
// + Swatch) lives in ./CopyControls. This file owns only the page composition/JSX.

export default function ImprensaPage() {
  useLocale(); // re-render on locale change so t() re-reads
  const factText = FACTS.map(([k, v]) => `${k}: ${v}`).join('\n');
  const mailtoHref = `mailto:${RECIPIENT}?subject=${encodeURIComponent('Imprensa — MAPA FOME')}`;

  return (
    <main className="mdf-press">
      <Link href="/" className="mdf-press__back">{t('page.press.back')}</Link>
      <h1>{t('page.press.title')}</h1>
      <p className="mdf-press__lead">
        {t('page.press.lead')}
      </p>

      {/* Intro / hero */}
      <section className="mdf-press__section" aria-labelledby="h-intro">
        <h2 id="h-intro">{t('page.press.intro_title')}</h2>
        <div className="mdf-press__hero">
          <div className="mdf-press__hero-logo">
            <img src="/presskit/MapaFome_Icons_Blue.svg" alt={t('page.press.icon_alt')} width={64} height={64} />
          </div>
          <div className="mdf-press__hero-body">
            <span className="mdf-press__eyebrow">{t('page.press.eyebrow')}</span>
            <p className="mdf-press__wordmark">MapaFome</p>
            <p>
              {t('page.press.intro_body')}
            </p>
            <p className="mdf-press__framing">
              {t('page.press.framing')}
            </p>
            <div className="mdf-press__slogan-block">
              <p className="mdf-press__slogan">{t('page.press.slogan')}</p>
              <p className="mdf-press__subtagline">{t('page.press.subtagline')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick summary */}
      <section className="mdf-press__section" aria-labelledby="h-resumo">
        <h2 id="h-resumo">{t('page.press.quick_title')}</h2>
        <div className="mdf-press__cards">
          {QUICK.map((q) => (
            <article key={q.label} className="mdf-press__card">
              <span className="mdf-press__card-label">{q.label}</span>
              <p>{q.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Refusals */}
      <section className="mdf-press__section" aria-labelledby="h-recusa">
        <h2 id="h-recusa">{t('page.press.refusals_title')}</h2>
        <p>{t('page.press.refusals_intro')}</p>
        <ul className="mdf-press__refusals">
          {REFUSALS.map(([head, body]) => (
            <li key={head}><strong>{head}</strong> {body}</li>
          ))}
        </ul>
        <blockquote className="mdf-press__callout">
          {t('page.press.refusals_callout')}
        </blockquote>
      </section>

      {/* Assets */}
      <section className="mdf-press__section" aria-labelledby="h-ativos">
        <h2 id="h-ativos">{t('page.press.assets_title')}</h2>
        <div className="mdf-press__assets">
          {ASSETS.map((a) => (
            <article key={a.file} className="mdf-press__asset">
              <div className={`mdf-press__asset-preview${a.dark ? ' mdf-press__asset-preview--dark' : ''}${a.cover ? ' mdf-press__asset-preview--cover' : ''}`}>
                <img src={a.file} alt={a.alt} loading="lazy" />
              </div>
              <h3>{a.title}</h3>
              <p className="mdf-press__asset-meta">{a.meta}</p>
              <p className="mdf-press__asset-desc">{a.desc}</p>
              <a className="mdf-press__download" href={a.file} download aria-label={a.ariaLabel}>
                ↓ {a.buttonLabel}
              </a>
            </article>
          ))}
        </div>
        <p className="mdf-press__note">
          {t('page.press.assets_note_lead')}<a href={`mailto:${RECIPIENT}`}>{RECIPIENT}</a>.
        </p>
      </section>

      {/* Asset license */}
      <section className="mdf-press__section" aria-labelledby="h-licenca">
        <h2 id="h-licenca">{t('page.press.license_title')}</h2>
        <p>
          {t('page.press.license_intro_lead')}“{CREDIT}”{t('page.press.license_intro_tail')}
        </p>
        <div className="mdf-press__cols">
          <div className="mdf-press__col">
            <h3>{t('page.press.rules_can')}</h3>
            <ul className="mdf-press__rules mdf-press__rules--do">
              {LICENSE_DO.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
          <div className="mdf-press__col">
            <h3>{t('page.press.rules_cannot')}</h3>
            <ul className="mdf-press__rules mdf-press__rules--dont">
              {LICENSE_DONT.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
        </div>
        <p className="mdf-press__note">
          {t('page.press.license_note_lead')}{' '}
          <a href={`mailto:${RECIPIENT}`}>{RECIPIENT}</a>{t('page.press.license_note_tail')}
        </p>
      </section>

      {/* Brand colors */}
      <section className="mdf-press__section" aria-labelledby="h-cores">
        <h2 id="h-cores">{t('page.press.colors_title')}</h2>
        <p className="mdf-press__note" style={{ marginTop: 0, marginBottom: 'var(--mdf-space-3)' }}>
          {t('page.press.colors_tap')}
        </p>
        <div className="mdf-press__swatches">
          {COLORS.map((c) => <Swatch key={c.hex + c.name} c={c} />)}
        </div>
        <p className="mdf-press__note">
          {t('page.press.colors_note')}
        </p>
      </section>

      {/* Boilerplate */}
      <section className="mdf-press__section" aria-labelledby="h-boiler">
        <h2 id="h-boiler">{t('page.press.boiler_title')}</h2>
        {BOILERPLATE.map((b) => (
          <div key={b.id} className="mdf-press__boiler">
            <span className="mdf-press__boiler-label">{b.label}</span>
            <p className="mdf-press__boiler-text">{b.text}</p>
            <CopyButton text={b.text} ariaLabel={`${t('page.press.copy_desc_aria')} ${b.label}`} />
          </div>
        ))}
        <p className="mdf-press__note">
          {t('page.press.boiler_note')}
        </p>
      </section>

      {/* Fact sheet */}
      <section className="mdf-press__section" aria-labelledby="h-ficha">
        <h2 id="h-ficha">{t('page.press.facts_title')}</h2>
        <div className="mdf-press__fact">
          <dl>
            {FACTS.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
          <div className="mdf-press__fact-actions">
            <CopyButton text={factText} idleLabel={t('page.press.facts_copy_idle')} ariaLabel={t('page.press.facts_copy_aria')} />
          </div>
        </div>
        <p className="mdf-press__note">
          {t('page.press.facts_note_lead')}<a href="/relatorios">mapafome.com.br/relatorios</a>{t('page.press.facts_note_tail')}
        </p>
      </section>

      {/* Logo usage */}
      <section className="mdf-press__section" aria-labelledby="h-uso">
        <h2 id="h-uso">{t('page.press.logo_title')}</h2>
        <div className="mdf-press__cols">
          <div className="mdf-press__col">
            <h3>{t('page.press.rules_can')}</h3>
            <ul className="mdf-press__rules mdf-press__rules--do">
              {LOGO_DO.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
          <div className="mdf-press__col">
            <h3>{t('page.press.rules_cannot')}</h3>
            <ul className="mdf-press__rules mdf-press__rules--dont">
              {LOGO_DONT.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
        </div>
        <p className="mdf-press__note">
          {t('page.press.logo_note')}
        </p>
      </section>

      {/* Quotable lines */}
      <section className="mdf-press__section" aria-labelledby="h-citacoes">
        <h2 id="h-citacoes">{t('page.press.quotes_title')}</h2>
        {QUOTES.map((q) => (
          <blockquote key={q} className="mdf-press__quote">
            <p>“{q}”</p>
            <span className="mdf-press__quote-copy">
              <CopyButton text={q} ariaLabel={`${t('page.press.copy_quote_aria')} ${q}`} ghost />
            </span>
          </blockquote>
        ))}
        <p className="mdf-press__note">
          {t('page.press.quotes_note')}
        </p>
      </section>

      {/* Press coverage / traction */}
      <section className="mdf-press__section" aria-labelledby="h-midia">
        <h2 id="h-midia">{t('page.press.media_title')}</h2>
        <p>
          {t('page.press.media_intro')}
        </p>
        <ul className="mdf-press__refusals">
          {MEDIA.map((m) => (
            <li key={m.outlet}>
              <strong>{m.outlet} ({m.when}).</strong> {m.text}
            </li>
          ))}
        </ul>
      </section>

      {/* Related links */}
      <section className="mdf-press__section" aria-labelledby="h-saiba">
        <h2 id="h-saiba">{t('page.press.related_title')}</h2>
        <ul className="mdf-press__related">
          {RELATED.map((r) => (
            <li key={r.href}>
              <a href={r.href}>{r.label}</a>
              <span>{r.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Press contact */}
      <section className="mdf-press__section" aria-labelledby="h-contato">
        <h2 id="h-contato">{t('page.press.contact_title')}</h2>
        <div className="mdf-press__contact">
          <p>
            {t('page.press.contact_body')}
          </p>
          <a className="mdf-press__cta" href={mailtoHref}>{t('page.press.contact_cta')}</a>
          <div className="mdf-press__email-row">
            <code>{RECIPIENT}</code>
            <CopyButton text={RECIPIENT} idleLabel={t('page.press.contact_copy_idle')} ariaLabel={t('page.press.contact_copy_aria')} ghost />
          </div>
          <p className="mdf-press__signoff">{t('page.press.signoff')}</p>
        </div>
      </section>

      {/* About this kit */}
      <p className="mdf-press__about">
        {t('page.press.about_updated')} {LAST_UPDATED}{t('page.press.about_mid')}{CREDIT}{t('page.press.about_tail')}
      </p>
    </main>
  );
}
