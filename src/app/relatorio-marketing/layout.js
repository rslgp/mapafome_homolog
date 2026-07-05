// Server component wrapper for /relatorio-marketing. The page is a client
// component (fetches the sheet + CSV export) and so cannot export Next.js
// `metadata` — this layout supplies the per-route <head>. Without it the page
// inherited the root layout's title AND its canonical (https://mapafome.com.br/),
// self-canonicalizing this sponsor/advertiser report to the HOME. SEO-01.
// Separate from /relatorios (public-policy) because the audience differs — this
// one is destined for sponsor/advertiser companies. metadataBase inherited from
// the root. Mirrors the parceiros/imprensa/assinar layout precedent.

import { reportDatasetLd } from '../structuredData';

const TITLE = 'Relatório para patrocinadores — MAPA FOME';

const DESCRIPTION =
  'Relatório de alcance e status de campanhas do MAPA FOME para empresas patrocinadoras e anunciantes: audiência estimada, raio de alcance e desempenho, com exportação em CSV.';

// SEO-03: aggregated campaign-reach data — a schema.org/Dataset.
const DATASET_LD = reportDatasetLd({
  name: 'Relatório de alcance de campanhas — MAPA FOME',
  description: DESCRIPTION,
  path: '/relatorio-marketing',
});

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://mapafome.com.br/relatorio-marketing' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://mapafome.com.br/relatorio-marketing',
    type: 'website',
    images: [{ url: '/presskit/MapaFome_banner.png', alt: 'MAPA FOME' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/presskit/MapaFome_banner.png'],
  },
};

export default function RelatorioMarketingLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DATASET_LD) }}
      />
      {children}
    </>
  );
}
