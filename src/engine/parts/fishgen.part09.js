  const g = generate({ habitat: HABITATS[meta.habitat] ? meta.habitat : undefined, niche: NICHES[meta.niche] ? meta.niche : undefined, clade: CLADES[meta.clade] ? meta.clade : undefined, seed: 'llm:' + cyrb128(prompt)[0].toString(36), overrides });
  g.meta.repairs.unshift(...issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i }))); return g;
}
function unflatten(flat) { const o = {}; for (const p in flat) setP(o, p, flat[p]); return o; }
Object.assign(FG, { generate, mutate, breed, genomeFromText, genomeFromLLM, resolveTraitMap, ADAPTATIONS, applyAdaptation, traitBounds });
/* data-layer self test: 200 genomes per habitat */
function selfTestData(perHabitat = 200) {
  const rows = [];
  for (const hid in HABITATS) { const row = { habitat: HABITATS[hid].n, n: perHabitat, nan: 0, unrepaired: 0, incoherent: 0, flags: 0, clades: new Set() };
    for (let i = 0; i < perHabitat; i++) { const g = generate({ habitat: hid, seed: 'st' + i });
      for (const p in SCHEMA) { const v = getP(g, p); if ((SCHEMA[p].t === 'n' || SCHEMA[p].t === 'i') && !isNum(v)) row.nan++; if (SCHEMA[p].t === 'hsl' && !v.every(isNum)) row.nan++; }
      if (violations(g).length) row.unrepaired++;
      if (g.fins.caudal.present && !(SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES).includes(g.fins.caudal.type)) row.incoherent++;
      if (HABITATS[hid].fantasy !== g.meta.fantasy && !HABITATS[hid].fantasy) row.flags++;
      row.clades.add(g.meta.clade); }
    row.clades = row.clades.size; rows.push(row); }
  return rows;
}
FG.selfTestData = selfTestData;
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 8. MORPHOLOGY BUILDER                                            ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const QUALITY = { hero: { S: 96, R: 48, K: 6, eye: 20, detail: true }, med: { S: 56, R: 28, K: 4, eye: 12, detail: true }, lod: { S: 20, R: 12, K: 2, eye: 0, detail: false } };
const MOUTH_LINE = { terminal: [0, -.24], superior: [.28, -.2], inferior: [-.84, -.64], subterminal: [-.65, -.48], beak: [-.03, -.18], tube: [0, -.08], suction: [-.85, -.73], protrusible: [-.04, -.27] };
const SHAPE_FN = {
  sail: t => Math.pow(Math.sin(Math.PI * t), .34) * (1 - .2 * t),
  rounded: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .65),
  lobe: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .85),
  continuous: t => (0.7 + .3 * Math.sin(Math.PI * t)) * sstep(0, .045, t) * (1 - sstep(.91, 1, t)),
  notched: (t, sf) => (1 - .53 * gaussf((t - Math.max(.35, sf)) / .095)) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .4),
  spinySoft: (t, sf) => (t < sf ? .78 : 1.0) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .42),
  filament: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .6) * (1 + 1.4 * gaussf((t - .85) / .085)),
  spines: t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), .38) * (1 - .2 * t)
};
const PECT_SHAPE = { pointed: t => .25 + .75 * Math.pow(1 - t, 1.3), rounded: t => .5 + .5 * Math.pow(Math.sin(Math.PI * t), .7), wing: t => .35 + .65 * Math.pow(1 - t, .8), disc: t => Math.pow(Math.sin(Math.PI * t), .55), fan: t => .75 + .25 * Math.sin(Math.PI * t), filament: t => t < .25 ? 1 : .25, limb: t => .6 + .4 * Math.sin(Math.PI * t) };
const PELV_SHAPE = { pointed: t => .3 + .7 * Math.pow(1 - t, 1.2), rounded: t => .5 + .5 * Math.sin(Math.PI * t), filament: t => t < .3 ? 1 : .2, fused: t => .6 + .4 * Math.sin(Math.PI * t) };
const CAUDAL_SHAPE = {
  forked: (a, n) => lerp(.55, .24, n) + (1 - lerp(.55, .24, n)) * Math.pow(a, 1.5),
  lunate: (a, n) => .16 + .75 * Math.pow(a, 1.8),
  truncate: a => 1 - .04 * a,
  rounded: a => .38 + .62 * Math.sqrt(Math.max(0, 1 - a * a)),
  emarginate: (a, n) => .77 - .14 * n + .3 * a * a,
  heterocercal: a => .28 + .72 * Math.pow(a, 1.32) - .11 * gaussf((a - .82) / .085),
  hypocercal: a => .4 + .6 * Math.pow(a, 1.4),
  diphycercal: a => 1.12 - .8 * Math.pow(a, 1.5),
  lyrate: a => .56 + .61 * Math.pow(a, 4),
  filamentous: a => .65 + 1.2 * Math.pow(a, 7),
  fantail: (a, n) => .46 + .54 * Math.sqrt(Math.max(0, 1 - Math.pow((a - .53) / .55, 2))) - (1 - a) * .24 * n
};
function bezier2(t, p0, p1, p2, p3) {
  const s = 1 - t; return [s * s * s * p0[0] + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * p3[0], s * s * s * p0[1] + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * p3[1]];
}
function foilOutline(t, apex, sweep, curve, free = 0) {
  const x = .29 + sweep * .6;
  return t <= apex
    ? bezier2(t / apex, [0, 0], [x * .18, .26], [x * .72, .76], [x, 1])
    : bezier2((t - apex) / (1 - apex), [x, 1], [x - curve * .2, .56], [.74 + free, .08], [1 + free, 0]);
}
const TEETH = { villiform: { r: .012, len: .05 }, needle: { r: .012, len: .14 }, triangular: { r: .03, len: .08 }, fang: { r: .02, len: .17 }, molar: { r: .035, len: .03 }, beak: { r: .08, len: .045 }, rasp: { r: .008, len: .03 } };

/** Analytic body model shared by loft, fins, eyes, jaw and tests. All outputs in fish-local metres. */
class BodyModel {
  constructor(g) {
    this.g = g; this.a = anatomyProfile(g); const b = g.body; this.L = b.length; this.bp = bodyProfile(g); this.maxD = this.bp.maxD * this.L; this.h = g.head.lengthFrac; this.lm = landmarks(g);
    this.billStart = ['bill', 'sword'].includes(g.head.special) ? -g.head.specialLen : null;
    /* global anatomy laws: everything below that shapes eyes, mouth, fins, tail and the flattened plan reads these axes only */
    this.ax = LAW.axesOf(g, this.a, NICHES[g.meta.niche], HABITATS[g.meta.habitat]);
    this.law = { eye: LAW.eyeLaw(this.ax), mouth: LAW.mouthLaw(this.ax), fin: LAW.finLaw(this.ax), tail: LAW.tailLaw(this.ax), flat: LAW.flatLaw(this.ax, g) }; this.law.pec = PEC.pecPlan(this.ax, g.body.length, this.ax.seedU);
    this.isManta = false;
    const NS = 240, pts = [], post = b.posture * Math.PI / 180, curl = b.curl; let x = 0, y = 0;
    for (let i = 0; i <= NS; i++) { const u = i / NS, phi = post * sstep(0.08, 0.28, u) + curl * TAU * 1.15 * Math.pow(Math.max(0, (u - 0.68) / 0.32), 1.6); pts.push({ x, y, phi }); x -= Math.cos(phi) * this.L / NS; y -= Math.sin(phi) * this.L / NS; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; for (const p of pts) { p.x -= cx; p.y -= cy; }
    const control = pts.filter((p, i) => i % 15 === 0).map(p => new THREE.Vector3(p.x, p.y, 0));
    const curve = new THREE.CatmullRomCurve3(control, false, 'centripetal'); curve.arcLengthDivisions = 480; curve.updateArcLengths();
    const sample = new THREE.Vector3(), tangent = new THREE.Vector3(); let previousAngle = 0;
    for (let i = 0; i <= NS; i++) {
      curve.getPointAt(i / NS, sample); curve.getTangentAt(i / NS, tangent);
      let angle = Math.atan2(-tangent.y, -tangent.x);
      while (angle - previousAngle > Math.PI) angle -= TAU;
      while (angle - previousAngle < -Math.PI) angle += TAU;
      pts[i].x = sample.x; pts[i].y = sample.y; pts[i].phi = angle; previousAngle = angle;
    }
    this.curve = curve;
    this.spine = pts; this.headX = pts[0].x; this.tailX = pts[NS].x;
    const mt = MOUTH_LINE[g.mouth.type] || MOUTH_LINE.terminal; this.tipF = mt[0]; this.cornerF = mt[1];
    this.mcU = this.lm.mouthCorner;
    this.oralDisc = this.law.mouth.construction === 'sucker' || this.law.mouth.construction === 'tube';
    this.ventralMouth = this.law.mouth.construction === 'ventral';
    const under = ['inferior', 'subterminal', 'suction'].includes(g.mouth.type);
    this.jawStartU = under ? this.h * .16 : .003;
    this.jawStartU = Math.min(this.jawStartU, this.mcU * .45);
    if (this.law.mouth.ventral) this.jawStartU = Math.min(this.law.mouth.setback * this.h, this.mcU * .62);   /* round 5A: cartilaginous plan - lip line under the snout, set back from the tip */
    if (g.head.special === 'hammer') this.jawStartU = Math.min(Math.max(this.jawStartU, g.head.specialLen * .72), this.mcU * .8);
    if (g.head.special === 'bill' || g.head.special === 'sword') this.jawStartU = Math.min(this.mcU * .5, Math.max(this.jawStartU, this.mcU * .35));
    /* eyeSize = visible eye diameter as a fraction of head length; the ball is recessed so only ~0.73 of its radius shows */
    this.eyeR = g.head.eyeSize * this.h * this.L * 0.69;
    this.eyeY = LAW.eyeStation(g, this.law.eye, this.ax) * this.bp.depth(this.lm.eye) * this.L * b.dorsalFrac * 0.7;
    this.cheekK = (this.law.mouth.cheek - .4) * .05;      /* adductor (cheek) mass scales with the bite niche: massive for ambush crushers, slim for pickers */
    this.protrusile = this.law.mouth.construction === 'jawed' && (this.law.mouth.picking || g.mouth.protrusible || g.mouth.type === 'protrusible');
    /* jaw articulation: behind the mouth corner and never in front of the eye line, always ahead of the gill opening */
    this.hingeU = clamp(Math.max(this.mcU + .004, this.lm.eye + .5 * g.head.eyeSize * this.h), this.mcU, Math.max(this.mcU, this.h * g.head.gillStart - .006));
    if (this.law.flat) { const sp = this.L * (this.a.family === 'ray' ? clamp(g.fins.pectoral.len * .47, .58, 1.23) : .42); this.discMargin = sp * this.law.flat.marginFrac; }
    this.disc = DISC.isDisc(this) ? DISC.plan(this) : null;   /* round 6A: the disc plan is one solid, opaque surface (discgeo.js) */
    if (this.disc) { this.discMargin = 0; this.maxD = this.disc.Hc; }
    this._fr = {}; this._s = {};
    /* round 6H (L3 termination law): the body never ends in a flat cut. Past u = 1 the loft continues as a rounded (elliptical) rear cap whose axial length is 0.75 x the
       peduncle's largest half-extent; the terminal fin root (at u = 1) is therefore buried inside the body volume, and the cross-section falls to zero smoothly (sqrt profile). */
    this.capU = 0;
    { const s1 = {}; this.section(1, s1); this.capU = Math.max(.004, .75 * Math.max(s1.dUp, s1.dDn, s1.w) / this.L); }
  }
  frame(u, out) {
    if (u > 1) { const a = this.spine[this.spine.length - 1]; out.tx = -Math.cos(a.phi); out.ty = -Math.sin(a.phi); out.px = a.x + out.tx * (u - 1) * this.L; out.py = a.y + out.ty * (u - 1) * this.L; out.nx = out.ty; out.ny = -out.tx; return out; }
    const sp = this.spine;
    if (u < 0) { const a = sp[0]; out.tx = -Math.cos(a.phi); out.ty = -Math.sin(a.phi); out.px = a.x + out.tx * u * this.L; out.py = a.y + out.ty * u * this.L; out.nx = out.ty; out.ny = -out.tx; return out; }
    const t = clamp(u, 0, 1) * (sp.length - 1), i = Math.min(sp.length - 2, Math.floor(t)), f = t - i, a = sp[i], b2 = sp[i + 1]; const phi = a.phi + (b2.phi - a.phi) * f;
    out.px = a.x + (b2.x - a.x) * f; out.py = a.y + (b2.y - a.y) * f; out.tx = -Math.cos(phi); out.ty = -Math.sin(phi); out.nx = out.ty; out.ny = -out.tx; return out;
  }
  section(u, s) {
    if (u > 1) { const q = (u - 1) / Math.max(1e-9, this.capU), k = Math.sqrt(Math.max(0, 1 - q * q)); this.section(1, s); s.dUp *= k; s.dDn *= k; s.w *= k; s.coreW = s.w; if (s.rim !== undefined) s.rim *= k; return s; }
    if (this.disc) return DISC.section(this, u, s);
    const g = this.g, b = g.body, L = this.L, d = this.bp.depth(u) * L, w = this.bp.width(u) * L;
    if (this.billStart !== null && u < .004) {
      const f = clamp((u - this.billStart) / (.004 - this.billStart), 0, 1), d0 = this.bp.depth(.004) * L, w0 = this.bp.width(.004) * L;
      s.dUp = d0 * b.dorsalFrac * f; s.dDn = d0 * (1 - b.dorsalFrac) * f;
      s.w = w0 * .5 * f * (g.head.special === 'sword' ? 1 + .38 * Math.sin(Math.PI * f) : 1);
      s.coreW = s.w; s.n = 2; s.nV = 2; s.nD = 2; return s;
    }
    const shoulder = 1 + b.shoulder * .11 * gaussf((u - this.h * .93) / (this.h * .35));
    const dfr = this.law.flat || b.roll !== 0 ? b.dorsalFrac : lerp(b.dorsalFrac, .5, sstep(.62, .95, u));   /* round 3: the peduncle is centred on the body axis (profile eases to symmetric toward the tail) */
    s.dUp = d * dfr; s.dDn = d * (1 - dfr); s.w = w * .5 * shoulder;
    s.w *= 1 + (g.head.cheek * .05 + this.cheekK) * gaussf((u - this.h * .77) / (this.h * .22));
    if (b.hump > 0) s.dUp += b.hump * this.maxD * 0.22 * gaussf((u - 0.2) / 0.11);
    s.n = lerp(b.superN, b.superNTail, sstep(0.5, 1, u)); s.nV = s.n * (1 + 3 * b.ventralFlat); s.nD = s.n * (1 + 2.5 * b.dorsalFlat);
    const h = this.h, headBlend = 1 - sstep(h * .9, h * 1.4, u);
    s.dUp += headBlend * g.head.foreheadSlope * d * .18 * gaussf((u - h * .55) / (h * .3));
    s.dUp += headBlend * g.head.brow * this.eyeR * .15 * gaussf((u - this.lm.eye) / (h * .13));
    if (g.head.special === 'hammer') {
      const len = Math.max(1e-4, g.head.specialLen), q = u / len;
      /* cephalofoil: near-straight leading edge, flat wings held to ~0.85 of its length, then a quick fair-in to the trunk */
      const wing = sstep(0, .08, q) * (1 - sstep(.82, 1.35, q)), front = sstep(0, .08, q);
      s.w += g.head.specialWidth * L * .5 * wing * (1 - .12 * Math.pow(Math.max(0, 1 - q / .4), 2));
      s.dUp = lerp(s.dUp, Math.min(s.dUp, this.maxD * .17), wing); s.dDn = lerp(s.dDn, Math.min(s.dDn, this.maxD * .16), wing);
      s.n = lerp(s.n, 4.5, wing); s.nD = s.n; s.nV = s.n * (1 + 2 * b.ventralFlat);
      if (q < .08) { const k = front; s.w = Math.max(s.w, g.head.specialWidth * L * .5 * k * .9); }
    }
    s.coreW = s.w;
    if (this.a.family === 'ray' || this.a.family === 'benthicShark') {
      const ray = this.a.family === 'ray', peak = ray ? b.peakU : .37, end = ray ? .76 : .68;
      const span = ray ? L * clamp(g.fins.pectoral.len * .47, .58, 1.23) : L * .42;
      /* flattened plan: disc outline (rounded ↔ angular) and the share left to the ray-supported margin fin are plan parameters */
      const fl = this.law.flat, front = ray ? fl.discFront : .09;
      const taper = u < peak ? front + (1 - front) * Math.pow(Math.sin(Math.PI * .5 * clamp(u / peak, 0, 1)), fl.discPow)
        : Math.pow(1 - sstep(peak, end, u), .82);
      s.w = Math.max(s.coreW, span * (1 - fl.marginFrac * .8) * taper);
    }
    return s;
  }
  mouthLineY(u, s) {
    const t = clamp((u - this.jawStartU) / Math.max(1e-6, this.mcU - this.jawStartU), 0, 1);
    const f = lerp(this.tipF, this.cornerF, smoother(t)) - this.g.mouth.cornerCurve * .055 * Math.sin(Math.PI * t);
    return clamp(f * (f > 0 ? s.dUp : s.dDn), -s.dDn * .96, s.dUp * .7);
  }
  halfWidthAtY(s, y) { const yR = y > 0 ? s.dUp : s.dDn, yn = y > 0 ? s.nD : s.nV; const q = Math.min(1, Math.pow(Math.abs(y) / Math.max(1e-9, yR), yn)); return s.w * Math.pow(Math.max(0, 1 - q), 1 / s.n); }
  point(u, theta, out, fr, s, raw = false) {
    if (this.disc) return DISC.point(this, u, theta, out, fr, s);
    const g = this.g, ct = Math.cos(theta), st = Math.sin(theta), n = st > 0 ? s.nD : s.nV, yR = st > 0 ? s.dUp : s.dDn;
    let ly = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * yR, lz = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / s.n) * s.w;
    if (this.a.family === 'ray' || this.a.family === 'benthicShark') {
      const outboard = Math.abs(lz) / Math.max(s.w, 1e-8);
      ly *= 1 - (this.a.family === 'ray' ? .90 : .78) * sstep(.08, .96, outboard);
    }
    const h = this.h;
    lz -= Math.sign(ct) * GILL.cut(this, u, st, s.w);   /* round 5A: gill-slit grooves (cartilaginous) / opercular trench (bony) */
    if (g.body.keel > 0) lz += Math.sign(ct) * g.body.keel * this.maxD * 0.08 * gaussf((u - 0.95) / 0.045) * Math.pow(Math.abs(ct), 6);
    out.mouth = 0;
    out.x = fr.px + fr.nx * ly; out.y = fr.py + fr.ny * ly; out.z = lz; out.ly = ly; out.lz = lz; return out;
  }
  surface(u, theta, out) { this.frame(u, this._fr); this.section(u, this._s); return this.point(u, theta, out, this._fr, this._s); }
  sampleLoft(u, theta, out, attribute = 'position') {
    const cache = this.loft, us = cache.us, values = cache.geo.getAttribute(attribute), R = cache.R;
    u = clamp(u, us[0], us[us.length - 1]);
    let lo = 0, hi = us.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (us[m] > u) hi = m; else lo = m; }
    const du = clamp((u - us[lo]) / Math.max(1e-12, us[hi] - us[lo]), 0, 1);
    const angle = (((theta + Math.PI / 2) / TAU) % 1 + 1) % 1 * R, j = Math.floor(angle), da = angle - j;
    const a = lo * R + j, b = lo * R + (j + 1) % R, c = hi * R + j, d = hi * R + (j + 1) % R;
    const ids = du + da <= 1 ? [a, b, c] : [b, c, d], ws = du + da <= 1 ? [1 - du - da, da, du] : [1 - du, 1 - da, du + da - 1];
    out.x = values.getX(ids[0]) * ws[0] + values.getX(ids[1]) * ws[1] + values.getX(ids[2]) * ws[2];
    out.y = values.getY(ids[0]) * ws[0] + values.getY(ids[1]) * ws[1] + values.getY(ids[2]) * ws[2];
    out.z = values.getZ(ids[0]) * ws[0] + values.getZ(ids[1]) * ws[1] + values.getZ(ids[2]) * ws[2];
    return out;
  }
  attachedSurface(u, theta, out) { return this.loft ? this.sampleLoft(u, theta, out) : this.surface(u, theta, out); }
  rawSurface(u, theta, out) { this.frame(u, this._fr); this.section(u, this._s); return this.point(u, theta, out, this._fr, this._s, true); }
  surfaceNormal(u, theta, out) {
    if (this.loft) { this.sampleLoft(u, theta, out, 'normal'); return out.normalize(); }
    const pa = {}, pb = {}, pc = {}, pd = {};
    this.rawSurface(clamp(u - .0005, .001, .999), theta, pa); this.rawSurface(clamp(u + .0005, .001, .999), theta, pb);
    this.rawSurface(u, theta - .001, pc); this.rawSurface(u, theta + .001, pd);
    const ax = pd.x - pc.x, ay = pd.y - pc.y, az = pd.z - pc.z, bx = pb.x - pa.x, by = pb.y - pa.y, bz = pb.z - pa.z;
    return out.set(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx).normalize();
  }
  mouthBoundary(u, side, out) {
    this.frame(u, this._fr); this.section(u, this._s); const y = this.mouthLineY(u, this._s);
    out.set(this._fr.px + this._fr.nx * y, this._fr.py + this._fr.ny * y, side * this.halfWidthAtY(this._s, y)); return out;
  }
}
function buildBodyGeometry(bm, S, R) {
  if (bm.disc) R = Math.max(12, Math.round(R * 2.5 / 4) * 4);   /* disc ring: faces uniform in z, so the underside grooves get real vertex columns */
  const billRings = bm.billStart === null ? 0 : (S < 30 ? 5 : 12);
  const Ubase = []; for (let i = 0; i <= S + billRings; i++) { const t = Math.max(0, i - billRings) / S; Ubase.push(i < billRings ? lerp(bm.billStart, .004, (i + 1) / (billRings + 1)) : Math.max(.004, t * (.6 + .4 * t))); }
  if (!bm.lod) {      /* extra stations across every groove / the opercular trench: real depth instead of aliasing */
    for (const e of (bm.disc ? DISC.extraStations(bm) : GILL.extraStations(bm))) if (e > .006 && e < .98) Ubase.push(e);
    Ubase.sort((a, b) => a - b); for (let i = Ubase.length - 1; i > 0; i--) if (Ubase[i] - Ubase[i - 1] < 1e-5) Ubase.splice(i, 1);
  }
  if (bm.capU > 0) { const NC = bm.lod ? 3 : 7; for (let k = 1; k <= NC; k++) Ubase.push(1 + bm.capU * Math.sin(k / NC * Math.PI / 2 * .94)); }   /* round 6H: rounded rear cap */
  const stations = Ubase.length - 1;
  const nV = (stations + 1) * R + 2, pos = new Float32Array(nV * 3), ab = new Float32Array(nV * 4), idx = [], us = new Float64Array(stations + 1);
  const fr = {}, s = {}, p = {}; let v = 0;
  for (let i = 0; i <= stations; i++) {
    const u = Ubase[i];
    us[i] = u; bm.frame(u, fr); bm.section(u, s);
    for (let j = 0; j < R; j++) { bm.point(u, -Math.PI / 2 + j / R * TAU, p, fr, s); pos[v * 3] = p.x; pos[v * 3 + 1] = p.y; pos[v * 3 + 2] = p.z; ab[v * 4] = u; ab[v * 4 + 1] = j / R; ab[v * 4 + 2] = p.mouth; v++; } }
  bm.frame(bm.billStart === null ? 0 : bm.billStart, fr); const snout = v++; pos[snout * 3] = fr.px - fr.tx * .0002 * bm.L; pos[snout * 3 + 1] = fr.py - fr.ty * .0002 * bm.L; ab[snout * 4] = bm.billStart === null ? 0 : bm.billStart; ab[snout * 4 + 1] = .25;
  bm.frame(1 + bm.capU, fr); const tail = v++; pos[tail * 3] = fr.px; pos[tail * 3 + 1] = fr.py; ab[tail * 4] = 1 + bm.capU; ab[tail * 4 + 1] = .5;
  for (let i = 0; i < stations; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b2 = i * R + (j + 1) % R, c2 = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R; idx.push(a, b2, c2, b2, d, c2); }
  for (let j = 0; j < R; j++) { idx.push(snout, (j + 1) % R, j, tail, stations * R + j, stations * R + (j + 1) % R); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  bm.loft = { geo, us, R };
  return geo;
}
// @@PART js/app.part10.js (10/19) lines 1848-2150 of the original module script -- stripped by build.mjs
function buildJawGeometry(bm) {
  /* lower jaw = lever hinged at the jaw joint (behind the eye line) with a visible jaw angle at its rear; upper jaw = premaxilla patch that slides forward-down with the open amount.
     Both are skin patches that are flush with the head along the seam, so at rest the lips simply meet (opening 0). */
  const NJ = 26, M = 16, p = {}, fr = {}, s = {};
  const u0 = MOUTH.jawU0(bm), u1 = MOUTH.jawU1(bm), cheek = bm.law.mouth.cheek;   /* round 2: same lip definition as the pocket rim, teeth rows and the skin shader */
  bm.frame(u1, fr); bm.section(u1, s);
  const py = bm.mouthLineY(u1, s), pivot = { x: fr.px + fr.nx * py, y: fr.py + fr.ny * py };
  const patch = upper => {
    const pos = [], ab = [], idx = [], uEnd = upper ? lerp(u0, bm.mcU, .8) : u1;
    for (let i = 0; i <= NJ; i++) {
      const u = lerp(u0, uEnd, Math.pow(i / NJ, 1.5)), t = (u - u0) / Math.max(1e-9, uEnd - u0);   /* denser rows at the chin so the front profile is round */
      bm.frame(u, fr); bm.section(u, s);
      const ym = bm.mouthLineY(u, s), yr = ym > 0 ? s.dUp : s.dDn, n = ym > 0 ? s.nD : s.nV;
      const rim = Math.asin(Math.sign(ym) * Math.pow(clamp(Math.abs(ym) / Math.max(yr, 1e-8), 0, .98), n * .5));
      for (let j = 0; j <= M; j++) {
        const jn = j / M, a = upper ? lerp(rim, Math.PI - rim, jn) : lerp(-Math.PI - rim, rim, jn);
        bm.point(u, a, p, fr, s, true);
        let off, w;
        if (upper) { off = bm.maxD * .003 * Math.sin(Math.PI * t) * Math.pow(Math.sin(Math.PI * jn), .8); w = (1 - sstep(.3, 1, t)) * sstep(.25, .9, Math.abs(2 * jn - 1)); }
        else {
          const fade = Math.sin(Math.PI * jn) * Math.sin(Math.PI * t), angle = Math.sin(Math.PI * clamp((t - .55) / .45, 0, 1)) * Math.pow(Math.sin(Math.PI * jn), .8);
          off = bm.maxD * (.004 * fade + (.006 + .008 * cheek) * angle); w = 1 - sstep(.62, 1, t);          /* jaw angle: a soft angular process at the rear of the lower jaw */
        }
        const length = Math.max(1e-8, Math.hypot(p.ly, p.lz));
        pos.push(p.x + fr.nx * p.ly / length * off, p.y + fr.ny * p.ly / length * off, p.z + p.lz / length * off);
        ab.push(u, ((a + Math.PI / 2) / TAU + 1) % 1, upper ? 2 : 0, w);
      }
    }
    for (let i = 0; i < NJ; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  };
  const geo = patch(false), upper = bm.protrusile ? patch(true) : null;
  const openAngle = MOUTH.gapeRad(bm, GH); MOUTH.jawMorph(bm, geo, GH);   /* jaw law: 12–28° typical, 40° hard max (widest-gape niche only) */
  return { geo, upper, pivot, openAngle };
}
function skinAttributes(geo, bm, tag = 0, jaw = false) {
  const pos = geo.getAttribute('position'), a = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const u = clamp((bm.headX - pos.getX(i)) / bm.L, .003, .999);
    const fr = {}; bm.frame(u, fr); const y = (pos.getX(i) - fr.px) * fr.nx + (pos.getY(i) - fr.py) * fr.ny;
    a[i * 4] = u; a[i * 4 + 1] = ((Math.atan2(y, pos.getZ(i)) + Math.PI / 2) / TAU + 1) % 1;
    a[i * 4 + 2] = tag; a[i * 4 + 3] = jaw ? 1 - sstep(Math.max(.004, bm.jawStartU) + (bm.mcU - Math.max(.004, bm.jawStartU)) * .85, bm.mcU, u) : 0;
  }
  geo.setAttribute('aBody', new THREE.BufferAttribute(a, 4)); return geo;
}
const GH = { THREE, clamp, lerp, sstep, smoother, TAU, skinAttributes, mergeGeos };
/* mouth constructor (see mouthgeo.js): seam + hinged jaws + layered interior for jawed mouths; fused plate; underside sucker disc; tube cap; flattened-plan ventral slot */
function buildMouthDetails(bm, mats) {
  const M = bm.law.mouth;
  if (bm.oralDisc) return MOUTH.buildDisc(bm, mats, GH, M);
  if (bm.ventralMouth) return [...MOUTH.buildVentralMouth(bm, mats, GH), ...(bm.law.flat && bm.law.flat.spine ? MOUTH.buildTailSpine(bm, mats, GH) : [])];
  return [...(M.construction === 'fused' ? MOUTH.buildBeak(bm, mats, GH, M) : []), ...(M.construction === 'jawed' ? MOUTH.buildInterior(bm, mats, GH) : [])];
}
/* fins: ray grid membranes merged into one geometry */
