// app/layout.js
import './globals.css';
import LocaleAutoDetect from './components/LocaleAutoDetect';
import LocationLocaleDetect from './components/LocationLocaleDetect';

export const metadata = {
  metadataBase: new URL('https://mapafome.com.br'),
  title: 'MAPA FOME',
  description: 'Vamos acabar com a fome juntos. Construído usando React, Material-UI e LeafletJS conectado ao Google Sheets para facilitar a edição da comunidade!',
  manifest: '/manifest.json',
  openGraph: {
    title: 'MAPA FOME',
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
  // iPhone X+: lets env(safe-area-inset-*) return real values so the FAB
  // and bottom sheet content clear the home indicator. Without this flag
  // Safari shrinks the viewport and every inset returns 0.
  viewportFit: 'cover',
  themeColor: '#D64545',
};

// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://mapafome.com.br/" />
        <meta name="referrer" content="no-referrer" />
        {/* PWA install bridge — capture `beforeinstallprompt` at page-parse time
            (before React mounts) so the event is never missed. The install
            button reads window.__mdf_install_prompt and calls .prompt() on it.
            Pattern mirrors the SOLONE pwa-lite host-page install bridge. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){window.__mdf_install_prompt=window.__mdf_install_prompt||null;window.__mdf_app_installed=window.__mdf_app_installed||false;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__mdf_install_prompt=e;});window.addEventListener('appinstalled',function(){window.__mdf_install_prompt=null;window.__mdf_app_installed=true;});})();",
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {/* INTL M6.2 — first-session browser-language auto-detect, run as a
            client mount-effect (renders null). Mounted once here so every route
            is covered; SSR-safe (no markup, detection deferred to the effect) so
            the prerendered DEFAULT_LOCALE HTML is never contradicted (R12). */}
        <LocaleAutoDetect />
        {/* LOC-LANG — first-session location-derived UI language, run as a client
            mount-effect (renders null). Auto-requests geolocation, reverse-geocodes
            the coords to a country, and applies the nearest supported locale ONLY
            when no stored/manual mdf_locale exists (dark-ship invariant). Mounted
            once here alongside LocaleAutoDetect; SSR-safe (no markup, detection
            deferred to the effect) so the prerendered pt-BR HTML is never
            contradicted (R12). */}
        <LocationLocaleDetect />
        {children}
      </body>
    </html>
  );
}
