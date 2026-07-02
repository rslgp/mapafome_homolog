// READ-ONLY scan: reuse FF2's exact approxFunctionLOCs algorithm to rank
// functions >100 LOC and flag which are NOT on the live FF2_BASELINE.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
const SRC = path.join(ROOT, 'src');
const FUNCTION_LOC_HARD_LIMIT = 100;

// Mirror of the live FF2_BASELINE (read from fitness-functions.mjs this run).
const FF2_BASELINE = new Set([
  'src/app/components/compatibility/components/mapComponents.js:119',
  'src/app/components/compatibility/App.js:135',
  'src/app/components/compatibility/App.js:802',
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
function rel(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }

function approxFunctionLOCs(source) {
  const lines = source.split('\n');
  const fnStarts = [];
  const fnPattern = /^(\s*)(async\s+)?(function\s+\w+|[\w$]+\s*\([^)]*\)\s*\{|[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>|export\s+const\s+[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*\{)/;
  for (let i = 0; i < lines.length; i++) if (fnPattern.test(lines[i])) fnStarts.push(i);
  const results = [];
  for (const start of fnStarts) {
    let depth = 0, started = false;
    for (let j = start; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { depth++; started = true; }
        else if (ch === '}') depth--;
      }
      if (started && depth <= 0) {
        results.push({ start, end: j, loc: j - start + 1, declaration: lines[start].trim().slice(0, 70) });
        break;
      }
    }
  }
  return results;
}

const hits = [];
for (const file of walk(SRC)) {
  if (/\.test\.(js|jsx|mjs|ts|tsx)$/.test(file)) continue; // tests are not product code
  const src = fs.readFileSync(file, 'utf8');
  for (const fn of approxFunctionLOCs(src)) {
    if (fn.loc > FUNCTION_LOC_HARD_LIMIT) {
      const key = `${rel(file)}:${fn.start + 1}`;
      hits.push({ key, loc: fn.loc, baselined: FF2_BASELINE.has(key), declaration: fn.declaration });
    }
  }
}
hits.sort((a, b) => b.loc - a.loc);
for (const h of hits) {
  console.log(`${String(h.loc).padStart(4)} LOC  ${h.baselined ? '[BASELINED]' : '[NET-NEW]  '}  ${h.key}  ::  ${h.declaration}`);
}
console.log(`\n${hits.length} fn(s) >100 LOC; ${hits.filter(h => !h.baselined).length} NET-NEW (not on FF2_BASELINE)`);
