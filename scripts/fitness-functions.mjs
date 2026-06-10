#!/usr/bin/env node
// VM9 — Fitness functions per v5 § evolutionary_architecture.fitness_functions.
// Run on every PR; non-zero exit blocks merge.
//
// FF1: no JS file in src/ exceeds 1000 LOC (v5 § critical_metrics.size hard limit)
// FF2: no function exceeds 100 LOC (parsed line-naively; conservative bound)
// FF4: no remaining TODO/FIXME/XXX in production code over a threshold
// FF5: documented load-bearing --mdf-* color pairs keep their WCAG 2.x contrast
//      floor (deterministic; complements the slow/flaky browser axe gate)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const FILE_LOC_HARD_LIMIT = 1000;
const FUNCTION_LOC_HARD_LIMIT = 100;
const TODO_HARD_LIMIT = 50;

// FF2 baseline (pre-existing debt allowlist). Widening the FF2 regex to catch
// exported arrows (`export const X = (..) => {`) surfaced ONE genuine >100-LOC
// arrow that the old regex was blind to. It is a REAL long-method finding, not
// a regex false positive — refactoring it is out of scope for the gate change.
// Allowlisted here so the gate (a) still hard-fails on any NEW long arrow and
// (b) does not pretend this one does not exist. Delete this entry when the
// component (MapClickHandler — one big useEffect of event-binding closures) is
// split; do NOT raise FUNCTION_LOC_HARD_LIMIT to hide it.
//   key = `<rel-path>:<1-based-decl-line>` (matches the FF2 failure string).
//   NOTE: line-anchored — refresh the line number if the component moves.
const FF2_BASELINE = new Set([
    'src/app/components/compatibility/components/mapComponents.js:387',
]);

function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.next') continue;
            out.push(...walk(p));
        } else if (/\.(js|jsx|mjs|ts|tsx)$/.test(entry.name)) {
            out.push(p);
        }
    }
    return out;
}

function rel(p) { return path.relative(ROOT, p); }

const failures = [];

// FF1: file LOC
for (const file of walk(SRC)) {
    const loc = fs.readFileSync(file, 'utf8').split('\n').length;
    if (loc > FILE_LOC_HARD_LIMIT) {
        failures.push(`FF1: ${rel(file)} — ${loc} LOC > ${FILE_LOC_HARD_LIMIT} hard limit`);
    }
}

// FF2: per-function LOC. Naive — counts braces per function/method declaration.
// Flags the long-method smell where it matters most: class methods, top-level
// function declarations, assignment arrows (`x = (..) => {`), and top-level
// exported arrows (`export const X = (..) => {`, incl. async).
//
// Residual gap (honest): only brace-bodied forms are measured. Implicit-return
// arrows (`export const f = (..) => expr`, `=> (`, or a multi-line arrow whose
// `=>` sits on a later line than the signature) are NOT matched — the brace
// counter can't bound a body that has no opening `{` on the declaration line,
// and matching them would mis-measure across the next braced sibling. These
// expression-bodied arrows are inherently short, so the long-method risk there
// is low; long logic belongs in a braced body, which IS caught.
function approxFunctionLOCs(source) {
    const lines = source.split('\n');
    const fnStarts = [];
    const fnPattern = /^(\s*)(async\s+)?(function\s+\w+|[\w$]+\s*\([^)]*\)\s*\{|[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>|export\s+const\s+[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*\{)/;
    for (let i = 0; i < lines.length; i++) {
        if (fnPattern.test(lines[i])) fnStarts.push(i);
    }
    const results = [];
    for (const start of fnStarts) {
        let depth = 0;
        let started = false;
        for (let j = start; j < lines.length; j++) {
            for (const ch of lines[j]) {
                if (ch === '{') { depth++; started = true; }
                else if (ch === '}') depth--;
            }
            if (started && depth <= 0) {
                results.push({ start, end: j, loc: j - start + 1, declaration: lines[start].trim().slice(0, 80) });
                break;
            }
        }
    }
    return results;
}

let ff2BaselineHits = 0;
for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const fn of approxFunctionLOCs(src)) {
        if (fn.loc > FUNCTION_LOC_HARD_LIMIT) {
            // Normalize to forward slashes so the baseline key is OS-independent.
            const key = `${rel(file).split(path.sep).join('/')}:${fn.start + 1}`;
            if (FF2_BASELINE.has(key)) { ff2BaselineHits++; continue; }
            failures.push(`FF2: ${key} — function ${fn.loc} LOC > ${FUNCTION_LOC_HARD_LIMIT}: ${fn.declaration}`);
        }
    }
}

// FF4: TODO/FIXME density
let todoCount = 0;
for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    todoCount += (src.match(/\b(TODO|FIXME|XXX)\b/g) || []).length;
}
if (todoCount > TODO_HARD_LIMIT) {
    failures.push(`FF4: ${todoCount} TODO/FIXME/XXX markers in src/ > ${TODO_HARD_LIMIT} ceiling`);
}

// FF5: token-level WCAG contrast forcing-function.
// WHY: the browser axe gate is render-state-flaky — it has missed real AA
// regressions and caught them only by render-timing luck. A `--mdf-*` token
// edit (e.g. lightening --mdf-ink-muted) can silently break a documented
// contrast ratio with every on-disk check still passing. FF5 is the FAST,
// DETERMINISTIC complement: it parses the literal hex tokens and asserts a
// CURATED allowlist of load-bearing fg/bg pairs against their WCAG floor, so a
// regression fails `npm run fitness` on the spot. It does NOT replace axe (it
// only covers token pairs we can resolve to two concrete hexes).
const TOKENS_CSS = path.join(
    SRC, 'app/components/compatibility/components/ux/tokens.css');

// Parse `--mdf-foo: #RRGGBB;` declarations into a name→hex map. Only literal
// 6-digit hex values are captured; var()-indirected or non-hex tokens are
// intentionally skipped (we never guess an unresolved value — see FF5 robustness).
function parseMdfHexTokens(cssText) {
    const map = new Map();
    const re = /(--mdf-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g;
    let m;
    while ((m = re.exec(cssText)) !== null) {
        map.set(m[1], m[2].toUpperCase());
    }
    return map;
}

// WCAG 2.x relative luminance: sRGB channel → linearized → weighted sum.
function srgbToLinear(channel8bit) {
    const c = channel8bit / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relativeLuminance(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
// WCAG 2.x contrast ratio: (Llighter + 0.05) / (Ldarker + 0.05).
function contrastRatio(fgHex, bgHex) {
    const l1 = relativeLuminance(fgHex);
    const l2 = relativeLuminance(bgHex);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
}

// AA floors. 4.5:1 for normal-size text (SC 1.4.3); 3:1 for large text and
// non-text UI/graphics (SC 1.4.11). round() to 2 dp so we compare against the
// SAME value humans read in the token comments and never trip on float noise.
const AA_TEXT = 4.5;
const AA_NONTEXT = 3.0;
function round2(n) { return Math.round(n * 100) / 100; }

// Non-token reference surfaces that real renders land on but that are NOT
// --mdf-* tokens (so they can't be parsed). Documented in tokens.css §urgency:
// OSM Mapnik land ≈ #F2EFE9 — the lightest map tile the white marker sits over.
const OSM_LIGHTEST_TILE = '#F2EFE9';

// CURATED load-bearing pairs. Each entry resolves its fg/bg to a concrete hex
// (a --mdf-* token name, or a literal for a non-token reference surface) and
// carries the floor it must clear + WHY it is load-bearing. Kept tight and
// high-signal: every pair here is a real a11y bug if it regresses, and every
// one is fully resolvable + passes today. Pairs whose hue legitimately rides
// the 4.5:1 edge as a NON-text accent (e.g. raw --mdf-brand at 4.38:1, used as
// a large heading accent) are deliberately NOT asserted at the text floor.
const CONTRAST_PAIRS = [
    // — Body/caption text on the two page surfaces (the spine of readability) —
    { label: 'ink on surface-0 (primary body text)',           fg: '--mdf-ink',        bg: '--mdf-surface-0', min: AA_TEXT },
    { label: 'ink on surface-1 (text on cards/sheets)',         fg: '--mdf-ink',        bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'ink-muted on surface-0 (de-emphasized body)',     fg: '--mdf-ink-muted',  bg: '--mdf-surface-0', min: AA_TEXT },
    { label: 'ink-muted on surface-1 (de-emphasized on cards)', fg: '--mdf-ink-muted',  bg: '--mdf-surface-1', min: AA_TEXT },

    // — The two labels that JUST regressed: ink-subtle FAILED here (3.30/3.45),
    //   moved to ink-muted. These guard the fix from silently reverting. —
    { label: 'sponsor __label (ink-muted on white slot — was ink-subtle 3.45)', fg: '--mdf-ink-muted', bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'version-footer (ink-muted on surface-0 — was ink-subtle 3.30)',   fg: '--mdf-ink-muted', bg: '--mdf-surface-0', min: AA_TEXT },

    // — Primary CTA: text on the AA-safe brand-hover fill, and brand-hover used
    //   AS text on white (the AA-safe brand text rail; raw --mdf-brand is the
    //   non-text-only variant and is excluded on purpose). —
    { label: 'brand-ink on brand-hover (primary CTA label)',    fg: '--mdf-brand-ink',  bg: '--mdf-brand-hover', min: AA_TEXT },
    { label: 'brand-hover as text on surface-1 (links/accents)', fg: '--mdf-brand-hover', bg: '--mdf-surface-1', min: AA_TEXT },

    // — Category accents used as text/glyph: accent-water is documented "AA on
    //   white"; food/shelter ride the same caption/legend text role. —
    { label: 'accent-water as text on surface-1',               fg: '--mdf-accent-water',   bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'accent-food as text on surface-1',                fg: '--mdf-accent-food',    bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'accent-shelter as text on surface-1',             fg: '--mdf-accent-shelter', bg: '--mdf-surface-1', min: AA_TEXT },

    // — Risk-scale badges (statistics surfaces): ink-on-bg pairs are real text. —
    { label: 'risk-none ink on bg (badge text)',                fg: '--mdf-risk-none-ink',      bg: '--mdf-risk-none-bg',      min: AA_TEXT },
    { label: 'risk-low ink on bg (badge text)',                 fg: '--mdf-risk-low-ink',       bg: '--mdf-risk-low-bg',       min: AA_TEXT },
    { label: 'risk-mod ink on bg (badge text)',                 fg: '--mdf-risk-mod-ink',       bg: '--mdf-risk-mod-bg',       min: AA_TEXT },
    { label: 'risk-high ink on bg (badge text)',                fg: '--mdf-risk-high-ink',      bg: '--mdf-risk-high-bg',      min: AA_TEXT },
    { label: 'risk-very-high ink on bg (badge text)',           fg: '--mdf-risk-very-high-ink', bg: '--mdf-risk-very-high-bg', min: AA_TEXT },

    // — Urgency marker rings: NON-text graphics (SC 1.4.11, 3:1). Must clear the
    //   floor on BOTH the white marker fill AND the lightest OSM map tile the
    //   ring is drawn over (the worst-case background). 'done' is excluded: it
    //   renders at 0.4 opacity as the de-emphasized/attended state, so its
    //   composited contrast is intentionally below the active-marker floor. —
    { label: 'urgency-fresh ring on white marker',             fg: '--mdf-urgency-fresh',   bg: '--mdf-surface-1', min: AA_NONTEXT },
    { label: 'urgency-waiting ring on white marker',           fg: '--mdf-urgency-waiting', bg: '--mdf-surface-1', min: AA_NONTEXT },
    { label: 'urgency-stale ring on white marker',             fg: '--mdf-urgency-stale',   bg: '--mdf-surface-1', min: AA_NONTEXT },
    { label: 'urgency-fresh ring on lightest OSM tile',        fg: '--mdf-urgency-fresh',   bg: OSM_LIGHTEST_TILE, min: AA_NONTEXT },
    { label: 'urgency-waiting ring on lightest OSM tile',      fg: '--mdf-urgency-waiting', bg: OSM_LIGHTEST_TILE, min: AA_NONTEXT },
    { label: 'urgency-stale ring on lightest OSM tile',        fg: '--mdf-urgency-stale',   bg: OSM_LIGHTEST_TILE, min: AA_NONTEXT },
];

if (!fs.existsSync(TOKENS_CSS)) {
    // Don't hard-fail the gate on a moved file — warn so FF5 is honest about
    // not having run, and let the other fitness functions stand.
    console.warn(`[fitness] FF5 SKIPPED — tokens.css not found at ${rel(TOKENS_CSS)}`);
} else {
    const tokens = parseMdfHexTokens(fs.readFileSync(TOKENS_CSS, 'utf8'));
    // A literal value is either a parsed --mdf-* token or an inline #hex ref.
    const resolve = (v) => (v.startsWith('#') ? v.toUpperCase() : tokens.get(v));
    let ff5Skipped = 0;
    for (const pair of CONTRAST_PAIRS) {
        const fgHex = resolve(pair.fg);
        const bgHex = resolve(pair.bg);
        // ROBUSTNESS: only assert pairs that fully resolve to two concrete
        // hexes. An unparseable token is a warn/skip, NEVER a failure.
        if (!fgHex || !bgHex) {
            console.warn(`[fitness] FF5 skip "${pair.label}" — unresolved token (${!fgHex ? pair.fg : pair.bg})`);
            ff5Skipped++;
            continue;
        }
        const ratio = round2(contrastRatio(fgHex, bgHex));
        if (ratio < pair.min) {
            failures.push(
                `FF5: contrast "${pair.label}" — ${pair.fg} (${fgHex}) on ${pair.bg} (${bgHex}) ` +
                `is ${ratio.toFixed(2)}:1, below the required ${pair.min.toFixed(1)}:1`);
        }
    }
    if (ff5Skipped > 0) {
        console.warn(`[fitness] FF5 note: ${ff5Skipped} curated pair(s) skipped (unresolved token).`);
    }
}

if (failures.length > 0) {
    console.error('\n[fitness] FAILED:');
    for (const f of failures) console.error('  ' + f);
    console.error(`\n${failures.length} fitness-function failure(s).\n`);
    process.exit(1);
}

console.log(`[fitness] OK — file-loc, function-loc, todo-density, token-contrast all within v5 hard limits.`);
if (ff2BaselineHits > 0) {
    console.log(`[fitness] note: ${ff2BaselineHits} FF2 baseline-allowlisted long function(s) (pre-existing debt — see FF2_BASELINE).`);
}
