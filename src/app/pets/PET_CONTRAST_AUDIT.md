# PET_CONTRAST_AUDIT.md — PET-M24 contrast + colorblind audit gate

**Milestone:** PET-M24 (owner: coloring-ict6) — the FINAL contrast + colorblind
audit gate for every NEW `/pets` color pairing produced across the visual
milestones (M1, M3, M4, M7, M7b, M8, M9b, M10, M11, M16, M19, M20, M22).

**Scope:** AUDIT + fix contrast only. This file does NOT author surfaces (other
items own those). It re-measures every new pairing, records the sighted WCAG 2.2
AA ratio, simulates deuteranopia + protanopia separability for the four
status/reunido hues, confirms the lightness staircase, brings any un-annotated or
drifted pairing up to the documented-ratio standard, and fixes any pairing below
floor.

**Dark mode:** OUT OF SCOPE / deferred. `tokens.css` has no
`prefers-color-scheme: dark` block, so a dark pet palette would land inert. When
the base introduces a dark theme, every `--pet-*` + `--pet-reunido` pair must be
re-derived at AA with eye-comfort floors (no pure `#000` surface, no pure `#FFF`
marker disc). Not audited here.

## Method

Ratios were RE-COMPUTED from the token hex values (not trusted from the inline
annotations) with the WCAG 2.2 relative-luminance formula
(`L = 0.2126·R + 0.7152·G + 0.0722·B` on linearized sRGB;
`contrast = (L_light + 0.05) / (L_dark + 0.05)`). CVD separability uses the
Viénot–Brettel–Mollon 1999 dichromat simulation matrices on linear RGB, then
compares the simulated colors' luminance contrast. Token hex values are read from
`src/app/components/compatibility/components/ux/tokens.css` (`--mdf-*`) and
`src/app/pets/petPalette.css` (`--pet-*`).

**Floors (WCAG 2.2 AA):** graphical / UI-component / state stroke `>= 3:1`
(SC 1.4.11); normal text `>= 4.5:1` (SC 1.4.3).

## 1. Sighted contrast — every new pairing

### A. Status / reunido accents (petPalette.css — PET-M11)

| Pairing | Variant | Measured | Floor | Result |
|---|---|---|---|---|
| `--pet-perdido` `#CE7106` on surface-1 `#FFF` | stroke | **3.51:1** | 3 | PASS |
| `--pet-perdido` on surface-0 `#FAFAF7` | stroke | **3.35:1** | 3 | PASS |
| `--pet-perdido-ink` on `--pet-perdido-tint` | tint+ink (text) | **7.86:1** | 4.5 | PASS |
| `--pet-perdido-on` `#2E1700` on `--pet-perdido` | solid+on (text) | **4.83:1** | 4.5 | PASS (dark-ink exception) |
| `--pet-encontrado` `#0E7490` on surface-1 | stroke | **5.36:1** | 3 | PASS |
| `--pet-encontrado` on surface-0 | stroke | **5.12:1** | 3 | PASS |
| `--pet-encontrado-ink` on `--pet-encontrado-tint` | tint+ink (text) | **8.78:1** | 4.5 | PASS |
| `--pet-on-accent` `#FCFCFA` on `--pet-encontrado` | solid+on (text) | **5.22:1** | 4.5 | PASS |
| `--pet-avistado` `#5B3FA6` on surface-1 | stroke | **7.76:1** | 3 | PASS |
| `--pet-avistado` on surface-0 | stroke | **7.42:1** | 3 | PASS |
| `--pet-avistado-ink` on `--pet-avistado-tint` | tint+ink (text) | **10.06:1** | 4.5 | PASS |
| `--pet-on-accent` on `--pet-avistado` | solid+on (text) | **7.55:1** | 4.5 | PASS |
| `--pet-reunido` `#BC3F84` on surface-1 | stroke | **5.02:1** | 3 | PASS |
| `--pet-reunido` on surface-0 | stroke | **4.80:1** | 3 | PASS |
| `--pet-reunido-ink` on `--pet-reunido-tint` | tint+ink (text) | **9.07:1** | 4.5 | PASS |
| `--pet-on-accent` on `--pet-reunido` | solid+on (text) | **4.89:1** | 4.5 | PASS |

**perdido SOLID+ON exception (encoded in the token):** `#CE7106` is too LIGHT to
host near-white text at AA, so `--pet-perdido-on` is a DARK ink `#2E1700`
(4.83:1), NOT the shared near-white `--pet-on-accent`. Never put white/near-white
text on the burnt-amber accent.

These 16 pairings drive: the M11 legend chips, all four `.pet-badge--*` variants
(stroke / tint / solid) for all four statuses + reunido, the detail-sheet status
badge (`.pet-detail__status--*`), and the report-sheet status chips
(`.pet-chip--*.pet-chip--on`). They reuse the same tokens, so one measurement
covers every reuse.

### B. Aged-marker rings (petMarkerIcon.js — PET-M11 lifecycle)

The aged lifecycle deliberately darkens the ring to the `-ink` token (value shift,
never opacity), so contrast INCREASES, plus a non-opacity secondary cue (the
dashed "wear" arc). Ring as a graphical object on the white marker disc
(`--mdf-surface-1`):

| Aged ring stroke | Measured | Floor | Result |
|---|---|---|---|
| `--pet-perdido-ink` `#6E3A02` on disc | **9.25:1** | 3 | PASS |
| `--pet-encontrado-ink` `#0A4555` on disc | **10.52:1** | 3 | PASS |
| `--pet-avistado-ink` `#3A2570` on disc | **12.51:1** | 3 | PASS |
| `--pet-reunido-ink` `#702048` on disc | **10.56:1** | 3 | PASS |

The reunido marker overlays a HEART glyph filled with `--pet-reunido` over a
`--mdf-surface-1` backing disc (5.02:1 stroke equivalent on the disc), so it is
grayscale-distinct by SHAPE from the active statuses' `!` / `check` / `eye`.

### C. Photo placeholder / skeleton (pets.css — PET-M16)

| Pairing | Measured | Floor | Result |
|---|---|---|---|
| `--mdf-ink-muted` placeholder label on `--pet-placeholder-tint` `#F3EDE3` | **5.74:1** | 4.5 | PASS |
| `--mdf-ink` text on placeholder tint | **14.95:1** | 4.5 | PASS |
| `--pet-perdido-ink` meaningful glyph ink on placeholder tint | **7.95:1** | 3 | PASS |
| `--mdf-ink-subtle` glyph-disc ring on placeholder tint | **2.96:1** | 3 | **DECORATIVE EXEMPT** (see §5) |

The loading skeleton is a low-contrast shimmer between `--pet-placeholder-tint`
and `--mdf-surface-1` (~1.10:1, a breath not a flash); under
`prefers-reduced-motion` it becomes a STATIC fill in the same tint. The skeleton
is decorative motion, not text/state — no AA floor applies. ERROR / broken-URL
falls through to the EMPTY placeholder (graceful identity), never a broken-image
glyph.

### D. Neutral-pair surfaces (every other new surface across the milestones)

Most new surfaces (M1 queued banner, M3 reveal-gate + privacy note +
free-text warning, M4 flag affordance, M7 filter chips, M7b lifecycle/encerrar +
confirm + warm success, M8 list rows + view-toggle, M9b match hint, M10
search/locate controls + status, M19 share button, M20 load/empty/error/closure/
first-hint, M22 cross-link reuses the same neutral pairs) intentionally avoid a
status hue — calm-tone governor: an anxious public must not be hit with alarm-red
or a saturated fill where neutral suffices. They compose proven `--mdf-*` neutral
pairs. Each measured once and reused:

| Pairing | Measured | Floor | Result |
|---|---|---|---|
| `--mdf-ink` `#1A1A1A` on surface-1 `#FFF` | **17.40:1** | 4.5 | PASS |
| `--mdf-ink` on surface-2 `#F1EFEA` | **15.15:1** | 4.5 | PASS |
| `--mdf-ink` on surface-0 `#FAFAF7` | **16.64:1** | 4.5 | PASS |
| `--mdf-ink-muted` `#5C5C5C` on surface-1 | **6.69:1** | 4.5 | PASS |
| `--mdf-ink-muted` on surface-2 | **5.82:1** | 4.5 | PASS |
| `--mdf-ink-muted` on surface-0 | **6.39:1** | 4.5 | PASS |
| `--mdf-ink-subtle` `#8A8A8A` boundary on surface-1 | **3.45:1** | 3 | PASS |
| `--mdf-ink-subtle` boundary on surface-2 | **3.00:1** | 3 | PASS |
| `--mdf-ink-subtle` boundary on surface-0 | **3.30:1** | 3 | PASS |

`--mdf-ink-subtle` is the visible-boundary token used throughout (the lighter
`--mdf-border` `#E5E2DC` is below 3:1 on these light surfaces and is only used for
hairline row separators, not state-bearing boundaries).

### E. Brand-pair CTAs (the only solid colored-text fill on the neutral surfaces)

The hopeful primary actions — M7b "Marcar como reunido", M11/M0 album CTA + Relatar
FAB, M15 photo-capture button, M20 error "Tentar de novo" + closure "Ver no mapa" —
use the app-wide brand pair:

| Pairing | Measured | Floor | Result |
|---|---|---|---|
| `--mdf-brand-ink` `#FFF` on `--mdf-brand-hover` `#B93838` | **5.70:1** | 4.5 | PASS |

> **FIX applied (annotation accuracy):** four inline comments annotated this pair
> as "≈ 6.4:1" — a drifted figure. The measured WCAG ratio is **5.70:1**. It still
> passes the 4.5:1 text floor, so no token changed; the four comments were
> corrected to the measured `5.70:1` (pets.css lines ~493, ~758, ~1630, ~1901).

## 2. Simulated deuteranopia + protanopia separability

Mutual luminance contrast between the simulated accent colors (Viénot 1999), for
every status+reunido pair. A pair is mono-distinguishable if it does not collapse
to the same simulated value.

**Deuteranopia**

| Pair | Sim. contrast |
|---|---|
| perdido vs encontrado | 1.80:1 |
| perdido vs avistado | 2.46:1 |
| perdido vs reunido | 1.41:1 |
| encontrado vs avistado | 1.37:1 |
| encontrado vs reunido | **1.28:1** (tightest involving reunido) |
| avistado vs reunido | 1.75:1 |

**Protanopia**

| Pair | Sim. contrast |
|---|---|
| perdido vs encontrado | **1.16:1** (system tightest) |
| perdido vs avistado | 1.77:1 |
| perdido vs reunido | 1.47:1 |
| encontrado vs avistado | 1.52:1 |
| encontrado vs reunido | 1.27:1 |
| avistado vs reunido | 1.20:1 |

**Every pair stays > 1:1 (no collapse) under both simulations.** The tightest pair
in the whole system is perdido vs encontrado at protanopia (1.16:1) — and it is NOT
left to luminance alone:

- it separates on the **blue/yellow axis protans retain** (perdido reads
  yellow-ish, encontrado blue-ish);
- the marker carries a distinct **glyph SHAPE** per status (`!` vs `check` vs
  `eye`), and reunido carries a unique **heart**;
- the lightness staircase (§3) keeps them ordered by value.

So distinction **never relies on red-vs-green alone.** reunido's tightest neighbour
(encontrado, deut 1.28 / prot 1.27) is above the system worst case, so reunido does
not degrade the staircase, and its heart glyph makes it grayscale-distinct by shape.

**reunido vs the reserved hunger success-green `#4A7C59`:** reunido is a warm
rose/orchid, off the confirmation axis. Their simulated luminance contrast is near
1:1 (deut 1.13 / prot 1.32) BECAUSE they sit at similar VALUE — but they are never
co-located (reunido is a `/pets` lifecycle overlay; success-green is a hunger-map
urgency hue on a different surface) and carry different glyphs, so there is no
in-context confusion. reunido never reuses the success-green hex.

## 3. Lightness staircase — HOLDS across all four statuses + reunido

sRGB relative luminance Y, strictly monotonic (lightest → darkest):

| Rank | Token | Hex | Y |
|---|---|---|---|
| 1 (lightest) | perdido | `#CE7106` | **0.2495** |
| 2 | reunido | `#BC3F84` | **0.1591** |
| 3 | encontrado | `#0E7490` | **0.1460** |
| 4 (darkest) | avistado | `#5B3FA6` | **0.0853** |

Each step is a real luminance drop (.090, .013, .061). The order matches the
petPalette.css inline staircase note (`.25 > .16 > .15 > .09`). Confirmed: the
staircase still holds with reunido inserted, so the four hues separate by VALUE
even when hue collapses under CVD.

## 4. Fixes applied (token-only; staircase preserved)

| Fix | What | Why |
|---|---|---|
| pets.css brand-pair annotation (4 comments) | "≈ 6.4:1" → measured **5.70:1** | Recorded ratio was drifted; brought to the documented-ratio standard. No token/hex changed → staircase + all other ratios untouched. Still PASS (>=4.5). |
| pets.css `.pet-detail__photo-placeholder-glyph` ring comment | Strengthened the 2.96:1 justification to cite WCAG 2.2 SC 1.4.11 pure-decoration exemption | The disc ring is decorative, encodes no state; the inline note now makes the sub-floor value explicitly intentional and airtight (see §5). |
| petPalette.css header | Added PET-M24 re-audit stamp (staircase + CVD re-verified, no fix needed) | The SOT file records that the gate re-measured and the analysis holds. |

No token VALUE was altered, so no re-measure of the staircase or the 16 accent
ratios was needed beyond confirming reproduction — every one reproduced exactly.

## 5. The one sub-floor pairing — documented exemption (not a violation)

`--mdf-ink-subtle` ring on `--pet-placeholder-tint` = **2.96:1** (vs the 3:1
graphical floor). This is the thin decorative disc behind the species emoji in the
photoless placeholder. It is EXEMPT, not a violation:

- It is **pure decoration** (WCAG 2.2 SC 1.4.11 explicitly exempts pure
  decoration). It encodes no state and is not an operable UI component.
- No information depends on perceiving the ring: the accessible meaning of the
  empty state comes 100% from the placeholder TEXT (`--mdf-ink-muted` 5.74:1 — AA
  pass) plus the JSX `aria-label`.
- Raising the ring to >= 3:1 (e.g. `--mdf-ink-muted`) would harden the frame and
  fight the calm tone of the empty state for zero accessibility gain.

The inline comment now states this explicitly so a future reader cannot mistake
2.96:1 for a passing graphical ratio or reuse the ring as a state boundary.

## 6. Gate

Run and reported in the task response: `npm run lint`, `npm run build`, and a
SERVED axe run (`npx serve out -l 3016`, then `@axe-core/cli` against
`http://localhost:3016/pets` and `http://localhost:3016/` for the M22 cross-link
hunger surface) with the wcag2a/2aa/21a/21aa/22aa tag set. The PET-M24 YAML gate
is **lint + a11y** with zero AA contrast violations on the new `/pets` surfaces.
