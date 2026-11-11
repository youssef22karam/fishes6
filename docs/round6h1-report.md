# Round 6H.1 report — eye margin/seat + mouth-corner fixes (WIP — one blocker left)

Arena session 01a1b6ed completed the fixes but left this report as a draft
and could not run headshots in its sandbox. Completed by Muse from Muse's
own gate runs, 2026-11-07. All numbers below are Muse's reruns on the final
delivered code (the model's last procgen edit post-dated its own randaudit).

## Gate results (Muse)
- Reassembly byte-exact (fishgen SHA dbdc0146...). pectest PASS, tailtest
  PASS, build PASS.
- verify: COHERENCE 1,000/1,000 PASS — UNIQUENESS FAIL: exactly 37/10,000
  seeds fail to resolve, deterministic. Muse probed all 10,000 uniqueness
  seeds: ALL 37 are pike/gar lineage (list in round6h2 prompt). The 6H.1
  eye clamp made the elongated-plan eye constraints unsatisfiable within
  the sampler's tries — sampler and audit disagree on the feasible eye
  band for very long heads.
- randaudit (Muse, final code): standard 0/300 violations in EVERY class
  (was 24/300); wonder RAW 4 (3 EYE_SLICED crosses, 1 FLAT_BODY_END — all
  rejected by the filter); wonder SHIPPED zero.
- Head renders (Muse, r5shot): grouper U7P5S — eye complete, round, proud
  of the surface, mouth seam sealed to the corner (the stonefish class,
  fixed); ray H2W9X — eye seated on the dome, buried fraction 0.

## Verdict
Eye + mouth-corner classes CLOSED on standard and shipped fish. NOT main:
uniqueness hard gate fails on the gar lineage. Round 6H.2 (micro, gar eye
feasibility only) follows from this branch state.
