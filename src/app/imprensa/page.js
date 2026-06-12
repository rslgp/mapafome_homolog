'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './imprensa.css';

// Press kit (kit de imprensa) for MAPA FOME. A self-serve page so journalists,
// creators and partners can grab everything they need — assets, paste-ready
// copy, brand colors, fact sheet, usage rules — without emailing first. Pure
// static output (Next output:'export'): no backend, plain <img>, clipboard via
// navigator.clipboard with a manual-selection fallback. Brand voice is
// dignity-first and anti-surveillance — never savior/pity framing.

const RECIPIENT = 'contato@mapafome.com.br';
const LAST_UPDATED = 'junho de 2026';
const CREDIT = 'MAPA FOME / mapafome.com.br';

const QUICK = [
  {
    label: 'O que é',
    text: 'Um mapa colaborativo, público e gratuito onde qualquer pessoa, em três toques, sinaliza alguém com fome para que voluntários por perto levem ajuda em tempo real.',
  },
  {
    label: 'Por que importa',
    text: 'Transforma a vontade de ajudar — que costuma se perder — em ação localizada e imediata, sem intermediário e sem burocracia.',
  },
  {
    label: 'O que não é',
    text: 'Não é caridade de cima para baixo, não é vigilância e não substitui política pública nem ONG. "Não substitui ninguém. Conecta todo mundo."',
  },
];

const REFUSALS = [
  ['Não rastreamos pessoas.', 'Sem pixel, sem identificador de aparelho, sem cookie de retargeting. As únicas métricas são agregadas por território e período — números, nunca indivíduos.'],
  ['Não guardamos rosto nem nome.', 'Os pontos não identificam quem está com fome. A dignidade da pessoa mapeada vem antes de qualquer dado.'],
  ['Não substituímos ninguém.', 'Não somos governo nem a ONG da esquina. Não viemos ocupar o lugar de quem já trabalha — viemos conectar.'],
  ['Não vendemos dados nem atenção.', 'Não há leilão de audiência. Quem procura retargeting deve usar outro canal.'],
  ['Não exploramos a dor.', 'Nada de imagens de sofrimento para comover. Solidariedade não precisa de espetáculo.'],
];

const ASSETS = [
  {
    file: '/presskit/MapaFome_Icons_Blue.png',
    title: 'Ícone do app (ciano) — PNG',
    meta: 'PNG transparente · 500×500 px · ~16,5 KB',
    desc: 'Pino com tigela de sopa fumegante, ciano #00CFFF, fundo transparente. Para favicons, avatares e selos. Use sobre fundo claro neutro ou escuro — nunca sobre vermelho.',
    alt: 'Ícone do MAPA FOME — pino de mapa com tigela de sopa fumegante, em ciano',
    buttonLabel: 'Baixar PNG',
    ariaLabel: 'Baixar ícone do MAPA FOME em PNG',
    dark: true,
  },
  {
    file: '/presskit/MapaFome_Icons_Blue.svg',
    title: 'Ícone do app — SVG',
    meta: 'Vetor escalável · viewBox 0 0 500 500 · ~2,3 KB',
    desc: 'O mesmo ícone em vetor, para impressão e telas grandes sem perda de nitidez. Não recolorir.',
    alt: 'Ícone do MAPA FOME em vetor escalável',
    buttonLabel: 'Baixar SVG',
    ariaLabel: 'Baixar ícone do MAPA FOME em SVG',
    dark: true,
  },
  {
    file: '/presskit/MapaFome_slogan.png',
    title: 'Lockup do slogan — PNG',
    meta: 'PNG quadrado · 1440×1440 px · ~210 KB',
    desc: 'Peça pronta para redes: eyebrow A PROPOSTA, wordmark, slogan e sub-tagline com o pino ciano. Ideal para post ou capa.',
    alt: 'Lockup do slogan do MAPA FOME sobre fundo creme',
    buttonLabel: 'Baixar PNG',
    ariaLabel: 'Baixar lockup do slogan do MAPA FOME em PNG',
    cover: true,
  },
];

// `cssVar` drives the swatch fill (token reference) so no color literal lives in
// the stylesheet; `hex` is copyable content. The cyan accent has no component
// token, so its fill falls back to the hex string from this data array.
const COLORS = [
  { name: 'Vermelho da marca', hex: '#D64545', token: '--mdf-brand', cssVar: 'var(--mdf-brand)', role: 'Cor de ação e wordmark. AA para títulos grandes (4,2:1 no creme).' },
  { name: 'Ciano do ícone', hex: '#00CFFF', token: null, cssVar: null, role: 'Cor exclusiva do pino/tigela. Contraste 1,85:1 no branco — só ícone/decoração, nunca texto.', warn: true },
  { name: 'Vermelho hover', hex: '#B93838', token: '--mdf-brand-hover', cssVar: 'var(--mdf-brand-hover)', role: 'Estado hover; use para texto vermelho pequeno (5,7:1 no branco).' },
  { name: 'Tinta (texto)', hex: '#1A1A1A', token: '--mdf-ink', cssVar: 'var(--mdf-ink)', role: 'Cor de corpo de texto sobre superfícies claras.' },
  { name: 'Tinta suave', hex: '#5C5C5C', token: '--mdf-ink-muted', cssVar: 'var(--mdf-ink-muted)', role: 'Texto secundário e legendas.' },
  { name: 'Superfície base (creme)', hex: '#FAFAF7', token: '--mdf-surface-0', cssVar: 'var(--mdf-surface-0)', role: 'Fundo da página.', light: true },
  { name: 'Superfície elevada (branco)', hex: '#FFFFFF', token: '--mdf-surface-1', cssVar: 'var(--mdf-surface-1)', role: 'Cards elevados.', light: true },
  { name: 'Superfície rebaixada', hex: '#F1EFEA', token: '--mdf-surface-2', cssVar: 'var(--mdf-surface-2)', role: 'Fundo de previews e blocos copiáveis.', light: true },
  { name: 'Borda', hex: '#E5E2DC', token: '--mdf-border', cssVar: 'var(--mdf-border)', role: 'Bordas de cards e swatches claros.', light: true },
];

const BOILERPLATE = [
  {
    id: 'short',
    label: 'Curta (~160 caracteres)',
    text: 'O MAPA FOME é um mapa colaborativo, gratuito e anônimo onde qualquer pessoa, em três toques, sinaliza alguém com fome para voluntários ajudarem em tempo real.',
  },
  {
    id: 'medium',
    label: 'Média (2–3 frases)',
    text: 'O MAPA FOME é uma plataforma pública, gratuita e anônima que conecta quem quer ajudar a quem precisa de comida agora. Em três toques, qualquer cidadão mapeia uma pessoa em situação de insegurança alimentar e voluntários próximos recebem o aviso para levar ajuda em tempo real. Não rastreia ninguém: mede só números agregados por território e tempo. Nascido em Recife e em expansão pelo Brasil, com planos para expandir internacionalmente. Não substitui ninguém — conecta todo mundo.',
  },
  {
    id: 'long',
    label: 'Longa (~1 parágrafo)',
    text: 'O MAPA FOME (mapafome.com.br) é um mapa colaborativo, público, gratuito e anônimo que permite a qualquer pessoa, em três toques, sinalizar alguém em situação de fome para que voluntários por perto levem ajuda em tempo real. A plataforma conecta cidadãos e voluntários de forma direta, sem burocracia e sem intermediário — sem substituir política pública nem as organizações que já atuam no território. Construída com tecnologia livre (React, Material-UI, LeafletJS e Next.js) e conectada a planilhas abertas que a própria comunidade edita e cura, trabalha com dados abertos e em tempo real. Dignidade é inegociável: o MAPA FOME não rastreia indivíduos, não usa pixel, device id nem cookie de retargeting; suas métricas são agregadas apenas por território e tempo. Nascido em Recife, com origem acadêmica no CIn UFPE, está em expansão por todo o Brasil. Como resume o próprio projeto: "Não substitui ninguém. Conecta todo mundo." Slogan: "Um mapa colaborativo. Aberto. Em tempo real."',
  },
];

const FACTS = [
  ['Nome', 'MAPA FOME'],
  ['O que é', 'Mapa colaborativo público, gratuito e anônimo para combater a fome em tempo real. Em três toques, qualquer pessoa mapeia alguém em situação de insegurança alimentar para que voluntários próximos levem ajuda.'],
  ['Como funciona', 'Três toques para mapear um ponto de necessidade; voluntários por perto veem em tempo real e levam ajuda. Dados abertos, editáveis e curados pela comunidade.'],
  ['Quem', 'Iniciativa cívica de código aberto, mantida pela comunidade e por parceiros. Cidadãos reportam, voluntários atendem; o projeto apenas conecta.'],
  ['Onde / Origem', 'Recife, Brasil (origem acadêmica no CIn UFPE); em expansão por todo o país. Acesso pela web.'],
  ['Tecnologia', "App web estático (Next.js, output:'export') com React, Material-UI e LeafletJS, conectado ao Google Sheets para curadoria comunitária. Hospedado no GitHub Pages."],
  ['Privacidade', 'Sem rastreamento individual: nenhum pixel, device id ou cookie de retargeting. Métricas agregadas apenas por território × tempo.'],
  ['Licença / dados', 'Software livre; dados abertos e em tempo real. Ativos de marca liberados para uso editorial e divulgação com crédito (ver Termos de uso dos ativos).'],
  ['Status', 'Em operação e expansão nacional.'],
  ['Slogan', '"Um mapa colaborativo. Aberto. Em tempo real."'],
  ['Sub-tagline', '"Não substitui ninguém. Conecta todo mundo."'],
  ['Site', 'mapafome.com.br'],
  ['Contato de imprensa', RECIPIENT],
];

const LICENSE_DO = [
  'Usar o ícone e o lockup do slogan em conteúdo editorial e nas redes, com crédito.',
  'Reduzir ou ampliar mantendo a proporção original.',
  'Usar o ícone PNG/SVG como avatar ou selo ao citar o projeto.',
];
const LICENSE_DONT = [
  'Recolorir, distorcer, girar ou aplicar sombra/contorno na marca.',
  'Sugerir parceria, patrocínio ou endosso que não exista.',
  'Usar a marca para arrecadar fundos em nome do projeto sem autorização por escrito.',
  'Aplicar a marca sobre fundo que prejudique a legibilidade ou ofenda a dignidade das pessoas.',
];

const LOGO_DO = [
  'Usar o ícone e o lockup nas versões originais (PNG ou SVG), sem alterar a proporção.',
  'Manter uma área de respiro em volta do logo — pelo menos a altura da tigela do pino.',
  'Usar o ícone ciano sobre fundo claro neutro (creme/branco) ou escuro com contraste suficiente.',
  'Reduzir mantendo a legibilidade (mínimo ~24 px para o ícone).',
  'Linkar para mapafome.com.br e descrever o projeto como gratuito, anônimo e em tempo real.',
];
const LOGO_DONT = [
  'Recolorir, aplicar gradiente, sombra ou contorno (o ciano é #00CFFF, o vermelho é #D64545 — não troque).',
  'Distorcer, girar ou recortar o pino; nem separar o slogan do ícone no lockup.',
  'Colocar o ícone ciano sobre o vermelho da marca, nem o vermelho sobre o ciano.',
  'Aplicar sobre fundo poluído, foto de baixo contraste ou padrão que dificulte a leitura.',
  'Recriar a marca com outra fonte ou redesenhar o ícone, ou sugerir endosso inexistente.',
];

const QUOTES = [
  'Não substitui ninguém. Conecta todo mundo.',
  'Um mapa colaborativo. Aberto. Em tempo real.',
  'Em três toques, a distância entre quem precisa e quem ajuda vira metros.',
  'A gente mapeia a fome para encurtá-la — nunca para vigiar quem a sente.',
  'Dignidade não se rastreia: nenhum pixel, nenhum cookie, nenhum device id.',
  'Combater a fome não é caridade de cima para baixo — é vizinho conectando vizinho.',
];

const RELATED = [
  { href: '/parceiros', label: 'Parceiros', desc: 'Empresas e organizações que sustentam a operação, com visibilidade honesta e sem vigiar ninguém.' },
  { href: '/iniciativas', label: 'Iniciativas', desc: 'Ações e mutirões da comunidade pelo território.' },
  { href: '/relatorios', label: 'Relatórios', desc: 'Dados abertos do projeto, agregados por território e tempo, exportáveis em CSV e JSON.' },
];

// Shared clipboard hook: copies text and flips the label for a few seconds.
// Falls back to a "select manually" hint when the Clipboard API is blocked
// (insecure context, permissions) so the action never silently no-ops.
function useCopy() {
  const [state, setState] = useState('idle'); // idle | copied | failed
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      setTimeout(() => setState('idle'), 3000);
    } catch (_e) {
      setState('failed');
      setTimeout(() => setState('idle'), 4000);
    }
  };
  return [state, copy];
}

function CopyButton({ text, idleLabel = 'Copiar', ariaLabel, ghost = false }) {
  const [state, copy] = useCopy();
  const label = state === 'copied' ? 'Copiado ✓' : state === 'failed' ? 'Selecione e copie' : idleLabel;
  return (
    <button
      type="button"
      className={`mdf-press__copy${ghost ? ' mdf-press__copy--ghost' : ''}`}
      onClick={() => copy(text)}
      aria-label={ariaLabel || idleLabel}
    >
      <span aria-live="polite">{label}</span>
    </button>
  );
}

function Swatch({ c }) {
  const [state, copy] = useCopy();
  const status = state === 'copied' ? 'Copiado ✓' : state === 'failed' ? 'Copie manualmente' : '';
  return (
    <button
      type="button"
      className={`mdf-press__swatch${c.light ? ' mdf-press__swatch--light' : ''}`}
      onClick={() => copy(c.hex)}
      aria-label={`Copiar hex ${c.hex} — ${c.name}`}
    >
      <span className="mdf-press__swatch-band" style={{ background: c.cssVar || c.hex }} aria-hidden="true" />
      <span className="mdf-press__swatch-body">
        <span className="mdf-press__swatch-name">{c.name}</span>
        <code className="mdf-press__swatch-hex">{c.hex}</code>
        {c.token && <code className="mdf-press__swatch-token">{c.token}</code>}
        <span className={`mdf-press__swatch-role${c.warn ? ' mdf-press__swatch-role--warn' : ''}`}>{c.role}</span>
        <span className="mdf-press__swatch-status" aria-live="polite">{status}</span>
      </span>
    </button>
  );
}

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
              dados abertos, nascido em Recife (origem acadêmica no CIn UFPE) e em
              expansão pelo Brasil. Princípio inegociável: ajudamos pessoas, não
              vigiamos pessoas.
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
