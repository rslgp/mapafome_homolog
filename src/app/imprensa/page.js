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
  const factText = FACTS.map(([k, v]) => `${k}: ${v}`).join('\n');
  const mailtoHref = `mailto:${RECIPIENT}?subject=${encodeURIComponent('Imprensa — MAPA FOME')}`;

  return (
    <main className="mdf-press">
      <Link href="/" className="mdf-press__back">← Mapa</Link>
      <h1>Kit de imprensa do MAPA FOME</h1>
      <p className="mdf-press__lead">
        Esta página reúne tudo o que jornalistas, criadores de conteúdo e parceiros
        precisam para falar sobre o MAPA FOME — sem precisar nos escrever antes. Baixe
        os logos, copie as descrições prontas, consulte a ficha técnica, as cores e as
        regras de uso, e pegue frases citáveis. É de graça e livre para uso editorial,
        com crédito. Só pedimos uma coisa em troca: respeite a dignidade de quem é
        mapeado — são cidadãos conectando cidadãos, não vítimas nem casos de caridade.
        O MAPA FOME não substitui ninguém; conecta todo mundo.
      </p>

      {/* Intro / hero */}
      <section className="mdf-press__section" aria-labelledby="h-intro">
        <h2 id="h-intro">O que é o MAPA FOME</h2>
        <div className="mdf-press__hero">
          <div className="mdf-press__hero-logo">
            <img src="/presskit/MapaFome_Icons_Blue.svg" alt="Ícone do MAPA FOME" width={64} height={64} />
          </div>
          <div className="mdf-press__hero-body">
            <span className="mdf-press__eyebrow">A proposta</span>
            <p className="mdf-press__wordmark">MapaFome</p>
            <p>
              O MAPA FOME é um mapa colaborativo, público, gratuito e anônimo. Em três
              toques, qualquer pessoa marca no mapa alguém em situação de fome para que
              voluntários por perto levem ajuda em tempo real. É software livre, com
              dados abertos, nascido em Recife, com origem em 2022 durante a graduação em
              Ciência da Computação no CIn UFPE, e em expansão pelo Brasil. Princípio
              inegociável: ajudamos pessoas, não vigiamos pessoas.
            </p>
            <p className="mdf-press__framing">
              Sugestão de enquadramento: tecnologia cívica e solidariedade entre
              vizinhos — não caridade nem pena.
            </p>
            <div className="mdf-press__slogan-block">
              <p className="mdf-press__slogan">“Um mapa colaborativo. Aberto. Em tempo real.”</p>
              <p className="mdf-press__subtagline">“Não substitui ninguém. Conecta todo mundo.”</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick summary */}
      <section className="mdf-press__section" aria-labelledby="h-resumo">
        <h2 id="h-resumo">O essencial em 30 segundos</h2>
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
        <h2 id="h-recusa">O que o MAPA FOME se recusa a fazer</h2>
        <p>O que recusamos define o projeto tanto quanto o que oferecemos. Estas linhas são inegociáveis.</p>
        <ul className="mdf-press__refusals">
          {REFUSALS.map(([head, body]) => (
            <li key={head}><strong>{head}</strong> {body}</li>
          ))}
        </ul>
        <blockquote className="mdf-press__callout">
          “A gente mapeia a fome para encurtá-la — nunca para vigiar quem a sente.”
        </blockquote>
      </section>

      {/* Assets */}
      <section className="mdf-press__section" aria-labelledby="h-ativos">
        <h2 id="h-ativos">Logos e ativos para baixar</h2>
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
          Formatos: PNG (transparente) para uso rápido; SVG (vetor) para impressão e
          qualquer tamanho sem perder nitidez. Precisa de outro formato, fundo ou versão
          monocromática? Escreva para <a href={`mailto:${RECIPIENT}`}>{RECIPIENT}</a>.
        </p>
      </section>

      {/* Asset license */}
      <section className="mdf-press__section" aria-labelledby="h-licenca">
        <h2 id="h-licenca">Termos de uso dos ativos</h2>
        <p>
          Você pode usar os ativos do MAPA FOME livremente em matérias jornalísticas,
          posts, vídeos e materiais de divulgação sobre o projeto, sempre com crédito a
          “{CREDIT}”.
        </p>
        <div className="mdf-press__cols">
          <div className="mdf-press__col">
            <h3>Pode</h3>
            <ul className="mdf-press__rules mdf-press__rules--do">
              {LICENSE_DO.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div className="mdf-press__col">
            <h3>Não pode</h3>
            <ul className="mdf-press__rules mdf-press__rules--dont">
              {LICENSE_DONT.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
        <p className="mdf-press__note">
          Em caso de dúvida sobre um uso específico, escreva para{' '}
          <a href={`mailto:${RECIPIENT}`}>{RECIPIENT}</a> — respondemos rápido.
        </p>
      </section>

      {/* Brand colors */}
      <section className="mdf-press__section" aria-labelledby="h-cores">
        <h2 id="h-cores">Cores da marca</h2>
        <p className="mdf-press__note" style={{ marginTop: 0, marginBottom: 'var(--mdf-space-3)' }}>
          Toque num bloco para copiar o código hex.
        </p>
        <div className="mdf-press__swatches">
          {COLORS.map((c) => <Swatch key={c.hex + c.name} c={c} />)}
        </div>
        <p className="mdf-press__note">
          Para texto, use Tinta (#1A1A1A) sobre Creme (#FAFAF7). O ciano e o vermelho são
          para destaque, não para corpo de texto: o ciano só no ícone/decoração, e o
          vermelho pequeno em #B93838.
        </p>
      </section>

      {/* Boilerplate */}
      <section className="mdf-press__section" aria-labelledby="h-boiler">
        <h2 id="h-boiler">Descrições prontas (copiar e colar)</h2>
        {BOILERPLATE.map((b) => (
          <div key={b.id} className="mdf-press__boiler">
            <span className="mdf-press__boiler-label">{b.label}</span>
            <p className="mdf-press__boiler-text">{b.text}</p>
            <CopyButton text={b.text} ariaLabel={`Copiar descrição ${b.label}`} />
          </div>
        ))}
        <p className="mdf-press__note">
          Pode adaptar para o seu veículo, desde que preserve o sentido: gratuito,
          anônimo, colaborativo e sem vigilância.
        </p>
      </section>

      {/* Fact sheet */}
      <section className="mdf-press__section" aria-labelledby="h-ficha">
        <h2 id="h-ficha">Ficha técnica</h2>
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
            <CopyButton text={factText} idleLabel="Copiar ficha técnica" ariaLabel="Copiar a ficha técnica inteira" />
          </div>
        </div>
        <p className="mdf-press__note">
          Números de pontos mapeados e atendimentos mudam o tempo todo. Para o dado mais
          recente, use <a href="/relatorios">mapafome.com.br/relatorios</a> (exportável
          em CSV e JSON) ou peça por e-mail.
        </p>
      </section>

      {/* Logo usage */}
      <section className="mdf-press__section" aria-labelledby="h-uso">
        <h2 id="h-uso">Como usar o logo</h2>
        <div className="mdf-press__cols">
          <div className="mdf-press__col">
            <h3>Pode</h3>
            <ul className="mdf-press__rules mdf-press__rules--do">
              {LOGO_DO.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div className="mdf-press__col">
            <h3>Não pode</h3>
            <ul className="mdf-press__rules mdf-press__rules--dont">
              {LOGO_DONT.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
        <p className="mdf-press__note">
          Sempre que houver texto sobre uma cor da marca, confira o contraste mínimo AA
          (4,5:1 para texto normal, 3:1 para texto grande).
        </p>
      </section>

      {/* Quotable lines */}
      <section className="mdf-press__section" aria-labelledby="h-citacoes">
        <h2 id="h-citacoes">Frases para citar</h2>
        {QUOTES.map((q) => (
          <blockquote key={q} className="mdf-press__quote">
            <p>“{q}”</p>
            <span className="mdf-press__quote-copy">
              <CopyButton text={q} ariaLabel={`Copiar frase: ${q}`} ghost />
            </span>
          </blockquote>
        ))}
        <p className="mdf-press__note">
          Pode usar com ou sem atribuição. Se atribuir: “— MAPA FOME”. Para citar uma
          pessoa nominalmente, fale com a gente.
        </p>
      </section>

      {/* Press coverage / traction */}
      <section className="mdf-press__section" aria-labelledby="h-midia">
        <h2 id="h-midia">Na mídia</h2>
        <p>
          Quatro anos de operação contínua, do cotidiano à calamidade. Para entrevista
          ou um dado atualizado, fale com a gente.
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
        <h2 id="h-saiba">Saiba mais</h2>
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
        <h2 id="h-contato">Contato de imprensa</h2>
        <div className="mdf-press__contact">
          <p>
            Para entrevista, dado atualizado, declaração ou um ativo em formato
            específico, escreva para a gente. Respondemos rápido. Mesmo assim: você não
            precisa esperar nossa resposta para publicar — este kit foi feito para isso.
          </p>
          <a className="mdf-press__cta" href={mailtoHref}>Falar com a imprensa</a>
          <div className="mdf-press__email-row">
            <code>{RECIPIENT}</code>
            <CopyButton text={RECIPIENT} idleLabel="Copiar e-mail" ariaLabel="Copiar e-mail de imprensa" ghost />
          </div>
          <p className="mdf-press__signoff">MAPA FOME — Recife, Brasil.</p>
        </div>
      </section>

      {/* About this kit */}
      <p className="mdf-press__about">
        Última atualização: {LAST_UPDATED}. Este kit pode mudar — confira sempre a versão
        mais recente em mapafome.com.br/imprensa. Crédito sugerido: {CREDIT}. Os ativos e
        textos desta página são oficiais e podem ser usados conforme os Termos de uso dos
        ativos acima.
      </p>
    </main>
  );
}
