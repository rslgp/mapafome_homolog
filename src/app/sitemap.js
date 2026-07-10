// SEO-02 — dynamic sitemap. Next.js generates /sitemap.xml from this file at
// build time (works under output:'export'). Replaces the stale hand-written
// public/sitemap.xml (2 URLs, lastmod 2022-01-25, one pointing at the old
// rslgp.github.io host) — that file and public/sitemap.txt were deleted.
//
// SCOPE: the primary, generally-discoverable public routes + the legal pages.
// The narrow-audience campaign micro-landings (/bluey, /dbd, /ios, /solone,
// /influencers, /editalpb/proposta) are intentionally omitted — they are
// shared by direct link to a specific audience, not general search targets.
//
// SOT: the base URL mirrors package.json "homepage" and the root layout's
// metadataBase (https://mapafome.com.br). lastmod is the build date, so every
// deploy re-stamps freshness without a hand-edit.
//
// EXT-HREFLANG-01 (DEFERRED, HUMAN-GATED) — international-SEO hreflang alternates
// are intentionally NOT emitted here. Real per-URL hreflang (a sitemap
// <xhtml:link rel="alternate" hreflang="es" href=".../es"> per locale, or route
// metadata.alternates.languages) requires a DISTINCT, CRAWLABLE URL that serves
// EACH of the 12 UI locales on first paint. This app has none: the locale swap is
// 100% CLIENT-SIDE on ONE URL per route (the static export prerenders pt-BR and
// applies a locale only AFTER hydration — no query-param/path locale read exists,
// grep-verified in i18n/engine.js). Emitting hreflang against `?lang=` or a single
// URL would serve the identical pt-BR shell to crawlers = a duplicate-content
// signal Google penalizes. The COMMITTABLE half shipped as og:locale +
// og:locale:alternate in the root layout (structuredData.js ogLocaleFor). Full
// hreflang is blocked on adding per-locale ROUTES (/es, /ar, ...), a routing
// rewrite that is a HUMAN decision — do NOT add hreflang alternates here or in
// route metadata until those routes exist.

// output:'export' requires metadata route handlers to be statically resolvable.
export const dynamic = 'force-static';

const BASE = 'https://mapafome.com.br';

// Route path -> crawl priority. Path '' is the home. Kept as one table so the
// list is the single place a new public route gets registered for discovery.
const ROUTES = [
  { path: '', priority: 1.0, changeFrequency: 'daily' }, // home: the live map
  { path: '/pets', priority: 0.9, changeFrequency: 'daily' },
  { path: '/assinar', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/parceiros', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/imprensa', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/relatorios', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/relatorio-marketing', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/iniciativas/cadastrar', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap() {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
