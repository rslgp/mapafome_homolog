// Server component wrapper for the /pets "achados e perdidos" lost-pets map.
// page.js is a client component (Leaflet/dynamic ssr:false) and so CANNOT export
// Next.js `metadata` — this layout supplies the per-route <head> at the route
// boundary so a shared lost-pet link previews with a pet-specific title/description
// instead of inheriting the generic 'MAPA FOME' hunger-map title from the root
// layout. metadataBase is inherited from the root layout (https://mapafome.com.br),
// so the relative OG image and canonical resolve against it.
// Mirrors the src/app/imprensa/layout.js precedent. PET-M17. Calm, dignified tone.

const TITLE = 'Pets perdidos — MAPA FOME';

const DESCRIPTION =
  'Mapa colaborativo de achados e perdidos de pets: veja animais perdidos, encontrados e avistados perto de você, ou reporte um pet para ajudar a reuni-lo com a família.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://mapafome.com.br/pets' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://mapafome.com.br/pets',
    type: 'website',
    images: ['/app_screenshot2.png'],
  },
};

export default function PetsLayout({ children }) {
  return children;
}
