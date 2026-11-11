/* MOUTH CONSTRUCTOR — one assembly for every creature, driven only by the mouth law (laws.mouthLaw: feeding niche × body plan axes).
   REST = CLOSED. The mouth is a SEAM in the head surface. jawEdgeVert is the ONE lip line: the lower-jaw patch edge, the pocket rim, the lip pads, the teeth rows, the beak
   plates, the skin shader's cut AND its painted crease (FS_SEAM) all read it, so the seam can never float off the head and the lips meet along their whole length.
   OPENING = a continuous deformation of that same closed geometry. Every mouth vertex carries its rest position, a hinge weight (aBody.w) and an open-pose offset (aOpen); the
   vertex shader does  p = hinge(p + aOpen·open, gape·open·w)  with open = uMouthOpen ∈ [0,1], so open = 0 is exactly the closed mouth and nothing is ever swapped or detached:
     · the lower jaw rotates about the joint (BodyModel.hingeU: behind the eye, ahead of the gill opening) and flexes over its rear 38 %, so it never leaves the head;
     · the floor of the mouth drops (jawMorph + pocket floor) and the pocket deepens toward the throat;
     · the corner skin, folded inside the seam at rest, unfolds into an elastic web that widens and thins with gape;
     · the lip pads roll toward the rim and thin; teeth erect from the gum only as far as the gap at their own station allows (teethgeo.js).
   Special constructions (fused beak, underside sucker disc, protrusible tube, flattened-plan ventral slot) come from the mouth law only.
   H = { THREE, clamp, lerp, sstep, smoother, TAU, skinAttributes, mergeGeos }. */
import { CAVITY_MAX, DISC_DEPTH_MAX } from './laws.js';

/* mouth-line level in vert = sin(theta) units, identical to the skin shader's crease line */
export function mouthLevel(bm, u, H) {
  const t = H.sstep(bm.jawStartU, bm.mcU, u);
  return H.lerp(bm.tipF, bm.cornerF, t) - .025 * Math.sin(Math.PI * t);
}
/* aperture half-height (vert units) of the opened mouth along the jaw */
export function apertureAt(bm, u, H) {
  const u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU * .92, tt = H.clamp((u - u0) / Math.max(1e-6, u1 - u0), 0, 1);
  return (.08 + .3 * bm.g.mouth.gape) * Math.pow(Math.sin(Math.PI * tt), .6);
}
const thetaOf = (vert, side) => { const th = Math.asin(Math.max(-.985, Math.min(.985, vert))); return side > 0 ? th : Math.PI - th; };
function skinPoint(bm, u, vert, side, out, lift = 0) {
  const fr = bm._mfr || (bm._mfr = {}), s = bm._ms || (bm._ms = {}), p = bm._mp || (bm._mp = {});
  bm.frame(u, fr); bm.section(u, s); bm.point(u, thetaOf(vert, side), p, fr, s, true);
  const l = Math.hypot(p.ly, p.lz) || 1, off = lift / l;
  out.set(p.x + fr.nx * p.ly * off, p.y + fr.ny * p.ly * off, p.z + p.lz * off); return out;
}
/** Fused-plate (beak) mouths: two thin plate RIBBONS lying in the head surface, meeting exactly on the seam, framed by thick skin lips. No hinged jaw and no cavity: the only
    movement is a small gape hinged at the beak's base (law.beakGape × head length at the tip, 0 at the base) that uncovers a dark floored slot between the plates. */
export function buildBeak(bm, mats, H, M) {
  const { THREE } = H, u0 = jawU0(bm), u1 = bm.mcU, K = 16, C = 4, out = [], w = .05 + .05 * bm.g.mouth.lips, gp = (M.beakGape || 0) * bm.h * bm.L, q = {};
  const dFn = u => gp * Math.pow(1 - H.clamp((u - u0) / Math.max(1e-9, u1 - u0), 0, 1), 1.2);
  const sp = [], sa = [], sd = [], sn = [], si = [];
  for (const sign of [1, -1]) {
    const pos = [], dl = [], rad = [], idx = [];
    for (const side of [1, -1]) {
      const base = pos.length / 3, sb = sp.length / 3;
      for (let i = 0; i <= K; i++) {
        const u = H.lerp(u0, u1, i / K), e = sign < 0 ? dFn(u) : 0;
        for (let j = 0; j <= C; j++) {
          const f = j / C; rimPoint(bm, u, side, sign * w * f, H, bm.maxD * (.0015 + .007 * Math.sin(Math.PI * f) * Math.sin(Math.PI * (.08 + .84 * i / K))), q);
          pos.push(q.x, q.y, q.z); rad.push(q.rx, q.ry, q.rz); dl.push(-q.nx * e, -q.ny * e, 0);
        }
        if (sign < 0) { const lf = bm.maxD * .0015; rimPoint(bm, u, side, 0, H, -bm.maxD * .0006, q);   /* slot: under the skin at rest, just proud of it (below the plates) when open */
          for (const k of [0, 1]) { sp.push(q.x, q.y, q.z); sa.push(u, .85, 1, 0); sn.push(q.rx, q.ry, q.rz); sd.push(q.rx * lf - q.nx * e * k, q.ry * lf - q.ny * e * k, q.rz * lf); } }
      }
      for (let i = 0; i < K; i++) { for (let j = 0; j < C; j++) { const a = base + i * (C + 1) + j, b = a + C + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } if (sign < 0) { const a = sb + i * 2; si.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    }
    outward(pos, idx, rad); const geo = geoOf(H, pos, idx, null, dl); H.skinAttributes(geo, bm, 0, sign < 0);
    const mesh = new THREE.Mesh(geo, mats.tooth); mesh.frustumCulled = false; mesh.userData.beak = true; out.push(mesh);
  }
  const slot = geoOf(H, sp, si, sa, sd); slot.setAttribute('normal', new THREE.Float32BufferAttribute(sn, 3));   /* collapsed at rest: analytic normals (a computed one would be zero-length) */
  for (const [geo, layer] of [[slot, 'slot'], [lipRibbons(bm, H, { off0: w, fused: true, dFn, uEnd: u1 }), 'lips']]) { const m = new THREE.Mesh(geo, mats.jaw); m.frustumCulled = false; m.userData.layer = layer; out.push(m); }
  return out;
}

/* ── ROUND 2: ONE source of truth for the lip line. The lower-jaw patch edge, the pocket rim, the teeth rows and the skin shader's discard line all use jawEdgeVert / lipPoint. ── */
export const jawU0 = bm => bm.jawStartU < .01 ? .0015 : Math.max(bm.jawStartU, .006);
export const jawU1 = bm => bm.hingeU || bm.mcU;
/** lip line as a height in sin(theta) units on the head section at station u (the lower patch edge is the asin of this) */
export function jawEdgeVert(bm, u) {
  const s = bm._es || (bm._es = {}); bm.section(u, s); const ym = bm.mouthLineY(u, s), yr = ym > 0 ? s.dUp : s.dDn, n = ym > 0 ? s.nD : s.nV;
  return Math.sign(ym) * Math.pow(Math.min(.98, Math.abs(ym) / Math.max(yr, 1e-8)), n * .5);
}
/** movement weight of the one-piece lower jaw along its length: 1 at the chin, 0 at the hinge (junction never separates) */
export const jawW = (bm, u, H) => 1 - H.sstep(.62, 1, H.clamp((u - jawU0(bm)) / Math.max(1e-6, jawU1(bm) - jawU0(bm)), 0, 1));
/** ROUND 2.1 — lateral splay of the opening lower jaw (the dentary is a blunt U in plan; the conical snout alone makes the front outline a V).
    Δz = SPREAD_K × zRef × sqrt(t)(1−t) × open × w  on the outward side, t = chin(0) → hinge(1) along the jaw. Zero at rest, at the chin ring and at the hinge, so the two lip halves meet
    at the chin with a horizontal tangent and the corners stay exactly where the mouth-width law puts them. GLSL twin: JAW_SPREAD_GLSL (fishgen part 11). */
export const SPREAD_K = .8;
/* the splay is bounded by the head plan: the opened lower jaw never becomes wider than the head's own width (0.98 × its largest half-width, at every station) */
export const jawSpreadRef = (bm, H) => {
  const u0 = jawU0(bm), u1 = jawU1(bm), o = {}, s = {}, lim = centreBand(bm) / .04 * .98; let ref = SPREAD_K * Math.abs(lipPoint(bm, u1, 1, H, 0, o).z);
  for (let k = 1; k < 10; k++) {
    const t = k / 10, u = H.lerp(u0, u1, t), f = Math.sqrt(t) * (1 - t) * jawW(bm, u, H); lipPoint(bm, u, 1, H, 0, o);
    const z = Math.max(Math.abs(o.z), o.ly > 0 ? bm.halfWidthAtY(bm.section(u, s), 0) : 0); if (f > 1e-6) ref = Math.min(ref, Math.max(0, lim - z) / f);
  }
  return ref;
};
export function spreadZ(z, u, w, u0, u1, Wd, open) {
  const t = Math.min(1, Math.max(0, (u - u0) / Math.max(1e-6, u1 - u0))), f = Math.sqrt(t) * (1 - t), zk = Math.max(.6 * Wd * Math.max(t, .02), 1e-5);
  return z + Math.min(1, Math.max(-1, z / zk)) * Wd * f * open * w;
}
export const EDGE_N = 40;
export function edgeTable(bm, H) { const u0 = jawU0(bm), u1 = jawU1(bm), a = []; for (let i = 0; i < EDGE_N; i++) a.push(jawEdgeVert(bm, H.lerp(u0, u1, i / (EDGE_N - 1)))); return a; }
/** point on the lip edge of one flank (side ±1) at station u, optionally pulled `inset` under the skin. Returns {x,y,z,ly,lz,fr}. */
export function lipPoint(bm, u, side, H, inset = 0, out = {}) {
  const fr = bm._lf || (bm._lf = {}), s = bm._ls || (bm._ls = {}), p = bm._lp || (bm._lp = {}); bm.frame(u, fr); bm.section(u, s);
  const rim = Math.asin(jawEdgeVert(bm, u)), a = side > 0 ? rim : -Math.PI - rim; bm.point(u, a, p, fr, s, true);
  const l = Math.hypot(p.ly, p.lz) || 1, off = -inset / l;
  out.x = p.x + fr.nx * p.ly * off; out.y = p.y + fr.ny * p.ly * off; out.z = p.z + p.lz * off; out.ly = p.ly; out.lz = p.lz; out.tx = fr.tx; out.ty = fr.ty; out.nx = fr.nx; out.ny = fr.ny; return out;
}

/* ROUND 6H.3b — CORNER_SEAL (L6, by construction, every mouth placement). Before any triangle is dropped the pocket is a closed bag: the rim loop is joined at both hinge
   corners, the rings close onto the throat cap, each cheek wall folds onto both lip copies (its rear edge at the hinge welds onto itself at the lip corner). The ONLY thing that
   ever opened the corner was the round-4 centre-band sliver drop: every ring converges onto the throat (z = 0), and on a ventral / inferior mouth the pocket is a slot near the
   centre plane, so DEEP ring triangles (rings 3-4, never front-view sheets) in the corner region fell inside the 0.02 x head-width band too; dropping SOME of them left free edges
   inside the head (sturgeon, carpet shark). The drop is therefore confined to the FRONT of the aperture, i.e. ahead of the corner region L6 audits (stations >= CORNER_U x mcU,
   coherence.js mouthSeal): a triangle is eligible only if every station it carries (aBody.x, stored float32 - compared as stored) lies ahead of it. In the corner region nothing is
   ever removed, whatever the placement (the rule reads stations only), so the cheek wall and the rings stay welded right to the rear edge at the hinge. */
export const CORNER_U = .7;
const cornerFront = (u, bm) => Math.fround(u) < CORNER_U * bm.mcU;

/* ── LIVING MOUTH: kinematics shared by the builders, the shaders and the audits (mouthcheck.js poses with the same numbers) ── */
export function jawPivot(bm) { const u1 = jawU1(bm), fr = {}, s = {}; bm.frame(u1, fr); bm.section(u1, s); const py = bm.mouthLineY(u1, s); return { x: fr.px + fr.nx * py, y: fr.py + fr.ny * py }; }
/** maximum gape angle of THIS fish: the niche angle (law.openRad) bounded by the head plan — the chord between the lip tips never exceeds 0.95 × the head's own width */
export function gapeRad(bm, H) {
  const M = bm.law.mouth; if (M.construction !== 'jawed') return 0; if (bm._gape) return bm._gape;
  const c = lipPoint(bm, jawU0(bm), 1, H, 0, {}), pv = jawPivot(bm), jl = Math.max(1e-9, Math.hypot(c.x - pv.x, c.y - pv.y));
  return bm._gape = Math.min(M.openRad, 2 * Math.asin(Math.min(1, .95 * centreBand(bm) / .02 / (2 * jl))));
}
/** THE pose: open ∈ [0,1] → gape angle, protrusion and morph amount. Grasping-predator niches rest ajar (law.restOpen, teeth showing) unless the jaw is held by a test / preset.
    A freshly built fish is always at open = 0 (closed); only the animation loop and the thumbnail renderer call this. */
export function poseMouth(fish, open, held) {
  const U = fish.uniforms, bm = fish.bm, M = bm.law.mouth, o = held ? open : Math.max(open, M.restOpen || 0);
  U.uMouthOpen.value = o; U.uJawAngle.value = o * U.uJawOpenMax.value; U.uJawProtrude.value = bm.protrusile ? o * (M.protrude || 0) * bm.h * bm.L : 0; return o;
}
/** lower-jaw patch morph: the floor of the mouth (ventral midline between chin and joint) lowers by law.drop × head length at full gape; zero on the lip edge, at the chin ring and at the joint */
export function jawMorph(bm, geo, H) {
  const P = geo.getAttribute('position'), A = geo.getAttribute('aBody'), d = new Float32Array(P.count * 3), u0 = jawU0(bm), u1 = jawU1(bm), fr = {}, drop = (bm.law.mouth.drop || 0) * bm.h * bm.L;
  for (let i = 0; i < P.count; i++) {
    const u = A.getX(i), t = H.clamp((u - u0) / Math.max(1e-9, u1 - u0), 0, 1), rim = Math.asin(jawEdgeVert(bm, u)); let a = A.getY(i) * H.TAU - Math.PI / 2; if (a > rim + 1e-3) a -= H.TAU;
    const jn = H.clamp((a + Math.PI + rim) / (Math.PI + 2 * rim), 0, 1), k = drop * Math.pow(Math.sin(Math.PI * jn), 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t / .82)), 1.3); bm.frame(u, fr);   /* fades out ahead of the joint: no step where the patch meets the throat */
    d[i * 3] = -fr.nx * k; d[i * 3 + 1] = -fr.ny * k;
  }
  geo.setAttribute('aOpen', new H.THREE.Float32BufferAttribute(d, 3)); return geo;
}
/* GLSL: the painted crease reads the SAME lip-line table as the cut (uMLine = edgeTable); the cavity darkens toward the throat as it opens; the corner web lightens as it thins */
export const FS_SEAM = `float mLvl(float u){ float fi=clamp((u-uJawU0)/max(1e-6,uHingeU-uJawU0),0.0,1.0)*39.0; int i0=int(floor(fi)); int i1=min(i0+1,39); return mix(uMLine[i0],uMLine[i1],fi-float(i0)); }`;
export const FS_CAV = `tn*=1.0-.5*occ*occ*uMouthOpen; if(tissue>1.7 && tissue<1.8) tn=mix(uIntLip*1.1,uIntLip*1.5+vec3(.09,.05,.04),uMouthOpen)*(1.0-.3*occ);`;
/* point on the head surface at the lip line + dv (sin-theta units), lifted radially; also returns the radial (rx,ry,rz), the frame normal and the skin angle coordinate */
function rimPoint(bm, u, side, dv, H, lift, o) {
  const fr = bm._lf || (bm._lf = {}), s = bm._ls || (bm._ls = {}), p = bm._lp || (bm._lp = {}); bm.frame(u, fr); bm.section(u, s);
  const th = Math.asin(Math.max(-.985, Math.min(.985, jawEdgeVert(bm, u) + dv))), a = side > 0 ? th : -Math.PI - th; bm.point(u, a, p, fr, s, true);
  const l = Math.hypot(p.ly, p.lz) || 1; o.rx = fr.nx * p.ly / l; o.ry = fr.ny * p.ly / l; o.rz = p.lz / l; o.nx = fr.nx; o.ny = fr.ny;
  o.x = p.x + o.rx * lift; o.y = p.y + o.ry * lift; o.z = p.z + o.rz * lift; o.a = ((a + Math.PI / 2) / H.TAU + 1) % 1; return o;
}
/* wind every triangle so its face normal agrees with the per-vertex outward reference (the skin shader flips normals on back faces) */
function outward(pos, idx, rad, from = 0) {
  for (let t = from; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3, bx = pos[b] - pos[a], by = pos[b + 1] - pos[a + 1], bz = pos[b + 2] - pos[a + 2], cx = pos[c] - pos[a], cy = pos[c + 1] - pos[a + 1], cz = pos[c + 2] - pos[a + 2];
    if ((by * cz - bz * cy) * rad[a] + (bz * cx - bx * cz) * rad[a + 1] + (bx * cy - by * cx) * rad[a + 2] < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
}
function geoOf(H, pos, idx, ab, dl) {
  const g = new H.THREE.BufferGeometry(); g.setAttribute('position', new H.THREE.Float32BufferAttribute(pos, 3)); if (ab) g.setAttribute('aBody', new H.THREE.Float32BufferAttribute(ab, 4));
  if (dl) g.setAttribute('aOpen', new H.THREE.Float32BufferAttribute(dl, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** LIPS: low skin pads lying IN the head surface on both sides of the seam (never a ring, tube or torus). Both pads start exactly on the lip line, so at rest they meet along
    their whole length. Thickness / width come from the lip axis (law.lipK by niche, blended with the genome's lip axis). The lower pad carries the jaw weight, the upper one the
    premaxilla's slide. Open pose (aOpen): the crest rolls toward the rim and the pad loses 30 % of its height — lips roll outward and thin as they stretch; both edges stay pinned. */
export function lipRibbons(bm, H, o = {}) {
  const M = bm.law.mouth, u0 = jawU0(bm), ue = o.uEnd || Math.min(bm.mcU, jawU1(bm)), uq = H.lerp(u0, bm.mcU, .8), NL = 26, C = 5, pos = [], ab = [], dl = [], rad = [], idx = [], q = {};
  const k = H.lerp(M.lipK == null ? .4 : M.lipK, bm.g.mouth.lips, .35), T = bm.maxD * (.004 + .013 * k), Wd = .035 + .06 * k, eps = bm.maxD * .0012, tol = centreBand(bm);
  for (const side of [1, -1]) for (const sign of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NL; i++) {
      const ti = i / NL, u = H.lerp(u0, ue, Math.pow(ti, 1.4)), tp = 1 - H.sstep(.78, 1, ti), e = sign < 0 && o.dFn ? o.dFn(u) : 0;
      const w = o.fused ? 0 : sign < 0 ? jawW(bm, u, H) : bm.protrusile ? 1 - H.sstep(.3, 1, H.clamp((u - u0) / Math.max(1e-9, uq - u0), 0, 1)) : 0;
      for (let j = 0; j <= C; j++) {
        const f = j / C, b0 = Math.pow(Math.sin(Math.PI * f), .75), b1 = .7 * Math.pow(Math.sin(Math.PI * Math.pow(f, .6)), .75), d = T * tp * (b1 - b0);
        rimPoint(bm, u, side, sign * ((o.off0 || 0) + Wd * f), H, eps + T * tp * b0, q);
        pos.push(q.x, q.y, q.z); rad.push(q.rx, q.ry, q.rz); ab.push(u, q.a, sign > 0 ? 2 : 0, w); dl.push(q.rx * d - q.nx * e, q.ry * d - q.ny * e, q.rz * d);
      }
    }
    for (let i = 0; i < NL; i++) for (let j = 0; j < C; j++) { const a = base + i * (C + 1) + j, b = a + C + 1; for (const t of [[a, b, a + 1], [a + 1, b, b + 1]]) if (!isSheet(pos, t[0], t[1], t[2], tol, true)) idx.push(t[0], t[1], t[2]); }
  }
  outward(pos, idx, rad); return geoOf(H, pos, idx, ab, dl);
}

/** Interior pocket: ONE closed bag rooted on the lip edge, collapsed flat inside the seam at rest.
    rim loop = upper lip copy (static) + lower lip copy (moves with the jaw, weight jawW) joined at both corners at the joint; hood (upper wall) and floor (lower wall) run from the
    rim to a throat cap; the chin cap closes the lower jaw's front. Depth ≤ CAVITY_MAX × head length. Rendered with the double-sided jaw material.
    LIVING (aOpen, all zero on the rim so the seam is untouched): with gape the throat recedes (rest depth = 0.8 × the open depth), the FLOOR bows down by law.drop and the hood arches
    up a third as much, every posed point re-contained in its own head section. Baked occlusion (aBody.y) is depth-led: light at the lips, dark at the throat.
    CORNER WEB (tissue 1.75): on each flank a membrane joins the upper and lower lip edge over the rear law.web of the jaw. At rest it is a double fold tucked inside the seam (welded
    onto itself and onto both lips); as the jaw opens it fans out between the lips (weight ramps 0 → jawW across it), is pulled taut (the fold flattens) and its free front edge
    recedes into a crescent — an elastic web that widens and thins with gape. Ahead of the web the side of the mouth is open, so the tooth rows show. */
export function buildCavity(bm, mats, H) {
  const { THREE } = H, g = bm.g, M = bm.law.mouth, u0 = jawU0(bm), u1 = jawU1(bm), K = 34, S = 8, N = 5, hl = bm.h * bm.L, depth = (M.comb ? CAVITY_MAX : Math.min(g.mouth.cavityDepth, CAVITY_MAX)) * hl, dRest = depth * .8, drop = (M.drop || 0) * hl;
  const inset = bm.maxD * .004, us = []; for (let i = 0; i <= K; i++) us.push(H.lerp(u0, u1, Math.pow(i / K, 1.5)));
  const tz = centreBand(bm);
  const P = (u, side) => { const o = lipPoint(bm, u, side, H, inset, {}); return new THREE.Vector3(o.x, o.y, o.z); };
  const R = us.map(u => P(u, 1)), Lf = us.map(u => P(u, -1)), W = us.map(u => jawW(bm, u, H));
  /* rim loop: right hinge → front (upper copy), front → left hinge, then back along the lower copy */
  const rim = [];
  for (let i = K; i >= 0; i--) rim.push({ p: R[i], u: us[i], w: 0 });
  for (let i = 0; i <= K; i++) rim.push({ p: Lf[i], u: us[i], w: 0 });
  for (let i = K; i >= 0; i--) rim.push({ p: Lf[i], u: us[i], w: W[i], lo: 1 });
  for (let i = 0; i <= K; i++) rim.push({ p: R[i], u: us[i], w: W[i], lo: 1 });
  const Mr = rim.length, rimC = new THREE.Vector3(); rim.forEach(r => rimC.add(r.p)); rimC.multiplyScalar(1 / Mr);
  const fr = {}; bm.frame((u0 + u1) / 2, fr);
  const T = new THREE.Vector3(fr.tx, fr.ty, 0), Nn = new THREE.Vector3(fr.nx, fr.ny, 0), throat = rimC.clone().addScaledVector(T, dRest);
  { const ut = H.clamp((u0 + u1) / 2 + dRest / bm.L, .004, .999), ft = {}, st = {}; bm.frame(ut, ft); bm.section(ut, st);
    const ly = H.clamp((throat.x - ft.px) * ft.nx + (throat.y - ft.py) * ft.ny, -st.dDn * .55, st.dUp * .55); throat.set(ft.px + ft.nx * ly, ft.py + ft.ny * ly, 0); }
  const pos = [], ab = [], dl = [], idx = [];
  let zR = 1e-6; rim.forEach(r => { zR = Math.max(zR, Math.abs(r.p.z)); });
  const occOf = (q, d) => H.clamp(.1 + .6 * Math.pow(d, .8) + .22 * Math.pow(1 - H.clamp(Math.abs(q.z) / zR, 0, 1), 1.2), 0, 1);   /* depth-led, continuous across the centre strip */
  const push = (q, u, w, occ, tag = 1, q1 = null) => { pos.push(q.x, q.y, q.z); ab.push(u, occ, tag, w); if (q1) dl.push(q1.x - q.x, q1.y - q.y, q1.z - q.z); else dl.push(0, 0, 0); return pos.length / 3 - 1; };
  for (let i = 0; i <= N; i++) {
    const d = i / N, e = H.smoother(d), shrink = 1 - .25 * e, bow = Math.sin(Math.PI * Math.min(1, .1 + .85 * d));
    for (let j = 0; j < Mr; j++) {
      const r = rim[j], q = r.p.clone().lerp(throat, e).sub(throat).multiplyScalar(shrink).add(throat); let q1 = null;
      if (i > 0) { contain(bm, q, H, .9); const lat = 1 - H.sstep(.6, 1, (r.u - u0) / Math.max(1e-9, u1 - u0)); q1 = contain(bm, q.clone().addScaledVector(T, (depth - dRest) * e).addScaledVector(Nn, (r.lo ? -1 : .35) * drop * bow * lat), H, .9); }
      push(q, r.u, r.w * Math.pow(1 - d, 1.4), occOf(q, d), 1, q1);
    }
  }
  /* round 6H.3b (L6): the centre-band sliver drop runs only in the FRONT of the aperture (see CORNER_SEAL) - in the corner region every ring triangle is kept */
  const front = j => cornerFront(Math.max(rim[j].u, rim[(j + 1) % Mr].u), bm);
  for (let i = 0; i < N; i++) for (let j = 0; j < Mr; j++) { const a = i * Mr + j, b = i * Mr + (j + 1) % Mr, c = a + Mr, d = b + Mr; if (!(front(j) && isSheet(pos, a, c, b, tz))) idx.push(a, c, b); if (!(front(j) && isSheet(pos, b, c, d, tz))) idx.push(b, c, d); }
  const grp = [{ name: 'hood/floor rings', a: 0, b: idx.length / 3 }];   /* triangle ranges per constructor (the centre-plane audit names the offender by group) */
  const centre = push(throat, u1, 0, 1, 1, contain(bm, throat.clone().addScaledVector(T, depth - dRest), H, .9)); for (let j = 0; j < Mr; j++) idx.push(N * Mr + j, centre, N * Mr + (j + 1) % Mr);
  grp.push({ name: 'throat cap fan', a: grp[0].b, b: idx.length / 3 });
  /* corner web (see header). Rest: lip point pulled medially by the fold (symmetric across the web, so the sheet folds onto itself); open: fold 0.4 → 0.14, front edge recedes. */
  const wallRanges = [], uw = Math.min(H.lerp(u1, u0, M.web == null ? .5 : M.web), .66 * bm.mcU), iw = Math.max(1, us.findIndex(u => u >= uw)), wl = (us[K] - us[iw]) * bm.L;
  for (const side of [1, -1]) {
    const base = pos.length / 3, arr = side > 0 ? R : Lf;
    for (let i = iw; i <= K; i++) for (let j = 0; j <= S; j++) {
      const f = j / S, fold = H.sstep(0, .2, f) * H.sstep(1, .8, f), rho = (i - iw) / Math.max(1, K - iw), q = arr[i].clone(), z0 = q.z; q.z = z0 * (1 - .4 * fold);
      const q1 = q.clone().addScaledVector(T, wl * .45 * Math.sin(Math.PI * f) * Math.pow(1 - rho, 2)); q1.z = z0 * (1 - .14 * fold);
      push(q, us[i], W[i] * f, .2 + .4 * Math.abs(2 * f - 1), 1.75, q1);
    }
    const t0 = idx.length / 3;
    /* front-only sliver rule (round 4 / 6H.3b): a web row is eligible for the centre-band drop only if it ends ahead of the corner region; from there to the joint every triangle is kept */
    const keep = (a, b, c, i) => !cornerFront(us[i + 1], bm) || !isSheet(pos, a, b, c, tz, true);
    for (let i = 0; i < K - iw; i++) for (let j = 0; j < S; j++) { const a = base + i * (S + 1) + j, b = a + S + 1; if (keep(a, b, a + 1, i + iw)) idx.push(a, b, a + 1); if (keep(a + 1, b, b + 1, i + iw)) idx.push(a + 1, b, b + 1); }
    wallRanges.push([base, pos.length / 3, side]);
    grp.push({ name: 'cheek wall ' + (side > 0 ? 'R' : 'L'), a: t0, b: idx.length / 3 });
  }
  /* chin cap: closes the front of the lower jaw (its first ring is an open edge); a fan over the lower half-ring at u0, weight = jaw weight (1). It is SKIN (tissue tag 0), never pocket material. */
  { const ring = [], u = us[0], s = {}, fr0 = {}, p = {}; bm.frame(u, fr0); bm.section(u, s); const rimA = Math.asin(jawEdgeVert(bm, u)), Mc = 12;
    for (let j = 0; j <= Mc; j++) { const a = H.lerp(-Math.PI - rimA, rimA, j / Mc); bm.point(u, a, p, fr0, s, true); const l = Math.hypot(p.ly, p.lz) || 1, o = -inset / l; ring.push(new THREE.Vector3(p.x + fr0.nx * p.ly * o, p.y + fr0.ny * p.ly * o, p.z + p.lz * o)); }
    const c = new THREE.Vector3(); ring.forEach(r => c.add(r)); c.multiplyScalar(1 / ring.length);
    const b0 = pos.length / 3, sk = q => { pos.push(q.x, q.y, q.z); ab.push(u, 0, 0, 1); dl.push(0, 0, 0); return pos.length / 3 - 1; };   /* one belly coordinate over the whole cap: no lip-crease tint across it */
    ring.forEach(r => sk(r)); const cc = sk(c), t0 = idx.length / 3; for (let j = 0; j < Mc; j++) idx.push(b0 + j, cc, b0 + j + 1); grp.push({ name: 'chin cap', a: t0, b: idx.length / 3 }); }
  const geo = geoOf(H, pos, idx, ab, dl);
  /* at rest the web is a collapsed sheet, so computed normals are ZERO-length (the shader would normalise 0 -> NaN): the web gets its analytic medial normal, any other zero normal the pocket axis */
  { const nA = geo.getAttribute('normal'); for (const [a, b, sd] of wallRanges) for (let v = a; v < b; v++) nA.setXYZ(v, 0, 0, -sd);
    for (let v = 0; v < nA.count; v++) if (Math.hypot(nA.getX(v), nA.getY(v), nA.getZ(v)) < 1e-6) nA.setXYZ(v, 0, 0, 1); nA.needsUpdate = true; }
  const mesh = new THREE.Mesh(geo, mats.jaw); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.userData.groups = grp; geo.userData.groups = grp; return [mesh];
}

/** round 4: a triangle that would stand on the centre plane as a sheet — wholly inside the band (0.02 × head width) with its surface parallel to the plane (|nz| ≥ .5). Used by the builders to drop such slivers. */
export function isSheet(pos, a, b, c, tol, any = false) {
  const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2], bx = pos[b * 3] - ax, by = pos[b * 3 + 1] - ay, bz = pos[b * 3 + 2] - az, cx = pos[c * 3] - ax, cy = pos[c * 3 + 1] - ay, cz = pos[c * 3 + 2] - az;
  if (Math.abs(az) > tol || Math.abs(pos[b * 3 + 2]) > tol || Math.abs(pos[c * 3 + 2]) > tol) return false;
  const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nzz = bx * cy - by * cx, l = Math.hypot(nx, ny, nzz); return any || (l > 1e-18 && Math.abs(nzz) / l >= .5);
}
/** round 4: the centre-plane band (0.02 × head width) shared by the builder and the audit */
export function centreBand(bm) { let hw = 0; for (let k = 0; k <= 12; k++) { const s = {}; bm.section(bm.h * k / 12, s); hw = Math.max(hw, bm.halfWidthAtY(s, 0)); } return hw * 2 * .02; }

/* keep any interior vertex inside the head section at its own station (a cavity, never a tunnel) */
function contain(bm, q, H, slack = .9) {
  const uq = H.clamp((bm.headX - q.x) / bm.L, .004, .999), fq = {}, sq = {}; bm.frame(uq, fq); bm.section(uq, sq);
  const ly = H.clamp((q.x - fq.px) * fq.nx + (q.y - fq.py) * fq.ny, -sq.dDn * slack, sq.dUp * slack), hw = bm.halfWidthAtY(sq, ly) * slack * .96;
  return q.set(fq.px + fq.nx * ly, fq.py + fq.ny * ly, H.clamp(q.z, -hw, hw));
}
function blobMesh(bm, mats, H, centre, ax, ay, az, fr, tag, wFn, rows = 8, cols = 12) {
  const { THREE } = H, geo = new THREE.SphereGeometry(1, cols, rows), P = geo.getAttribute('position'), ab = [], q = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    q.set(centre.x + fr.tx * ax * x + fr.nx * ay * y, centre.y + fr.ty * ax * x + fr.ny * ay * y, centre.z + az * z);
    contain(bm, q, H); P.setXYZ(i, q.x, q.y, q.z);
    ab.push(H.clamp((bm.headX - q.x) / bm.L, .004, .999), .5, tag, wFn(x, y, z));
  }
  geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4));
  { const ix = geo.index.array, keep = [], tol = centreBand(bm); for (let t = 0; t < ix.length; t += 3) if (!isSheet(P.array, ix[t], ix[t + 1], ix[t + 2], tol, true)) keep.push(ix[t], ix[t + 1], ix[t + 2]); geo.setIndex(keep); }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.jaw); mesh.frustumCulled = false; mesh.renderOrder = 1; return mesh;
}
/** Layered interior (visible only when the jaw opens): inner walls (the capped pocket), tongue as a floor mass, and the first gill arches hinted in shadow at the back. */
export function buildInterior(bm, mats, H) {
  const { THREE } = H, g = bm.g, walls = buildCavity(bm, mats, H), out = [...walls]; walls.forEach(w => { w.userData.layer = "walls"; });
  const u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU * .92, depth = (bm.law.mouth.comb ? CAVITY_MAX : Math.min(g.mouth.cavityDepth, CAVITY_MAX)) * bm.h * bm.L, fr = {}, sl = new THREE.Vector3(), su = new THREE.Vector3();
  bm.frame(bm.mcU, fr);
  const ap = apertureAt(bm, (u0 + u1) / 2, H), ym = skinPoint(bm, (u0 + u1) / 2, mouthLevel(bm, (u0 + u1) / 2, H), 1, new THREE.Vector3(), 0);
  const lowY = skinPoint(bm, (u0 + u1) / 2, mouthLevel(bm, (u0 + u1) / 2, H) - ap * .98, 1, sl, 0).clone(), upY = skinPoint(bm, (u0 + u1) / 2, mouthLevel(bm, (u0 + u1) / 2, H) + ap * .98, 1, su, 0).clone();
