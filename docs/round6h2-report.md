# Round 6H.2 report — eyeband single source of truth (WIP — coherence traded)

Arena session 01a1b725 built src/engine/eyeband.js (sampler eyeU envelope
derived from the same band the audit enforces) but hit the account's daily
usage limit before running any post-fix gate; its report stayed a draft.
Completed by Muse from Muse's own gate runs, 2026-11-07.

## Gate results (Muse, final delivered code)
- Reassembly byte-exact. pectest PASS. tailtest PASS (the model's sandbox
  tailtest FAIL — minD 0.003 — did not reproduce in Muse's environment,
  the reference environment for all prior rounds). Build PASS.
- verify: UNIQUENESS PASS — 10,000/10,000 generated, 0 failed to resolve.
  The gar defect is FIXED; all 37 previously failing seeds resolve.
- verify: COHERENCE 940/1,000 FAIL — all trait invariants 1,000/1,000;
  the mesh audit fails 60 fish. Failing examples: stingray "eye
  protrusion above 1/3 of its diameter" (many), flatfish EYE_SLICED with
  cornea 92–96% visible, sturgeon MOUTH_CORNER_OPEN (4–6 free edges).
  The seat fix overshot: corneas went from buried (6H.1) to
  over-protruding under the classic audit's protrusion cap, and the
  mouth-corner closure does not hold for the ancient head geometry at
  mesh level.
- randaudit (Muse): standard 2/300 (both EYE_SLICED); wonder RAW 1;
  wonder SHIPPED zero.

## Verdict
NOT main. The eyeband architecture is right and uniqueness is restored;
the remaining work is one bounded seat BAND (protrusion min AND max,
shared by construction and both audits) plus the sturgeon corner.
Round 6H.3 (micro) follows from this branch state when the Arena daily
limit resets.
