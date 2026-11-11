// Re-splits the (edited) reassembled src/engine/fishgen.js into src/engine/parts/fishgen.partNN.js at LINE boundaries,
// every part <= LIMIT bytes. Run after editing fishgen.js:  node tools/split.mjs   (then reassemble reproduces the file byte for byte).
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const partsDir = join(root, "src", "engine", "parts"), src = readFileSync(join(root, "src", "engine", "fishgen.js"));
const LIMIT = 29000;
const lines = []; let start = 0;
for (let i = 0; i < src.length; i++) if (src[i] === 10) { lines.push(src.subarray(start, i + 1)); start = i + 1; }
if (start < src.length) lines.push(src.subarray(start));
const chunks = []; let cur = [], size = 0;
for (const l of lines) {
  if (l.length > LIMIT) { console.error("split: a single line exceeds the limit (" + l.length + " bytes)"); process.exit(1); }
  if (size + l.length > LIMIT) { chunks.push(Buffer.concat(cur)); cur = []; size = 0; }
  cur.push(l); size += l.length;
}
if (cur.length) chunks.push(Buffer.concat(cur));
for (const f of readdirSync(partsDir)) if (/^fishgen\.part\d+\.js$/.test(f)) unlinkSync(join(partsDir, f));
chunks.forEach((c, i) => writeFileSync(join(partsDir, `fishgen.part${String(i + 1).padStart(2, "0")}.js`), c));
console.log(`split: ${chunks.length} parts (max ${Math.max(...chunks.map(c => c.length))} bytes)`);
