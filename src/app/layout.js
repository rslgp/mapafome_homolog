// app/layout.js
import './globals.css';
import LocaleAutoDetect from './components/LocaleAutoDetect';
import LocationLocaleDetect from './components/LocationLocaleDetect';
import { organizationLd, ogLocaleFor } from './structuredData';

export const metadata = {
  metadataBase: new URL('https://mapafome.com.br'),
  title: 'MAPA FOME',
  description: 'Vamos acabar com a fome juntos. Construído usando React, Material-UI e LeafletJS conectado ao Google Sheets para facilitar a edição da comunidade!',
  manifest: '/manifest.json',
  openGraph: {
    title: 'MAPA FOME',
    description: 'Vamos acabar com a fome juntos. Construído usando React, Material-UI e LeafletJS conectado ao Google Sheets para facilitar a edição da comunidade!',
    images: ['/app_screenshot2.png'],
    // UX-M35b: the site itself, not the GitHub repo — the OG url is what the
    // WhatsApp preview card links to.
    url: 'https://mapafome.com.br/',
    type: 'website',
    // EXT-HREFLANG-01 (committable minimum): og:locale (pt-BR, the prerendered
    // default) + og:locale:alternate for every OTHER supported UI locale, DERIVED
    // from SUPPORTED_LOCALES (i18n/engine.js SOT via structuredData.js). This is an
    // honest per-DOCUMENT "offered in these languages" hint. It deliberately does
    // NOT add alternates.languages/hreflang: the locale swap is client-only on ONE
    // URL, so real hreflang needs per-locale routes (/es, /ar, ...) — a routing
    // rewrite that is HUMAN-GATED and deferred. See structuredData.js ogLocaleFor.
    ...ogLocaleFor(),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAPA FOME',
    description: 'Vamos acabar com a fome juntos: um mapa colaborativo, aberto e em tempo real de quem precisa de alimento.',
    images: ['/app_screenshot2.png'],
  },
  verification: {
    google: 'xnDDdF_R6dnOC-clyk9Y59OROow929qgIK_uEpUy52g',
  },
  // UX-M35b: canonical via metadata (not a hard-coded <link> in <head>). A
  // fixed <link rel="canonical" href=".../"> in the root <head> leaked onto
  // EVERY route, so /assinar and /parceiros emitted two competing canonicals.
  // Declaring it here lets the home carry "/" while each route layout that
  // sets its own alternates.canonical overrides it — one canonical per page.
  alternates: { canonical: 'https://mapafome.com.br/' },
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
        <meta name="referrer" content="no-referrer" />
        {/* UX-M19 (CWV/LCP): the map is the LCP element and its tiles come from a
            third-party host, so the browser must DNS-resolve + TCP + TLS that host
            before Leaflet can even request the first tile. Warm the DEFAULT layer's
            host (Waze, the checked:true base in mapConstants) with preconnect so the
            handshake overlaps HTML parse instead of starting after hydration; the two
            fallback hosts (only fetched if the user switches layer) get the cheaper
            dns-prefetch. crossOrigin because tiles are cross-origin image requests.
            SOT note: hosts mirror src/.../mapConstants.js TILE_LAYERS — keep in sync. */}
        <link rel="preconnect" href="https://worldtiles1.waze.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.fr" />
        <link rel="dns-prefetch" href="https://server.arcgisonline.com" />
        {/* SEO-03: Organization/NGO structured data so search engines resolve
            MAPA FOME as an entity (rich results). SOT in ./structuredData.js.
            JSON.stringify is safe here — the object holds only our own static
            literals (no user input), so there is no injection surface. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd()) }}
        />
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
