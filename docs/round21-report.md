# IchthyoGen — Round 2.1 (fix-only): teeth gate war, front aperture point, eye tyre ring

Branch `round2-wip`. Surgical round: no change to finmotion, genome, UI, the parts system or `tools/reassemble.mjs`.
All rules are global (axes only). Every file is ≤ 30,000 bytes (the generated, git-ignored `src/engine/fishgen.js` bundle excepted).

## Validation run (fresh, passing)

`npm run reassemble && node tools/verify.mjs && node tools/pectest.mjs && npm run build` — all pass. Full text: `docs/verify-report.txt`.

| | Round 2 (before) | Round 2.1 (after) |
|---|---|---|
| UNIQUENESS | **FAIL** 9,918 / 10,000, 82 failed to resolve | **PASS 10,000 / 10,000, 0 failed to resolve** |
| mean gate attempts / seed | 1.02 | **1.00** |
| distinct genome hashes | 9,918 | 10,000 |
| COHERENCE | 1,000 / 1,000 | **1,000 / 1,000** (mesh audit 1,000 / 1,000) |
| gate rejections, "mouth_gills: teeth outside the jaw" | 12,663 (of 12,703) | **0** |
| gate rejections, all reasons | 12,703 | 39 (all `fins: anal area` envelope, unrelated) |
| pectest | pass | PASS |
| OVERALL | FAIL | **PASS** |

Mesh build at gallery quality: median 13.5 ms, p95 22.4 ms.

## Defect 1 — teeth generator vs validator

**Diagnosis: the generator was the wrong side (case a). The validator was measuring the real skin cross-section.**
I instrumented the checker to log the first failing tooth on 800 seeds (1,208 rejections):

- 100 % failed the *lateral* test (`|z| ≤ halfWidth(ly)·1.04`). None failed on height.
- 100 % were the **lower jaw, outer row (row 0)**. 99 % were needle teeth, the rest molar.
- The lower lip line sits at a median of **85 %** of the way down the section (range 80–97 %).
  `teethgeo` then dropped each root a further `len/3` straight down (the 1/3 rooting) but moved it laterally only by about 1.25 × tooth radius.
  The lower section narrows quickly there, so the root centre ended up outside the skin: **median 7 % beyond the half-width, up to 70 %** (the limit was 4 %).
  The long needle class has the deepest root drop, so it failed most.
- The gum band and the second row were not the problem. Row 1 insets further and never failed.

**Fix, by construction (generator side; the validator's anatomy rule is unchanged):**

- New single source of truth in `teethgeo.js`: `jawEnv(bm, H, x, y)` returns the section extents at the point's own station (`ly`, `dUp`, `dDn`, `hw`). `jawIn(env, z, slack)` is the inside test.
  `mouthcheck.js` now imports and uses these same two functions, so the check and the generator cannot drift apart.
- For every tooth, at its own position, the generator now:
  1. places the root and requires its height to be inside `±0.9 ×` the section (a shorter tooth is tried if not; the 1/3 rooting is never shortened);
  2. caps the root's lateral position at `0.9 × hw(own height) − base radius`;
  3. eases the ±6° tilt until the **tip** is inside the same envelope;
  4. skips the tooth only if no length ≥ 0.012 × head length fits (never happened as a visible gap in the shots).
- The validator keeps its slack (1.04) and gains a tip check (`teeth tip outside the jaw`). It is stricter, not looser.
- Effect on fish that were already valid: on 260 seeds that pass under both versions, the median tooth count and length ratio is 1.00 (p10 = 1.00); only the violating rows were fitted inward (worst case 0.70 × count).

## Defect 2 — front aperture came to a point

**Cause.** The snout is conical in plan, so half-width grows linearly with distance from the tip. The lower jaw drops rigidly about the hinge, so the drop is also linear. In front projection the lower lip edge is therefore a straight V with a corner at bottom centre. Two further features made it a "heart":

- the chin cap was built from pocket material, so it showed as a pink plug at the lip arc;
- the static snout-tip skin below the lip line (`u < jawU0`) was not cut when the jaw opened, which left a skin lump hanging into the top centre of the aperture.

**Changes.** Gape angle and mouth width are untouched; the corners stay where the width law puts them.

1. **Lateral splay of the opening lower jaw** (blunt-U dentary): `Δz = 0.8 · hwHinge · √t(1−t) · open · w`, with `t` running chin(0) → hinge(1).
   It is zero at rest, at the chin ring and at the hinge, so the left and right lip halves meet at the chin with a **horizontal tangent** and the lower edge becomes one convex arc.
   - GLSL: `JAW_SPREAD_GLSL` (shared by the jaw material and the lower teeth, which carry the same weight).
   - JS twin: `mouthgeo.spreadZ`, used in the checker's jaw pose.
   - New uniform: `uJawSpread`.
2. **Chin cap** is now skin tissue (tag 0) with one belly coordinate, so no pocket-coloured plug can show at the lip arc.
3. **Skin cut** for terminal mouths now also covers the snout tip (`u < jawU0` when `jawU0 < .002`), so the upper edge is a plain smooth arc with no lump or notch.

Result: front views of QZTAI (widest, 40°), Q10BMF (moray, 40°) and Q1CW5 (shark) show a single rounded aperture (rounded U below, smooth arc above).

## Defect 3 — eye in a black tyre

**Cause.** The ring was the exposed **sclera shell** (limbus at 0.62 rad, skin crossing at acos(0.70) = 0.795 rad), shaded near-black. The skin shader also still applied a periorbital pigment ring (−34 %) and an orbital relief ring.

**Changes.**

- New `eyegeo.buildSkinBlend`: a single surface of revolution made from the **head's own skin material** (`mats.body` + skin attributes).
  - Its inner edge hugs the sphere just outside the corneal rim, so the dark band is covered.
  - It then falls with a zero-slope start (smoothstep²) to the real head surface and sinks 0.08 R under it, so no edge is visible.
  - Skin coordinates are taken from the head surface directly beneath each vertex, so colour and pattern match the surrounding skin.
- `eyegeo.skinCurvature` fits the local head surface (five `rawSurface` lookups, paraboloid) so heights are measured against the real skin.
- `eyegeo.seatDelta` seats the eyeball slightly deeper along its own axis where the head curves away, capped so the skin never closes over the iris. This only ever **reduces** protrusion (≤ 1/6 D still holds).
- Skin shader: the periorbital ring and the orbital relief ring are removed. In their place the skin darkens only in the last fraction before the eyeball (distance 0.62–0.98 eye radii).
- Kept from Round 2: dark iris luminance cap, true pupil, lateral placement, plan envelope.
- Rim height (`info.rimH`, as a fraction of the eye diameter): median **0.055**, p99 0.066, over 788 eyes. **10 of 788 eyes (1.3 %) are above 0.06, worst 0.111.**

## Screenshots (`docs/shots/after21/`)

- `jaw1/` — side, front, q34 and eyeS at jaw = 1.
- `jaw0/` — front and side at jaw = 0.
- Seeds: QOG9_, QUK8_, Q1CW5 (the same three as before) plus the widest-gape seeds QZTAI (dragonfish), QIBXD (perch) and Q10BMF (moray).
- Produced with `tools/shots2.mjs` on the final `dist/`.
- "Widest" is the niche flag (open 25–40°). No cartilaginous-plan seed in a 2,500-seed scan carries it, so the shark Q1CW5 (22.5°) stands in for that case.

## Known residuals (stated honestly)

- A faint pink trace remains on the chin cap, bottom centre of the front view of Q1CW5. It sits inside the white chin skin and no longer crosses the lip arc.
- Interior geometry (a small pink block and a central bar) is visible in the dark pocket on some front views. It lies inside the aperture and does not affect the outline.
- The ≤ 0.06 D rim limit is met on 98.7 % of eyes. The remaining 1.3 % are thin side-flattened heads where the one-side mid-plane clamp stops the extra seating.
- Under software GL, running two `shots2` jobs in parallel timed out; run them sequentially.
