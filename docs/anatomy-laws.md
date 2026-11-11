# IchthyoGen — global anatomy laws (mouths, eyes, fins, tails, flattened plan)

All laws live in `src/engine/laws.js` and read **only** the generator's axes:

| axis | source |
|---|---|
| BODY PLAN | anatomy family of the lineage + plan flags (`flat` 0/½/1, `cartilaginous`, `sideFlat`, `headExpanded`, `jawless`, `tubular`, `elongated`, `perch`, `solid`, `softRayed`) |
| FEEDING NICHE | functional flags of the niche (`predator`, `ambusher`, `grazer`, `planktivore`, `sifter`, `flatBenthic`, `parasite`, `suction`, `surfaceFeeder`, …) |
| SWIM MODE | `swim.mode` |
| DEPTH / HABITAT | habitat `light` (dark < 0.3, lightless ≤ 0.02 or cave flag) |

`FG.axesOf(genome)` collapses a genome to these axes. No rule, range or example is keyed to a named animal.

## Where each law acts

1. **Repair rule `anatomy_laws`** (`fishgen` rules table, runs to a fixed point with the other rules) — `LAW.repairLaws`.
2. **Geometry** — `BodyModel.law = { eye, mouth, fin, tail, flat }` drives `buildEyes`, the mouth constructor (`mouthgeo.js`), `FinBuilder`/`addPectoral`/`addCaudal`, `BodyModel.section` (disc), `buildNostrils` (spiracles).
3. **Validation** — `validate.js` imports `assertLaws` (genome level) and `checkFishGeometry` audits the mesh (cavity inside the head and ≤ 0.35 head length, teeth on the jaw margins, flattened-plan disc + margin fin + no hinged jaw). Invariants added: `tail`, `plan`.

## 1. Mouths — `mouthLaw(ax)` (rest = closed, opening = living deformation)
Everything below is a function of FEEDING NICHE × BODY PLAN (+ the head section the plan produces); nothing is keyed to a named animal.
* construction: `ventral` (flattened plan) · `sucker` (jawless plan or parasitic niche) · `fused` (grazing niche) · `tube` (tubular plan or suction niche) · `jawed` otherwise.
* placement: `up` → superior (surface / glider niches) · `down` → subterminal / inferior (sifter, flat-benthic, parasite, bottom-dweller, scavenger; cartilaginous plan: set back under the snout) · `forward` → terminal.
* gape band (mouth-corner station, hence mouth width on the head section) by prey-size niche: ambush [.55,.95] · lurer/filter [.45,.9] · predator [.4,.85] · picking/plankton [.08,.32] · tube/fused ≤ .25 · default [.18,.55]. The corner never passes the front edge of the eye (ambush: its centre line) on lateral-eyed plans.
* gape ANGLE (`openDeg`): ambush 28° (a seeded minority 34°) · pursuit predator 26° · lurer/filter 22° · everything else 12–20° by gape band · non-jawed 0. `mouthgeo.gapeRad` bounds it again by the head plan: the chord between the lip tips ≤ 0.95 × head width. The lateral splay of the opened jaw is bounded so the jaw is never wider than the head (`jawSpreadRef`).
* living axes: `restOpen` (grasping predators rest ajar at .34–.45 of their own maximum, teeth showing; all others rest closed) · `lipK` (fused .9, bottom-feeding .75, tube/picking .5, generalist .38, filter .2, predator .12 — blended 35 % with the genome lip axis) · `protrude` × head length (tube .16, picking .12, generalist .06, predator .02) · `drop` × head length (.025–.07 by gape band) · `web` (corner web = rear .40–.58 of the jaw) · `beakGape` (.035 × head length at the beak tip) · `comb` (filter niche: fine even tooth row, deepest pocket the law allows with a fine even set of slim arch bars).
* teeth class from niche: grasping (needle/fang/triangular) · crushing (molar) · comb (villiform/rasp) · plate (fused) · absent. Length .02–.075 × head length (.09 widest-gape niche in the dark band), ≤ 0.26 × local jaw depth, ≤ what the lip gap at the tooth's own station allows; roots buried 1/3 in the jaw rim, crowns leaning inward and backward; lower row half a pitch along and further in.
* construction (`mouthgeo.js`, `teethgeo.js`): ONE lip line (`jawEdgeVert`) shared by the lower-jaw patch edge, pocket rim, lip pads, teeth, beak plates, the skin shader's cut and its painted crease (`FS_SEAM`). Each mouth vertex = rest position + hinge weight (`aBody.w`) + open offset (`aOpen`); the shader poses `hinge(p + aOpen·open, gape·open·w)`, `open = uMouthOpen`. `open = 0` is the closed mouth exactly (a built fish always has `uJawAngle = uMouthOpen = 0`); `mouthgeo.poseMouth` is the only place the pose is set (animation loop, thumbnails).
  * joint `hingeU` ≥ rear edge of the eye and ahead of the gill opening; the jaw flexes over its rear 38 % so it never separates from the head.
  * floor: lower-jaw patch midline + pocket floor drop by `drop`, hood arches a third as much, throat recedes (rest depth = 0.8 × open depth ≤ `CAVITY_MAX`), every posed point re-contained in its head section; occlusion is depth-led and darkens further with gape.
  * corner web: folded double sheet inside the seam at rest → fans out between the lips, flattens (pulled taut) and its front edge recedes into a crescent; shaded lighter as it thins.
  * lips: low pads in the head surface on both sides of the seam, pinned on the lip line and on the skin; open pose rolls the crest toward the rim and removes 30 % of the height.
  * teeth: visible length = min(2/3 length, 0.47 × lip gap at the tooth's station) at every gape (`aErupt`) → hidden on the seam when closed, never touching the opposite row or jaw.
* fused: two plates meeting on the seam + thick skin lips; no hinged jaw, no cavity (`uJawOpenMax = 0`); the lower plate and lip drop by `beakGape` at the tip (0 at the base) over a dark floored slot.
* tube: round sleeve on the snout tip, puckered shut at rest; telescopes forward by `protrude` and opens into a round O over a floored funnel.
* sucker: underside disc, depth ≤ 0.1 head length, lip annulus + floored dish (static). Flattened plan: ventral lip arcs + floored slot (static).
* audit: `node tools/mouthaudit.mjs` poses every mouth mesh like the shaders at 11 gapes and checks the bounds above (`SHOTS=file.png` writes a software-rendered contact sheet).

## 2. Eyes — `eyeLaw(ax)`
* diameter / head length band: lightless → vestigial [.05,.06] skin-covered (still 2 eyes) · dark or nocturnal → [.10,.15] · bright open-water cruising → [.05,.10] · else [.06,.14].
* pupil: vertical at the bright ambush/nocturnal extreme, horizontal at the bright bottom-oriented extreme, round otherwise (`uPupilShape`).
* placement: lateral · dorsal (flattened plan) · one side (side-flattened plan) · lateral extremity (expanded head). Protrusion = (0.8 − 0.53 + 0.14)/2 = 0.205 of the diameter ≤ 1/3.

## 3. Fins — `finLaw(ax)`
* one constructor (`FinBuilder`): base rooted on the skin, rays, translucent membrane, **scalloped trailing edge between ray tips** and a satin membrane (`FS_FIN`).
* area / lateral body area envelopes by swim mode (`FIN_ENV`), minimum ray counts (`RAY_MIN`), stiffness at the cruising end, segmented spiny front section on the perch-like plan, accessory fin only in the soft-rayed subcarangiform band, merged continuous fringe on elongated plans, ray-supported disc margin on the flattened plan.

## 4. Tails — `tailLaw(ax)`
* homocercal: outline is `homocercalOutline(a, T, notch)`, a continuous function of the swim axis T (rounded → truncate → forked → crescent); aspect band, peduncle depth cap and keel (`T ≥ .85`) interpolate from T.
* heterocercal (cartilaginous plan): the rear axis deflects upward by the plan parameter (`lobeAsym` ∈ [.2,.85]); the upper lobe is built around the deflected axis (`bend`), lower lobe shorter, lateral keels on. Lobe ratio `lobeRatioOf(d)` bounded [1.05, 4].
* whip (flattened plan): no caudal fin; slender peduncle, small rear median fins, optional tail spine (flat-benthic niche).

## 5. Flattened plan — `flatLaw(ax, g)`
Disc outline rounded ↔ angular and width ratio are plan parameters; the body carries the fused disc and the fin constructor builds its ray-supported margin. Top surface: eyes + spiracles. Bottom: ventral mouth (two lip arcs + floored slot) + 5 gill pairs. Half-form (`flat = .5`): disc front, distinct rear body with median fins and a heterocercal tail from the same construction.

## 7. Close-up presets
God Mode → camera row: **Mouth · Eye · Fin · Tail · Below** (plus Side / Dorsal / Head). All framed on landmarks, so a blind-generated set can be shot per law.
