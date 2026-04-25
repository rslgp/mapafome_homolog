#!/usr/bin/env node
// VM9 — Fitness functions per v5 § evolutionary_architecture.fitness_functions.
// Run on every PR; non-zero exit blocks merge.
//
// FF1: no JS file in src/ exceeds 1000 LOC (v5 § critical_metrics.size hard limit)
// FF2: no function exceeds 100 LOC (parsed line-naively; conservative bound)
// FF3: bundle size budget (placeholder — needs `next build` first; skipped if .next missing)
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
// Misses arrow-function-only files but flags the long-method smell where it
// matters most (class methods, top-level function declarations).
function approxFunctionLOCs(source) {
    const lines = source.split('\n');
    const fnStarts = [];
    const fnPattern = /^(\s*)(async\s+)?(function\s+\w+|[\w$]+\s*\([^)]*\)\s*\{|[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>)/;
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

for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const fn of approxFunctionLOCs(src)) {
        if (fn.loc > FUNCTION_LOC_HARD_LIMIT) {
            failures.push(`FF2: ${rel(file)}:${fn.start + 1} — function ${fn.loc} LOC > ${FUNCTION_LOC_HARD_LIMIT}: ${fn.declaration}`);
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
