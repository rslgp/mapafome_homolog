// SEO-02 — dynamic robots.txt. Next.js generates /robots.txt from this file at
// build time (works under output:'export'). Replaces the static public/robots.txt,
// which allowed all crawlers but omitted the Sitemap: directive — so crawlers
// had no pointer to the sitemap. This keeps the allow-all policy and adds the
// Sitemap: line pointing at the dynamic sitemap (src/app/sitemap.js).

// output:'export' requires metadata route handlers to be statically resolvable.
export const dynamic = 'force-static';

const BASE = 'https://mapafome.com.br';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
