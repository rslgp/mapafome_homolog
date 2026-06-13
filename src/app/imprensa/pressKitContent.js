// pressKitContent.js — single source of truth for the /imprensa press-kit CONTENT
// DATA. Pure, render-agnostic: paste-ready copy, brand facts, asset/colour/license/
// logo/quote/media/related metadata + the three scalar constants. No React, no
// 'use client', no DOM. Extracted from page.js (SRP) so press-copy edits and the
// clipboard/UI code stop colliding; page.js imports these and CopyControls.js owns
// the interaction. Internal to the route folder (no barrel needed — page.js's only
// public contract is its default export, resolved by Next via the file path).

export const RECIPIENT = 'dev.rafaelleao+mapafome_imprensa@gmail.com';
export const LAST_UPDATED = 'junho de 2026';
export const CREDIT = 'MAPA FOME / mapafome.com.br';

export const QUICK = [
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

export const REFUSALS = [
  ['Não rastreamos pessoas.', 'Sem pixel, sem identificador de aparelho, sem cookie de retargeting. As únicas métricas são agregadas por território e período — números, nunca indivíduos.'],
  ['Não guardamos rosto nem nome.', 'Os pontos não identificam quem está com fome. A dignidade da pessoa mapeada vem antes de qualquer dado.'],
  ['Não substituímos ninguém.', 'Não somos governo nem a ONG da esquina. Não viemos ocupar o lugar de quem já trabalha — viemos conectar.'],
  ['Não vendemos dados nem atenção.', 'Não há leilão de audiência. Quem procura retargeting deve usar outro canal.'],
  ['Não exploramos a dor.', 'Nada de imagens de sofrimento para comover. Solidariedade não precisa de espetáculo.'],
];

export const ASSETS = [
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
export const COLORS = [
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

export const BOILERPLATE = [
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
    text: 'O MAPA FOME (mapafome.com.br) é um mapa colaborativo, público, gratuito e anônimo que permite a qualquer pessoa, em três toques, sinalizar alguém em situação de fome para que voluntários por perto levem ajuda em tempo real. A plataforma conecta cidadãos e voluntários de forma direta, sem burocracia e sem intermediário — sem substituir política pública nem as organizações que já atuam no território. Construída com tecnologia livre (React, Material-UI, LeafletJS e Next.js) e conectada a planilhas abertas que a própria comunidade edita e cura, trabalha com dados abertos e em tempo real. Dignidade é inegociável: o MAPA FOME não rastreia indivíduos, não usa pixel, device id nem cookie de retargeting; suas métricas são agregadas apenas por território e tempo. Criado por Rafael Leão, o projeto teve origem em 2022 durante sua graduação em Ciência da Computação no CIn UFPE (formado em 2025, hoje engenheiro de software); nascido em Recife, está em expansão por todo o Brasil. Como resume o próprio projeto: "Não substitui ninguém. Conecta todo mundo." Slogan: "Um mapa colaborativo. Aberto. Em tempo real."',
  },
];

export const FACTS = [
  ['Nome', 'MAPA FOME'],
  ['O que é', 'Mapa colaborativo público, gratuito e anônimo para combater a fome em tempo real. Em três toques, qualquer pessoa mapeia alguém em situação de insegurança alimentar para que voluntários próximos levem ajuda.'],
  ['Como funciona', 'Três toques para mapear um ponto de necessidade; voluntários por perto veem em tempo real e levam ajuda. Dados abertos, editáveis e curados pela comunidade.'],
  ['Quem', 'Iniciativa cívica de código aberto, mantida pela comunidade e por parceiros. Cidadãos reportam, voluntários atendem; o projeto apenas conecta.'],
  ['Fundador', 'Rafael Leão, criador do MAPA FOME. O projeto teve origem em 2022, durante a graduação em Ciência da Computação no CIn UFPE; formado em 2025, hoje é engenheiro de software.'],
  ['Onde / Origem', 'Recife, Brasil; origem em 2022 durante a graduação no CIn UFPE; em expansão por todo o país. Acesso pela web.'],
  ['Tecnologia', "App web estático (Next.js, output:'export') com React, Material-UI e LeafletJS, conectado ao Google Sheets para curadoria comunitária. Hospedado no GitHub Pages."],
  ['Privacidade', 'Sem rastreamento individual: nenhum pixel, device id ou cookie de retargeting. Métricas agregadas apenas por território × tempo.'],
  ['Licença / dados', 'Software livre; dados abertos e em tempo real. Ativos de marca liberados para uso editorial e divulgação com crédito (ver Termos de uso dos ativos).'],
  ['Status', 'Em operação e expansão nacional.'],
  ['Slogan', '"Um mapa colaborativo. Aberto. Em tempo real."'],
  ['Sub-tagline', '"Não substitui ninguém. Conecta todo mundo."'],
  ['Site', 'mapafome.com.br'],
  ['Contato de imprensa', RECIPIENT],
];

export const LICENSE_DO = [
  'Usar o ícone e o lockup do slogan em conteúdo editorial e nas redes, com crédito.',
  'Reduzir ou ampliar mantendo a proporção original.',
  'Usar o ícone PNG/SVG como avatar ou selo ao citar o projeto.',
];
export const LICENSE_DONT = [
  'Recolorir, distorcer, girar ou aplicar sombra/contorno na marca.',
  'Sugerir parceria, patrocínio ou endosso que não exista.',
  'Usar a marca para arrecadar fundos em nome do projeto sem autorização por escrito.',
  'Aplicar a marca sobre fundo que prejudique a legibilidade ou ofenda a dignidade das pessoas.',
];

export const LOGO_DO = [
  'Usar o ícone e o lockup nas versões originais (PNG ou SVG), sem alterar a proporção.',
  'Manter uma área de respiro em volta do logo — pelo menos a altura da tigela do pino.',
  'Usar o ícone ciano sobre fundo claro neutro (creme/branco) ou escuro com contraste suficiente.',
  'Reduzir mantendo a legibilidade (mínimo ~24 px para o ícone).',
  'Linkar para mapafome.com.br e descrever o projeto como gratuito, anônimo e em tempo real.',
];
export const LOGO_DONT = [
  'Recolorir, aplicar gradiente, sombra ou contorno (o ciano é #00CFFF, o vermelho é #D64545 — não troque).',
  'Distorcer, girar ou recortar o pino; nem separar o slogan do ícone no lockup.',
  'Colocar o ícone ciano sobre o vermelho da marca, nem o vermelho sobre o ciano.',
  'Aplicar sobre fundo poluído, foto de baixo contraste ou padrão que dificulte a leitura.',
  'Recriar a marca com outra fonte ou redesenhar o ícone, ou sugerir endosso inexistente.',
];

export const QUOTES = [
  'Não substitui ninguém. Conecta todo mundo.',
  'Um mapa colaborativo. Aberto. Em tempo real.',
  'Em três toques, a distância entre quem precisa e quem ajuda vira metros.',
  'A gente mapeia a fome para encurtá-la — nunca para vigiar quem a sente.',
  'Dignidade não se rastreia: nenhum pixel, nenhum cookie, nenhum device id.',
  'Combater a fome não é caridade de cima para baixo — é vizinho conectando vizinho.',
];

// Press coverage / traction, oldest first. `outlet` + `when` head each item; the
// optional `href` links the original matéria. Years follow the project's own
// timeline; the RS-floods coverage spans 2023-2024 across sources.
export const MEDIA = [
  {
    outlet: 'TV Globo — Jornal Hoje',
    when: '2022',
    text: 'Reportagem em rede nacional logo após o lançamento, em plena pandemia. A repercussão fez a base de usuários crescer em massa.',
  },
  {
    outlet: 'Enchentes do Rio Grande do Sul',
    when: '2023-2024',
    text: 'O MAPA FOME foi acionado por moradores e voluntários durante a catástrofe das enchentes no RS, validando o canal de uso emergencial além do cotidiano.',
  },
  {
    outlet: 'CIn / UFPE',
    when: '20 de maio de 2026',
    text: 'Nota institucional do Centro de Informática da UFPE sobre os quatro anos de operação e a abertura da frente de captação a parlamentares, gestores públicos, universidades e empresas com agenda ESG.',
  },
  {
    outlet: 'UNIFOR',
    when: '14 de maio de 2026',
    text: 'Matéria no Ceará sobre a articulação do projeto no Estado e a visita à Assembleia Legislativa, no contexto da expansão para o Nordeste.',
  },
];

export const RELATED = [
  { href: '/parceiros', label: 'Parceiros', desc: 'Empresas e organizações que sustentam a operação, com visibilidade honesta e sem vigiar ninguém.' },
  { href: '/iniciativas', label: 'Iniciativas', desc: 'Ações e mutirões da comunidade pelo território.' },
  { href: '/relatorios', label: 'Relatórios', desc: 'Dados abertos do projeto, agregados por território e tempo, exportáveis em CSV e JSON.' },
];
