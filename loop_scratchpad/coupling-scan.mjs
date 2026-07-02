// READ-ONLY coupling + zero-test scan. No build. Static import parse only.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
const SRC = path.join(ROOT, 'src');
const TEST = path.join(ROOT, 'test');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'out') continue;
      walk(p, out);
    } else if (/\.(js|jsx|mjs|ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

const files = walk(SRC).filter(f => !/\.test\.(js|jsx|mjs|ts|tsx)$/.test(f));
const testFiles = [...walk(TEST), ...walk(SRC).filter(f => /\.test\./.test(f))];

// Build relative-import fan-out (intra-src only) and fan-in.
const importRe = /(?:import[\s\S]*?from\s*|import\s*)['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const fanOut = new Map();   // file -> count of relative imports
const fanIn = new Map();    // resolved target -> count of importers
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m, count = 0;
  const seen = new Set();
  importRe.lastIndex = 0;
  while ((m = importRe.exec(src)) !== null) {
    const spec = m[1] || m[2];
    if (!spec || !spec.startsWith('.')) continue; // only intra-project edges
    count++;
    // resolve target to a normalized key (best-effort, extensionless)
    const abs = path.normalize(path.join(path.dirname(f), spec));
    const key = rel(abs).replace(/\.(js|jsx|mjs|ts|tsx)$/, '');
    if (!seen.has(key)) { seen.add(key); fanIn.set(key, (fanIn.get(key) || 0) + 1); }
  }
  fanOut.set(rel(f), count);
}

// Zero-test detection: collect every module basename referenced anywhere in tests.
const testBlob = testFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const referenced = new Set();
const tImp = /['"]([^'"]+)['"]/g; let tm;
while ((tm = tImp.exec(testBlob)) !== null) {
  const base = path.basename(tm[1]).replace(/\.(js|jsx|mjs|ts|tsx)$/, '');
  if (base) referenced.add(base);
}

console.log('=== FAN-OUT (intra-project relative imports), top 15 ===');
[...fanOut.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([f, c]) => console.log(`${String(c).padStart(3)}  ${f}`));

console.log('\n=== FAN-IN (most-imported intra-project modules), top 15 ===');
[...fanIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([f, c]) => console.log(`${String(c).padStart(3)}  ${f}`));

console.log('\n=== PRODUCT MODULES whose basename is NEVER referenced by any test ===');
const noTest = files
  .map(f => ({ rel: rel(f), base: path.basename(f).replace(/\.(js|jsx|mjs|ts|tsx)$/, ''),
               loc: fs.readFileSync(f, 'utf8').split('\n').length }))
  .filter(o => !referenced.has(o.base))
  .filter(o => !/page$|layout$/.test(o.base)) // route shells are e2e/smoke territory
  .sort((a, b) => b.loc - a.loc);
noTest.slice(0, 25).forEach(o => console.log(`${String(o.loc).padStart(4)} LOC  ${o.rel}`));
console.log(`\n${noTest.length} product modules with no test referencing their basename (route shells excluded).`);
