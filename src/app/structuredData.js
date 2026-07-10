// structuredData.js — SEO-03: single source of truth for schema.org JSON-LD.
//
// Pure, render-agnostic builders that return plain JS objects (no React, no DOM).
// A layout renders one as <script type="application/ld+json"> in <head>. Keeping
// the literals HERE (one SOT) means the org facts are not re-typed per page and a
// fact change lands in one place. Facts mirror the press kit (pressKitContent.js)
// and the site metadata (root layout metadataBase) — keep them in sync.
//
// WHY: the site shipped ZERO structured data. Organization/NGO gives search
// engines an entity (name, url, logo, mission, contact) for rich results, and the
// report pages are aggregated open-data — an ideal schema.org/Dataset — which
// makes them discoverable as data by the public-interest audience (MP, saúde,
// segurança alimentar) the reports are built for.

const SITE_URL = 'https://mapafome.com.br';
const LOGO_URL = `${SITE_URL}/presskit/MapaFome_Icons_Blue.png`;
const BANNER_URL = `${SITE_URL}/presskit/MapaFome_banner.png`;

// ── EXT-HREFLANG-01 — international-SEO Open Graph locale hints ────────────────
// The app serves 12 UI locales (SUPPORTED_LOCALES in i18n/engine.js) but the swap
// is 100% CLIENT-SIDE on a SINGLE URL per route: the static export prerenders the
// DEFAULT_LOCALE (pt-BR) HTML, and a locale is only applied AFTER hydration (from
// localStorage / a mount-effect browser-language|geolocation detect). There is NO
// query-param / path read of the locale anywhere in the engine.
//
// WHAT THIS DOES (the committable minimum): emit og:locale + og:locale:alternate
// so a social/search crawler learns the content is OFFERED in these languages —
// an honest, per-DOCUMENT hint that does not claim a distinct indexable URL exists
// for each language.
//
// WHY NOT alternates.languages / <link rel="alternate" hreflang> (DEFERRED, HUMAN-
// GATED): real hreflang requires a DISTINCT, CRAWLABLE URL that serves EACH locale
// on first paint. This app has none — `?lang=es` is never read (grep-verified in
// i18n/engine.js) so it would serve the byte-identical pt-BR shell to Googlebot,
// i.e. the duplicate-content pattern Google penalizes. Emitting hreflang here would
// be a DISHONEST SEO signal. True hreflang is blocked on per-locale ROUTES
// (/es, /ar, ...), which is a routing rewrite = a human decision, tracked as the
// deferred half of EXT-HREFLANG-01. Do NOT add alternates.languages until those
// routes exist.
//
// SOT: the language list is DERIVED from SUPPORTED_LOCALES (i18n/engine.js) — the
// single source — never re-typed. `knowsLanguage` above predates this and stays a
// separate schema.org field (bare language codes, no territory); this list uses the
// OG `language_TERRITORY` form (RFC 5646 with '_'). One list, two projections.
//
// Imported from a 'use client' module into these server metadata builders: this is
// a plain value re-export (a string array), no hooks/DOM, so it is server-safe.
// Import from the PURE locale SOT (locales.js), NOT engine.js: engine.js is a
// Client Component ('use client'), and importing it into this server-side metadata
// module dragged the client boundary across the seam and broke the build-collect
// step (`SUPPORTED_LOCALES.filter is not a function` on /imprensa). locales.js is
// React-free, so a server module can read it safely.
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './components/compatibility/components/ux/i18n/locales.js';

// toOgLocale — normalize a BCP-47 UI tag ('pt-BR', 'es', 'zh') to the Open Graph
// locale form Facebook/OG expect: `language_TERRITORY` with an underscore, or a
// bare language when the tag has no region. Pure + total.
function toOgLocale(tag) {
  const [lang, region] = String(tag).split('-');
  return region ? `${lang}_${region}` : lang;
}

// ogLocaleFor — the openGraph `locale` + `alternateLocale` pair for a document.
// `primary` is the locale the prerendered HTML actually renders (pt-BR for the
// static export); `alternateLocale` is every OTHER supported locale, in OG form.
// Next maps openGraph.alternateLocale -> <meta property="og:locale:alternate">.
// Callers spread this into their `openGraph` block.
export function ogLocaleFor(primary = DEFAULT_LOCALE) {
  return {
    locale: toOgLocale(primary),
    alternateLocale: SUPPORTED_LOCALES
      .filter((l) => l !== primary)
      .map(toOgLocale),
  };
}

// The MAPA FOME organization as an NGO. NGO is a schema.org subtype of
// Organization, the honest fit for a non-profit collaborative-map platform.
export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name: 'MAPA FOME',
    url: SITE_URL,
    logo: LOGO_URL,
    image: BANNER_URL,
    description:
      'Mapa colaborativo, público e gratuito onde qualquer pessoa sinaliza, em ' +
      'três toques, alguém com fome para que voluntários por perto levem ajuda em ' +
      'tempo real. Também responde a desastres naturais quando pessoas perdem suas casas.',
    slogan: 'Não substitui ninguém. Conecta todo mundo.',
    sameAs: ['https://www.instagram.com/mapafome'],
    knowsLanguage: ['pt-BR', 'es', 'en', 'de', 'fr', 'ru', 'zh', 'ar', 'bn', 'uk', 'hi', 'tr'],
  };
}

// A report page as a schema.org/Dataset. `name`/`description`/`path` are supplied
// by the caller (each report page differs); the publisher + license are shared.
// measurementTechnique + variableMeasured signal that the data is aggregated and
// privacy-preserving (k-anonymized), matching the report pages' actual contract.
export function reportDatasetLd({ name, description, path }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url: `${SITE_URL}${path}`,
    isAccessibleForFree: true,
    creativeWorkStatus: 'Published',
    measurementTechnique: 'Agregação anonimizada (k-anônimo, k=5) por território e período',
    publisher: {
      '@type': 'NGO',
      name: 'MAPA FOME',
      url: SITE_URL,
    },
    encodingFormat: ['text/html', 'text/csv', 'application/json'],
  };
}

export { SITE_URL };
