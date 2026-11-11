# Round 4 report — skin, scales, pattern & light (+ mouth bar diagnosis)

NOTE: the Arena session hit its token limit after deployment, before writing this
report or refreshing verify-report.txt (the zip's verify-report was Round 3's,
byte-identical). This report and the committed verify-report.txt are therefore
Muse's own verification record (independent rerun on the delivered zip),
2026-11-07.

## Gate results (Muse's rerun)
- Reassembly: parts reassemble byte-for-byte to fishgen.js (529,101 B, SHA c76ea2a7…).
- verify.mjs: exit 0 — UNIQUENESS PASS 10,000/10,000, 0 failed to resolve;
  COHERENCE 1,000/1,000; mesh build median 11.3 ms (no perf regression).
- pectest PASS (0 violations). tailtest PASS (0 violations; eye rim over-cap
  unchanged at 36/1,970 — no growth).
- Build PASS (dist 1,457,060 B).
- Centre-plane audit (tools/r4audit.mjs, Muse's rerun): 0 offending triangles,
  0/339 fish affected; named seeds Q1CW5 and QZTAI both 0. Before-fix audit
  (docs/centre-audit-before.json): 2,229 triangles over 252 fish — chin cap 1,700,
  cheek walls 238+238, tongue 39, hood/floor rings 14.

## What improved (Muse's renders, round4-shots/)
- Cruiser + deep-band skin: the uniform honeycomb/dot grid is gone where the
  axis gates say smooth — fine station-graded grain instead (QOG9_ side).
- Deep-band body darker/desaturated, photophore rows on the pattern field (QZTAI side).
- Mouth interior now graded (lighter toward the lips) instead of flat dark red.

## What did NOT land (carried to Round 4.1)
- FRONT-VIEW MOUTH BAR STILL VISIBLE on Q1CW5 + QZTAI at jaw = 1 — but now
  DIAGNOSED: a mesh colour-code render (tools/r4ident.mjs) shows the divider is
  drawn by the BODY SKIN mesh (mesh 0), not by any interior group — the interior
  centre-plane audit passes because the bar was never interior geometry. The
  skin's jaw-opening treatment leaves a midline column of head surface standing
  inside the aperture silhouette.
- Eye blend patch: body spot pattern still stops at the patch boundary (QUK8_
  eye macro) — pattern is still not body-space continuous across the patch.
- Rigid-plan snout cap: the dense speckle patch with a hard straight boundary
  is unchanged (QUK8_ head side view).
