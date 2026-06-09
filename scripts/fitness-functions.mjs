#!/usr/bin/env node
// VM9 — Fitness functions per v5 § evolutionary_architecture.fitness_functions.
// Run on every PR; non-zero exit blocks merge.
//
// FF1: no JS file in src/ exceeds 1000 LOC (v5 § critical_metrics.size hard limit)
// FF2: no function exceeds 100 LOC (parsed line-naively; conservative bound)
// FF4: no remaining TODO/FIXME/XXX in production code over a threshold

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

if (failures.length > 0) {
    console.error('\n[fitness] FAILED:');
    for (const f of failures) console.error('  ' + f);
    console.error(`\n${failures.length} fitness-function failure(s).\n`);
    process.exit(1);
}

console.log(`[fitness] OK — file-loc, function-loc, todo-density all within v5 hard limits.`);
if (ff2BaselineHits > 0) {
    console.log(`[fitness] note: ${ff2BaselineHits} FF2 baseline-allowlisted long function(s) (pre-existing debt — see FF2_BASELINE).`);
}
