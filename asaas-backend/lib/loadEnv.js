// loadEnv.js — tiny, dependency-free .env.local loader.
//
// IMPORTANT: it reads values LITERALLY. It never expands `$` (so an Asaas key
// like `$aact_...` survives intact) and it strips a single layer of matching
// surrounding quotes (so you can quote a value that contains `#`, spaces, or
// leading `$`). Existing process.env values win, so deploy env vars override.

const { readFileSync } = require('node:fs');

function unquote(v) {
  const s = v.trim();
  if (s.length >= 2 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) {
    return s.slice(1, -1);
  }
  return s;
}

function loadEnv(path) {
  let txt;
  try {
    txt = readFileSync(path, 'utf8');
  } catch {
    return; // no file — rely on process.env (e.g. on the deploy)
  }
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue; // don't clobber real env
    process.env[key] = unquote(line.slice(eq + 1));
  }
}

module.exports = { loadEnv, unquote };
