// Server component wrapper for /assinar (recurring-support subscription). The
// page is a client component (form state / Asaas client) and so cannot export
// Next.js `metadata` — this layout supplies the per-route <head> so a shared
// /assinar link previews with a support-focused title/description + the brand
// banner, instead of inheriting the generic hunger-map title from the root
// layout. metadataBase (https://mapafome.com.br) is inherited from the root, so
// the relative OG image + canonical resolve against it. Mirrors the
// pets/imprensa layout precedent. UX-M35b. Calm, dignified tone.

const TITLE = 'Apoie o MAPA FOME';

const DESCRIPTION =
  'Uma contribuição mensal ajuda a manter o mapa da fome no ar. Apoie com Pix, cartão ou boleto — leva menos de um minuto.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://mapafome.com.br/assinar' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://mapafome.com.br/assinar',
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

export default function AssinarLayout({ children }) {
  return children;
}
