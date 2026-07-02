// Find functions the LIVE FF2 regex CANNOT match but that exceed 100 LOC:
//   - `export default function Name(...) {`
//   - destructured-param arrows `const X = ({ ... }) => {`  (params contain `{`)
//   - multiline-signature arrows whose `=> {` is not on the decl line
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.argv[2];
const SRC = path.join(ROOT, 'src');
const LIMIT = 100;
// the exact live FF2 regex:
const FF2 = /^(\s*)(async\s+)?(function\s+\w+|[\w$]+\s*\([^)]*\)\s*\{|[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>|export\s+const\s+[\w$]+\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*\{)/;
// broader detector for component/function openers FF2 misses:
const OPENERS = [
  /^\s*export\s+default\s+(async\s+)?function\s+\w+\s*\(/,         // export default function
  /^\s*(export\s+)?(default\s+)?const\s+[\w$]+\s*=\s*(async\s+)?\(\s*\{/, // destructured-param arrow
  /^\s*(export\s+)?(default\s+)?function\s+\w+\s*\(\s*\{/,         // destructured-param fn decl
];
function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '.next') continue; walk(p, o); }
    else if (/\.(js|jsx|mjs|ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) o.push(p);
  }
  return o;
}
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const hits = [];
for (const f of walk(SRC)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (FF2.test(lines[i])) continue;            // FF2 already sees it
    if (!OPENERS.some(re => re.test(lines[i]))) continue;
    // brace-bound it
    let depth = 0, started = false, end = -1;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) { if (ch === '{') { depth++; started = true; } else if (ch === '}') depth--; }
      if (started && depth <= 0) { end = j; break; }
    }
    const loc = end >= 0 ? end - i + 1 : -1;
    if (loc > LIMIT) hits.push({ key: `${rel(f)}:${i + 1}`, loc, decl: lines[i].trim().slice(0, 60) });
  }
}
hits.sort((a, b) => b.loc - a.loc);
for (const h of hits) console.log(`${String(h.loc).padStart(4)} LOC  ${h.key}  ::  ${h.decl}`);
console.log(`\n${hits.length} fn(s) >100 LOC that the LIVE FF2 regex CANNOT see (gate blind spot).`);
