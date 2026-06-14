// strings.page.js — PAGE-CHROME UI copy shard (BRAND scope).
//
// SCOPE (this commit): only the header/nav strings the brand header renders, plus
// the per-country brand tagline key. These were previously inline pt-BR literals in
// header.js; routing them through t('page.header.*') lets the brand header resolve
// localized copy in the three shipping locales. The fuller "make the whole page
// dynamic" migration (report form, sheets, tutorial, info panel, legend, ...) and
// the 4-to-7 locale expansion belong to the in-flight intl stream and are NOT in
// this shard yet — they will land with their consuming components so no key is dead.
//
// WHY A SEPARATE SHARD (not strings.core/assinar/pets.js): those shards are owned by
// the in-flight locale work; this file is additive and isolated so the two efforts
// never collide. dictionary.js spreads this shard LAST per locale (purely additive).
//
// LOCALE PARITY (test/i18n.test.js): every block below exposes the SAME key set,
// asserted data-driven over SUPPORTED_LOCALES (pt-BR/es/en-US). NO DEAD KEYS: every
// key here is referenced by header.js (page.header.*) or countryBrand.js
// (page.brand.tagline.br). pt-BR carries the verbatim current Portuguese (dark-ship:
// the default page reads byte-for-byte as today). es/en-US are finalized mechanical
// copy. New strings avoid the em-dash (commas/parens).

export const pt = {
  // ── header.js (header / nav) — all MECHANICAL (nav, labels, install) ──
  'page.header.skip_to_map':   'Pular para o mapa',
  'page.header.wordmark':      'MAPA FOME .com.br',
  'page.header.backup_link':   ' · mapafome.com.br ',
  'page.header.count_full':    ' pontos mapeados',
  'page.header.count_short':   ' pts',
  'page.header.report_aria':   'Relatar um ponto no mapa',
  'page.header.tour_aria':     'Ver tutorial dos três passos',
  'page.header.install_aria':  'Instalar o aplicativo MAPA FOME (PWA-lite)',
  'page.header.install_label': 'Instalar',
  'page.header.donate_aria':   'Doar via Pix',
  'page.header.donate_label':  'Doar',
  'page.header.pets_aria':     'Pets perdidos — mapa de achados e perdidos',
  'page.header.install_ios':   'No iPhone/iPad (Safari): toque em Compartilhar e escolha "Adicionar à Tela de Início" para instalar.',
  'page.header.install_other': 'Para instalar: abra o menu do navegador (⋮) e escolha "Instalar app" ou "Adicionar à tela inicial".',
  // INTL brand layer (countryBrand.js) — per-country localized tagline shown next
  // to the canonical MAPA FOME mark. Brazil carries the real pt-BR line; only
  // launch countries with a brand entry reference a tagline key.
  'page.brand.tagline.br':     'O mapa contra a fome no Brasil',
};

export const es = {
  'page.header.skip_to_map':   'Saltar al mapa',
  'page.header.wordmark':      'MAPA FOME .com.br',
  'page.header.backup_link':   ' · mapafome.com.br ',
  'page.header.count_full':    ' puntos mapeados',
  'page.header.count_short':   ' pts',
  'page.header.report_aria':   'Reportar un punto en el mapa',
  'page.header.tour_aria':     'Ver el tutorial de los tres pasos',
  'page.header.install_aria':  'Instalar la aplicación MAPA FOME (PWA-lite)',
  'page.header.install_label': 'Instalar',
  'page.header.donate_aria':   'Donar con Pix',
  'page.header.donate_label':  'Donar',
  'page.header.pets_aria':     'Mascotas perdidas — mapa de objetos perdidos y encontrados',
  'page.header.install_ios':   'En iPhone/iPad (Safari): toca Compartir y elige "Añadir a pantalla de inicio" para instalar.',
  'page.header.install_other': 'Para instalar: abre el menú del navegador (⋮) y elige "Instalar app" o "Añadir a la pantalla de inicio".',
  'page.brand.tagline.br':     'El mapa contra el hambre en Brasil',
};

export const enUS = {
  'page.header.skip_to_map':   'Skip to the map',
  'page.header.wordmark':      'MAPA FOME .com.br',
  'page.header.backup_link':   ' · mapafome.com.br ',
  'page.header.count_full':    ' points mapped',
  'page.header.count_short':   ' pts',
  'page.header.report_aria':   'Report a point on the map',
  'page.header.tour_aria':     'View the three-step tutorial',
  'page.header.install_aria':  'Install the MAPA FOME app (PWA-lite)',
  'page.header.install_label': 'Install',
  'page.header.donate_aria':   'Donate via Pix',
  'page.header.donate_label':  'Donate',
  'page.header.pets_aria':     'Lost pets — lost and found map',
  'page.header.install_ios':   'On iPhone/iPad (Safari): tap Share and choose "Add to Home Screen" to install.',
  'page.header.install_other': 'To install: open the browser menu (⋮) and choose "Install app" or "Add to Home screen".',
  'page.brand.tagline.br':     'The map against hunger in Brazil',
};
