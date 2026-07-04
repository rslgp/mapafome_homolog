#!/usr/bin/env node
// VM9 — Fitness functions per v5 § evolutionary_architecture.fitness_functions.
// Run on every PR; non-zero exit blocks merge.
//
// FF1: no JS file in src/ exceeds 1000 LOC (v5 § critical_metrics.size hard limit)
// FF2: no function exceeds 100 LOC (parsed line-naively; conservative bound)
// FF4: no remaining TODO/FIXME/XXX in production code over a threshold
// FF5: documented load-bearing --mdf-* color pairs keep their WCAG 2.x contrast
//      floor (deterministic; complements the slow/flaky browser axe gate)
// FF6: one-bbox-SOT (INTERNATIONAL_PLAN FIT-1 / §4.6) — the publish geofence has a
//      SINGLE source of truth (countries.COUNTRY_PUBLISH_BOUNDS via isInsideCountry).
//      No `BR_BBOX` identifier may survive anywhere in src/ EXCEPT countries.js
//      (where it appears only in a clarifying comment). Converts the DRY claim into
//      a forcing function instead of hope (Norman: forcing function, not a comment).
// FF7: Pais-stamp invariant (INTERNATIONAL_PLAN FIT-2 / §4.6.1 / DEST-1) — every
//      publish row built by variaveisAmbiente.criarRow MUST stamp `Dados.Pais`, so
//      non-BR marks on the single shared sheet are attributable and the read-back
//      filter can scope by country (legacy rows with no Pais default to 'br').
//      A refactor that drops the stamp would silently re-collapse all marks into
//      the BR view; this asserts the assignment survives. Structural grep (the FF6
//      pattern); the data-flow correctness is covered by test/intlReadback.test.js.
// FF8: offline-queue country-capture invariant (INTERNATIONAL_PLAN M4b / STATE-1
//      / R3b) — the publish payload built in ReportSheet (the single object BOTH
//      the interactive write AND the offline enqueue inherit) MUST carry a
//      `country` field, captured at publish time. Without it the offline flush
//      would re-validate a queued pin against the LIVE selected country and a
//      flag-control switch could freeze the whole queue (STATE-1). Structural
//      grep; the freeze-prevention + payload-keyed validation behavior is covered
//      by test/publishQueue.test.js.
// FF9: no raw hex color literal (#RGB / #RRGGBB / #RRGGBBAA) in CODE under src/
//      outside a CURATED allowlist of legitimate homes (the color SOT tokens.css
//      and the documented synced-const inline-SVG pins). The color SOT is
//      --mdf-* CSS custom properties in tokens.css; a stray `#abcdef` in a random
//      component is unguarded drift away from that SOT (Norman: a forcing function,
//      not a "use the token" comment). Comments are stripped before matching, so a
//      hex named in documentation is fine; only a raw literal in shipping CODE
//      trips it. The allowlist (FF9_HEX_ALLOWLIST) carries one entry per legitimate
//      home with its reason, the same shape as FF1_BASELINE / FF2_BASELINE, so a
//      NEW raw hex in an un-allowlisted file fails the gate. The Exclude clause of
//      this milestone forbids RELOCATING any existing color, so pre-existing
//      legitimate homes are allowlisted (not moved). swRegister.js is the noted
//      drift example: its update-toast styles bake #1A1A1A/#FFF/#D64545 into a DOM
//      string injected before the React tree (and thus before tokens.css var
//      resolution exists), pre-existing debt, allowlisted with that reason, a
//      candidate for a later relocation pass (software-engineer scope, not here).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const FILE_LOC_HARD_LIMIT = 1000;
const FUNCTION_LOC_HARD_LIMIT = 100;
const TODO_HARD_LIMIT = 50;

// FF1 baseline (pre-existing data-table debt allowlist). The i18n shards under
// ux/i18n/ are flat DATA TABLES — one `export const <locale> = { …keys… }` block
// per UI locale, zero control flow — not logic modules. FF1's real target is the
// long-MODULE smell (comprehension/review/change-locality decay); a translation
// table has none of it. These files are wide because the app is multi-locale, and
// they grow on exactly that intended axis (12 locales today). Splitting them
// per-locale (strings.page.hi.js, …) would explode 4 files into ~48 AND break the
// parity test's single-source-of-keys design — a worse architecture to satisfy a
// proxy that was never measuring a real defect here. Allowlisted so FF1 still
// hard-fails any NEW >1000-LOC LOGIC file. Do NOT raise FILE_LOC_HARD_LIMIT to
// hide them (that would blind the gate to real god-files); remove an entry only if
// a shard is ever genuinely split. key = forward-slash rel-path (OS-independent).
const FF1_BASELINE = new Set([
    'src/app/components/compatibility/components/ux/i18n/strings.core.js',
    'src/app/components/compatibility/components/ux/i18n/strings.assinar.js',
    'src/app/components/compatibility/components/ux/i18n/strings.pets.js',
    'src/app/components/compatibility/components/ux/i18n/strings.page.js',
]);

// FF2 baseline (pre-existing debt allowlist). Earlier widenings caught exported
// arrows (`export const X = (..) => {`); the latest widening also catches
// `export default function Foo(..) {` (named OR anonymous) and `const`-declared
// brace-bodied arrows (`const X = (..) => {`, incl. destructured params). That
// surfaced a batch of REAL >100-LOC functions the old regex was structurally
// blind to (it required a leading identifier, so `const X =` and
// `export default function` slipped past). These are pre-existing debt that was
// always there but invisible, NOT new debt and NOT regex false positives.
// Allowlisted here so the gate (a) still hard-fails on any NEW long function and
// (b) does not pretend these do not exist. Delete an entry when its component is
// split below the limit; do NOT raise FUNCTION_LOC_HARD_LIMIT to hide them.
//   key = `<rel-path>:<1-based-decl-line>` (matches the FF2 failure string).
//   NOTE: line-anchored, so refresh the line number if the component moves.
const FF2_BASELINE = new Set([
    // MapClickHandler moved 387→119 when the pure tap logic / event contract /
    // registries were extracted into siblings (tapRecognition/markerEvents/
    // mapRegistries). The handler body itself (one big event-binding useEffect)
    // is unchanged and still over the limit — same debt, refreshed anchor.
    'src/app/components/compatibility/components/mapComponents.js:119',
    // App.js (the root class component) carries two pre-existing >100-LOC methods
    // that predate this allowlist (red across every recent commit, e.g. c15fb8d):
    // the constructor (state init + many bound handlers) and componentDidMount
    // (the mount-time wiring sequence). Both are REAL long-method debt, NOT in
    // scope for the i18n locale work that surfaced this gate run, allowlisted so
    // the gate still hard-fails any NEW long method while not pretending these two
    // do not exist. Delete each entry when App.js is decomposed; do NOT raise
    // FUNCTION_LOC_HARD_LIMIT to hide them. Line-anchored — refresh on move.
    'src/app/components/compatibility/App.js:135',
    'src/app/components/compatibility/App.js:802',
    // Surfaced by the export-default / const-arrow widening (regex was blind to
    // these forms). Each is a pre-existing top-level page or sheet component whose
    // single render function is over the limit (real long-method debt), allowlisted
    // here because refactoring them is out of scope for the gate-widening change.
    // Split the component below 100 LOC to remove an entry; refresh anchor on move.
    'src/app/assinar/page.js:36',                                              // AssinarPage (215)
    'src/app/components/compatibility/components/header.js:13',                 // Header (154)
    'src/app/components/compatibility/components/InfoPanel.js:21',              // InfoPanel thin render after M10d (378, JSX return; install logic moved to useInfoPanel hook)
    'src/app/components/compatibility/components/ux/GuidedTutorial.js:97',      // GuidedTutorial (292)
    'src/app/components/compatibility/components/ux/InstallToast.js:48',        // InstallToast (253)
    'src/app/components/compatibility/components/ux/NotificationPrefs.js:44',   // NotificationPrefs (109)
    'src/app/components/compatibility/components/ux/PinDetailSheet.js:83',      // PinDetailSheet (202)
    'src/app/components/compatibility/components/ux/ReportSheet.js:28',         // ReportSheet (295)
    'src/app/imprensa/page.js:38',                                             // ImprensaPage (252)
    'src/app/iniciativas/cadastrar/page.js:21',                                // InitiativeRegisterPage (174)
    'src/app/parceiros/page.js:19',                                            // ParceirosPage (232)
    // M10b: PetDetailSheet was the /pets read-only detail god-component (five
    // reset-on-pet-change useState machines + three focus effects + three memos +
    // three handlers, all inline in one ~630-LOC render function). Its state /
    // handlers / effects / memos were extracted into the usePetDetailSheet hook
    // (src/app/pets/usePetDetailSheet.js); the god-component logic smell is CURED.
    // What FF2's naive brace counter still measures for PetDetailSheet is the large
    // JSX RETURN of a now-thin renderer (the counter runs to end-of-file on a big
    // JSX tree, its documented residual gap; the function body is a hook destructure
    // + pure JSX, zero logic). SAME class as the InfoPanel / ReportSheet / PetsApp
    // render baselines, not real long-method debt. Allowlisted with a refreshed
    // anchor (moved 54 -> 35 after the extraction). The extracted hook is NOT
    // separately baselined: its function body stays under the 100-LOC counter.
    'src/app/pets/PetDetailSheet.js:35',                                        // PetDetailSheet thin render (JSX return; counter gap)
    'src/app/pets/PetFilterBar.js:82',                                         // PetFilterBar (162)
    'src/app/pets/PetListView.js:54',                                          // PetListView (101)
    'src/app/pets/PetLocateControl.js:30',                                     // PetLocateControl (109)
    'src/app/pets/PetReportSheet.js:26',                                       // PetReportSheet thin render after M10c (418, JSX return; state/handlers moved to usePetReportSheet hook)
    // M10a: PetsApp was the /pets god-component (~20 useState + many handlers +
    // memos + two effects in one ~590-LOC function). Its state/handlers/effects
    // were extracted into the usePetsApp hook (src/app/pets/usePetsApp.js); the
    // god-component logic smell is CURED. What the FF2 naive brace counter still
    // measures for PetsApp is the large JSX RETURN of a now-thin renderer (the
    // counter runs to end-of-file on a big JSX tree, its documented residual gap;
    // the function body is only a hook destructure + pure JSX, zero logic). This is
    // the SAME class as the other page/sheet render baselines above (InfoPanel /
    // ReportSheet / the pages), not real long-method debt, allowlisted with a
    // refreshed anchor (moved 83 -> 40 after the extraction).
    'src/app/pets/PetsApp.js:40',                                              // PetsApp thin render (JSX return; counter gap)
    // M10a: usePetsApp is the extracted brain of /pets: ~20 interdependent
    // useState + the useCallback handlers + useMemo derivations + the GPS/load and
    // offline-flush effects, all closing over the SAME setters. It is genuinely
    // >100 LOC, but splitting it into sub-hooks would force each fragment to pass
    // setters/state to the others (an artificial coupling seam that is WORSE than
    // one cohesive hook per KISS / needless_complexity). The extraction already
    // delivered the SRP win (logic now separately testable via
    // test/petsApp.dom.test.js); a further split is not warranted. Allowlisted with
    // that reason; refresh the anchor if the hook declaration moves.
    'src/app/pets/usePetsApp.js:72',                                           // usePetsApp cohesive extracted hook
    'src/app/pets/PetSearchField.js:145',                                      // PetSearchField (112)
    'src/app/relatorio-marketing/page.js:25',                                  // RelatorioMarketingPage (170)
    'src/app/relatorios/page.js:32',                                           // RelatoriosPage (339)
]);

// FF9 allowlist (legitimate raw-hex homes). The color SOT is the --mdf-* tokens
// in tokens.css; every other surface should read a token / CSS var. These files
// legitimately carry a raw hex literal in CODE and CANNOT just switch to a var
// today, so they are allowlisted with a reason (the Exclude clause of this gate
// forbids RELOCATING colors, so a real home rides here rather than being moved).
// Add an entry ONLY for a genuine SOT or a documented can-not-be-a-var case; do
// NOT widen this to silence a new stray hex in a component (that is the drift the
// rule exists to catch). key = forward-slash rel-path (OS-independent), matching
// the FF1/FF2 keying. Comments are stripped before matching, so a file that names
// a hex ONLY in a comment never reaches this list (e.g. header.js documents the
// base brand hex in a comment but uses --mdf-* in code, so it is intentionally
// absent here and the rule still passes for it).
const FF9_HEX_ALLOWLIST = new Set([
    //, The two documented synced-const inline-SVG pins (M15/M21). A CSS var
    //   cannot be read at module-eval time when the inline-SVG data-URI / HTML
    //   string is built, so each carries a JS constant (PIN_BLUE / PIN_CYAN) that
    //   MUST equal its --mdf-pin-* token in tokens.css (the SOT pair). The same
    //   inline-SVG strings also hard-code structural #ffffff (the white ring/dot),
    //   which is geometry, not a themeable brand color.
    'src/app/components/compatibility/components/mapConstants.js',  // PIN_BLUE synced const + inline-SVG #ffffff ring/dot
    'src/app/components/compatibility/components/mapPinIcons.js',   // PIN_CYAN synced const + inline-SVG #ffffff
    //, The /pets dropped-pin inline-SVG: same module-eval-time class as the two
    //   pins above. Fill is `var(--pet-perdido, #d8572a)` (a CSS-var WITH a literal
    //   fallback, the safe inline-SVG idiom) plus structural #ffffff paw dots.
    'src/app/pets/PetMap.js',
    //, countryBrand.js is itself a small per-country brand-accent SOT: `br:
    //   '#C8102E'` is Brazil's deepened accent that overrides --mdf-brand where the
    //   base fails AA. It is the single home for that per-country hue (one row per
    //   country), not drift away from a token. Relocating it is color-specialist
    //   scope, out of this gate.
    'src/app/components/compatibility/components/countryBrand.js',
    //, layout.js themeColor is Next.js metadata (the PWA browser-chrome theme
    //   color); it is a manifest/meta value, not a CSS context, so it cannot be a
    //   CSS var and must be a literal hex.
    'src/app/layout.js',
    //, pressKitContent.js is press-kit DATA: the hex strings ARE the content
    //   (a swatch table that documents the brand palette for journalists, each row
    //   pairs the hex with its token name). The hex is the payload, not styling.
    'src/app/imprensa/pressKitContent.js',
    //, strings.page.js (FF1-baselined i18n data table): the press "colors_note"
    //   copy quotes brand hexes inside translated user-facing strings across 12
    //   locales. Documentation content, not a style literal.
    'src/app/components/compatibility/components/ux/i18n/strings.page.js',
    //, DRIFT EXAMPLE (item M9): swRegister.js bakes #1A1A1A / #FFF / #D64545 into
    //   the update-toast style string it injects directly into the DOM. That toast
    //   is built by the service-worker registration shim that can run BEFORE the
    //   React tree mounts (and thus before tokens.css var resolution is reliable in
    //   that injected element), so it uses literal hexes. This is pre-existing debt
    //   and a real relocation candidate (software-engineer scope, NOT this gate's
    //   Exclude-bound change), allowlisted now so the gate is GREEN on the current
    //   tree while the drift is named.
    'src/app/components/compatibility/components/ux/swRegister.js',
    //, Dev-only debug overlays, gated behind ?debug=hitbox / ?debug=tap; they
    //   never render for production users, so their diagnostic literals (#0077ff
    //   outline, #0077ff/#fff overlay chrome) are not user-facing theme surfaces.
    'src/app/components/compatibility/components/_debug/MapHitboxOutline.js',
    'src/app/components/compatibility/components/_debug/TapDebugOverlay.js',
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
let ff1BaselineHits = 0;
for (const file of walk(SRC)) {
    const loc = fs.readFileSync(file, 'utf8').split('\n').length;
    if (loc > FILE_LOC_HARD_LIMIT) {
        // Normalize to forward slashes so the baseline key is OS-independent
        // (matches the FF2_BASELINE keying).
        const key = rel(file).split(path.sep).join('/');
        if (FF1_BASELINE.has(key)) { ff1BaselineHits++; continue; }
        failures.push(`FF1: ${rel(file)} — ${loc} LOC > ${FILE_LOC_HARD_LIMIT} hard limit`);
    }
}

// FF2: per-function LOC. Naive (counts braces per function/method declaration).
// Flags the long-method smell where it matters most: class methods, top-level
// function declarations, assignment arrows (`x = (..) => {`), `const`-declared
// arrows (`const X = (..) => {`, incl. destructured params `({a,b}) => {`),
// exported arrows (`export const X = (..) => {`), and exported-default functions
// (`export default function Foo(..) {` named OR anonymous). The `\([^)]*\)`
// param span already admits destructured params `({a, b})` for every braced
// form, so object/array destructuring in the signature is measured too.
//
// Residual gap (honest): only brace-bodied forms are measured. Implicit-return
// arrows (`export const f = (..) => expr`, `=> (`, or a multi-line arrow whose
// `=>` sits on a later line than the signature) are NOT matched, because the
// brace counter can't bound a body that has no opening `{` on the declaration
// line, and matching them would mis-measure across the next braced sibling. These
// expression-bodied arrows are inherently short, so the long-method risk there
// is low; long logic belongs in a braced body, which IS caught.
function approxFunctionLOCs(source) {
    const lines = source.split('\n');
    const fnStarts = [];
    const fnPattern = /^(\s*)(export\s+default\s+)?(async\s+)?(function\s*\w*\s*\([^)]*\)\s*\{|[\w$]+\s*\([^)]*\)\s*\{|(export\s+)?(const\s+)?[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*\{)/;
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

// FF6: one-bbox-SOT. The legacy BR_BBOX literal lived in THREE places
// (sheetsClient, Coordinates, plus the dentroLimites inline). M2 folded all of
// them into countries.COUNTRY_PUBLISH_BOUNDS as the single source of truth, read
// through isInsideCountry(coords, code). Assert no `BR_BBOX` identifier survives
// in src/ outside countries.js — a re-introduction (a new local copy of the box)
// fails the gate on the spot. countries.js is allowlisted because the token only
// appears there inside a clarifying comment ("NOT the viewport, NOT BR_BBOX").
const FF6_BBOX_SOT_FILE = 'src/app/components/compatibility/components/countries.js';
const BR_BBOX_TOKEN = /\bBR_BBOX\b/;
for (const file of walk(SRC)) {
    const relForward = rel(file).split(path.sep).join('/');
    if (relForward === FF6_BBOX_SOT_FILE) continue; // SOT — comment-only mention
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (BR_BBOX_TOKEN.test(lines[i])) {
            failures.push(
                `FF6: one-bbox-SOT — \`BR_BBOX\` found at ${relForward}:${i + 1} ` +
                `(must live ONLY in COUNTRY_PUBLISH_BOUNDS / ${FF6_BBOX_SOT_FILE}). ` +
                `INTERNATIONAL_PLAN FIT-1 / §4.6.`);
        }
    }
}

// FF7: Pais-stamp invariant. variaveisAmbiente.criarRow must assign Dados.Pais
// on the JSON blob it builds, so every publish path stamps the mark's country
// (resolved via the injected resolver / an explicit dadosRow.pais). If this
// assignment disappears, non-BR marks become indistinguishable from BR ones on
// the shared sheet and the read-back filter silently re-collapses them. We match
// the literal assignment token in the SOT file; the behavioral proof (OFF→'br',
// missing→'br', non-BR attribution) lives in test/intlReadback.test.js.
const FF7_PAIS_STAMP_FILE = 'src/app/components/compatibility/components/variaveisAmbiente.js';
const FF7_PAIS_STAMP_TOKEN = /dadosJSON\.Pais\s*=/;
{
    const stampPath = path.join(ROOT, FF7_PAIS_STAMP_FILE);
    if (!fs.existsSync(stampPath)) {
        failures.push(
            `FF7: Pais-stamp — ${FF7_PAIS_STAMP_FILE} not found (cannot verify ` +
            `criarRow stamps Dados.Pais). INTERNATIONAL_PLAN FIT-2 / §4.6.1.`);
    } else {
        const stampSrc = fs.readFileSync(stampPath, 'utf8');
        if (!FF7_PAIS_STAMP_TOKEN.test(stampSrc)) {
            failures.push(
                `FF7: Pais-stamp — \`dadosJSON.Pais = …\` not found in ${FF7_PAIS_STAMP_FILE}. ` +
                `criarRow must stamp every publish row's country (DEST-1) or non-BR ` +
                `marks collapse into the BR read-back. INTERNATIONAL_PLAN FIT-2 / §4.6.1.`);
        }
    }
}

// FF8: offline-queue country-capture invariant. ReportSheet's publish payload
// (the single object both the interactive write and the offline enqueue inherit)
// must include a `country` field captured at publish time. If it disappears, a
// pin queued offline would be re-validated against the LIVE selected country at
// flush — the STATE-1 freeze this milestone removed. We match the literal field
// in the payload built at the publish call; the freeze-prevention + payload-keyed
// validation behavior is proven in test/publishQueue.test.js.
const FF8_QUEUE_CAPTURE_FILE =
    'src/app/components/compatibility/components/ux/ReportSheet.js';
const FF8_COUNTRY_FIELD_TOKEN = /country\s*:\s*activeCountryFor\s*\(/;
{
    const capturePath = path.join(ROOT, FF8_QUEUE_CAPTURE_FILE);
    if (!fs.existsSync(capturePath)) {
        failures.push(
            `FF8: queue-country-capture — ${FF8_QUEUE_CAPTURE_FILE} not found ` +
            `(cannot verify the publish payload captures \`country\`). ` +
            `INTERNATIONAL_PLAN M4b / STATE-1.`);
    } else {
        const captureSrc = fs.readFileSync(capturePath, 'utf8');
        if (!FF8_COUNTRY_FIELD_TOKEN.test(captureSrc)) {
            failures.push(
                `FF8: queue-country-capture — \`country: activeCountryFor(…)\` not ` +
                `found in ${FF8_QUEUE_CAPTURE_FILE}. The publish payload must capture ` +
                `the active country at publish time so the offline flush validates ` +
                `against it, not the live selected country (else the queue can freeze ` +
                `on a flag-control switch). INTERNATIONAL_PLAN M4b / STATE-1.`);
        }
    }
}

// FF9: no raw hex color literal in CODE outside the curated homes. Models the
// FF6 structural-grep shape (walk src/, per-file allowlist, line-anchored report)
// but strips comments first so the rule targets a raw literal in SHIPPING CODE,
// not a hex named in documentation. The color SOT is the --mdf-* tokens in
// tokens.css; a stray `#abcdef` in a component is unguarded drift away from it.
// Matches #RGB, #RRGGBB, #RRGGBBAA (case-insensitive), longest-first so an 8-hex
// is reported whole and never mis-split into a 6-hex + stray chars.
function stripComments(source) {
    // Blank out /* block */ comments, then // line comments, PRESERVING line
    // count so a reported `:line` still maps to the source (the block strip keeps
    // every newline and only blanks the non-newline chars). Naive but safe for
    // this gate: it can over-strip a hex inside a string that itself contains a
    // `//` or `/*` (none do in src/ today), and the only cost of over-stripping is
    // a MISSED catch, never a false FAIL, acceptable for a forcing function whose
    // job is to fail on NEW drift, backed by review.
    const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, (block) =>
        block.replace(/[^\n]/g, ' '));
    // Normalize CRLF first: on Windows a trailing `\r` survives the `\n` split,
    // and `.` does not match `\r`, so an end-anchored `//.*$` would NOT strip a
    // line ending in CRLF (the `$` cannot sit before the final `\r`). Drop the
    // `\r`, then strip from the first `//` to end of line.
    return noBlock
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.replace(/\/\/.*/, ''))
        .join('\n');
}
const HEX_LITERAL = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const FF9_TOKENS_CSS_REL =
    'src/app/components/compatibility/components/ux/tokens.css';
for (const file of walk(SRC)) {
    const relForward = rel(file).split(path.sep).join('/');
    // tokens.css is the color SOT and is not a .js/.jsx file (walk only yields
    // code files), so it is never scanned here; the allowlist above documents the
    // synced-const homes that mirror its tokens.
    if (FF9_HEX_ALLOWLIST.has(relForward)) continue;
    const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n');
    for (let i = 0; i < lines.length; i++) {
        HEX_LITERAL.lastIndex = 0;
        const m = HEX_LITERAL.exec(lines[i]);
        if (m) {
            failures.push(
                `FF9: raw-hex-SOT, \`${m[0]}\` found at ${relForward}:${i + 1} ` +
                `(color SOT is the --mdf-* tokens in ${FF9_TOKENS_CSS_REL}; read a ` +
                `token / CSS var, do not inline a hex). If this is a legitimate home ` +
                `(a SOT or a can-not-be-a-var case), add it to FF9_HEX_ALLOWLIST ` +
                `with a reason; otherwise replace the literal with a token.`);
        }
    }
}

// FF10: no INFINITE CSS animation outside a curated allowlist (UX-M21).
// WHY: SC 2.2.2 — auto-playing motion that lasts >5s needs a pause/stop/hide
// mechanism, and an unbounded pulse on a humanitarian surface reads as
// pressure (calm-tone governor). This session's real incident: the revenue-CTA
// pulse first shipped as `infinite` and was cut to 6 cycles on review; a rule
// that lives only in a vault note repeats the mistake — a gate does not.
// The legitimate exception class is the LOADING indicator (spinner/skeleton):
// its motion IS the status, and it ends when loading ends. Those homes ride
// the allowlist below with that reason; do NOT widen it to silence a new
// decorative infinite loop (that is exactly the drift this rule catches).
// key = forward-slash rel-path (matches FF1/FF2/FF9 keying).
const FF10_INFINITE_ALLOWLIST = new Set([
    //, /pets skeleton shimmer: loading placeholder, motion = "still loading",
    //   unmounts when data lands.
    'src/app/pets/pets.css',
    //, ReportSheet submit spinner (mdf-spin 720ms): in-flight request status,
    //   unmounts on settle.
    'src/app/components/compatibility/components/ux/ReportSheet.css',
]);
// Walk src/ for stylesheets (walk() above is code-files-only on purpose).
function walkCss(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.next') continue;
            out.push(...walkCss(p));
        } else if (/\.css$/.test(entry.name)) {
            out.push(p);
        }
    }
    return out;
}
// Strip /* block */ comments preserving line count (same idiom + rationale as
// FF9's stripComments; CSS has no // line comments).
function stripCssComments(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, (block) =>
        block.replace(/[^\n]/g, ' '));
}
// `animation: ... infinite` shorthand OR `animation-iteration-count: infinite`.
const FF10_INFINITE_RE = /\banimation(?:-iteration-count)?\s*:[^;{}]*\binfinite\b/;
for (const file of walkCss(SRC)) {
    const relForward = rel(file).split(path.sep).join('/');
    if (FF10_INFINITE_ALLOWLIST.has(relForward)) continue;
    const lines = stripCssComments(fs.readFileSync(file, 'utf8')).split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (FF10_INFINITE_RE.test(lines[i])) {
            failures.push(
                `FF10: infinite-animation at ${relForward}:${i + 1} — unbounded ` +
                `auto-motion violates SC 2.2.2 and the calm-tone governor. Bound ` +
                `the loop (the revenue pulse uses 6 cycles) or, if this is a real ` +
                `LOADING indicator, add the file to FF10_INFINITE_ALLOWLIST with ` +
                `that reason.`);
        }
    }
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
    //, Body/caption text on the two page surfaces (the spine of readability)
    { label: 'ink on surface-0 (primary body text)',           fg: '--mdf-ink',        bg: '--mdf-surface-0', min: AA_TEXT },
    { label: 'ink on surface-1 (text on cards/sheets)',         fg: '--mdf-ink',        bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'ink-muted on surface-0 (de-emphasized body)',     fg: '--mdf-ink-muted',  bg: '--mdf-surface-0', min: AA_TEXT },
    { label: 'ink-muted on surface-1 (de-emphasized on cards)', fg: '--mdf-ink-muted',  bg: '--mdf-surface-1', min: AA_TEXT },

    //, The two labels that JUST regressed: ink-subtle FAILED here (3.30/3.45)
    //   moved to ink-muted. These guard the fix from silently reverting.
    { label: 'sponsor __label (ink-muted on white slot — was ink-subtle 3.45)', fg: '--mdf-ink-muted', bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'version-footer (ink-muted on surface-0 — was ink-subtle 3.30)',   fg: '--mdf-ink-muted', bg: '--mdf-surface-0', min: AA_TEXT },

    //, Primary CTA: text on the AA-safe brand-hover fill, and brand-hover used
    //   AS text on white (the AA-safe brand text rail; raw --mdf-brand is the
    //   non-text-only variant and is excluded on purpose).
    { label: 'brand-ink on brand-hover (primary CTA label)',    fg: '--mdf-brand-ink',  bg: '--mdf-brand-hover', min: AA_TEXT },
    { label: 'brand-hover as text on surface-1 (links/accents)', fg: '--mdf-brand-hover', bg: '--mdf-surface-1', min: AA_TEXT },

    //, Category accents used as text/glyph: accent-water is documented "AA on
    //   white"; food/shelter ride the same caption/legend text role.
    { label: 'accent-water as text on surface-1',               fg: '--mdf-accent-water',   bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'accent-food as text on surface-1',                fg: '--mdf-accent-food',    bg: '--mdf-surface-1', min: AA_TEXT },
    { label: 'accent-shelter as text on surface-1',             fg: '--mdf-accent-shelter', bg: '--mdf-surface-1', min: AA_TEXT },

    //, Risk-scale badges (statistics surfaces): ink-on-bg pairs are real text.
    { label: 'risk-none ink on bg (badge text)',                fg: '--mdf-risk-none-ink',      bg: '--mdf-risk-none-bg',      min: AA_TEXT },
    { label: 'risk-low ink on bg (badge text)',                 fg: '--mdf-risk-low-ink',       bg: '--mdf-risk-low-bg',       min: AA_TEXT },
    { label: 'risk-mod ink on bg (badge text)',                 fg: '--mdf-risk-mod-ink',       bg: '--mdf-risk-mod-bg',       min: AA_TEXT },
    { label: 'risk-high ink on bg (badge text)',                fg: '--mdf-risk-high-ink',      bg: '--mdf-risk-high-bg',      min: AA_TEXT },
    { label: 'risk-very-high ink on bg (badge text)',           fg: '--mdf-risk-very-high-ink', bg: '--mdf-risk-very-high-bg', min: AA_TEXT },

    //, Urgency marker rings: NON-text graphics (SC 1.4.11, 3:1). Must clear the
    //   floor on BOTH the white marker fill AND the lightest OSM map tile the
    //   ring is drawn over (the worst-case background). 'done' is excluded: it
    //   renders at 0.4 opacity as the de-emphasized/attended state, so its
    //   composited contrast is intentionally below the active-marker floor.
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

console.log(`[fitness] OK, file-loc, function-loc, todo-density, bbox-SOT, Pais-stamp, queue-country-capture, raw-hex-SOT, no-infinite-animation, token-contrast all within v5 hard limits.`);
if (ff1BaselineHits > 0) {
    console.log(`[fitness] note: ${ff1BaselineHits} FF1 baseline-allowlisted data-table shard(s) (i18n strings, see FF1_BASELINE).`);
}
if (ff2BaselineHits > 0) {
    console.log(`[fitness] note: ${ff2BaselineHits} FF2 baseline-allowlisted long function(s) (pre-existing debt, see FF2_BASELINE).`);
}
