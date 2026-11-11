# Round 6H report — coherence hardening (WIP — NOT main-accepted)

Arena session 01a1b651 died on the token limit after deploying; the code was
salvaged from its zip and gated by Muse, 2026-11-07. The model wrote no
report; this is Muse's record.

## What landed in the code
- Shared audit src/engine/coherence.js (laws L1-L6) wired into verify, the
  Wonder filter, Breed and mutation acceptance; hybrid niche-clade waiver
  removed. Rostrum teeth re-fit (new src/engine/rostrum.js).
- Census tools: tools/randaudit.mjs (300 std + 300 Wonder), tools/headshots.mjs.

## Muse's gate on this code
- verify: UNIQUENESS PASS; COHERENCE 875/1000 FAIL (the new audit's own
  classes: EYE_OUTSIDE_HEAD / EYE_SLICED boundary + seat cases, 7x
  MOUTH_CORNER_OPEN, 1 gar with unrepaired constraints). pectest/tailtest
  PASS; build PASS; reassembly byte-exact (SHA 44578da8...).
- Muse's randaudit (300/300): standard 24/300 with violations
  (EYE_OUTSIDE_HEAD 10 — all within ~0.01 of the gill-front boundary on
  short-headed plans; EYE_SLICED 14 — stingray corneas buried 0.08-0.20 R);
  wonder RAW 19/299; **wonder SHIPPED 269 candidates, ZERO violations in
  every class**; DETACHED_TEETH 0 across all 899 audited fish.

## Verdict
NOT accepted to main (hard gate FAIL). Preserved on branch round6h-wip.
Round 6H.1 (fix-only) must bring: verify coherence 1000/1000 AND randaudit
standard zero — by fixing eye U placement margin on short-headed plans,
eye seat depth on disc/flat plans, and the mouth-corner free edges.
