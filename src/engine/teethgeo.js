/* TEETH — continuous, ROOTED rows along both lip edges, built on the SAME lip line as the jaw patch / pocket rim (mouthgeo.lipPoint).
   · every tooth base is buried 1/3 of its length INSIDE the jaw rim (above the upper lip line / below the lower one) and tucked just inside the lip;
   · every tooth points at the opposite jaw, leaning INWARD and BACKWARD (recurved, more so for the grasping classes) — never outward or forward;
   · rows are continuous: spacing between neighbours = 1.3 × base width (law ≤ 1.5), graded smoothly (largest at the front/middle of the jaw, smaller toward the corners);
     the lower row is set half a pitch along and a little further in, so the two rows interdigitate; the filter niche (law.comb) gets a fine EVEN comb (no grading, no jitter);
   · length 0.02–0.075 × head length by tooth class (0.09 only for the widest-gape niche in the dark band; TOOTH_LEN_MAX stays the validator's ceiling) — a fish, not a monster;
   · LIVING: a tooth is erected from the gum by the gape. Its visible length is  min(2/3 × length, TOOTH_GAP × lip gap at its OWN station)  at every gape (aErupt, vertex shader),
     and its length is capped by the gap its station reaches at this fish's maximum gape. So with the mouth closed every tip lies ON the seam inside the lip (nothing shows outside
     the silhouette), and since TOOTH_GAP < 1/2 an upper and a lower tooth can never meet, nor can a tip reach the opposite jaw, at any gape between closed and maximum;
   · round-to-slightly-flattened cones (never cards, never zero-thickness pins); a second, shorter inner row only for the widest-gape niche;
   · one InstancedMesh; the lower row carries the lower jaw's movement weight (aJaw), identical to the lip it grows from.
   Fused plates (beak), sucker discs and tubes get no jaw teeth (the caller does not build them). */
import { jawU0, jawU1, jawW, lipPoint, gapeRad, jawPivot } from './mouthgeo.js';

export const TOOTH_LEN = { villiform: .02, rasp: .02, molar: .026, triangular: .05, needle: .055, fang: .075 };   /* × head length */
export const TOOTH_LEN_MAX = .14, TOOTH_SPACING_MAX = 1.5;
export const TOOTH_GAP = .47, TOOTH_WIDEST = .09;   /* share of the lip gap one tooth may span · longest tooth of the widest-gape niche (× head length) */
const hash = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

/** ROUND 2.1 — THE jaw envelope (single source of truth for generator AND validator, mouthcheck.js imports it).
    At the head station that owns point (x,y): ly = height along the section normal, dUp/dDn = section extents, hw = half-width of the section at that height. */
export function jawEnv(bm, H, x, y, o = {}) {
  const fr = bm._tef || (bm._tef = {}), s = bm._tes || (bm._tes = {}), u = H.clamp((bm.headX - x) / bm.L, .003, .999); bm.frame(u, fr); bm.section(u, s);
  const ly = (x - fr.px) * fr.nx + (y - fr.py) * fr.ny; o.u = u; o.ly = ly; o.dUp = s.dUp; o.dDn = s.dDn; o.hw = bm.halfWidthAtY(s, H.clamp(ly, -s.dDn * .99, s.dUp * .99)); return o;
}
export const jawIn = (e, z, slack) => e.ly > -e.dDn * slack && e.ly < e.dUp * slack && Math.abs(z) <= e.hw * slack + 1e-6;
export const TEETH_SLACK = 1.04, TEETH_FIT = .9;   /* validator slack / generator target (the generator aims strictly inside what the validator accepts) */

/** lip arc of the upper jaw (static): right corner → chin → left corner, as dense points with frame data; teeth ride on it for both jaws */
export function lipArc(bm, H, NS = 80) {
  const u0 = jawU0(bm), uc = Math.min(bm.mcU * .97, jawU1(bm)), pts = [], o = {};
  for (const side of [1, -1]) for (let i = 0; i <= NS; i++) {
    const k = side > 0 ? NS - i : i, u = H.lerp(u0, uc, Math.pow(k / NS, 1.4)); lipPoint(bm, u, side, H, 0, o);
    pts.push({ x: o.x, y: o.y, z: o.z, ly: o.ly, lz: o.lz, tx: o.tx, ty: o.ty, nx: o.nx, ny: o.ny, u });
  }
  let s = 0; pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z); pts[i].s = s; }
  return { pts, total: s };
}
function at(arc, s) {
  const p = arc.pts; let lo = 0, hi = p.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].s <= s) lo = m; else hi = m; }
  const a = p[lo], b = p[hi], f = (s - a.s) / Math.max(1e-12, b.s - a.s), L = k => a[k] + (b[k] - a[k]) * f;
  return { x: L('x'), y: L('y'), z: L('z'), tx: L('tx'), ty: L('ty'), nx: L('nx'), ny: L('ny'), u: L('u') };
}

/** lip gap at the station that owns lip point P when the jaw is at this fish's maximum gape (chord swept by the lower lip about the joint, with its own movement weight) */
export function lipGap(bm, H, P, piv, ang) { return 2 * Math.hypot(P.x - piv.x, P.y - piv.y) * Math.sin(ang * jawW(bm, P.u, H) / 2); }

/** returns { mesh (InstancedMesh), info } or null */
export function buildTeethRows(bm, mats, H, form) {
  const { THREE } = H, M = bm.law.mouth; if (!form || form === 'none' || form === 'beak') return null;
  const hl = bm.h * bm.L, widest = !!M.widest, even = !!M.comb, arc = lipArc(bm, H), piv = jawPivot(bm), ang = gapeRad(bm, H);
  let base = (TOOTH_LEN[form] || .03) * hl; if (form === 'fang' && widest) base = TOOTH_WIDEST * hl; if (base < .02 * hl) base = .02 * hl;
  const slender = form === 'needle' || form === 'fang', blunt = form === 'molar';
  const radK = blunt ? .85 : form === 'triangular' ? .42 : slender ? .17 : even ? .2 : .3, flat = form === 'triangular' ? .5 : blunt ? .9 : .82;
  const inK = slender ? .3 : form === 'triangular' ? .2 : .12, backK = slender ? .28 : form === 'triangular' ? .18 : .08;   /* recurve: inward / backward lean */
  const rowsN = widest && (form === 'needle' || form === 'fang' || form === 'triangular') ? 2 : 1;
  const cone = new THREE.ConeGeometry(1, 1, form === 'triangular' ? 4 : 6, 1); cone.translate(0, .5, 0);
  const list = [], seed = (M.openDeg || 1) * .37 + bm.L;
  const up = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3(), B = new THREE.Vector3(), Pm = new THREE.Vector3(), Md = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Mx = new THREE.Matrix4();
  let idx = 0; const ev = {}, ev2 = {};
  for (let row = 0; row < rowsN; row++) for (const lower of [false, true]) {
    let pos = arc.total * .012 + (row ? .5 : 0) * base * .1 + (lower ? 1.3 * Math.max(base * .7 * radK, .0012 * bm.L) : 0);   /* lower row half a pitch along: the rows interdigitate */
    const end = arc.total * .988; let n = 0;
    while (pos < end && n < 200) {
      const sN = pos / arc.total, grade = even ? .8 : .38 + .62 * Math.pow(Math.sin(Math.PI * H.clamp(sN, 0, 1)), .8), jit = even ? 1 : 1 + (hash(idx, seed) - .5) * .4;   /* ±20 % */
      const P = at(arc, pos), sc = bm._ts || (bm._ts = {}); bm.section(P.u, sc);
      const gapF = lipGap(bm, H, P, piv, ang);
      let len = Math.min(TOOTH_LEN_MAX * hl, base * grade * jit * (row ? .62 : 1), .26 * (sc.dUp + sc.dDn), 1.5 * TOOTH_GAP * gapF), rad = 0, ok = false;   /* never longer than the local jaw depth or the gap at its station allows */
      const sgn = lower ? -1 : 1, front = 1 - H.sstep(0, .14, (P.u - jawU0(bm)) / Math.max(1e-6, Math.min(bm.mcU * .97, jawU1(bm)) - jawU0(bm)));   /* near the snout tip the skin falls away behind the lip: bury deeper */
      const back = hl * .1; Md.set(P.tx * back, P.ty * back, -P.z).normalize();   /* medial (inward) direction: toward the head axis a little behind the root */
      const jx = even ? 0 : (hash(idx + 7, seed) - .5) * .21, jz = even ? 0 : (hash(idx + 13, seed) - .5) * .21;
      /* FIT (round 2.1): root, base disc and tip are placed against the SAME envelope the validator checks (jawEnv at the tooth's OWN station): the root's lateral
         position is capped at TEETH_FIT × half-width(own height) − base radius, the tilt is eased until the tip is inside too, and the length shrinks (never the 1/3 rooting)
         until root height and tip fit the section, so a generated row cannot violate the check. */
      for (let tr = 0; tr < 9 && len >= .012 * hl; tr++, len *= .86) {
        rad = Math.max(len * radK, .0012 * bm.L);
        const inset = rad * 1.25 + (row ? len * .5 + rad : 0) + (lower ? rad * .9 : 0) + (len * .55 + rad * 2) * front;   /* the lower row closes inside the upper one */
        B.set(P.x + Md.x * inset + P.nx * sgn * len / 3, P.y + Md.y * inset + P.ny * sgn * len / 3, P.z + Md.z * inset);   /* base centre buried len/3 inside the jaw edge */
        const e = jawEnv(bm, H, B.x, B.y, ev);
        if (!(e.ly > -e.dDn * TEETH_FIT && e.ly < e.dUp * TEETH_FIT)) continue;       /* root height outside the section → shorter tooth (root depth = len/3) */
        const zmax = e.hw * TEETH_FIT - rad * flat; if (zmax <= 0) continue;           /* base wider than the jaw here → shorter / thinner tooth */
        if (Math.abs(B.z) > zmax) B.z = Math.sign(B.z || 1) * zmax;
        let tl = 1; for (let k = 0; k < 4; k++, tl *= .5) {                            /* toward the opposite jaw, leaning in and back; jitter eased until the tip is inside as well */
          D.set(-P.nx * sgn, -P.ny * sgn, 0).addScaledVector(Md, inK).add(Pm.set(P.tx * backK + jx * tl, P.ty * backK, jz * tl)).normalize();
          const te = jawEnv(bm, H, B.x + D.x * len, B.y + D.y * len, ev2); if (jawIn(te, B.z + D.z * len, TEETH_FIT)) { ok = true; break; }
        }
        if (ok) break;
      }
      if (!ok) { pos += .02 * hl; continue; }
      Q.setFromUnitVectors(up, D); S.set(rad, len, rad * flat); Mx.compose(B, Q, S);
      list.push({ m: Mx.clone(), w: lower ? jawW(bm, P.u, H) : 0, erupt: Math.max(1e-3, TOOTH_GAP * gapF / len), lower, u: P.u, len, rad, root: B.clone(), tip: B.clone().addScaledVector(D, len), lip: Pm.set(P.x, P.y, P.z).clone(), row });
      pos += 2 * rad * 1.3 + (row ? rad * .6 : 0); n++; idx++;
    }
  }
  const inst = new THREE.InstancedMesh(cone, mats.tooth, list.length), aJaw = new Float32Array(list.length), aErupt = new Float32Array(list.length);
  list.forEach((t, i) => { inst.setMatrixAt(i, t.m); aJaw[i] = t.w; aErupt[i] = t.erupt; });
  cone.setAttribute('aJaw', new THREE.InstancedBufferAttribute(aJaw, 1)); cone.setAttribute('aErupt', new THREE.InstancedBufferAttribute(aErupt, 1));   /* visible length = len × (1/3 + min(2/3, aErupt × open)) */
  inst.frustumCulled = false; inst.instanceMatrix.needsUpdate = true;
  inst.userData.teethInfo = list.map(t => ({ u: t.u, len: t.len, rad: t.rad, lower: t.lower, row: t.row, root: t.root, tip: t.tip, lip: t.lip, erupt: t.erupt, spacing: 2.6 * t.rad })); inst.userData.hl = hl;
  return inst;
}
