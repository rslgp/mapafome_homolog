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
