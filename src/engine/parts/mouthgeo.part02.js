  const hy = Math.max(1e-5, Math.abs((upY.x - lowY.x) * fr.nx + (upY.y - lowY.y) * fr.ny)) * .5, hw = Math.max(1e-5, bm.halfWidthAtY(bm.section(bm.mcU, {}), 0));
  const mid = new THREE.Vector3((lowY.x + upY.x) / 2, (lowY.y + upY.y) / 2, 0), L = bm.L;
  /* tongue: a floor mass resting on the lower jaw floor, its front following the jaw, its root fixed */
  const tc = mid.clone().addScaledVector(new THREE.Vector3(fr.nx, fr.ny, 0), -hy * .62).addScaledVector(new THREE.Vector3(fr.tx, fr.ty, 0), depth * .25);
  out.push(Object.assign(blobMesh(bm, mats, H, tc.addScaledVector(new THREE.Vector3(fr.nx, fr.ny, 0), -hy * .12).addScaledVector(new THREE.Vector3(fr.tx, fr.ty, 0), depth * .2), Math.min(depth * .62, depth * .55 + (u1 - u0) * L * .3), hy * .26, Math.max(centreBand(bm) * 2.6, Math.min(hw * .45, hy * 1.5 + 1e-5)), fr, 1.5, (x) => Math.max(0, .5 - x * .5) * (1 - H.sstep(.2, 1, x * .5 + .5) * .4), 8, 14), { userData: { layer: 'tongue' } }));
  { const tg = out[out.length - 1].geometry, nv = tg.getAttribute('position').count, d = new Float32Array(nv * 3), k = (bm.law.mouth.drop || 0) * bm.h * bm.L * .6; for (let i = 0; i < nv; i++) { d[i * 3] = -fr.nx * k; d[i * 3 + 1] = -fr.ny * k; } tg.setAttribute('aOpen', new THREE.Float32BufferAttribute(d, 3)); }   /* the tongue rides the dropping floor */
  /* first gill arches: thin ribs standing across the throat at the very back, hinted in shadow */
  const comb = bm.law.mouth.comb, nA = comb ? 4 : 3 + (g.mouth.gape > .6 ? 1 : 0);   /* filter niche: the deepest pocket the law allows, its arches a fine even set of slim bars */
  for (let k = 0; k < nA; k++) {
    const back = depth * (.62 + .1 * k), c = mid.clone().addScaledVector(new THREE.Vector3(fr.tx, fr.ty, 0), back);
    /* round 3: arches are LATERAL pairs (left / right of the aperture centre line, thin, low) — nothing stands on the vertical centre plane, so the pocket reads from the front as one continuous dark cavity */
    for (const sd of [-1, 1]) out.push(Object.assign(blobMesh(bm, mats, H, c.clone().setZ(sd * hw * .62), depth * (comb ? .016 : .028), hy * .6, Math.min(hw * .2, hy * .5 + 1e-5), fr, 1.25, () => 0, 5, 10), { userData: { layer: 'arches' } }));
  }
  { const lips = new THREE.Mesh(lipRibbons(bm, H), mats.jaw); lips.frustumCulled = false; lips.renderOrder = 1; lips.userData.layer = 'lips'; out.push(lips); }
  return out;
}

/** Tube construction (tubular plan / suction niche): a small ROUND protrusible mouth on the snout tip. Rest: the skin sleeve lies flat on the tip, puckered shut around a pin-hole
    with a shallow floor. Open (aOpen): the sleeve telescopes forward by law.protrude × head length (≤ 1.5 radii), the lips part into a round O and the funnel behind them deepens. */
function buildTube(bm, mats, H, M) {
  const { THREE } = H, u = .006, fr = {}; bm.frame(u, fr);
  const n = new THREE.Vector3(-fr.tx, -fr.ty, 0).normalize(), c = new THREE.Vector3(fr.px, fr.py, 0).addScaledVector(n, bm.L * .0007), headL = bm.h * bm.L;
  const R = Math.min(bm.maxD * .07, headL * .12), depth = Math.min(DISC_DEPTH_MAX * headL * .95, R * .35) * .4, ext = Math.min((M.protrude || .12) * headL, R * 1.5);
  const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n), NA = 24, NR = 7, ND = 4, v = new THREE.Vector3(), v1 = new THREE.Vector3(), rIn = R * .1, rOpen = R * .5, zLip = ext - R * .12;
  const ring = (r0, z0, r1, z1, pos, dl, rad) => { for (let j = 0; j < NA; j++) { const a = j / NA * H.TAU, cx = Math.cos(a), sy = Math.sin(a); v.set(cx * r0, sy * r0, z0).applyQuaternion(rot).add(c); v1.set(cx * r1, sy * r1, z1).applyQuaternion(rot).add(c); pos.push(v.x, v.y, v.z); dl.push(v1.x - v.x, v1.y - v.y, v1.z - v.z); rad.push(n.x, n.y, n.z); } };
  const strip = (rows, idx) => { for (let i = 0; i < rows; i++) for (let j = 0; j < NA; j++) { const a = i * NA + j, b = i * NA + (j + 1) % NA; idx.push(a, b, a + NA, b, b + NA, a + NA); } };
  const lp = [], ld = [], lr = [], li = [], dp = [], dd = [], dr = [], di = [], da = [];
  for (let k = 0; k <= NR; k++) {   /* skin sleeve: base ring pinned on the head, lip crest at f = .8, inner lip edge at f = 1 */
    const f = k / NR, pad = R * .07 * Math.sin(Math.PI * Math.min(1, f * 1.15)), g = Math.min(1, f / .8), h = Math.max(0, (f - .8) / .2);
    ring(H.lerp(R * 1.03, rIn, f), pad, H.lerp(H.lerp(R * 1.03, R * .72, H.smoother(g)), rOpen, h), ext * Math.pow(g, .7) + pad - R * .12 * h * h, lp, ld, lr);
  }
  for (let m = 0; m <= ND; m++) {   /* floored funnel behind the lips: rim welded to the inner lip edge in both poses, floor fixed, so the cavity deepens as the tube extends */
    const f = m / ND, rr = rIn * (1 - f); ring(rr, -depth * (1 - Math.pow(rr / rIn, 2)), rOpen * Math.pow(1 - f, .8), H.lerp(zLip, -depth, Math.pow(f, .5)), dp, dd, dr); for (let j = 0; j < NA; j++) da.push(u, .35 + .65 * f, 1, 0);
  }
  strip(NR, li); strip(ND, di); outward(lp, li, lr); outward(dp, di, dr);
  const lip = geoOf(H, lp, li, null, ld); H.skinAttributes(lip, bm); const out = [new THREE.Mesh(lip, mats.jaw), new THREE.Mesh(geoOf(H, dp, di, da, dd), mats.jaw)];
  out[0].userData.disc = { depth, headL, radius: R, front: true, normalY: n.y, centreY: c.y };   /* measured by the law audit */
  out.forEach(m => { m.frustumCulled = false; }); return out;
}
/** Shallow floored disc with a lip ring: underside sucker (construction 'sucker') or front cap of a short tube ('tube'). */
export function buildDisc(bm, mats, H, M) {
  const { THREE } = H, g = bm.g, front = M.construction === 'tube';
  if (front) return buildTube(bm, mats, H, M);
  const u = front ? .006 : bm.h * .3, theta = front ? 0 : -Math.PI / 2, fr = {}, p = {}; bm.frame(u, fr);
  const normal = new THREE.Vector3();
  if (front) normal.set(-fr.tx, -fr.ty, 0).normalize(); else bm.surfaceNormal(u, theta, normal);
  const centre = new THREE.Vector3();
  if (front) centre.set(fr.px, fr.py, 0).addScaledVector(normal, bm.L * .0007); else { bm.rawSurface(u, theta, p); centre.set(p.x, p.y, 0).addScaledVector(normal, bm.L * .0008); }
  const headL = bm.h * bm.L, radius = front ? Math.min(bm.maxD * .07, headL * .12) : Math.min(bm.maxD * .22, headL * .3);
  const depth = Math.min(DISC_DEPTH_MAX * headL * .95, radius * .35) * (front ? .4 : 1);
  const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  const lip = new THREE.RingGeometry(radius * .8, radius * 1.03, 28, 1); lip.applyQuaternion(rot);   /* flat annulus flush with the head surface: no torus, no protruding lip */
   lip.translate(centre.x, centre.y, centre.z); H.skinAttributes(lip, bm);
  /* floored dish: concave rings sinking to a flat floor at `depth`, never a hole */
  const NR = 6, NA = 24, pos = [], ab = [], idx = [];
  for (let i = 0; i <= NR; i++) { const rr = radius * .92 * (1 - i / NR), z = -depth * (1 - Math.pow(rr / (radius * .92), 2)); for (let j = 0; j < NA; j++) { const a = j / NA * H.TAU; pos.push(Math.cos(a) * rr, Math.sin(a) * rr, z); ab.push(u, .25, 1, 0); } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * NA + j, b = i * NA + (j + 1) % NA, c = a + NA, d = b + NA; idx.push(a, b, c, b, d, c); }
  const dish = new THREE.BufferGeometry(); dish.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dish.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); dish.setIndex(idx); dish.computeVertexNormals();
  dish.applyQuaternion(rot); dish.translate(centre.x, centre.y, centre.z);
  const out = [new THREE.Mesh(lip, mats.body), new THREE.Mesh(dish, mats.jaw)];
  out[0].userData.disc = { depth, headL, radius, front, normalY: normal.y, centreY: centre.y };   /* measured by the law audit */
  if (g.mouth.teeth === 'rasp' && !front) {
    const teeth = [];
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 18; i++) { const a = (i + ring * .5) / 18 * H.TAU, rr = radius * (.7 - ring * .25), geo = new THREE.ConeGeometry(radius * .035, radius * .1, 4); geo.rotateX(Math.PI / 2); geo.translate(Math.cos(a) * rr, Math.sin(a) * rr, -depth * (1 - (rr / radius) ** 2) + radius * .05); geo.applyQuaternion(rot); geo.translate(centre.x, centre.y, centre.z); teeth.push(geo); }
    out.push(new THREE.Mesh(H.mergeGeos(teeth), mats.simple));
  }
  out.forEach(m => { m.frustumCulled = false; }); return out;
}

/** Flattened plan: a shallow curved mouth on the BOTTOM surface (two lip arcs around a dark slot). */
export function buildVentralMouth(bm, mats, H) {
  const { THREE } = H, g = bm.g, u = bm.h * .42, s = {}, fr = {}, p = {}; bm.section(u, s); bm.frame(u, fr);
  const w = s.coreW * .62, K = 16, out = [];
  const bottom = (uu, z, out2, lift) => { bm.frame(uu, fr); bm.section(uu, s); const ct = Math.sign(z) * Math.pow(Math.min(1, Math.abs(z) / Math.max(1e-8, s.w)), s.n / 2); bm.point(uu, -Math.acos(H.clamp(ct, -1, 1)), p, fr, s, true); const l = Math.hypot(p.ly, p.lz) || 1; out2.set(p.x + fr.nx * p.ly / l * lift, p.y + fr.ny * p.ly / l * lift, p.z + p.lz / l * lift); return out2; };
  for (const sign of [-1, 1]) {   /* lips: flat ribbons lying IN the skin (no tube, no ridge) */
    const rp = [], ri = [], q = new THREE.Vector3();
    for (let i = 0; i <= K; i++) for (const e of [-1, 1]) { const z = H.lerp(-w, w, i / K), uu = u + .05 * bm.h * (z / w) ** 2 + sign * .02 * bm.h + e * .006 * bm.h * (1 + g.mouth.lips); bottom(uu, z, q, bm.maxD * .0012); rp.push(q.x, q.y, q.z); }
    for (let i = 0; i < K; i++) { const a = i * 2; ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); geo.setIndex(ri); geo.computeVertexNormals(); H.skinAttributes(geo, bm); const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; out.push(m);
  }
  /* slot: a thin dark strip between the lips, closed (a floor), depth ≤ CAVITY_MAX by construction (it lies on the skin) */
  const pos = [], ab = [], idx = [];
  for (let i = 0; i <= K; i++) { const z = H.lerp(-w, w, i / K) * .95; for (const sgn of [-1, 1]) { const uu = u + .05 * bm.h * (z / w) ** 2 + sgn * .009 * bm.h; const q = bottom(uu, z, new THREE.Vector3(), -bm.maxD * .003); pos.push(q.x, q.y, q.z); ab.push(uu, .25, 1, 0); } }
  for (let i = 0; i < K; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const slot = new THREE.BufferGeometry(); slot.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); slot.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); slot.setIndex(idx); slot.computeVertexNormals();
  const sm = new THREE.Mesh(slot, mats.jaw); sm.frustumCulled = false; sm.userData.ventral = { y: pos.filter((_, i) => i % 3 === 1).reduce((a, b, _, r) => a + b / r.length, 0) }; out.push(sm);
  return out;
}

/** Flattened plan: optional defensive spine on the top of the slender tail (niche flag). */
export function buildTailSpine(bm, mats, H) {
  const { THREE } = H, u = .8, p = {}, n = new THREE.Vector3(), fr = {}; bm.rawSurface(u, Math.PI / 2, p); bm.surfaceNormal(u, Math.PI / 2, n); bm.frame(u, fr);
  const len = bm.L * .09, geo = new THREE.ConeGeometry(bm.maxD * .02, len, 6); geo.translate(0, len * .5, 0);
  const dir = new THREE.Vector3(fr.tx, fr.ty, 0).multiplyScalar(.9).add(n.multiplyScalar(.35)).normalize();
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); geo.translate(p.x, p.y, p.z);
  const m = new THREE.Mesh(geo, mats.tooth); m.frustumCulled = false; return [m];
}
