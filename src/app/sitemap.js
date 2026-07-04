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
