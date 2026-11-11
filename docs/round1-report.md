# IchthyoGen — Round 1: mouths + side (pectoral) fins

Scope: only (1) mouths / jaws and (2) side fins. Architecture, genome wiring, species-card UI and the split-file layout
(`src/engine/parts/`, `tools/reassemble.mjs`) are unchanged. Every rule reads only the generator's axes
(body plan, feeding niche, swim mode, depth/light, body size) — nothing is keyed to a named animal.

## What changed

### Mouths (`laws.js`, `mouthgeo.js`, `fishgen` parts, `validate.js`, `anatomycheck.js`)
* **Resting state** unchanged in principle and now enforced: opening angle 0, the mouth is a seam in the head surface (skin shader crease); nothing protrudes.
* **No ring / torus / tube anywhere in a mouth.** `TorusGeometry` (sucker / tube-cap lip) → flat annulus (`RingGeometry`) lying flush on the head;
  `TubeGeometry` (flattened-plan ventral lips) → two flat ribbons lying in the skin. The mesh audit now rejects any Torus/Tube mouth part for every construction.
* **Jaw opening is a state**: `mouthLaw()` returns `openDeg` — 12–28° by gape band of the niche, 40° hard maximum, reached only by the widest-gape niche
  (`ambusher`) and only for a seed-gated minority (measured **18 / 364 = 5 %** of jawed fish, limit 10 %). The old fixed ≤ 13.7° cap is gone; `uJawOpenMax` = the law angle.
  One uniform drives both hinges, so left/right rotate by exactly the same angle.
* **Placement**: mouth width 0.25–0.65 × head width from the gape band; the corner may not pass the front edge of the eye
  (widest niche: the eye centre line) — enforced by capping gape and placing the eye (`repairLaws`, capped by the gill opening) and asserted by the gate.
* **Interior**: `CAVITY_MAX` 0.35 → **0.30** head length; the pocket gained a medial septum (floor / palate sheet) so the open mouth is closed in the mid-plane
  (the lower half follows the jaw).

### Side fins (`finmotion.js` new, `addPectoral`, `FinBuilder`, `VS_FIN`/`FS_FIN`, animate loop)
* **Plan** (`pecPlan`): class from axes — `disc` (flattened plan, merged fin), `row` (labriform), `hover` (ostraciiform / hippocampiform), `stabilise` (body-driven cruisers);
  rest abduction 9–24° (small & stiff for cruisers, larger & rounder for manoeuvrers), length band 0.10–0.26 × body length (0.32 only for hover, 6 % of hover fish), aspect / fan spread by class.
* **Anatomy**: base centre buried 0.025 × body length in the wall (law minimum 0.02) with the skin blend kept; thickened leading edge + fleshy base wedge in the geometry;
  individual rays stand proud of the membrane in the vertex shader; membrane never drops to jelly opacity. Foil fins no longer stick out sideways (rest = close to the body, angled back).
* **Movement** from the base joint: per-vertex hinge point + abduction axis (`aHinge`, `aAxis`); sweep −25…+35° and abduction 5…55° are clamped **in the shader and in the controller**;
  rotation weight grows from the buried base outward, tip lags the base by 8–20° of phase (progressive along the ray, plus a small per-ray term) so flex travels along the rays.
  * stabilisers: ≤ 10° corrections (measured max 8°), amplitude and frequency fall with speed;
  * rowers: scull (power stroke sweeps back with the fin spread, recovery feathered/adducted), 1.2–3.0 Hz scaled down with body size, rises with speed;
  * hoverers: continuous 10–25° sculling;
  * braking: both fins flare symmetrically to ≥ 51° abduction; turns: outer fin abducts / inner adducts proportionally to turn rate; identical left/right in straight cruise;
  * complete rest: fins still, or one slow scull every 5 s.
  * disc plan: no joint; travelling wave on the margin, amplitude ≤ 0.06 × body width, wavelength 0.4–0.9 × body length.

### Validation / reject-and-resample
`validate.js` (analytic gate, resamples) now checks jaw angle bounds, mouth width, corner-vs-eye, fin rest abduction, tip lag and disc/joint agreement.
`anatomycheck.js` (mesh audit) checks one-piece hinged jaw, jaw-limit, no torus/tube, fin burial ≥ 0.02 L, fin length band, left/right mirror.
The "Fin roots detached" audit now allows the deliberate burial depth.

## Checks run
* `npm run reassemble && node tools/verify.mjs && npm run build` → verify **PASS** (1000 unique seeds, 1.01 gate attempts/seed, coherence 300/300 incl. mesh audit 300/300), build OK.
* `node tools/pectest.mjs 400` (new): 400 fish × 40 s scripted speed / turn / brake / rest, 5.76 M angle samples, **0 violations**:
  sweep ∈ [−25.0, +35.0]°, abduction ∈ [5.0, 55.0]°, cruiser amplitude ≤ 8°, rower/hover 2.46–3.0 Hz, straight-cruise asymmetry 0, motion at rest 0,
  fin length 0.100–0.260 × body length, burial 0.025 × body length, tip lag 12.2–19.4°, jaw 12–40° (5 % at 40°).
* Screenshots (`tools/shots.mjs`, needs Playwright): `docs/shots/before/` (original engine) and `docs/shots/after/` — per seed:
  `_head_rest` (head-on, closed), `_mouth_rest_side`, `_mouth_open_side`, `_mouth_open_34`, `_fin_rest`, `_fin_power`, `_fin_recovery`.

## Not finished / honest notes
* **Open-mouth see-through**: with the jaw at its law angle in a pure side view of the widest-gape fish, a thin band below the upper lip can still show background.
  The septum renders correctly in isolation (debug render), but in the full scene something still lets a sliver through — not fully diagnosed. Closed mouths are clean.
* Fused-plate (beak) and tube constructions have no hinged jaw, so their opening is 0 by design.
* Check (d) (cartilaginous eyes): the eye code was not touched this round; see `*_head_rest.png` for the hetero-plan seeds (Q1CW5, Q3QFR).
* Screenshot PASS/FAIL was judged by eye on a sample; fin close-ups use the fish's own stroke at mid-power / mid-recovery (small for cruisers by design).
