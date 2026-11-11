// Reassembles src/engine/fishgen.js from src/engine/parts/fishgen.partNN.js
// The parts are ONE continuous ES module, split only so every file in this
// repo stays under 30,000 bytes. They are concatenated in filename order.
// Never import a part on its own. Edit the parts, then run this script
// (it also runs automatically as part of `npm run dev` / `npm run build`).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const partsDir = join(root, "src", "engine", "parts");
const outFile = join(root, "src", "engine", "fishgen.js");
const LIMIT = 30000;

const parts = readdirSync(partsDir)
  .filter((f) => /^fishgen\.part\d+\.js$/.test(f))
  .sort();

if (parts.length === 0) {
  console.error("reassemble: no parts found in", partsDir);
  process.exit(1);
}

let total = 0;
const chunks = parts.map((name) => {
  const buf = readFileSync(join(partsDir, name));
  if (buf.length > LIMIT) {
    console.error(`reassemble: ${name} is ${buf.length} bytes, over the ${LIMIT}-byte limit. Split it further before building.`);
    process.exit(1);
  }
  total += buf.length;
  return buf;
});

writeFileSync(outFile, Buffer.concat(chunks));
console.log(`reassemble: ${parts.length} parts -> src/engine/fishgen.js (${total} bytes)`);

// src/engine/mouthgeo.js is likewise generated from src/engine/parts/mouthgeo.partNN.js
const mgParts = readdirSync(partsDir)
  .filter((f) => /^mouthgeo\.part\d+\.js$/.test(f))
  .sort();
if (mgParts.length > 0) {
  let mgTotal = 0;
  const mgChunks = mgParts.map((name) => {
    const buf = readFileSync(join(partsDir, name));
    if (buf.length > LIMIT) {
      console.error(`reassemble: ${name} is ${buf.length} bytes, over the ${LIMIT}-byte limit. Split it further before building.`);
      process.exit(1);
    }
    mgTotal += buf.length;
    return buf;
  });
  writeFileSync(join(root, "src", "engine", "mouthgeo.js"), Buffer.concat(mgChunks));
  console.log(`reassemble: ${mgParts.length} parts -> src/engine/mouthgeo.js (${mgTotal} bytes)`);
}
