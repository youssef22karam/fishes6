# Round 6H.3a report — eye-seat band (PIECE 1 of 2, MICRO)

## Defect
In Round 6H.2, eye seating acted as an unbounded or mismatched floor rather than a shared bounded band:
- Ray (disc plan) corneas over-protruded (`eye protrusion above 1/3 of its diameter` in the classic mesh audit, because `headDepthAt` measured depth against the midline ridge `s.dUp` at `z = 0` rather than the local disc dome height at `P.z`, and `laws.js` held an older `1/6` constant while `lawaudit.js` reported `1/3`).
- Flatfish corneas were 92–96% exposed (`EYE_SLICED` on seeds such as `AW54QXER` and `G6TXBTXD`, because `eyeSliced` raycast local eye coordinates against world-rotated `group.rotation.x` meshes).
- An earlier fix had buried stingray corneas (`0.08–0.20 R` under the midline peak).

## Fix — Bounded Eye-Seat Band in `src/engine/eyeband.js`
1. **Single source of truth (`src/engine/eyeband.js`)**:
   - Defined the bounded eye-seat band (`SEAT_BAND` / `seatBand()`):
     - Resting default: `EYE_SEAT = 0.70` radii inside the local surface (`EYE_PROTRUSION = 0.15` of eye diameter — seated in its socket, cornea doming gently proud).
     - Lower bound: `EYE_PROTRUSION_MIN = (1 - Math.cos(CORNEA_REACH)) / 2` (`~0.105` of eye diameter, `EYE_SEAT_MAX = Math.cos(CORNEA_REACH)`) plus `CORNEA_CLEAR = 0.012 R` clearance above the local surface (`BURIAL_MAX = 0.02 R`, `CORNEA_VIS_MIN = 0.97`).
     - Upper bound: `EYE_PROTRUSION_MAX = 1 / 3` of eye diameter (`EYE_SEAT_MIN = 1 / 3 R`).
2. **Local dome/socket surface for flattened plans (`src/engine/eyegeo.js`, `src/engine/coherence.js`)**:
   - `headDepthAt` in `src/engine/eyegeo.js` evaluates flattened plans (`bm.disc` and `ray` / `benthicShark`) against their local dome surface height at `(u, P.z)` rather than the centreline ridge height `s.dUp`.
   - `seatDelta` and `seatLift` in `src/engine/eyegeo.js` (and `buildEyes` in `src/engine/parts/fishgen.part10.js`) clamp seat adjustments strictly inside `[EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX]` from `src/engine/eyeband.js`.
   - `eyeSliced` in `src/engine/coherence.js` runs its raycast visibility check in the fish-local frame (`group.rotation.x` neutralised and restored) and reads the seat band bounds from `src/engine/eyeband.js`.
3. **Unified audits (`src/engine/lawaudit.js`, `src/engine/anatomycheck.js`, `src/engine/validate.js`, `src/engine/mouthcheck.js`, `src/engine/coherence.js`)**:
   - Both the classic mesh audit and the shared coherence audit read `EYE_PROTRUSION_MIN` and `EYE_PROTRUSION_MAX` from `src/engine/eyeband.js`.

## Gate Results
- **Reassembly (`node tools/reassemble.mjs`)**: byte-exact (`20 parts -> src/engine/fishgen.js`, `535,357` bytes; all parts `<= 30,000` bytes).
- **`node tools/pectest.mjs`**: PASS (`400` fish, `5,760,000` frames, `0` violations).
- **`node tools/tailtest.mjs`**: PASS (`1,000` built fish, `0` violations, `minCellPrototypeDistance = 0.005`, `axisGatesOK = true`).
- **`node tools/r6h2gar.mjs`**: PASS (`211/211` gar seeds resolve and pass built-head audit, including `37/37` listed seeds).
- **`node tools/verify.mjs`** (`docs/verify-report.txt`):
  - **UNIQUENESS**: `10,000/10,000` PASS (`0` failed to resolve, `10,000` distinct hashes, mean gate attempts/seed `1.11`, determinism `60/60`).
  - **COHERENCE**: `997/1,000` (all 10 trait invariants `1,000/1,000`; `mutate` `250/250`; `breed` `250/250`; mesh audit `997/1,000`).
  - **Failing examples**: **0** eye-protrusion cases and **0** `EYE_SLICED` cases (all previously failing stingray and flatfish seeds including `AAVJQHA2`, `NJXZ67Z4`, `AW54QXER`, `G6TXBTXD` pass with `0` errors; only `3` sturgeon `MOUTH_CORNER_OPEN` examples remain, which are Piece 2).
- **`node tools/randaudit.mjs after`** (`docs/census/randaudit-after.json`):
  - `standard`: `n=300`, `fish-with-violation=0` (`EYE_OUTSIDE_HEAD=0`, `EYE_SLICED=0`, `DETACHED_TEETH=0`, `FLAT_BODY_END=0`, `MOUTH_CORNER_OPEN=0`).
  - `wonder RAW`: `n=300`, `fish-with-violation=1` (`EYE_SLICED=0`, `FLAT_BODY_END=1`).
  - `wonder SHIPPED`: `n=289`, `fish-with-violation=0` across all classes (`RANDAUDIT PASS`).
- **`npm run build`**: PASS.

## Muse's gate (rerun on the delivered zip, 2026-11-08)
Arena Battle, accepted model: gemini-4-argon-high (the other side, "kairo",
was not on nino's whitelist and was not downloaded).
- Reassembly OK; verify: UNIQUENESS 10,000/10,000 PASS; COHERENCE 997/1,000
  — the ONLY failing examples are 3 sturgeon MOUTH_CORNER_OPEN (piece 2's
  scope, explicitly out of scope here). ZERO eye-protrusion, ZERO
  EYE_SLICED. pectest PASS, tailtest PASS, build PASS.
- Muse's randaudit: standard 1/300 (one carpet-shark MOUTH_CORNER_OPEN —
  piece 2), EYE_SLICED 0; wonder SHIPPED 0/289 violations.
- Muse's render: ray H2W9X eye = low turret with the cornea doming gently
  proud of the disc surface (round6h3a-shots/head_H2W9X.png) — matches the
  real stingray reference.
VERDICT: piece 1 bar MET exactly. On branch round6h-wip; piece 2 follows.
