# Round 4.1 report — the mouth bar, fixed (eye pattern + snout speckle move to 4.2)

NOTE: both Arena sessions for this round died on the session token limit
(01a1b50c, 01a1b530) before running validation or writing a report. This report
is Muse's verification record on the preserved session-2 zip, 2026-11-07.

## The bar — true cause, and a correction
Muse's Round 4 diagnosis (bar = body skin mesh, from a colour-code render) was
WRONG. The two Arena investigations converged on the real mechanism, and the
fix proves it: the cheek walls at rest are a COLLAPSED SHEET (upper/lower lip
points coincide), so computeVertexNormals leaves ZERO-LENGTH normals on them;
the shader normalises 0 -> NaN and the open walls shade BLACK. The visible
"divider" was the intact, correctly shaded hood/floor funnel strip BETWEEN the
two NaN-blackened walls. It was never a separate object — which is why three
rounds of geometry surgery and a geometry audit (0 offending triangles) could
not find or remove it.

Fix (src/engine/mouthgeo.js, the only code change): cheek-wall vertices get
their analytic medial normal; any other zero-length normal falls back to the
pocket axis. Geometry, weights and the rest pose are untouched.

## Gate results (Muse's runs on the delivered code)
- verify: OVERALL PASS — UNIQUENESS 10,000/10,000, 0 failed; COHERENCE
  1,000/1,000. (One earlier run flaked 999/1,000 on a rare sampled genome
  ZFX7K3C2, "eyes not on opposite sides" — a stochastic coherence-sampler edge
  that the rerun passed; the Round 4 baseline samples the same space.)
- pectest PASS (0 violations). tailtest PASS (0 violations).
- Build PASS (dist 1,457,314 B). Reassembly byte-exact (fishgen unchanged:
  529,101 B, SHA c76ea2a7… — the fix lives in mouthgeo.js, outside the parts).
- Muse's front renders at jaw = 1 (round41-shots/): Q1CW5 — ONE continuous
  mouth, no divider, no twin black holes. QZTAI — single opening, no divider.
  THE BAR IS GONE on both seeds, first time since it appeared in Round 2.1.

## Not done — moved to Round 4.2
- FIX 2 (pattern across the eye blend patch): session 1's attempt does not
  work — Muse's QUK8_ eye macro on that build is unchanged (patch still
  plain, spots still clipped at the edge). Session 2 diagnosed only.
- FIX 3 (rigid-plan snout speckle patch): never started in either session.
