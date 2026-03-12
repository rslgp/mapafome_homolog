// app/layout.js
// import './globals.css'; // your styles

export const metadata = {
  title: 'MAPA FOME',
  description: 'Vamos acabar com a fome juntos. Construído usando React, Material-UI e LeafletJS conectado ao Google Sheets para facilitar a edição da comunidade!',
  themeColor: '#000000',
  openGraph: {
    title: 'MAPA da FOME',
    description: 'Vamos acabar com a fome juntos. Construído usando React, Material-UI e LeafletJS conectado ao Google Sheets para facilitar a edição da comunidade!',
    images: ['/app_screenshot2.png'],
    url: 'https://github.com/rslgp/mapafome',
  },
  verification: {
    google: 'xnDDdF_R6dnOC-clyk9Y59OROow929qgIK_uEpUy52g',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://mapafome.com.br/" />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
