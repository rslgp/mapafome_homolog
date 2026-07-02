import fs from 'node:fs';
const files = [
  ['src/app/pets/PetReportSheet.js', 40],
  ['src/app/pets/PetsApp.js', 83],
  ['src/app/pets/PetDetailSheet.js', 54],
  ['src/app/components/compatibility/components/InfoPanel.js', 20],
];
const ROOT = process.argv[2];
for (const [rel, declLine] of files) {
  const lines = fs.readFileSync(ROOT + '/' + rel, 'utf8').split('\n');
  const start = declLine - 1;
  let depth = 0, started = false, end = -1;
  for (let j = start; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth <= 0) { end = j; break; }
  }
  const loc = end >= 0 ? end - start + 1 : -1;
  console.log(`${rel}:${declLine}  brace-bounded LOC=${loc}  (decl: ${lines[start].trim().slice(0,50)})`);
}
