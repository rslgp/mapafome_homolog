// Server component wrapper for /relatorios. The page is a client component
// (fetches the sheet + clipboard/CSV export) and so cannot export Next.js
// `metadata` — this layout supplies the per-route <head>. Without it the page
// inherited the root layout's title AND its canonical (https://mapafome.com.br/),
// self-canonicalizing the reports page to the HOME — telling Google to fold the
// public-interest data pages into the homepage. SEO-01. metadataBase
// (https://mapafome.com.br) is inherited from the root. Mirrors the
// parceiros/imprensa/assinar layout precedent.

import { reportDatasetLd } from '../structuredData';

const TITLE = 'Relatórios de interesse público — MAPA FOME';

const DESCRIPTION =
  'Relatórios agregados e anonimizados (k-anônimo) de insegurança alimentar do MAPA FOME, para Ministério Público, secretarias de saúde e organizações de segurança alimentar. Sem dados pessoais, com exportação em CSV.';

// SEO-03: this page is aggregated open data — a schema.org/Dataset — so it is
// discoverable as data by the public-interest audience it is built for.
const DATASET_LD = reportDatasetLd({
  name: 'Relatórios de insegurança alimentar — MAPA FOME',
  description: DESCRIPTION,
  path: '/relatorios',
});

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://mapafome.com.br/relatorios' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://mapafome.com.br/relatorios',
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

export default function RelatoriosLayout({ children }) {
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
