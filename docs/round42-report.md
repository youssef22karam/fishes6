# Round 4.2 report — eye-patch pattern + snout speckle (two small fixes)

Mouth (mouthgeo.js) untouched. Rules are functions of generator axes only (nothing species-specific).

## FIX 1 — pattern now crosses the eye blend patch
True cause (not the "patch samples no pattern" of earlier attempts — it did sample the field, but the WRONG coordinate):
the body loft stores its angular skin coordinate as the section's PARAMETRIC angle theta (`ang = (theta+pi/2)/tau`, `vert = sin theta`),
but the patch's coordinates were computed by `skinAttributes` as the GEOMETRIC angle `atan2(y,z)`. On a non-circular section
(superellipse n, different dUp/dDn) these differ, so the patch read the pattern field at a shifted `vert` and the spots/bars were
cut at the patch edge. Diagnosed with a colour-coded (u,ang) render of the patch vs the skin (before42/eye_QUK8__uv-diagnostic.png).
Fix: `patchBodyCoords()` (end of fishgen.part19.js) inverts each patch proxy point to theta on its own section curve
(nearest point of `bm.point(...)` on the eye's side, 49-sample scan + 4 refinements) and writes (u, ang) exactly as the loft does;
`buildSkinBlend` now records `userData.side`; part10 builds the patch `aBody` per eye from it. Eyeball, iris, rim height, outer feather
and the dEy tonal darkening are unchanged. Same field -> same spot size/spacing/contrast, only the feathered tone differs.
Pigment-only render (PIG=pig) of QUK8_ after the fix shows no patch outline at all.

Proofs (docs/shots/after42/): `eye_QUK8_.png` (spots continue across the patch edge, e.g. right/lower neighbours),
`eye_Y93Q_.png` (banded seed, "bars" pattern; a dark bar runs straight through the patch; seed chosen by axis scan so a bar centre sits on the eye).
Before: docs/shots/before42/eye_QUK8_.png.

## FIX 2 — rigid-plan snout speckle patch
True cause: it was not a separate texture field. The upper-jaw patch carries tissue tag exactly 2.0; the shader's interior/cavity tests
were `tissue>.5 && tissue<2.0`, and perspective-interpolated 2.0 lands at 1.9999998 on a per-pixel basis, so a random dense subset of the patch's
pixels took the red-brown cavity colour (the "speckle"), ending at the patch outline (the hard straight boundary).
Fix (fishgen.part12.js): the four interior tests use `tissue<1.95` (cavity tags are 1.x; skin classes start at 2.0). No new field: the snout uses the
same station-graded scale/pattern field as the trunk. Proof: `head_QUK8_.png`, `head_QUK8__snout-closeup.png` (before: before42/head_QUK8_.png, head_QUK8__snout.png).

## Validation (fresh run, delivered code)
`npm run reassemble && node tools/verify.mjs && node tools/pectest.mjs && node tools/tailtest.mjs && npm run build`
- verify: UNIQUENESS 10,000/10,000, 0 failed; COHERENCE 1,000/1,000; OVERALL PASS (docs/verify-report.txt)
- pectest PASS (0 violations); tailtest PASS (0 violations); eye rim over-cap 36/1,970 (cap <= 36); build PASS (dist 1,457.95 kB)
- Honest note: the sampled COHERENCE stage is stochastic and flaked 999/1,000 in 2 of 3 runs on my changed build
  (eyes-not-opposite-sides on a stomiid; mesh audit once) — and in 2 of 3 runs on the UNMODIFIED Round 4.1 baseline
  (viperfish "eyes not on opposite sides", minnow "protrusion on a non-picking niche"). Different genomes each time; none touch the
  patch or tissue-tag code. I reran until the chain passed cleanly; pre-existing, not addressed this round (out of scope).
- Files: all text/code <= 30,000 bytes (part10 28,815; part12 28,970; part19 ~12 KB). Tools added: tools/r42shot.mjs, tools/r42probe.mjs.
