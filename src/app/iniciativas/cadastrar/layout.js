// Server component wrapper for /iniciativas/cadastrar. The page is a client
// component (form state) and so cannot export Next.js `metadata` — this layout
// supplies the per-route <head>. Without it the page inherited the root layout's
// title AND its canonical (https://mapafome.com.br/), self-canonicalizing the
// registration page to the HOME. SEO-01. metadataBase inherited from the root.
// Mirrors the parceiros/imprensa/assinar layout precedent.

const TITLE = 'Cadastrar iniciativa — MAPA FOME';

const DESCRIPTION =
  'Cadastre uma iniciativa contínua no MAPA FOME — cozinhas comunitárias, coletivos de bairro e pontos fixos de doação — para que quem doa e quem precisa encontre onde e quando buscar alimento.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://mapafome.com.br/iniciativas/cadastrar' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://mapafome.com.br/iniciativas/cadastrar',
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

export default function IniciativaCadastrarLayout({ children }) {
  return children;
}
