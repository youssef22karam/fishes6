# Round 6H.3b report — ventral mouth corner (PIECE 2 of 2, MICRO)

STATUS: COMPLETE. The bar is met. One file of engine code changed (`src/engine/mouthgeo.js`); eyes, `eyeband.js`, the audits and every
fishgen part are untouched (parts byte-identical to 6H.3a).

## Defect (from Muse's verify on the 6H.3a code)
COHERENCE 997/1,000: the only failing examples were sturgeon `MOUTH_CORNER_OPEN` ("cheek wall has 6 free edges inside the head at the
mouth corner") — `3SB1GD9P`, `EGRWC5YJ`, `T08KPND9` — plus carpet shark `V66HKTNW` (2 free edges) in Muse's census.

## Reproduction on the built mesh (new probe `tools/r6h3b.mjs`, same path as verify: `fromSeed` → `buildFish('med')` → shared audit)
| seed | free edges inside the head | where (all owned by the pocket's `hood/floor rings` group) |
|---|---|---|
| 3SB1GD9P sturgeon | 6 (max 0.056 HL) | rings 3–4, stations 28–29 (u = 1.43–1.49 x mcU, behind the corner, up to the hinge at 1.77), all 4 rim copies, z ~ 0 |
| EGRWC5YJ sturgeon | 6 (max 0.056 HL) | same pattern, u = 1.48–1.53 x mcU |
| T08KPND9 sturgeon | 6 (max 0.046 HL) | same pattern, u = 1.39–1.44 x mcU |
| V66HKTNW carpet shark | 2 (0.107 HL) | rings 3–4, stations 7–8 (u = 0.69–0.70 x mcU); this aperture only STARTS at 0.61 x mcU |

The sturgeons also had 2 shallow free cheek-wall edges each (0.005 HL, under the audit's threshold). The audit text says "cheek wall"
generically; the deep offenders are ring triangles of the same pocket.

## Cause
The round-4 centre-band sliver drop in `buildCavity` (`isSheet`: triangles inside 0.02 x head width of the centre plane and parallel
to it) ran over the WHOLE pocket. Every ring converges onto the throat (z = 0), and on a ventral / inferior mouth the pocket is a slot
near the centre plane, so DEEP ring triangles (rings 3–4) in the corner region also passed the test. Some of them were dropped and
their neighbours were not (at rest the hood and floor quads coincide but use opposite diagonals, so a partial drop never cancels),
which left free edges deep in the head. History: 6H.1 had confined the drop to the front (0.5 x mcU); the 6H.2 commit reverted those
lines along with other 6H.1 fixes in `coherence.js` / `procgen.js` (it worked from a pre-6H.1 copy). That is when the sturgeon class
came back.

Why the 6H.1 cut was NOT simply restored: measured on 300 subterminal/inferior fish, a 0.5 x mcU cut closes the corner but raises the
round-4 centre-plane standing sheets (`FG.centreAudit`, the front-view "mouth bar") from 0 to 105, and changes 406/600 pockets. The
drops in the 0.5–0.7 band are real front-view dividers on ventral mouths. Per-triangle diagnosis showed the corner-region drops are
exclusively deep ring 3–4 triangles, and none of them is ever a front-view sheet.

## Fix — CORNER_SEAL in `src/engine/mouthgeo.js` (by construction, every mouth placement)
Before anything is dropped the pocket is a closed bag (rim joined at both hinge corners, rings closed onto the throat cap, cheek walls
folded onto both lip copies, rear edge welded at the lip corner). The sliver drop is now confined to the FRONT of the aperture: a ring
or cheek-wall triangle is eligible only if every station it carries (`aBody.x`, compared as stored, float32) lies ahead of the corner
region L6 audits (`CORNER_U` = 0.7 x mcU). In the corner region nothing is ever removed. The rule reads stations only, never the mouth
placement, so terminal, protrusible, superior, subterminal and inferior mouths are all sealed the same way, right to the rear edge at the
hinge. The front drop pattern (round 4) is unchanged.

## Results
**Named seeds (checked):** `3SB1GD9P`, `EGRWC5YJ`, `T08KPND9`, `V66HKTNW` have 0 free edges at the mouth corner at ANY depth (the shallow
cheek-wall edges are gone too); `checkFishGeometry` errors: none. The 6 extra sturgeons the baseline failed in the random stress below
(`WE7EM354`, `BDQA7NT0`, `72ZJPZ7Y`, `JKZR835Z`, `JHDK0HYP`, `X971G8E3`) also have 0.

**Deterministic populations, before → after** (300 all-clade + 300 subterminal/inferior):
| | all-clade | ventral |
|---|---|---|
| `MOUTH_CORNER_OPEN` | 0 → 0 | 2 → 0 |
| fish with ANY free corner edge | 0 → 0 | 2 → 0 |
| centre-plane standing sheets (round 4) | 3 → 3 (pre-existing) | 0 → 0 |

161/600 pockets differ, and every difference is restored corner-region triangles: 4–16 innermost ring-4 → throat triangles on
terminal / protrusible / superior mouths, deep ring 3–4 triangles on inferior ones. Vertex positions and attributes are unchanged.
`tools/r4audit.mjs 400`: 0 offenders before and after.

**Random-draw stress** (`randomFish`, 150 each of ancient / shark / ray / cat): baseline 6/150 ancient (all sturgeon); fixed 0/600.

## Gate results (final code)
- **`node tools/verify.mjs`** (`docs/verify-report.txt` is this run): **OVERALL PASS**. UNIQUENESS 10,000/10,000 (0 failed to
  resolve, 10,000 distinct hashes, mean attempts 1.11, determinism 60/60; trait-distance stats identical to 6H.3a, so no genome
  changed). COHERENCE 1,000/1,000 (all 10 invariants 1,000/1,000, mesh audit 1,000/1,000, mutate 250/250, breed 250/250). The
  "coherence: MOUTH_CORNER_OPEN" rejection reason is gone.
- **Earlier verify run, disclosed:** the first verify after the fix gave UNIQUENESS PASS, COHERENCE 999/1,000 with zero
  `MOUTH_CORNER_OPEN`. The single failure, `VDX5RETA` boxfish `EYE_OUTSIDE_HEAD` ("eye on the gill region, u=0.188, gill front
  0.200"), reproduces identically on the untouched 6H.3a code (same genome hash), so it predates this piece. It is rare: 0 of 300
  deterministic boxfish on the baseline. Eye code is out of scope here and was not touched. Lead for a later piece: the analytic eye
  landmark (u = 0.1727) passes the gate, but the built eye centre sits about 0.015 L further back; seating along the surface normal
  of a blunt box-shaped head front plausibly accounts for the shift.
- **`node tools/randaudit.mjs after`** (`docs/census/randaudit-after.json`): standard n=300, 0 in every class; wonder RAW 1
  (`FLAT_BODY_END`, the pre-existing Brook marlin-flounder, filtered); wonder SHIPPED n=289, 0 in every class; RANDAUDIT PASS.
- **pectest** PASS (0 violations). **tailtest** PASS (1,000 built, 0 violations, minCellPrototypeDistance 0.005, axisGatesOK true).
- **`npm run build`** PASS (`dist/index.html` 1,488.50 kB).
- **Reassembly** byte-exact: 20 parts → `src/engine/fishgen.js`, 535,357 bytes, SHA-256 `02b2aa9c…2054d0b2a`.
- **Sizes:** every tracked and new file is ≤ 30,000 bytes (`mouthgeo.js` 27,154).
- Build-time figures in the verify report (median ~50 ms) were measured on a 2-core sandbox while other gates ran concurrently. Its
  analytic-only uniqueness phase was 2x slower than 6H.3a too, so the slowdown is the environment. The fix adds at most about 134
  triangles to a pocket; max fish 31,062 of the 40,000 budget.

## Files
`src/engine/mouthgeo.js` (fix), `tools/r6h3b.mjs` (new probe), `docs/verify-report.txt`, `docs/census/randaudit-after.json`, this
report. Not committed or pushed.

## Muse's independent gate (2026-11-08, run on the delivered zip, not the model's numbers)
- Reassembly: 20 parts → fishgen.js 535,357 B (unchanged — fix is in mouthgeo.js only).
- verify.mjs MY RUN: **OVERALL PASS — UNIQUENESS 10,000/10,000, COHERENCE 1,000/1,000** (first full-green verify in the project).
- randaudit MY RUN: standard 0/300 every class (MOUTH_CORNER_OPEN 0); wonder SHIPPED 0/289; RAW 1 FLAT_BODY_END (Brook marlin-flounder, filter-rejected, pre-existing).
- Named-seed probe (tools/r6h3b.mjs): 4/4 seeds zero free edges inside the head at the corner.
- pectest PASS, tailtest PASS, npm run build PASS.
- Battle attempt 3 of 3: accepted model claude-opus-5.5-max (whitelist); attempts 1–2 pairs rejected per nino's whitelist.
