// Server component wrapper for /parceiros. The page is a client component and
// so cannot export Next.js `metadata` — this layout supplies the per-route
// <head> so a shared /parceiros link previews with a partnership-focused
// title/description + the brand banner, instead of inheriting the generic
// hunger-map title from the root layout. metadataBase
// (https://mapafome.com.br) is inherited from the root. Mirrors the
// pets/imprensa/assinar layout precedent. UX-M35b. Calm, dignified tone.

const TITLE = 'Parceiros — MAPA FOME';

const DESCRIPTION =
  'Empresas, ONGs e iniciativas que apoiam o MAPA FOME. Conheça quem sustenta o mapa da fome e como a sua organização pode somar à causa.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://mapafome.com.br/parceiros' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://mapafome.com.br/parceiros',
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

export default function ParceirosLayout({ children }) {
  return children;
}
