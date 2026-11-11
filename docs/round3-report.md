# IchthyoGen — Round 3: tails, remaining fins, tail/fin diversity

All rules are global (axes only: body plan, niche flags, swim mode, depth band, body size). No file is over 30,000 bytes (the generated, git-ignored `src/engine/fishgen.js` excepted). Screenshots are in `docs/shots/after3/` (29 files).

## Validation (fresh run)

`npm run reassemble && node tools/verify.mjs && node tools/pectest.mjs && npm run build` — all passed.

| check | result |
|---|---|
| UNIQUENESS | **PASS, 10,000 / 10,000, 0 failed to resolve** |
| COHERENCE + mesh audit | 1,000 / 1,000 |
| pectest (finmotion clamps) | PASS (unchanged) |
| OVERALL | **PASS** (`docs/verify-report.txt`) |
| tail check (`tools/tailtest.mjs`, 1,000 built fish) | PASS, 0 violations (`docs/tail-report.txt`) |

## Tail audit (1,000 fish, measured from the built mesh)

| metric | median | p98 | max | cap |
|---|---|---|---|---|
| resting tail pitch (°) | 0.0 | 1.8 | 3.0 | ≤ 15 |
| heterocercal lobe ratio (70 fish) | 1.40 | 1.99 | 2.10 | ≤ 2.2 |
| caudal height / L | 0.245 | 0.271 | 0.271 | ≤ 0.38 |
| caudal area / L² | 0.022 | – | 0.061 | ≤ 0.16 |
| dorsal height / L | 0.087 | 0.300 | 0.300 | ≤ 0.30 |
| anal height / L | 0.062 | – | 0.300 | ≤ 0.30 |
| pelvic ÷ side fin (non-gliding plans) | 0.38 | – | 0.74 | ≤ 1.0 |

- 97.1 % of heterocercal fish have a lobe ratio in 1.1–1.6; 1 of 70 is above 2.0.
- The internal spine deflection is 10.1–29.3°.
- "Pitch" is the angle between the body axis and the vector from the fin base to the centroid of the trailing edge.

## What changed

**1. Tails** (`src/engine/tailgeo.js`, new; `laws.js`; part10 calls it).
- The standing defect is gone. The old ranges (deflection [.2,.85], lobe ratio [1.05, 4]) and the `bend` rotation of the upper lobe are removed.
- The fin is built flat on the body axis with no rotation anywhere.
- The upper lobe is longer, partly by reaching further back and partly by being higher. `heteroSplit` solves this numerically for the genome's lobe ratio and reduces the asymmetry if the fin's pitch would exceed 12.5°.
- `lobeAsym` is now sampled per fish from a seed-derived unit by `lobeAsymFromUnit`. This gives a concentrated distribution with a hard maximum of 2.2. The ratio is `1 + 1.2·lobeAsym`.
- The 10–30° spine deflection is reported (`info.tail.spineDeg`). It is internal and never rotates the fin.
- Caudal height is capped at 0.38 L, using a soft saturation so typical tails stay under the cap. Area is capped at 0.16 L² by reducing the chord.
- Homocercal lobes differ by ≤ ±12 % (hypocercal ≤ ±15 %).
- The peduncle profile eases to symmetric (`dorsalFrac` → 0.5 over u = .62–.95), so the visible centreline runs straight into the tail.
- The fin base is buried by `min(0.02 L, ½ local depth)`. The depth clamp applies on very slender bodies.
- Shape families come from swim mode: lunate/forked for cruisers, rounded/truncate/fan for manoeuvrers, a rounded paddle for ambush and bottom niches (when T < .55), and diphycercal for elongated plans.
- Per-fish variation (fork depth, lobe fullness, trailing-edge curve) is drawn from the seed. A bounded plan-axis bias separates plan cells.
- Swimming already uses only the lateral (yaw) wave `waveZ`, growing from peduncle to tip. There is no vertical term in any fin or tail shader.

**2. Other fins** (part10, part12, `laws.js`).
- Dorsal and anal realised height is capped at 0.30 L in the builder (shape peaks included) and at genome level in the repair rule.
- Pelvic fins are capped at 0.20 L and at 0.8 × the realised side-fin length. Gliding and disc plans are exempt.
- Ridge fins and pelvics get the same buried base as the caudal.
- Dorsal, anal, pelvic and caudal membranes now keep a minimum opacity (0.86–1.0), like the side fins.
- Because of the dorsal cap, the area-envelope floor is waived for a dorsal or anal fin that is already at the cap. This avoided about 1,000 pointless rejections.

**3. Diversity.**
- `docs/shots/after3/tail_grid_44.png` shows 44 real renders across the 18 plan × swim cells present in the generator.
- Mesh outlines: 867 distinct signatures out of 952 fish. Minimum distance between cell-mean outlines is 0.005 L, so no two cells coincide exactly.
- The two exceptions are gated:
  - Gliding plan: the side-fin length band is still finmotion's (pectest unchanged).
  - Ornamental niche: the 0.55 height cap and filaments are gated on the axis flag `ornamental`. The unit test in `tailtest` confirms the flag opens them and `ambusher`/`glider` do not.
  - **The generator has no niche that sets `ornamental`,** so the exception is wired and tested but currently unused by any generated fish. I did not invent a niche, because that would change the population.

**4. Residuals from 2.1.**
- *Front mouth centre bar:* **only partly fixed.** I replaced the central gill-arch blobs with lateral left/right pairs and made the tongue lower. A bar still reads in the front view of the widest-gape seed (`reg_frontAperture_QZTAI.png`): a narrow maroon vertical strip with a black slot on each side.
  - My diagnosis is that it is not a strut. The pocket tapers (shrink 0.25) towards the throat cap, so the lit back wall appears as a narrow centre strip between two shadowed flank walls.
  - The next step is to darken or widen the cap in the pocket shader, or stop the taper. I ran out of budget before doing that.
  - I did not check the faint pink chin patch.
- *Eye blend edge:* the outer boundary of the skin blend is now irregular (four harmonics, per-eye phase) instead of a perfect circle. The rim and iris are unchanged. I judged this from the macro shot `reg_eyeMacro_QIBXD.png`. There was no pattern-continuity change.
- *Rim cap:* relaxing the mid-plane clamp (0.06 R → 0.02 R) did not help, so it was reverted. On this audit's 1,970 eyes, 36 (1.8 %) exceed 0.06 D, worst 0.207 (p99 = 0.083). The Round 2.1 figure was 10 of 788 (1.3 %, worst 0.111), but on a different seed sample, so I cannot say whether this is a regression. **Left as a stated residual.**

## Screenshots (`docs/shots/after3/`)

- 16 `side_<plan>_<swim>_<seed>.png`: whole fish at rest, tail on axis.
- `hetero_{min,mid,max}_*`: lobe ratios 1.10, 1.38 and 2.01, as tail close-up plus side view.
- `tail_grid_44.png`: the 44-tail grid.
- `reg_*`: mouth-open side, eye macro, front aperture (two seeds). Rounds 1–2.1 are unchanged apart from the residuals above.
- `picks.json` and `meta.json` hold the seed selections and the measured pitch and height for each side shot.

## Tools

`tools/tailtest.mjs` (tail audit), `tools/r3pick.mjs` (axis-based seed picker), `tools/r3shots.mjs` (screenshot set) and `tools/shots3.mjs` (ad-hoc side and tail shots).

## Other residuals

- The mouth centre bar and the rim cap, both described above.
- Headless Chromium needed extracted system libraries. This is an environment issue only.
