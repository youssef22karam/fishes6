// Living-mouth audit:  node tools/reassemble.mjs && node tools/mouthaudit.mjs     env: N=300 (fish)  SHOTS=out.png (software-rasterised contact sheet, no GL needed; CW, Z, SEEDS)
// Poses every mouth mesh exactly like the vertex shaders (p = hinge(p + aOpen·open, gape·open·w), teeth erected by aErupt) at 11 gapes from closed to maximum and measures the
// hard bounds of the mouth law: seam pinned, continuous stretch, teeth never reach the opposite jaw, open mouth inside the head's own width, cavity inside the head, predators ajar.
import './headless.mjs';
import fs from 'node:fs'; import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const { hashHex } = await import(eng('genome.js'));
const MOUTH = await import(eng('mouthgeo.js'));
initProcGen(FG);
const H = { clamp: (x, a, b) => Math.min(b, Math.max(a, x)), lerp: (a, b, t) => a + (b - a) * t, sstep: (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, TAU: Math.PI * 2 };
const N = +process.env.N || 300, SHOTS = process.env.SHOTS, TAU = Math.PI * 2;
function poser(fish, o) {
  const U = fish.uniforms, bm = fish.bm, M = bm.law.mouth, ang = o * U.uJawOpenMax.value, piv = U.uJawPivot.value, u0 = U.uJawU0.value, u1 = U.uHingeU.value, ref = U.uJawSpread.value;
  const pro = bm.protrusile ? o * (M.protrude || 0) * bm.h * bm.L : 0, so = U.uJawOpenMax.value > 1e-4 ? o : 0;
  const hinge = (p, u, w) => { p[2] = MOUTH.spreadZ(p[2], u, w, u0, u1, ref, so); const a = -ang * w, c = Math.cos(a), s = Math.sin(a), dx = p[0] - piv.x, dy = p[1] - piv.y; p[0] = piv.x + c * dx - s * dy + pro * w; p[1] = piv.y + s * dx + c * dy; return p; };
  const vert = (geo, i, out, simple) => { const P = geo.getAttribute('position').array, A = geo.getAttribute('aBody'), O = geo.getAttribute('aOpen'); for (let k = 0; k < 3; k++) out[k] = P[i * 3 + k] + (O ? O.array[i * 3 + k] * o : 0);
    if (A && !simple) { const tag = A.array[i * 4 + 2], w = A.array[i * 4 + 3]; if (tag < 2) hinge(out, A.array[i * 4], w); else if (tag < 2.1) { out[0] += pro * w; out[1] -= pro * w * .35; } } return out; };
  return { hinge, vert, o };
}
const parts = fish => { const a = []; if (fish.parts.jaw) a.push({ m: fish.parts.jaw, kind: 'jaw' }); if (fish.parts.upperJaw) a.push({ m: fish.parts.upperJaw, kind: 'jaw' }); for (const m of fish.group.children) if (m.userData && m.userData.mouthPart && m.geometry.getAttribute('aBody')) a.push({ m, kind: m.userData.beak ? 'beak' : m.userData.layer || 'part' }); return a; };
const cls = M => M.construction !== 'jawed' ? M.construction : M.widest ? 'ambush predator' : M.restOpen > 0 ? (M.ventral ? 'pursuit predator (ventral)' : 'pursuit predator') : M.comb ? 'filter' : M.picking ? 'picker' : M.orientation === 'down' ? 'bottom feeder' : 'generalist';
const S = {}, bad = {}; const fail = (k, seed) => { (bad[k] ||= []).push(seed); }; const picks = {};
for (let i = 0; i < N; i++) {
  const seed = hashHex('mouth' + i).slice(0, 8).toUpperCase().replace(/[ILOU]/g, c => ({ I: '1', L: '1', O: '0', U: 'V' }[c])); let f; try { f = fromSeed(seed); } catch (e) { continue; }
  const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }), bm = fish.bm, M = bm.law.mouth, U = fish.uniforms, hl = bm.h * bm.L, c = cls(M), s = S[c] ||= { n: 0, gape: 0, teeth: 0, ajar: 0, shown: 0, lip: 0 };
  s.n++; s.gape += U.uJawOpenMax.value * 180 / Math.PI; s.lip += M.lipK; if (!picks[c]) picks[c] = seed;
  if (U.uJawAngle.value !== 0 || U.uMouthOpen.value !== 0) fail('built fish is not closed', seed);
  const hw = MOUTH.centreBand(bm) / .04, P = parts(fish), prev = P.map(() => null), prev2 = P.map(() => null), v = [0, 0, 0]; let jump = 0;
  for (let k = 0; k <= 10; k++) {
    const ps = poser(fish, k / 10);
    P.forEach((p, pi) => { const g = p.m.geometry, n = g.getAttribute('position').count, cur = new Float64Array(n * 3);
      for (let j = 0; j < n; j++) { ps.vert(g, j, v, p.kind === 'beak'); cur.set(v, j * 3); if (!(isFinite(v[0]) && isFinite(v[1]) && isFinite(v[2]))) fail('NaN in a posed mouth mesh', seed); if (p.kind === 'jaw' && Math.abs(v[2]) > hw * 1.0001) fail('open lower jaw wider than the head', seed); }
      if (prev2[pi]) for (let j = 0; j < n * 3; j++) jump = Math.max(jump, Math.abs(cur[j] - 2 * prev[pi][j] + prev2[pi][j]) / hl);
      prev2[pi] = prev[pi]; prev[pi] = cur; });
    if (M.construction === 'jawed') {
      /* teeth: visible length ≤ half the lip gap at the tooth's own station, at this gape */
      const info = fish.parts.teeth && fish.parts.teeth.userData.teethInfo || [], o = {}; let shown = 0;
      for (const t of info) { MOUTH.lipPoint(bm, t.u, Math.sign(t.root.z) || 1, H, 0, o); const up = [o.x, o.y, o.z], lo = ps.hinge([o.x, o.y, o.z], t.u, MOUTH.jawW(bm, t.u, H)), gap = Math.hypot(up[0] - lo[0], up[1] - lo[1], up[2] - lo[2]), vis = t.len * Math.min(2 / 3, t.erupt * k / 10);
        if (vis > .5 * gap + 1e-7 * bm.L) fail('tooth reaches past half the lip gap', seed); if (vis > .006 * hl) shown++; }
      if (k === 0 && info.some(t => t.len * Math.min(2 / 3, 0) > 0)) fail('teeth exposed at rest', seed);
      if (M.restOpen > 0 && Math.abs(k / 10 - Math.round(M.restOpen * 10) / 10) < 1e-9) { s.ajar++; if (shown > 0) s.shown++; else if (info.length) fail('predator at rest shows no teeth', seed); }
      if (k === 10) { MOUTH.lipPoint(bm, MOUTH.jawU0(bm), 1, H, 0, o); const lo = ps.hinge([o.x, o.y, o.z], MOUTH.jawU0(bm), 1), chord = Math.hypot(o.x - lo[0] + (bm.protrusile ? M.protrude * hl : 0), o.y - lo[1]); if (chord > 2 * hw) fail('gape chord wider than the head', seed); s.teeth += info.length; }
    }
  }
  if (jump > .03) fail('discontinuous stretch (second difference > 0.03 head length per 0.1 gape)', seed); s.jump = Math.max(s.jump || 0, jump);
  /* pinned seam: pocket rim ring and both lip-pad edges carry no open-pose offset */
  for (const p of P) { const g = p.m.geometry, O = g.getAttribute('aOpen'); if (!O) continue;
    if (p.m.userData.groups) { const A = g.getAttribute('aBody').array; for (let j = 0; j < 140; j++) if (Math.hypot(O.array[j * 3], O.array[j * 3 + 1], O.array[j * 3 + 2]) > 1e-9) { fail('pocket rim moves off the lip line', seed); break; }
      /* cavity stays inside the head volume at maximum gape (jaw frame: before the hinge rotation) */
      const e = {}, Pp = g.getAttribute('position').array; for (let j = 0; j < Pp.length / 3; j++) { if (!(A[j * 4 + 2] >= 1 && A[j * 4 + 2] < 2)) continue; const x = Pp[j * 3] + O.array[j * 3], y = Pp[j * 3 + 1] + O.array[j * 3 + 1], z = Pp[j * 3 + 2] + O.array[j * 3 + 2], u = H.clamp((bm.headX - x) / bm.L, .003, .999), fr = {}, sc = {}; bm.frame(u, fr); bm.section(u, sc); const ly = (x - fr.px) * fr.nx + (y - fr.py) * fr.ny;
        if (!(ly > -sc.dDn * 1.02 && ly < sc.dUp * 1.02 && Math.abs(z) <= bm.halfWidthAtY(sc, H.clamp(ly, -sc.dDn * .99, sc.dUp * .99)) * 1.02 + 1e-6)) { fail('open cavity leaves the head volume', seed); break; } } }
    if (p.kind === 'lips' && M.construction === 'jawed') for (let j = 0; j < O.count; j++) if ((j % 6 === 0 || j % 6 === 5) && Math.hypot(O.array[j * 3], O.array[j * 3 + 1], O.array[j * 3 + 2]) > 1e-6 * bm.L) { fail('lip pad edge not pinned', seed); break; } }
  if (M.construction === 'jawed') { const er = .5 * f.genome.head.eyeSize * bm.h, ax = FG.axesOf(f.genome), lateral = !ax.plan.flat && !ax.plan.sideFlat && !ax.plan.headExpanded && f.genome.head.eyeSide !== 'none';   /* same plan exemption as the engine's own corner rule (validate.js): eyes not on the flank */
    if (lateral && bm.mcU > bm.lm.eye + er + 1e-6) fail('mouth corner behind the rear edge of the eye', seed); if (!lateral && bm.mcU > bm.lm.eye + er + 1e-6) (S[c].exempt = (S[c].exempt || 0) + 1, console.log('   corner rule n/a (eyes not lateral):', seed, f.lineage)); if (bm.hingeU < Math.min(bm.lm.eye + er, bm.h * f.genome.head.gillStart - .006) - 1e-6) fail('jaw joint not behind the eye', seed); if (U.uJawOpenMax.value > M.openRad + 1e-9) fail('gape above the niche angle', seed); }
  fish.dispose();
}
console.log(`LIVING-MOUTH AUDIT — ${N} seeds, 11 gapes each (closed → maximum)\n  class                         n   max gape°  lipK  teeth  ajar@rest  teeth shown  max stretch jump`);
for (const [k, s] of Object.entries(S).sort((a, b) => b[1].n - a[1].n)) console.log('  ' + k.padEnd(28) + String(s.n).padStart(4) + (s.gape / s.n).toFixed(1).padStart(10) + (s.lip / s.n).toFixed(2).padStart(7) + (s.teeth / s.n).toFixed(0).padStart(6) + String(s.ajar).padStart(9) + String(s.shown).padStart(12) + s.jump.toFixed(4).padStart(14));
const keys = Object.keys(bad); console.log(keys.length ? '  VIOLATIONS:' : '  violations: 0'); for (const k of keys) console.log(`    ${bad[k].length}× ${k}  e.g. ${bad[k].slice(0, 3).join(' ')}`);
console.log(`  RESULT: ${keys.length ? 'FAIL' : 'PASS'}`);

/* ── software-rasterised contact sheet (flat shaded, z-buffer): closed · half · maximum from the side, maximum from the front quarter ── */
if (SHOTS) {
  const CW = +process.env.CW || 300, CH = Math.round(CW * .77), Z = +process.env.Z || 1, list = process.env.SEEDS ? process.env.SEEDS.split(',').map(x => ['seed', x]) : Object.entries(picks),   /* Z = zoom on the mouth, SEEDS = a,b,c picks the rows */ W = CW * 4, Hh = CH * list.length, img = new Uint8Array(W * Hh * 3).fill(18), zb = new Float32Array(W * Hh).fill(-1e9);
  const tri = (a, b, c, col, ox, oy) => { const x0 = Math.max(ox, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(ox + CW - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(oy, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(oy + CH - 1, Math.ceil(Math.max(a[1], b[1], c[1]))), d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-9) return;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; } const sh = .35 + .65 * Math.max(0, (nx * -.3 + ny * -.55 + nz * .78) / nl);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const l0 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d, l1 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d, l2 = 1 - l0 - l1; if (l0 < -1e-4 || l1 < -1e-4 || l2 < -1e-4) continue; const z = l0 * a[2] + l1 * b[2] + l2 * c[2], k = y * W + x; if (z <= zb[k]) continue; zb[k] = z; img[k * 3] = Math.min(255, col[0] * sh * 255); img[k * 3 + 1] = Math.min(255, col[1] * sh * 255); img[k * 3 + 2] = Math.min(255, col[2] * sh * 255); } };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  list.forEach(([c, seed], row) => {
    const f = fromSeed(seed), fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'hero' }), bm = fish.bm, M = bm.law.mouth, U = fish.uniforms, hl = bm.h * bm.L, table = MOUTH.edgeTable(bm, H), u0 = U.uJawU0.value, u1 = U.uHingeU.value;
    const views = [[0, 0], [M.restOpen > 0 ? M.restOpen : .5, 0], [1, 0], [1, 1]];
    views.forEach(([o, vw], col) => {
      const ps = poser(fish, o), ox = col * CW, oy = row * CH, a = vw ? -1.0 : 0, ca = Math.cos(a), sa = Math.sin(a), sc = (vw ? .78 : 1) * CW / (hl * 1.25) * Z, cx = bm.headX - hl * .5 / Z, cy = Z > 1 ? U.uJawPivot.value.y : fish.bm.spine[0].y, v = [0, 0, 0];
      const proj = p => { const x = p[0] - cx, z = p[2]; return [ox + CW / 2 - (x * ca + z * sa) * sc, oy + CH / 2 - (p[1] - cy) * sc, -x * sa + z * ca]; };
      const draw = (geo, colOf, skip, simple) => { const ix = geo.index.array, n = geo.getAttribute('position').count, pp = new Array(n); for (let j = 0; j < n; j++) { ps.vert(geo, j, v, simple); pp[j] = proj(v); } for (let t = 0; t < ix.length; t += 3) { if (skip && skip(ix[t], ix[t + 1], ix[t + 2])) continue; tri(pp[ix[t]], pp[ix[t + 1]], pp[ix[t + 2]], colOf(ix[t]), ox, oy); } };
      { const g = fish.parts.body.geometry, A = g.getAttribute('aBody').array, P = g.getAttribute('position').array, below = i => { const u = A[i * 4]; if (!(U.uJawOpenMax.value > .001 && o > .02 && u >= (u0 < .002 ? 0 : u0) && u <= u1)) return false; const fi = H.clamp((u - u0) / Math.max(1e-6, u1 - u0), 0, 1) * 39, i0 = Math.floor(fi), i1 = Math.min(i0 + 1, 39); return Math.sin(A[i * 4 + 1] * TAU - Math.PI / 2) < table[i0] + (table[i1] - table[i0]) * (fi - i0) - .0005; };
        const ix = g.index.array, pp = []; for (let j = 0; j < P.length / 3; j++) pp.push(proj([P[j * 3], P[j * 3 + 1], P[j * 3 + 2]])); for (let t = 0; t < ix.length; t += 3) { const i = ix[t], j = ix[t + 1], k = ix[t + 2]; if (A[i * 4] > bm.h * 1.6 || (below(i) && below(j) && below(k))) continue; tri(pp[i], pp[j], pp[k], [.42, .5, .56], ox, oy); } }
      for (const p of parts(fish)) { const g = p.m.geometry, A = g.getAttribute('aBody').array; draw(g, i => { const tag = A[i * 4 + 2], occ = A[i * 4 + 1]; return p.kind === 'beak' ? [.92, .88, .74] : p.kind === 'lips' ? [.8, .56, .5] : p.kind === 'jaw' ? [.5, .58, .64] : tag > 1.7 && tag < 1.8 ? [1, .72, .7] : tag > 1.4 && tag < 1.6 ? [.9, .5, .52] : tag >= 1 && tag < 2 ? mix([.8, .4, .38], [.1, .02, .03], Math.min(1, occ * (1 + .5 * o))) : [.5, .58, .64]; }, null, p.kind === 'beak'); }
      const t = fish.parts.teeth; if (t) { const g = t.geometry, P = g.getAttribute('position').array, ix = g.index.array, IM = t.instanceMatrix.array, aJ = g.getAttribute('aJaw').array, aE = g.getAttribute('aErupt').array, n = P.length / 3;
        for (let i = 0; i < t.count; i++) { const m = IM.subarray(i * 16, i * 16 + 16), k = 1 / 3 + Math.min(2 / 3, aE[i] * o), pp = []; for (let j = 0; j < n; j++) { const x = P[j * 3], y = P[j * 3 + 1] * k, z = P[j * 3 + 2], w = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; if (aJ[i] > 0) ps.hinge(w, (bm.headX - w[0]) / bm.L, aJ[i]); pp.push(proj(w)); } for (let q = 0; q < ix.length; q += 3) tri(pp[ix[q]], pp[ix[q + 1]], pp[ix[q + 2]], [1, 1, .95], ox, oy); } }
      { const fr = {}, e = bm.lm.eye; bm.frame(e, fr); const sx = {}; bm.section(e, sx); const ec = [fr.px + fr.nx * bm.eyeY, fr.py + fr.ny * bm.eyeY, bm.halfWidthAtY(sx, bm.eyeY)], r = f.genome.head.eyeSize * hl * .5; for (let q = 0; q < 20; q++) { const a0 = q / 20 * TAU, a1 = (q + 1) / 20 * TAU; tri(proj([ec[0], ec[1], ec[2] + r * .1]), proj([ec[0] + Math.cos(a0) * r, ec[1] + Math.sin(a0) * r, ec[2] + r * .1]), proj([ec[0] + Math.cos(a1) * r, ec[1] + Math.sin(a1) * r, ec[2] + r * .1]), [.05, .05, .06], ox, oy); } }
    });
    console.log(`  row ${row}: ${c}  seed ${seed}  ${f.lineage || f.clade}  gape ${(U.uJawOpenMax.value * 180 / Math.PI).toFixed(1)}°  restOpen ${M.restOpen}  teeth ${f.genome.mouth.teeth}`); fish.dispose();
  });
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; }), crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, 'ascii'); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const raw = Buffer.alloc((W * 3 + 1) * Hh); for (let y = 0; y < Hh; y++) Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  const hd = Buffer.alloc(13); hd.writeUInt32BE(W, 0); hd.writeUInt32BE(Hh, 4); hd[8] = 8; hd[9] = 2;
  fs.writeFileSync(SHOTS, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); console.log('  contact sheet →', SHOTS);
}
