// Server component wrapper for the /imprensa press kit. The page itself is a
// client component (clipboard interactions) and so cannot export metadata —
// this layout supplies the per-route <head>: a press-focused title/description
// and the slogan lockup as the share (OG/Twitter) image, so links to the kit
// preview with the brand instead of the app screenshot used site-wide.

const DESCRIPTION =
  'Kit de imprensa do MAPA FOME: baixe logos (PNG/SVG), copie descrições prontas, cores da marca, ficha técnica e frases citáveis. Uso editorial livre, com crédito.';

export const metadata = {
  title: 'Kit de imprensa — MAPA FOME',
  description: DESCRIPTION,
  alternates: { canonical: 'https://mapafome.com.br/imprensa' },
  openGraph: {
    title: 'Kit de imprensa — MAPA FOME',
    description: DESCRIPTION,
    url: 'https://mapafome.com.br/imprensa',
    images: [{ url: '/presskit/MapaFome_slogan.png', width: 1440, height: 1440, alt: 'MAPA FOME — Um mapa colaborativo. Aberto. Em tempo real.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kit de imprensa — MAPA FOME',
    description: DESCRIPTION,
    images: ['/presskit/MapaFome_slogan.png'],
  },
};

export default function ImprensaLayout({ children }) {
  return children;
}
