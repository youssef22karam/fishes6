# IchthyoGen — Hyperreal Procedural Fish Generator

This is the complete IchthyoGen project.

## Layout note

The fish engine is one large ES module, `src/engine/fishgen.js`. In this
repo it is stored as sequential parts:

```
src/engine/parts/fishgen.part01.js   (lines 1–230 of the module)
src/engine/parts/fishgen.part02.js   (lines 231–275 of the module)
src/engine/parts/fishgen.part03.js   (lines 276–323 of the module)
src/engine/parts/fishgen.part04.js   (lines 324–499 of the module)
src/engine/parts/fishgen.part05.js   (lines 500–719 of the module)
src/engine/parts/fishgen.part06.js   (lines 720–935 of the module)
src/engine/parts/fishgen.part07.js   (lines 936–1225 of the module)
src/engine/parts/fishgen.part08.js   (lines 1226–1485 of the module)
src/engine/parts/fishgen.part09.js   (lines 1486–1772 of the module)
src/engine/parts/fishgen.part10.js   (lines 1773–2035 of the module)
src/engine/parts/fishgen.part11.js   (lines 2036–2114 of the module)
src/engine/parts/fishgen.part12.js   (lines 2115–2439 of the module)
src/engine/parts/fishgen.part13.js   (lines 2440–2745 of the module)
src/engine/parts/fishgen.part14.js   (lines 2746–2938 of the module)
src/engine/parts/fishgen.part15.js   (lines 2939–3118 of the module)
src/engine/parts/fishgen.part16.js   (lines 3119–3368 of the module)
src/engine/parts/fishgen.part17.js   (lines 3369–3592 of the module)
src/engine/parts/fishgen.part18.js   (lines 3593–3739 of the module)
src/engine/parts/fishgen.part19.js   (lines 3740–3974 of the module)
```

The parts are **one continuous module in filename order** — the `import`
statements are in part01 and the `export { boot, FG }` is at the end of
part19. They are not separate modules: never import a part on its own, and
never reorder them. Concatenated in order they reproduce the original
`fishgen.js` byte for byte
(SHA-256 of the original: `a982dac594db38c5f0467c0e2be593fe0b7ef6beeeeb5d359845184a00e372ac`).

## Build / run

```bash
npm install
npm run build     # reassembles fishgen.js, then builds one single-file HTML in dist/
npm run dev       # reassembles, then starts the Vite dev server
```

`tools/reassemble.mjs` concatenates the parts into the generated
`src/engine/fishgen.js` (git-ignored). It runs automatically inside
`dev`/`build`. Run it on its own any time with `npm run reassemble`.

The build output is a single self-contained HTML file
(`dist/index.html`, ~1.3 MB, everything inlined via vite-plugin-singlefile).

## Global anatomy laws (mouths, eyes, fins, tails, flattened plan)

`src/engine/laws.js` holds the universal laws, expressed only through the
generator's axes (BODY PLAN, FEEDING NICHE, SWIM MODE, DEPTH/HABITAT). They
run as the `anatomy_laws` repair rule, drive the geometry builders
(`src/engine/mouthgeo.js` is the mouth constructor), and are asserted by
`src/engine/validate.js` (`tail` and `plan` invariants) and the mesh audit.
The mouth is a living deformation of its own closed geometry (seam → hinge + open-pose offsets; see §1 of the laws doc); `node tools/mouthaudit.mjs` poses it at 11 gapes per fish and checks the mouth bounds.
See `docs/anatomy-laws.md`; `docs/verify-report.txt` is the 10,000 / 1,000
population report (`npm run reassemble && node tools/verify.mjs`).

## Notes

- `package-lock.json` was deliberately left out: `npm install` regenerates
  it. Dependency versions are pinned in `package.json`.
- Everything else is the untouched original project: `src/App.tsx` is the UI
  shell, `src/engine/fish.css` the engine styles, `src/engine/fishgen.d.ts`
  the type declarations for the engine module.

## Working on this repo

1. Read the engine as one module: `fishgen.part01.js` through
   `fishgen.part20.js`, in order.
2. Verify with `npm install && npm run build` — the build must succeed and
   produce `dist/index.html`.

---

## Procedural genome system (added on top of the original engine)

New modules in `src/engine/` (the generated `fishgen.js` is untouched apart from small hooks in the parts):

| file | role |
|---|---|
| `clades.js`, `cladedata.js` | 59 continuous + 20 discrete trait axes; 17 clade envelopes / 41 lineages (ranges only, no species) |
| `genome.js` | seed → RNG → clade → trait vector; clamp, bounded mutation, crossover, genome hash, trait distance |
| `mapping.js` | trait vector → original engine genome paths (`body.*`, `head.*`, `fins.*`, `skin.*`…) |
| `validate.js` | **anatomy hard gate** (8 invariants; trait stage + engine `BodyModel` analytic stage) |
| `procgen.js` | pipeline: sample → mutate → map → gate → accept / resample; seed grammar `A`, `A~SALT` (mutant), `A^B.SALT` (offspring) |
| `naming.js` | genus/species + common name derived from traits and clade |
| `procui.js` | "Procedural" panel: Random, seed field, Mutate, Breed, clade bias, 24-fish gallery |

Verification: `node tools/reassemble.mjs && node tools/verify.mjs` (env `UNIQ`, `COH`, `SAMPLE`). `node tools/diag.mjs` prints per-lineage gate pass-rates.
Last full report: `docs/verify-report.txt`; screenshots in `docs/`.

Engine fix: `checkFishGeometry` read `getAttribute('aFin')` from a position attribute in its batoid branch; it now reads it from the fin geometry.
