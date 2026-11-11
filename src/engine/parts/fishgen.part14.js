const FS_PART = /* glsl */`uniform vec3 uFogCol; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = (1.0-smoothstep(0.2,0.5,d))*0.5*vA; gl_FragColor = vec4(mix(uFogCol, vec3(1.0), 0.6), a); }`;
const FS_SHAFT = /* glsl */`uniform float uI; varying vec2 vUv; void main(){ float a = (1.0-smoothstep(0.0,1.0,abs(vUv.x*2.0-1.0)))*(1.0-vUv.y)*(vUv.y)*uI; gl_FragColor = vec4(vec3(1.0,0.97,0.85), a*0.35); }`;
const VS_SHAFT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
function disposeObject(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) { const ms = Array.isArray(c.material) ? c.material : [c.material]; ms.forEach(m => m.dispose()); } }); }
function propMaterial(color, emissive) { return new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000, emissiveIntensity: emissive ? 1.2 : 0 }); }
function makeProp(type, rng, es) {
  const g = new THREE.Group(); const sc = es * rng.range(0.6, 1.4);
  const jitter = geo => { const p = geo.getAttribute('position'); for (let i = 0; i < p.count; i++) { const k = 1 + (rng.next() - 0.5) * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } geo.computeVertexNormals(); return geo; };
  switch (type) {
    case 'rock': case 'boulder': { const m = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(sc * (type === 'boulder' ? 0.9 : 0.5), 1)), propMaterial(new THREE.Color().setHSL(rng.range(0.05, 0.12), 0.2, rng.range(0.2, 0.35)))); m.scale.y = rng.range(0.5, 0.8); g.add(m); break; }
    case 'coral': { const n = rng.int(3, 6); for (let i = 0; i < n; i++) { const h = sc * rng.range(0.3, 0.9); const m = new THREE.Mesh(rng.chance(0.5) ? new THREE.ConeGeometry(sc * 0.12, h, 6) : new THREE.SphereGeometry(sc * rng.range(0.12, 0.25), 7, 6), propMaterial(new THREE.Color().setHSL(rng.pick([0.95, 0.05, 0.12, 0.8, 0.5]), 0.7, 0.5))); m.position.set((rng.next() - 0.5) * sc * 0.6, h * 0.4, (rng.next() - 0.5) * sc * 0.6); g.add(m); } break; }
    case 'fan': case 'sponge': { const m = new THREE.Mesh(type === 'fan' ? new THREE.CylinderGeometry(sc * 0.45, sc * 0.1, sc * 0.9, 8, 1, false) : new THREE.CylinderGeometry(sc * 0.15, sc * 0.2, sc * 0.8, 8, 1, true), propMaterial(new THREE.Color().setHSL(type === 'fan' ? 0.95 : 0.78, 0.6, 0.45))); if (type === 'fan') m.scale.z = 0.08; m.position.y = sc * 0.4; g.add(m); break; }
    case 'kelp': { const n = rng.int(2, 4); for (let i = 0; i < n; i++) { const h = es * rng.range(6, 12); const m = new THREE.Mesh(new THREE.CylinderGeometry(es * 0.03, es * 0.06, h, 5), propMaterial(new THREE.Color().setHSL(0.17, 0.5, 0.22))); m.position.set((rng.next() - 0.5) * es, h / 2, (rng.next() - 0.5) * es); m.rotation.z = (rng.next() - 0.5) * 0.25; m.rotation.x = (rng.next() - 0.5) * 0.25; g.add(m); const b = new THREE.Mesh(new THREE.PlaneGeometry(es * 0.5, h * 0.8), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.16, 0.5, 0.25), side: THREE.DoubleSide })); b.position.copy(m.position); b.rotation.y = rng.next() * Math.PI; g.add(b); } break; }
    case 'weed': case 'grass': case 'leaf': { const n = rng.int(6, 14); for (let i = 0; i < n; i++) { const h = es * (type === 'leaf' ? 0.25 : rng.range(0.8, 1.8)); const m = new THREE.Mesh(new THREE.PlaneGeometry(es * 0.08, h), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(type === 'leaf' ? 0.08 : rng.range(0.2, 0.3), 0.5, type === 'leaf' ? 0.25 : 0.3), side: THREE.DoubleSide })); m.position.set((rng.next() - 0.5) * es * 1.5, type === 'leaf' ? 0.01 : h / 2, (rng.next() - 0.5) * es * 1.5); m.rotation.y = rng.next() * Math.PI; if (type === 'leaf') m.rotation.x = -Math.PI / 2; else m.rotation.z = (rng.next() - 0.5) * 0.4; g.add(m); } break; }
    case 'root': { const n = rng.int(3, 6); for (let i = 0; i < n; i++) { const h = es * rng.range(4, 7); const m = new THREE.Mesh(new THREE.CylinderGeometry(es * 0.06, es * 0.12, h, 6), propMaterial(0x4a3524)); m.position.set((rng.next() - 0.5) * es * 2, h / 2, (rng.next() - 0.5) * es * 2); m.rotation.z = (rng.next() - 0.5) * 0.5; m.rotation.x = (rng.next() - 0.5) * 0.5; g.add(m); } break; }
    case 'wood': { const m = new THREE.Mesh(new THREE.CylinderGeometry(es * 0.15, es * 0.2, es * 4, 7), propMaterial(0x5a4030)); m.rotation.z = Math.PI / 2 + (rng.next() - 0.5) * 0.3; m.rotation.y = rng.next() * Math.PI; m.position.y = es * 0.15; g.add(m); break; }
    case 'ice': { const m = new THREE.Mesh(new THREE.BoxGeometry(sc * 2, sc * 0.8, sc * 2), new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.8 })); m.position.y = es * 7; m.rotation.y = rng.next(); g.add(m); break; }
    case 'vent': { const m = new THREE.Mesh(new THREE.ConeGeometry(sc * 0.6, sc * 1.6, 7), propMaterial(0x332a28)); m.position.y = sc * 0.8; g.add(m); const t = new THREE.Mesh(new THREE.SphereGeometry(sc * 0.15, 6, 5), propMaterial(0x442200, 0xff6622)); t.position.y = sc * 1.6; g.add(t); break; }
    case 'stalagmite': { const n = rng.int(2, 4); for (let i = 0; i < n; i++) { const h = sc * rng.range(0.8, 2.5); const m = new THREE.Mesh(new THREE.ConeGeometry(sc * 0.2, h, 6), propMaterial(0x8a8070)); m.position.set((rng.next() - 0.5) * sc, h / 2, (rng.next() - 0.5) * sc); g.add(m); } break; }
    case 'lava': { const m = new THREE.Mesh(new THREE.CircleGeometry(sc * 1.2, 10), propMaterial(0x441100, 0xff5500)); m.rotation.x = -Math.PI / 2; m.position.y = 0.02 * es; g.add(m); break; }
    case 'crystal': { const n = rng.int(2, 5); for (let i = 0; i < n; i++) { const h = sc * rng.range(0.5, 1.6); const m = new THREE.Mesh(new THREE.OctahedronGeometry(sc * 0.2, 0), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(rng.range(0.7, 0.9), 0.7, 0.6), emissive: new THREE.Color().setHSL(rng.range(0.7, 0.9), 0.8, 0.3), transparent: true, opacity: 0.85 })); m.scale.y = h / (sc * 0.4); m.position.set((rng.next() - 0.5) * sc, h / 2, (rng.next() - 0.5) * sc); m.rotation.z = (rng.next() - 0.5) * 0.5; g.add(m); } break; }
    case 'cloud': { const n = rng.int(3, 6); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(sc * rng.range(0.6, 1.4), 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); m.position.set((rng.next() - 0.5) * sc * 3, (rng.next() - 0.5) * sc + es * rng.range(-6, 6), (rng.next() - 0.5) * sc * 2); g.add(m); } break; }
    case 'star': { const n = 200, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = es * 60; const th = rng.next() * TAU, ph = Math.acos(2 * rng.next() - 1); pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: es * 0.3, sizeAttenuation: true }))); break; }
  }
  return g;
}
function buildEnvironment(hab, L) {
  if (App.env) { scene.remove(App.env.group); disposeObject(App.env.group); App.env = null; }
  const es = App.es = Math.max(0.05, L) * 2.2; const rng = new RNG('env:' + hab.id); const group = new THREE.Group(); const env = { group, hab };
  const water = new THREE.Color(hab.water[0], hab.water[1], hab.water[2]);
  if (hab.floor) { const geo = new THREE.PlaneGeometry(60 * es, 60 * es, 40, 40); const p = geo.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setZ(i, (Math.sin(p.getX(i) * 0.7 / es) + Math.cos(p.getY(i) * 0.5 / es)) * 0.15 * es + (rng.next() - 0.5) * 0.1 * es); geo.computeVertexNormals(); geo.rotateX(-Math.PI / 2);
    const sand = new THREE.Color().setHSL(hab.pal.h[0][0] / 360, 0.25, hab.id === 'lavaLake' ? 0.08 : hab.light < 0.1 ? 0.12 : 0.4);
    const mat = new THREE.ShaderMaterial({ uniforms: Object.assign({}, ENV, { uColor: { value: sand }, uCaustic: { value: hab.light > 0.4 && !reducedMotion ? 1 : 0 }, uScale: { value: es } }), vertexShader: VS_FLOOR, fragmentShader: FS_FLOOR });
    env.floor = new THREE.Mesh(geo, mat); env.floor.position.y = -1.6 * es; group.add(env.floor);
    const props = hab.props.filter(p => p !== 'star' && p !== 'cloud'); for (let i = 0; i < 26 && props.length; i++) { const pr = makeProp(rng.pick(props), rng, es); const a = rng.next() * TAU, r = es * rng.range(3.5, 20); pr.position.set(Math.cos(a) * r, -1.55 * es, Math.sin(a) * r); pr.rotation.y = rng.next() * TAU; group.add(pr); } }
  for (const t of hab.props.filter(p => p === 'star' || p === 'cloud')) { const n = t === 'star' ? 1 : 10; for (let i = 0; i < n; i++) { const pr = makeProp(t, rng, es); const a = rng.next() * TAU, r = es * rng.range(6, 24); pr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); group.add(pr); } }
  { const n = 400, pos = new Float32Array(n * 3), seed = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = (rng.next() - 0.5) * 14 * es; pos[i * 3 + 1] = (rng.next() - 0.5) * 12 * es; pos[i * 3 + 2] = (rng.next() - 0.5) * 14 * es; seed[i] = rng.next(); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    env.particles = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { uTime: ENV.uTime, uScale: { value: es }, uSize: { value: 5 * es * renderer.getPixelRatio() }, uFogCol: ENV.uFogCol }, vertexShader: VS_PART, fragmentShader: FS_PART, transparent: true, depthWrite: false })); env.particles.frustumCulled = false; group.add(env.particles); }
  if (hab.light > 0.3) { env.shafts = new THREE.Group(); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(es * rng.range(1, 2.5), es * 14), new THREE.ShaderMaterial({ uniforms: { uI: { value: hab.light * 0.8 } }, vertexShader: VS_SHAFT, fragmentShader: FS_SHAFT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); const a = rng.next() * TAU, r = es * rng.range(2, 9); m.position.set(Math.cos(a) * r, es * 3, Math.sin(a) * r); m.rotation.z = (rng.next() - 0.5) * 0.3; env.shafts.add(m); } group.add(env.shafts); }
  scene.add(group); App.env = env; applyTier(); applyMode();
}
function applyMode() {
  const hab = App.env ? App.env.hab : HABITATS.coralReef, es = App.es, studio = App.mode === 'studio';
  if (App.env) { App.env.group.visible = !studio; }
  if (studio) { scene.background = studioBackdrop(); scene.fog = null; ENV.uFogDensity.value = 0; ENV.uLightDir.value.set(0.45, 0.8, 0.6).normalize(); ENV.uLightCol.value.setRGB(1.05, 1.03, 1); ENV.uSkyCol.value.setRGB(0.62, 0.66, 0.72); ENV.uGroundCol.value.setRGB(0.22, 0.21, 0.22); ENV.uFogCol.value.setRGB(0.11, 0.15, 0.2); lights.hemi.color.set(0x9fb3c8); lights.hemi.groundColor.set(0x3a3a3a); lights.dir.intensity = 1.6; }
  else { const w = new THREE.Color(hab.water[0], hab.water[1], hab.water[2]); scene.background = w; scene.fog = new THREE.FogExp2(w, hab.fog / es); ENV.uFogDensity.value = hab.fog / es; ENV.uFogCol.value.copy(w);
    const l = hab.light; ENV.uLightDir.value.set(0.25, 1, 0.35).normalize(); ENV.uLightCol.value.setRGB(0.3 + l * 0.9, 0.35 + l * 0.85, 0.45 + l * 0.7); ENV.uSkyCol.value.setRGB(w.r * 1.6 + 0.25 * l, w.g * 1.6 + 0.3 * l, w.b * 1.6 + 0.35 * l); ENV.uGroundCol.value.setRGB(0.05 + w.r * 0.6, 0.05 + w.g * 0.6, 0.05 + w.b * 0.6);
    if (hab.id === 'lavaLake') { ENV.uLightDir.value.set(0.1, -1, 0.3).normalize(); ENV.uLightCol.value.setRGB(1.3, 0.45, 0.1); ENV.uGroundCol.value.setRGB(0.8, 0.25, 0.05); }
    if (hab.id === 'void' || hab.id === 'abyssal' || hab.id === 'hadal') { ENV.uSkyCol.value.setRGB(0.12, 0.12, 0.18); ENV.uGroundCol.value.setRGB(0.04, 0.04, 0.06); ENV.uLightCol.value.setRGB(0.35, 0.4, 0.5); }
    lights.hemi.color.copy(ENV.uSkyCol.value); lights.hemi.groundColor.copy(ENV.uGroundCol.value); lights.dir.intensity = 0.6 + l * 1.2; lights.dir.color.copy(ENV.uLightCol.value); }
  ENV.uFillCol.value.copy(ENV.uSkyCol.value).multiplyScalar(studio ? .42 : .22);
  /* the reflection probe is tinted / dimmed to the water it is swimming in */
  if (studio) { ENV.uEnvTint.value.setRGB(1, 1, 1); ENV.uEnvInt.value = 1; ENV.uWet.value = 1; }
  else { const l = clamp(hab.light, 0, 1), w = new THREE.Color(hab.water[0], hab.water[1], hab.water[2]);
    ENV.uEnvTint.value.setRGB(lerp(w.r * 1.4 + .08, 1, l * .8), lerp(w.g * 1.4 + .1, 1, l * .8), lerp(w.b * 1.4 + .14, 1, l * .8));
    ENV.uEnvInt.value = 0.16 + l * 0.95; ENV.uWet.value = 0.78 + l * 0.22; }
  if (renderer) renderer.toneMappingExposure = studio ? 1.0 : 1.06;
  document.getElementById('btnMode').textContent = studio ? 'Studio' : 'Habitat';
}
/* ── school (boids on instanced LOD) ── */
// @@PART js/app.part13.js (13/19) lines 2609-2814 of the original module script -- stripped by build.mjs
class School {
  constructor(genome, count, es) {
    this.max = count; this.count = count; this.es = es; this.lod = buildFish(genome, { quality: 'lod', instanced: count }); const ph = new Float32Array(count); for (let i = 0; i < count; i++) ph[i] = Math.random();
    this.meshes = this.lod.group.children.filter(m => m.isInstancedMesh);
    for (const mesh of this.meshes) { mesh.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1)); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.group = this.lod.group; this.pos = new Float32Array(count * 3); this.vel = new Float32Array(count * 3); this.dummy = new THREE.Object3D(); this.tmp = new THREE.Vector3(); this.fwd = new THREE.Vector3(1, 0, 0); this.q = new THREE.Quaternion();
    const ni = NICHES[genome.meta.niche]; this.formation = (ni && ni.formation) || 'loose'; const L = genome.body.length; this.L = L; this.speed = L * (this.formation === 'hover' ? 0.2 : this.formation === 'benthic' ? 0.5 : genome.swim.mode === 'thunniform' ? 3.5 : 1.6) * genome.swim.freq / 1.6;
    const R = es * 3; for (let i = 0; i < count; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R; this.pos[i * 3] = Math.cos(a) * r; this.pos[i * 3 + 1] = (Math.random() - 0.5) * R * 0.8 + this.baseY(); this.pos[i * 3 + 2] = Math.sin(a) * r; this.vel[i * 3] = this.speed; this.vel[i * 3 + 1] = 0; this.vel[i * 3 + 2] = (Math.random() - 0.5) * this.speed * 0.3; }
    this.params = { polarized: [1.5, 1.2, 1.0, 2.2], loose: [0.6, 0.5, 1.4, 1.6], benthic: [0.3, 0.4, 1.6, 1.0], column: [0.8, 0.6, 1.2, 1.2], hover: [0.2, 0.3, 1.5, 1] }[this.formation] || [0.6, 0.5, 1.4, 1.6];
    this.center = new THREE.Vector3(0, this.baseY(), 0); this.sepR = L * 1.6; this.nbrR = L * (this.formation === 'polarized' ? 6 : 4);
    this.roll = this.lod.group.rotation.x; this.lod.group.rotation.x = 0;
  }
  baseY() { return this.formation === 'benthic' ? -1.3 * this.es : 0.6 * this.es; }
  setCount(n) { this.count = Math.min(this.max, Math.max(4, n)); for (const mesh of this.meshes) mesh.count = this.count; }
  update(dt, t) {
    this.lod.uniforms.uCycle.value += dt * this.lod.bm.g.swim.freq;
    const n = this.count, P = this.pos, V = this.vel, [align, coh, sep, home] = this.params, sp = this.speed, sepR2 = this.sepR * this.sepR, nbrR2 = this.nbrR * this.nbrR, R = this.es * 3.2;
    if (this.formation === 'column') this.center.y = this.baseY() + Math.sin(t * 0.15) * this.es * 2;
    for (let i = 0; i < n; i++) { const ix = i * 3; let ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, sx = 0, sy = 0, sz = 0, cnt = 0;
      for (let j = 0; j < n; j++) { if (j === i) continue; const jx = j * 3, dx = P[jx] - P[ix], dy = P[jx + 1] - P[ix + 1], dz = P[jx + 2] - P[ix + 2], d2 = dx * dx + dy * dy + dz * dz; if (d2 > nbrR2) continue; cnt++; ax += V[jx]; ay += V[jx + 1]; az += V[jx + 2]; cx += dx; cy += dy; cz += dz; if (d2 < sepR2 && d2 > 1e-9) { const w = 1 / d2; sx -= dx * w; sy -= dy * w; sz -= dz * w; } }
      let fx = 0, fy = 0, fz = 0; if (cnt) { fx += (ax / cnt - V[ix]) * align + cx / cnt * coh; fy += (ay / cnt - V[ix + 1]) * align + cy / cnt * coh; fz += (az / cnt - V[ix + 2]) * align + cz / cnt * coh; }
      fx += sx * sep * this.L * this.L; fy += sy * sep * this.L * this.L; fz += sz * sep * this.L * this.L;
      const hx = this.center.x - P[ix], hy = this.center.y - P[ix + 1], hz = this.center.z - P[ix + 2], hd = Math.sqrt(hx * hx + hy * hy + hz * hz); if (hd > R) { const k = home * (hd - R) / R; fx += hx / hd * k * sp; fy += hy / hd * k * sp; fz += hz / hd * k * sp; }
      const d0 = Math.max(1e-6, Math.sqrt(P[ix] * P[ix] + P[ix + 1] * P[ix + 1] + P[ix + 2] * P[ix + 2])); if (d0 < this.es * 1.2) { const k = (this.es * 1.2 - d0) / this.es * sp * 3; fx += P[ix] / d0 * k; fy += P[ix + 1] / d0 * k; fz += P[ix + 2] / d0 * k; }
      if (this.formation === 'benthic') fy += (this.baseY() - P[ix + 1]) * 2 * sp; if (this.formation === 'hover') { fx += (Math.random() - 0.5) * sp * 2; fy += (Math.random() - 0.5) * sp * 2; }
      V[ix] += fx * dt; V[ix + 1] += fy * dt * 0.6; V[ix + 2] += fz * dt; const vl = Math.hypot(V[ix], V[ix + 1], V[ix + 2]) || 1e-6; const tgt = clamp(vl, sp * 0.5, sp * 1.4); V[ix] *= tgt / vl; V[ix + 1] *= tgt / vl; V[ix + 2] *= tgt / vl; }
    const roll = this.roll; for (let i = 0; i < n; i++) { const ix = i * 3; P[ix] += V[ix] * dt; P[ix + 1] += V[ix + 1] * dt; P[ix + 2] += V[ix + 2] * dt;
      this.dummy.position.set(P[ix], P[ix + 1], P[ix + 2]); this.tmp.set(V[ix], V[ix + 1], V[ix + 2]).normalize(); this.q.setFromUnitVectors(this.fwd, this.tmp); this.dummy.quaternion.copy(this.q); if (roll) this.dummy.rotateX(roll); this.dummy.updateMatrix(); for (const mesh of this.meshes) mesh.setMatrixAt(i, this.dummy.matrix); }
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() { scene.remove(this.group); this.lod.dispose(); }
}
/* ── fish lifecycle ── */
function setFish(genome, opts = {}) {
  const prevL = App.genome ? App.genome.body.length : null;
  const cycle = App.fish ? App.fish.uniforms.uCycle.value : 0;
  const fish = buildFish(genome, { quality: App.tier >= 2 ? 'med' : 'hero' });
  if (App.fish) { scene.remove(App.fish.group); App.fish.dispose(); App.fish = null; } clearHelpers();
  if (genome.meta.godMode === undefined) genome.meta.godMode = GOD.enabled; else GOD.enabled = genome.meta.godMode;
  App.genome = genome; if (!opts.noHistory) { App.history.push(deepClone(genome)); if (App.history.length > 32) App.history.shift(); }
  if (opts.keepCamera) fish.uniforms.uCycle.value = cycle;
  syncSelects(genome);
  App.fish = fish; scene.add(fish.group);
  const hab = HABITATS[genome.meta.habitat] || HABITATS.coralReef;
  if (!App.env || App.env.hab.id !== hab.id || !prevL || Math.abs(Math.log(genome.body.length / prevL)) > 0.5) buildEnvironment(hab, genome.body.length);
  if (App.school) { App.school.dispose(); App.school = null; } if (App.schoolOn) startSchool();
  App.inflateTarget = 0; fish.uniforms.uPupil.value = 1 - hab.light; App.state.nextBurst = ENV.uTime.value + 3 + Math.random() * 6;
  if (!opts.keepCamera) frameCamera(fish); updateHUD(); updateDebugHelpers(); if (!opts.skipPanel) refreshPanels(); updateHash();
}
function frameCamera(fish) {
  const box = fish.info.bounds, c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const r = Math.max(1e-3, size.length() * .5), ray = ['ray', 'benthicShark'].includes(fish.bm.a.family) || Math.abs(fish.bm.g.body.roll) > 45;
  const halfFov = camera.fov * Math.PI / 360;
  const visibleHalf = ray ? Math.max(size.z * .55, size.x * .54 / camera.aspect) : Math.max(size.y * .55, size.x * .54 / camera.aspect);
  const dist = visibleHalf / Math.tan(halfFov) * 1.16 + (ray ? size.y : size.z) * .6;
  camera.near = Math.max(.0001, dist * .003); camera.far = dist * 400 + App.es * 200; camera.updateProjectionMatrix();
  controls.minDistance = r * .25; controls.maxDistance = dist * 6;
  const direction = ray ? new THREE.Vector3(.08, .96, .28) : new THREE.Vector3(.13, .1, 1);
  tweenCamera(c.clone().add(direction.normalize().multiplyScalar(dist)), c);
}
function tweenCamera(to, target) {
  if (reducedMotion) { camera.position.copy(to); controls.target.copy(target); controls.update(); return; }
  App.cameraTween = { from: camera.position.clone(), to, startTarget: controls.target.clone(), target, start: performance.now(), duration: 550 };
  controls.enableDamping = false;
}
function setCameraView(view) {
  if (!App.fish) return;
  const center = App.fish.info.bounds.getCenter(new THREE.Vector3()), size = App.fish.info.bounds.getSize(new THREE.Vector3()), r = Math.max(size.length() * .5, .001), distance = r / Math.sin(camera.fov * Math.PI / 360) * 1.12;
  const bm = App.fish.bm, L = bm.L, lm3 = {}; for (const l of App.fish.info.landmarks3D) lm3[l.name] = l;
  /* law close-ups: framed on the anatomical landmark the law governs (mouth / eye / tail / underside / fin) */
  const headLen = L * (App.genome.head.lengthFrac || .27), V3 = (x, y, z) => new THREE.Vector3(x, y, z), mid = (a, b, w) => a && b ? V3(a.x + (b.x - a.x) * w, a.y + (b.y - a.y) * w, a.z + (b.z - a.z) * w) : a || b;
  const close = { mouth: [mid(lm3.snout, lm3.mouthCorner, .55), V3(1, .1, .75), headLen * 1.25, true], mouthbelow: [mid(lm3.snout, lm3.mouthCorner, .55), V3(.35, -1, .25), headLen * 1.25, true], eye: [lm3.eye, V3(.35, .25, 1), headLen * .9, true], tail: [lm3.caudalBase, V3(-.3, .1, 1), L * .45], fin: [lm3.pectoralBase, V3(.2, -.2, 1), L * .35], below: [null, V3(.03, -1, .02), 1.12] };
  if (close[view]) { const [lmk, d, k] = close[view], tgt = lmk ? new THREE.Vector3(lmk.x, lmk.y, lmk.z) : center; tweenCamera(tgt.clone().addScaledVector(d.normalize(), lmk ? k : distance * k), tgt); return; }
  const dir = view === 'top' ? new THREE.Vector3(.04, 1, .001) : view === 'head' ? new THREE.Vector3(1, .06, .01) : new THREE.Vector3(.02, .05, 1);
  tweenCamera(center.clone().addScaledVector(dir.normalize(), distance), center);
}
function undoFish() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  if (Object.values(GOD.axes).some(v => v !== 0) && GOD.baseline) { GOD.axes = {}; setFish(deepClone(GOD.baseline), { noHistory: true, keepCamera: true }); return; }
  if (App.history.length < 2) { toast('No earlier fish in this session.'); return; }
  App.history.pop(); setFish(deepClone(App.history[App.history.length - 1]), { noHistory: true, keepCamera: true }); toast('Previous genome restored.');
}
function startSchool() { if (!App.genome) return; if (App.school) App.school.dispose(); App.school = new School(App.genome, TIERS[App.tier].school, App.es); scene.add(App.school.group); App.schoolOn = true; document.getElementById('btnSchool').classList.add('active'); }
function stopSchool() { if (App.school) { App.school.dispose(); App.school = null; } App.schoolOn = false; document.getElementById('btnSchool').classList.remove('active'); }
function rebuildAll() { if (App.genome) { const g = App.genome; if (App.env) { scene.remove(App.env.group); disposeObject(App.env.group); App.env = null; } setFish(g, { noHistory: true, keepCamera: true }); } }
function clearHelpers() { for (const h of App.helpers) { scene.remove(h); disposeObject(h); } App.helpers = []; }
function updateDebugHelpers() {
  clearHelpers(); const f = App.fish; if (!f) return; const d = App.debug;
  for (const k of ['body', 'jaw', 'fin', 'simple', 'tooth']) f.materials[k].wireframe = d.wire;
  if (d.skeleton) { const pts = []; for (let i = 0; i < f.info.spine.length - 1; i += 4) { const a = f.info.spine[i], b = f.info.spine[Math.min(i + 4, f.info.spine.length - 1)]; pts.push(a.x, a.y, 0, b.x, b.y, 0); } for (const r of f.info.rays) pts.push(...r);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const ls = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2dd4bf, depthTest: false, transparent: true, opacity: 0.9 })); ls.rotation.x = f.group.rotation.x; ls.renderOrder = 10; scene.add(ls); App.helpers.push(ls); }
  if (d.landmarks) { const pts = [], cols = []; for (const l of f.info.landmarks3D) { pts.push(l.x, l.y, l.z); const c = new THREE.Color().setHSL(cyrb128(l.name)[0] % 360 / 360, 0.9, 0.6); cols.push(c.r, c.g, c.b); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 12, sizeAttenuation: false, vertexColors: true, depthTest: false })); p.rotation.x = f.group.rotation.x; p.renderOrder = 11; scene.add(p); App.helpers.push(p); }
}
/* ── animation loop ── */
let lastT = performance.now(), frames = 0, fpsAcc = 0, hudTimer = 0;
function animate(now) {
  requestAnimationFrame(animate);
  try {
    const rawDt = Math.max(.0001, (now - lastT) / 1000); lastT = now;
    if (App.contextLost || App.shaderFailed) return;
    const dt = App.paused ? 0 : Math.min(.05, rawDt) * (reducedMotion ? .35 : 1); App.clock += dt; const t = App.clock; ENV.uTime.value = t;
    const fps = 1 / rawDt; if (!App.testing) adaptQuality(Math.min(.1, rawDt), fps); frames++; fpsAcc += fps; hudTimer += rawDt; if (hudTimer > .5) { updateStats(fpsAcc / frames); frames = 0; fpsAcc = 0; hudTimer = 0; }
    const f = App.fish; if (f) {
      const u = f.uniforms, g = App.genome, s = App.state, L = g.body.length;
      const restPose = App.debug.skeleton || App.debug.landmarks || window.__fgRest; u.uAmp.value = restPose ? 0 : g.swim.amp;
      if (!reducedMotion && t > s.nextBurst) { s.burst = 1; s.nextBurst = t + 5 + Math.random() * 9; } s.burst = Math.max(0, s.burst - dt / 1.3); const b = s.burst * s.burst; u.uBurst.value = b; u.uFreq.value = g.swim.freq * (1 + 1.1 * b);
      u.uCycle.value += dt * u.uFreq.value;
      const br = clamp(0.55 / Math.pow(L, 0.35), 0.25, 1.6), breath = 0.5 + 0.5 * Math.sin(t * br * TAU); u.uBreath.value = breath * (reducedMotion ? 0.3 : 1);
      const predator = (g.meta.tags || []).includes('predator'), shark = f.bm.a.solid && f.bm.a.gills === 'lateral';
      const feed = Math.pow(Math.max(0, Math.sin(t * br * TAU * .5 - 1.2)), 8);   /* a brief bite per cycle: between bites the jaw sits at exactly 0 (lips meet along the seam) */
      let open = clamp(feed * (shark ? .18 : .35 + .5 * g.mouth.open) * (predator ? 1.3 : .8) + b * (predator ? .45 : .1), 0, 1);
      if (window.__fgJaw != null) open = clamp(window.__fgJaw, 0, 1);              /* hold the jaw (close-up presets / tests) */
      MOUTH.poseMouth(f, open, window.__fgJaw != null);
      if (t > s.saccT) { s.saccT = t + 0.7 + Math.random() * 2.5; s.saccTarget.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3); } u.uSacc.value.lerp(s.saccTarget, 1 - Math.exp(-dt * 16));
      u.uInflate.value = lerp(u.uInflate.value, App.inflateTarget, 1 - Math.exp(-dt * 3));
      { /* side-fin controller: swim mode + size + speed (burst) + turn + braking → clamped joint angles; fins still at complete rest */
        const plan = f.bm.law.pec, st = f.pecState || (f.pecState = Object.assign(PEC.newPecState(), { prev: 0, brake: 0 })), D = Math.PI / 180;
        const spd = restPose || App.paused ? 0 : clamp(.4 + .6 * b, 0, 1), dsp = dt > 0 ? (spd - st.prev) / dt : 0; st.prev = spd;
        st.brake = lerp(st.brake, dt > 0 && dsp < -.55 ? 1 : 0, 1 - Math.exp(-dt * 8));
        const xt = Math.sin(t * .41) * Math.sin(t * .17 + 1.3) * 1.8, turn = clamp(Math.sign(xt) * Math.max(0, Math.abs(xt) - .55) / .45, -1, 1) * (restPose ? 0 : 1);
        let P;
        if (window.__fgFin) { const q = PEC.pecStep(PEC.newPecState(), plan, 1e-4, { speed: .9, turn: 0, brake: 0 }); P = window.__fgFin === 'rest' ? PEC.pecStep(PEC.newPecState(), plan, 1e-4, { speed: 0, still: true, hold: true }) : q; P.phase = window.__fgFin === 'power' ? Math.PI / 2 : window.__fgFin === 'recovery' ? 1.5 * Math.PI : 0; }
        else { P = PEC.pecStep(st, plan, dt, { speed: spd, turn, brake: st.brake, still: restPose || App.paused, hold: restPose }); P.phase = st.phase; }
        const w4 = (v, o) => o.set(v.sM * D, v.sA * D, v.aM * D, v.aA * D);
        w4(P.R, u.uPecA.value); w4(P.L, u.uPecB.value); u.uPecP.value.x = u.uPecP.value.y = P.phase;
        f.pecFrame = { P, spd, turn, brake: st.brake };
        if (u.uPecDisc.value > .5) { const dw = PEC.discWave(0, spd, .5), wd = f.info.bounds.getSize(new THREE.Vector3()).z; u.uDiscK.value = dw.k; u.uDiscAmp.value = restPose ? 0 : dw.ampOverWidth * wd * .98; }
      }
      if (restPose) { u.uBreath.value = 0; if (window.__fgJaw == null) { u.uJawAngle.value = 0; u.uJawProtrude.value = 0; } u.uInflate.value = 0; u.uFlap.value = 0; } else u.uFlap.value = FLAP[g.swim.mode] || .2;
      f.group.position.y = reducedMotion || restPose ? 0 : Math.sin(t * .6) * L * .015; f.group.rotation.y = reducedMotion || restPose ? 0 : Math.sin(u.uCycle.value * TAU) * .012 * (1 + b);
    }
    if (App.school && App.schoolOn && dt > 0) App.school.update(dt, t);
