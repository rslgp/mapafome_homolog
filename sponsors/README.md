# MAPA FOME — sponsor banner assets

Drop PNGs here. Each file is referenced from
`src/app/components/compatibility/components/ux/sponsors.js` by path
(e.g. `/sponsors/apoie.png`).

## Contract

- **Format**: PNG only (no GIF — no loops per design_brief.yaml § visual_system.markers).
- **Dimensions**: 1200×300 (2× asset). Rendered at up to 600×150 CSS px in a 4:1 aspect box.
- **Max size**: 80 KB gzip. Banners are lazy-loaded but still count against CLS + LCP.
- **Text**: Portuguese (pt-BR). No English CTAs.
- **Color**: Must coexist with the warm off-white `--mdf-surface-0` (#FAFAF7). Avoid the project's brand red `#D64545` so the slot does not compete visually with the [Relatar] CTA.
- **Motion**: none. No flashing, no looping animation (WCAG 2.3.1 + calm tone).
- **Safety checklist** (applied before accepting any sponsor): not a debt-collection, loan, or gambling product; not a food brand with documented labor abuses; URL uses HTTPS.

## Adding a sponsor

1. Drop the PNG here (`public/sponsors/{id}.png`).
2. Append an entry to `SPONSORS` in `sponsors.js`:
   - `id` — unique slug, matches the PNG filename
   - `img` — e.g. `/sponsors/{id}.png`
   - `href` — real destination URL (HTTPS) or internal `/apoiar`
   - `alt` — short brand identifier (used by screen readers + image alt)
   - `label` — display label (optional, used in the carousel dots aria label)
   - **`description`** — tagline, **HARD LIMIT 150 characters**, pt-BR. Longer strings are truncated with an ellipsis at render time (`clampDescription` in `sponsors.js`). Write it to earn the reader's next click, not as a slogan.
   - **`regions`** — slugs from `regionResolver.js` (`pe-recife`, `sp-sp`, `rj-rj`, `mg-bh`, `ba-sal`, `ce-for`, `rs-poa`, `pr-cwb`, `df-bsb`) or `'*'` for the global fallback
   - **`placements`** — array of slot slugs where this sponsor may appear. Use the `PLACEMENTS` export from `sponsors.js`:
     - `PLACEMENTS.INFO_PANEL_FOOTER` — below the InfoPanel contact/suggestion block (live)
     - `PLACEMENTS.INFO_PANEL_PARCEIROS` — Parceiros accordion in InfoPanel (Phase 3)
     - `PLACEMENTS.APOIAR_GRID` — `/apoiar` page grid (Phase 2)
     - `PLACEMENTS.INITIATIVES_FOOTER` — below `/iniciativas/*`
   - `weight` — relative weight within the resolved region/placement (default 1)
   - **`startsAt`** — optional date the exposure window opens. Accepts `YYYY-MM-DD` (preferred), `MM-DD-YYYY`, or `DD/MM/YYYY`. Omit to run from anytime.
   - **`expiresAt`** — optional date the exposure window closes. Same formats as `startsAt`. **The sponsor stays live through the END of that day (local time) and disappears at midnight.** Example: `expiresAt: '2026-02-17'` (or `'02-17-2026'`) means the sponsor is visible all day on Feb 17 2026 and gone starting Feb 18. Open sessions that span midnight drop the sponsor within 10 minutes without a reload.
   - **`center`** — optional `[lat, lng]` of a paid geographic reach. Pairs with `radiusKm` to sell by precise coverage area (e.g. "all users within 3 km of my restaurant").
   - **`radiusKm`** — reach radius around `center`, in kilometers. Required if `center` is set. When set, the user's GPS coords must be within this distance for the sponsor to be eligible; if no coords are available, the sponsor does not appear.
   - **Priority:** when the user is inside a sponsor's paid reach, that sponsor sorts to the **top of the carousel** — higher priority than any `regions`-only match. A brand that pays for radius targeting gets the first slide in its own coverage area.
3. The click opens `href` directly (external URLs open in a new tab with `rel="noreferrer sponsored"`). Click attribution is fired from `onClick` + `onAuxClick` on the anchor, so middle-clicks and ⌘/Ctrl-clicks are counted too. If a sponsor wants an interstitial tracking page (e.g. to attach a server-side pixel), set `href` to `/go/{id}/` and ship a static redirector at `public/go/{id}/index.html`.
4. Multiple sponsors eligible for the same `(region, placement)` = auto-rotating carousel, 7 s per slide, paused on hover/focus, honors `prefers-reduced-motion`.
5. Ship via PR so the dignity + brand checklist gets reviewed.
