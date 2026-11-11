    body.querySelector('#expShare').onclick = async () => { updateHash(); const url = location.href; try { await navigator.clipboard.writeText(url); toast('Share link copied'); } catch (e) { prompt('Copy this link', url); } };
    body.querySelector('#expGlb').onclick = () => exportGLB(name);
    body.querySelector('#impJson').onchange = ev => { const file = ev.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { try { const { genome, issues } = validateGenome(JSON.parse(rd.result)); genome.meta.repairs = issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i })); genome.meta.edited = true; finalize(genome); syncSelects(genome); setFish(genome); toast(`Imported (${issues.length} schema fixes, ${genome.meta.repairs.length} total repairs)`); } catch (e) { toast('Import failed: ' + e.message); } }; rd.readAsText(file); };
  },
  debug(body) {
    const g = App.genome, f = App.fish; if (!g || !f) { body.textContent = 'No fish.'; return; } const d = App.debug;
    const m = g.meta.metrics || metrics(g); const fa = m.finAreaFractions; const viol = violations(g);
    body.innerHTML = `<div class="row"><label><input type="checkbox" id="dbgWire"${d.wire ? ' checked' : ''}> wireframe</label><label><input type="checkbox" id="dbgSkel"${d.skeleton ? ' checked' : ''}> skeleton / fin rays</label><label><input type="checkbox" id="dbgLm"${d.landmarks ? ' checked' : ''}> landmarks</label></div>
      <div class="grp">Metrics</div><table><tr><td>Fineness ratio</td><td>${m.fineness}</td></tr><tr><td>Caudal aspect ratio (genome / measured)</td><td>${m.caudalAR} / ${f.info.caudalAR}</td></tr><tr><td>Relative gape (gape / L)</td><td>${m.relGape} (${m.gapeOfHead} of head depth)</td></tr><tr><td>Fin area ÷ lateral body area</td><td>dorsal ${fa.dorsal} · anal ${fa.anal} · pectoral ${fa.pectoral} · pelvic ${fa.pelvic} · caudal ${fa.caudal}</td></tr><tr><td>Triangles</td><td>${f.info.tris.toLocaleString()} (budget 40,000)</td></tr><tr><td>Size class</td><td>${g.meta.sizeClass} · ${g.body.length.toFixed(3)} m</td></tr><tr><td>Tags</td><td>${esc((g.meta.tags || []).join(', '))}</td></tr></table>
      <div class="grp">Landmarks (u)</div><table>${Object.entries(g.meta.landmarks || landmarks(g)).map(([k, v]) => `<tr><td>${k}</td><td>${(+v).toFixed(3)}</td></tr>`).join('')}</table>
      <div class="grp">Rule repairs applied (${g.meta.repairs.length}) · outstanding violations: <span class="${viol.length ? 'bad' : 'ok'}">${viol.length}</span></div><table><tr><th>rule</th><th>path</th><th>from</th><th>to</th></tr>${g.meta.repairs.slice(0, 120).map(r => `<tr><td>${esc(r.rule)}</td><td>${esc(r.path)}</td><td>${esc(JSON.stringify(r.from))}</td><td>${esc(JSON.stringify(r.to))}</td></tr>`).join('') || '<tr><td colspan="4">none — sampled genome satisfied every rule</td></tr>'}</table>
      <div class="grp">Rules table (${RULES.length})</div><table>${RULES.map(r => `<tr><td><code>${r.id}</code></td><td>${esc(r.desc)}</td></tr>`).join('')}</table>`;
    body.querySelector('#dbgWire').onchange = e => { d.wire = e.target.checked; updateDebugHelpers(); }; body.querySelector('#dbgSkel').onchange = e => { d.skeleton = e.target.checked; updateDebugHelpers(); }; body.querySelector('#dbgLm').onchange = e => { d.landmarks = e.target.checked; updateDebugHelpers(); };
  },
  tests(body) {
    body.innerHTML = `<p class="god-copy">Quick checks cover goldfish in the hadal habitat, visible bounded mutation steps, replay/import, missing fin curves and removal of cone horns. Full tests also cover every reference species and 200 genomes per habitat.</p><div class="row"><button id="focusedTests" class="primary">Quick Regression Check</button></div><div class="row"><label><input type="checkbox" id="testExhaustive"> Exhaustive geometry (slower)</label></div><div class="row"><button id="runTests">Full Anatomy Tests</button><button id="cancelTests" class="sm">Cancel</button><span id="testProg" class="mut"></span></div><div id="testOut"></div>`;
    body.querySelector('#focusedTests').onclick = e => {
      if (TEST_STATE.running) return; e.target.disabled = true;
      const output = body.querySelector('#testOut');
      setTimeout(() => { try { const rows = runFocusedTests(); output.innerHTML = `<table><tr><th>Check</th><th>Result</th></tr>${rows.map(row => `<tr><td>${esc(row.name)}</td><td class="${row.pass ? 'ok' : 'bad'}">${row.pass ? 'PASS' : esc(row.error)}</td></tr>`).join('')}</table>`; } finally { e.target.disabled = false; } }, 0);
    };
    body.querySelector('#runTests').onclick = async e => { e.target.disabled = true; try { await runSelfTest(body.querySelector('#testOut'), body.querySelector('#testProg'), body.querySelector('#testExhaustive').checked); } finally { e.target.disabled = false; } };
    body.querySelector('#cancelTests').onclick = () => { TEST_STATE.cancel = true; };
  },
  help(body) {
    body.innerHTML = `<h2 class="god-title">Form follows function.</h2><p class="god-copy">The engine inherits a body plan, samples correlated traits, repairs anatomy, then builds the fish. Bills and ray discs share the body loft. Detached cone horns are removed; brow and forehead contours stay part of the skin.</p>
      <div class="grp">Species and habitats</div><p class="god-copy">Species and habitat selections can be combined. Incompatible combinations such as goldfish in a hadal trench create a labelled speculative concept, not a real population or a claim of survival. Anatomy is validated; pressure tolerance, respiration and fluid dynamics are not simulated.</p>
      <div class="grp">Stepwise evolution</div><p class="god-copy">Use the mutation selector to target body depth, fin silhouette, fin growth, tail propulsion, or the head. Each click changes a functional unit by a bounded step, measures its post-repair proportions, and advances the counter. Adjacent fin shapes can change every third step. Limits stay anchored to the founding genome, so repeated clicks cannot grow the envelope indefinitely. Mutation strength is in God Mode; Undo restores the previous genome. Genome shows the exact trait changes. Skin-pattern seeds stay stable across the lineage.</p>
      <div class="grp">Add data in index.html</div><table><tr><td>Clade</td><td>Add a K entry with its parent and changed traits. Add an ANATOMY delta only for a different construction foundation, and ECOLOGY_LIMITS for salinity/depth restrictions.</td></tr><tr><td>Niche</td><td>Add an NI entry: weighted compatible clades, function-to-form references and ranges. Add a linked ADAPTATIONS module if it introduces a new selective pressure.</td></tr><tr><td>Habitat</td><td>Add an H entry: weighted niches, natural palette, light, water, fog and procedural props. Fantasy habitats must be flagged.</td></tr><tr><td>Species</td><td>Add one SP entry with common/scientific names, clade, niche, native habitat and approximate trait ranges. It automatically appears in the gallery and pickers.</td></tr></table>
      <div class="grp">Verification</div><p class="god-copy">Tests checks 200 seeded genomes and mutations per habitat, all reference-species geometries, deterministic generation, crossover, bilateral symmetry, loft-projected attachment tolerance and triangle budgets. Enable exhaustive geometry to build both detail levels for every generated fish. Results are computed on your device, never pre-filled.</p>
      <div class="grp">Known limitations</div><p class="god-copy">These are procedural approximations, not scan-derived, photographically verified fish. Eye rims conform to the skin; fin rays and micro-scales are procedural shading, not individual skeletal or scale meshes. Surface joins are not fully watertight and some complex clades remain stylized. GLB preserves geometry and approximate vertex pigmentation, not the custom shaders. Photographic indistinguishability is not guaranteed; visual quality and frame rate depend on the device.</p>
      <div class="grp">Anatomical reference</div><p class="god-copy"><a href="https://www.pc.maricopa.edu/Biology/ppepe/BIO145/lab04_1.html" target="_blank" rel="noopener noreferrer" style="color:var(--acc)">External shark anatomy, Phoenix College</a>: fin hierarchy, gill positions, ventral nares and heterocercal tails. Species ratios in the app are approximate authored envelopes.</p>`;
  }
};
const fmt = v => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3);
let editTimer = 0; function applyEdit(path, value) { const g = App.genome; if (!g) return; setP(g, path, value); g.meta.godMode = GOD.enabled; g.meta.parentSpecies = g.meta.species || g.meta.parentSpecies; g.meta.species = null; g.meta.edited = true; clearTimeout(editTimer); editTimer = setTimeout(() => { try { g.meta.repairs = []; finalize(g); setFish(g, { noHistory: true, keepCamera: true }); } catch (e) { showError(e); } }, 140); }
function syncInspector() { const g = App.genome; for (const [p, { input, val, e }] of inspectorState.inputs) { const v = getP(g, p); if (document.activeElement === input) continue; if (e.t === 'n' || e.t === 'i') { input.value = v; if (val) val.textContent = fmt(v); } else if (e.t === 's') input.value = v; else if (e.t === 'b') input.checked = !!v; else input.value = hslToHex(v[0], v[1], v[2]); } }
/* ── thumbnails (gallery) ── */
const thumbQueue = []; let thumbBusy = false, thumbR = null, thumbScene = null, thumbCam = null;
function requestThumb(id, img) { thumbQueue.push({ id, img }); pumpThumbs(); }
// @@PART js/app.part15.js (15/19) lines 2938-3227 of the original module script -- stripped by build.mjs
async function pumpThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  try { if (!thumbR) { const cv = document.createElement('canvas'); cv.width = 260; cv.height = 182; thumbR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.ACESFilmicToneMapping; thumbScene = new THREE.Scene(); thumbCam = new THREE.PerspectiveCamera(32, 260 / 182, 0.01, 100); }
    while (thumbQueue.length) { const { id, img } = thumbQueue.shift(); if (!img.isConnected) continue; let fish = null;
      try { const g = generate({ species: id, seed: 'gallery' }); fish = buildFish(g, { quality: 'med' }); MOUTH.poseMouth(fish, 0); thumbScene.add(fish.group); const saved = { fog: ENV.uFogDensity.value, ld: ENV.uLightDir.value.clone(), lc: ENV.uLightCol.value.clone(), sk: ENV.uSkyCol.value.clone(), gr: ENV.uGroundCol.value.clone() };
        ENV.uFogDensity.value = 0; ENV.uLightDir.value.set(0.45, 0.8, 0.6).normalize(); ENV.uLightCol.value.setRGB(1.05, 1.03, 1); ENV.uSkyCol.value.setRGB(0.62, 0.66, 0.72); ENV.uGroundCol.value.setRGB(0.22, 0.21, 0.22);
        const box = fish.info.bounds, c2 = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() * 0.5;
        const ray = ['ray', 'benthicShark'].includes(fish.bm.a.family), dist = r / Math.sin(thumbCam.fov * Math.PI / 360) * (ray ? 1.35 : 1.02);
        thumbCam.position.copy(c2).add((ray ? new THREE.Vector3(.1, .95, .27) : new THREE.Vector3(.3, .2, 1)).normalize().multiplyScalar(dist)); thumbCam.near = dist * 0.01; thumbCam.far = dist * 10; thumbCam.lookAt(c2); thumbCam.updateProjectionMatrix();
        thumbR.setClearColor(0x0b1a26, 1); thumbR.render(thumbScene, thumbCam); img.src = thumbR.domElement.toDataURL('image/jpeg', 0.85);
        ENV.uFogDensity.value = saved.fog; ENV.uLightDir.value.copy(saved.ld); ENV.uLightCol.value.copy(saved.lc); ENV.uSkyCol.value.copy(saved.sk); ENV.uGroundCol.value.copy(saved.gr); }
      catch (e) { console.warn('thumb failed', id, e); }
      finally { if (fish) { thumbScene.remove(fish.group); fish.dispose(); } }
      await new Promise(r => setTimeout(r, 0)); } }
  finally { thumbBusy = false; }
}
/* ── GLB export (bakes standard materials) ── */
function pigmentAt(g, u, ang, out) {
  const s = g.skin, raw = g.body.roll ? Math.sin(ang * TAU) : -Math.cos(ang * TAU);
  const vert = anatomyProfile(g).family === 'ray' ? clamp(raw * 5, -1, 1) : raw;
  out.copy(hslCol(s.base)).lerp(hslCol(s.belly), s.countershade * (1 - sstep(-.38, .48, vert)));
  const fract = x => x - Math.floor(x), freq = s.patternScale, seed = cyrb128(g.meta.surfaceSeed || g.meta.seed)[0] % 1000;
  let mask = 0;
  if (s.pattern === 'bars') mask = sstep(.27, .38, Math.abs(fract(u * g.body.fineness * 1.1 * freq) - .5));
  else if (s.pattern === 'stripes') mask = sstep(.3, .4, Math.abs(fract(vert * 1.6 * freq) - .5));
  else if (s.pattern === 'spots') { const x = u * g.body.fineness * 3.5 * freq, y = vert * 3.2 * freq, h = fract(Math.sin(Math.floor(x) * 127.1 + Math.floor(y) * 311.7 + seed) * 43758.5453); mask = (1 - sstep(.13, .24, Math.hypot(fract(x) - .5, fract(y) - .5))) * (h > .2 ? 1 : 0); }
  else if (['mottle', 'disruptive', 'reticulate', 'saddles'].includes(s.pattern)) mask = sstep(.22, .7, .5 + .5 * Math.sin(u * 36 * freq + Math.sin(vert * 17 + seed) * 3));
  else if (s.pattern === 'eyespot') mask = 1 - sstep(.7, .9, Math.hypot((u - .74) * g.body.fineness, vert - .25) / (.35 * freq));
  out.lerp(hslCol(s.accent), mask * s.patternStrength);
  if (s.band > 0) out.lerp(hslCol(s.bandColor), (1 - sstep(.07, .2, Math.abs(vert - .02))) * sstep(.1, .3, u) * s.band);
  return out;
}
function exportGLB(name) {
  const f = App.fish; if (!f) return;
  const group = new THREE.Group(), geometries = [], materials = [], color = new THREE.Color(); group.rotation.x = f.group.rotation.x;
  const cleanup = () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); };
  try {
    f.group.traverse(o => {
      if (!o.isMesh) return;
      const source = o.geometry, geo = new THREE.BufferGeometry(), pos = source.getAttribute('position');
      geo.setAttribute('position', pos.clone()); if (source.getAttribute('normal')) geo.setAttribute('normal', source.getAttribute('normal').clone()); if (source.index) geo.setIndex(source.index.clone());
      const body = source.getAttribute('aBody'), fin = source.getAttribute('aFin'), skin = source.getAttribute('aSkin'), eye = f.materials._eyes.includes(o.material), glow = o.material === f.materials.glow, tooth = o.material === f.materials.tooth;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        if (tooth) color.setRGB(.82, .78, .68);
        else if (glow) color.copy(f.uniforms.uGlow.value);
        else if (eye) { const ae = source.getAttribute('aEye'), k = ae ? ae.getZ(i) : 0; color.copy(k === 2 ? new THREE.Color(.008, .008, .009) : k === 1 ? o.material.uniforms.uEyeCol.value : k === 0 ? new THREE.Color(.62, .6, .55) : new THREE.Color(.3, .3, .3)); }
        else if (body) { pigmentAt(App.genome, body.getX(i), body.getY(i), color); if (body.getZ(i) > .5 && body.getZ(i) < 2 || body.getZ(i) > 5.4 && body.getZ(i) < 6.6) color.setRGB(.019, .007, .009); }
        else if (skin) { pigmentAt(App.genome, skin.getX(i), skin.getY(i), color); if (skin.getZ(i) < .5) color.lerp(f.uniforms.uFinCol.value, sstep(.06, .42, fin.getY(i))); }
        else color.copy(f.uniforms.uBase.value);
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometries.push(geo);
      const transparent = !!skin && !f.bm.a.solid;
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: eye ? .12 : .42, metalness: 0, transparent, opacity: transparent ? .78 : 1, side: THREE.DoubleSide, emissive: glow ? f.uniforms.uGlow.value.clone() : new THREE.Color(0) }); materials.push(material);
      if (o.isInstancedMesh) { const matrix = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, matrix); const mesh = new THREE.Mesh(geo, material); mesh.applyMatrix4(matrix); group.add(mesh); } }
      else group.add(new THREE.Mesh(geo, material));
    });
    group.userData = { genome: stripGenome(App.genome), pose: 'neutral', pigmentBake: 'approximate vertex colors' };
    new GLTFExporter().parse(group, result => { download(new Blob([result], { type: 'model/gltf-binary' }), name + '.glb'); cleanup(); toast('GLB exported with anatomy and baked pigmentation.'); }, error => { cleanup(); toast('GLB export failed: ' + (error.message || error)); }, { binary: true });
  } catch (error) { cleanup(); showError(error); }
}
/* ── self test ── */
const TEST_STATE = { running: false, cancel: false, last: null };
function runFocusedTests() {
  const rows = [], assert = (condition, message) => { if (!condition) throw new Error(message); };
  const test = (name, fn) => { try { fn(); rows.push({ name, pass: true }); } catch (error) { rows.push({ name, pass: false, error: error.message }); } };
  test('Goldfish + hadal habitat creates a labelled speculative form', () => {
    const g = generate({ species: 'goldfish', habitat: 'hadal', seed: 'goldfish-hadal-regression' });
    assert(g.meta.habitat === 'hadal' && g.meta.species === 'goldfish', 'Species or habitat was discarded');
    assert(g.meta.speculative && g.meta.adapted.speculative, 'Impossible habitat was presented as a real population');
    assert(violations(g).length === 0, 'Unrepaired anatomical constraints');
  });
  test('Goldfish creates in every habitat without selection errors', () => {
    for (const habitat in HABITATS) { const g = generate({ species: 'goldfish', habitat, seed: 'all-habitats-regression' }); assert(g.meta.habitat === habitat && violations(g).length === 0, habitat + ' was not preserved or failed constraints'); }
  });
  test('Eight body/fin mutation steps make visible, bounded changes', () => {
    let g = generate({ species: 'goldfish', seed: 'step-regression' });
    const targets = ['agility', 'display', 'finShape', 'tail', 'speed', 'feeding', 'agility', 'finShape'];
    for (let i = 0; i < targets.length; i++) {
      const before = deepClone(g); g = mutate(g, .55, 'step-regression-' + i, targets[i]);
      assert(g.meta.evolution.step === i + 1, 'Step counter did not advance');
      assert(morphologyDifference(before, g) >= .025, 'Mutation is effectively a no-op');
      assert(violations(g).length === 0, 'Mutation failed anatomical rules');
      for (const p in g.meta.evolution.origin) {
        const lim = mutationBounds(g, p, g.meta.evolution), value = getP(g, p);
        assert(value >= lim.min - 1e-6 && value <= lim.max + 1e-6, p + ' escaped the founding envelope');
      }
    }
  });
  test('Mutation is repeatable and preserves the skin pattern seed', () => {
    const source = generate({ species: 'rainbow-trout', seed: 'deterministic-mutation' });
    const a = mutate(source, .55, 'shared-mutation-seed', 'finShape'), b = mutate(source, .55, 'shared-mutation-seed', 'finShape');
    assert(JSON.stringify(stripGenome(a)) === JSON.stringify(stripGenome(b)), 'Seeded mutation differs on replay');
    assert(a.meta.surfaceSeed === source.meta.surfaceSeed && source.meta.species === 'rainbow-trout', 'Source genome or pattern seed was altered');
  });
  test('JSON import preserves evolution anchors and adaptation labels', () => {
    const source = generate({ species: 'goldfish', habitat: 'hadal', seed: 'import-regression' });
    const evolved = mutate(source, .55, 'import-step', 'finShape');
    const imported = validateGenome(JSON.parse(JSON.stringify(stripGenome(evolved)))).genome; finalize(imported);
    assert(imported.meta.evolution.step === 1 && imported.meta.speculative, 'Evolution or speculative label was dropped');
    assert(JSON.stringify(imported.meta.evolution.origin) === JSON.stringify(evolved.meta.evolution.origin), 'Evolution envelope changed on import');
  });
  test('No cone horns; every pectoral shape curve is defined', () => {
    const g = generate({ clade: 'scorpaenid', habitat: 'coralReef', noSpecies: true, seed: 'ornament-regression' });
    assert(g.head.special !== 'horns', 'Cone head ornament remains enabled');
    for (const shape of SCHEMA['fins.pectoral.shape'].opts) assert(typeof PECT_SHAPE[shape] === 'function' && isNum(PECT_SHAPE[shape](.5)), 'Missing ' + shape + ' fin profile');
  });
  for (const species of ['goldfish', 'pacific-sardine', 'red-lionfish', 'milkfish', 'blue-marlin']) test(species + ' builds valid hero and school geometry', () => {
    const g = generate({ species, seed: 'focused-geometry' });
    for (const quality of ['hero', 'lod']) {
      const fish = buildFish(g, { quality });
      try { const result = checkFishGeometry(fish); assert(result.errors.length === 0, quality + ': ' + result.errors.join('; ')); }
      finally { fish.dispose(); }
    }
  });
  runHybridTests(test, assert);
  TEST_STATE.focused = rows; return rows;
}
FG.runFocusedTests = runFocusedTests;
function checkFishGeometry(fish) {
  const g = fish.bm.g, L = fish.bm.L, errors = [], q = QUALITY[fish.info.quality], tol = Math.max(L * 1e-6, 1e-9);
  for (const geo of fish.geos) for (const name of ['position', 'normal']) {
    const attr = geo.getAttribute(name); if (attr && !attr.array.every(Number.isFinite)) errors.push('Non-finite ' + name);
  }
  const pos = fish.parts.body.geometry.getAttribute('position'), fins = fish.parts.fins.geometry.getAttribute('position');
  let asym = 0, maxRootError = 0;
  const RR = fish.bm.loft.R;   /* round 6A: the disc ring is denser than the quality table's R */
  for (let s = 0; s < fish.bm.loft.us.length; s += 3) for (let j = 1; j < RR / 2; j++) {
    const a = s * RR + j, b = s * RR + RR - j;
    if (Math.abs(pos.getX(a) - pos.getX(b)) > tol || Math.abs(pos.getY(a) - pos.getY(b)) > tol || Math.abs(pos.getZ(a) + pos.getZ(b)) > tol) asym++;
  }
  const p = {};
  for (const root of fish.info.attachments) {
    fish.bm.attachedSurface(root.u, root.theta, p);
    maxRootError = Math.max(maxRootError, Math.max(0, Math.hypot(fins.getX(root.index) - p.x, fins.getY(root.index) - p.y, fins.getZ(root.index) - p.z) - (root.allow || 0)));
    if (root.u < 0 || root.u > 1) errors.push('Attachment outside landmark axis');
  }
  if (asym) errors.push('Body lost bilateral symmetry');
  if (maxRootError > tol) errors.push('Fin roots detached from skin');
  if (fish.bm.billStart !== null) {
    const uv = fish.parts.body.geometry.getAttribute('aBody');
    if (uv.getX(0) > -.04 || fish.bm.loft.us[0] >= 0) errors.push('Bill is not part of the continuous body loft');
  }
  if (fish.bm.a.family === 'ray' || fish.bm.a.family === 'benthicShark') {
    let minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) { minZ = Math.min(minZ, pos.getZ(i)); maxZ = Math.max(maxZ, pos.getZ(i)); minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); }
    /* flattened plan: a disc (width ≫ thickness), its margin built by the fin constructor and rooted on the disc edge, no hinged jaw on the full form */
    if (fish.bm.law.flat.flat >= 1 && (maxZ - minZ) / Math.max(L * .01, maxY - minY) < 2.2) errors.push('Flattened plan is not a disc');
    const att = (fish.info.attachments || []).filter(x => x.kind === 'pectoral');
    if (!att.length && !fish.bm.disc) errors.push('Flattened plan margin fin is not rooted on the disc');
    if (fish.parts.jaw && fish.bm.law.flat.flat >= 1) errors.push('Flattened plan has a hinged jaw');
  }
  if (fish.parts.jaw) {
    const tissue = fish.parts.jaw.geometry.getAttribute('aBody');
    for (let i = 0; i < tissue.count; i++) if (tissue.getZ(i) !== 0) { errors.push('Mouth contains a flat cavity shelf'); break; }
  }
  if (g.meta.species === 'goldfish' && (g.body.fineness > 2.05 || g.fins.caudal.type !== 'fantail')) errors.push('Goldfish body or tail is not the reference fantail form');
  if (g.head.special === 'horns') errors.push('Detached cone ornament was not removed');
  /* mouth law audit: the interior cavity is a pocket inside the head (never a tunnel), ≤ 0.35 head length deep; teeth only on the jaw margins */
  { const bm = fish.bm, fr = {}, s = {}; let out = 0, deepest = 0;
    const inBody = (x, y, z, slack) => { const u = clamp((bm.headX - x) / L, .003, .999); bm.frame(u, fr); bm.section(u, s); const ly = (x - fr.px) * fr.nx + (y - fr.py) * fr.ny; return ly > -s.dDn * slack && ly < s.dUp * slack && Math.abs(z) <= bm.halfWidthAtY(s, clamp(ly, -s.dDn * .99, s.dUp * .99)) * slack + 1e-6; };
    for (const m of fish.group.children) { const ab = m.geometry.getAttribute('aBody'); if (!ab || m.material !== fish.materials.jaw || !(ab.getZ(0) >= 1 && ab.getZ(0) < 2) || bm.ventralMouth || bm.oralDisc) continue; const P = m.geometry.getAttribute('position');
      for (let i = 0; i < P.count; i++) { if (!inBody(P.getX(i), P.getY(i), P.getZ(i), 1.02)) out++; deepest = Math.max(deepest, (bm.headX - P.getX(i)) / L); } }
    if (out) errors.push('Mouth cavity breaks out of the head'); if (deepest > Math.max(bm.mcU, bm.hingeU || 0) + LAW.CAVITY_MAX * bm.h + 1e-6) errors.push('Mouth cavity deeper than 0.35 head length');
    if (fish.parts.teeth) { const M = new THREE.Matrix4(), P = new THREE.Vector3(); for (let i = 0; i < fish.parts.teeth.count; i++) { fish.parts.teeth.getMatrixAt(i, M); P.setFromMatrixPosition(M); const u = (bm.headX - P.x) / L; if (u < bm.jawStartU - .01 || u > Math.max(bm.mcU, bm.hingeU || 0) + 1e-6 || !inBody(P.x, P.y, P.z, 1.08)) { errors.push('Teeth outside the jaw margins'); break; } } } }
  if (!fish.bm.oralDisc || true) errors.push(...FG.round2Check(fish.bm));   /* round 2: see-through mouth / teeth rooting / eye protrusion */
  errors.push(...auditAnatomy(fish, THREE));
  const budget = fish.info.quality === 'lod' ? 2500 : 40000;
  if (fish.info.tris > budget) errors.push('Triangle budget exceeded');
  const un = violations(g); if (un.length) errors.push(un.length + ' unrepaired constraints');
  return { errors: [...new Set(errors)], maxRootError, asym, tris: fish.info.tris };
}
async function runSelfTest(out, prog, exhaustive = false) {
  if (TEST_STATE.running) { toast('Tests are already running.'); return; }
  TEST_STATE.running = App.testing = true; TEST_STATE.cancel = false;
  const rows = [], issues = [], beforePause = App.paused; App.paused = true; out.innerHTML = '';
  const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));
  const show = () => {
    out.innerHTML = `<div style="overflow:auto"><table><tr><th>Suite</th><th>Genomes</th><th>Mutations</th><th>Geometry</th><th>Hero / LOD tris</th><th>Result</th></tr>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.n}</td><td>${r.m}</td><td>${r.geo}</td><td>${r.hero.toLocaleString()} / ${r.lod.toLocaleString()}</td><td class="${r.fail ? 'bad' : 'ok'}">${r.fail ? 'FAIL (' + r.fail + ')' : 'PASS'}</td></tr>`).join('')}</table></div>`;
    if (issues.length) { const pre = document.createElement('pre'); pre.style.cssText = 'font-size:10px;white-space:pre-wrap;color:#f4aba3'; pre.textContent = issues.slice(0, 25).join('\n'); out.appendChild(pre); }
  };
  const testGenome = (g, row, build) => {
    row.n++;
    let nan = false; for (const p in SCHEMA) { const v = getP(g, p), e = SCHEMA[p]; if ((e.t === 'n' || e.t === 'i') && !isNum(v) || e.t === 'hsl' && !(Array.isArray(v) && v.every(isNum))) nan = true; }
    const problems = violations(g); if (nan || problems.length) { row.fail++; issues.push(`${row.name}: ${g.meta.clade}, seed ${g.meta.seed}: ${nan ? 'NaN' : problems.map(p => p.rule).join(', ')}`); }
    if (build) for (const quality of ['hero', 'lod']) {
      let fish;
      try { fish = buildFish(g, { quality }); const check = checkFishGeometry(fish); row.geo++; row[quality === 'hero' ? 'hero' : 'lod'] = Math.max(row[quality === 'hero' ? 'hero' : 'lod'], check.tris); if (check.errors.length) { row.fail++; issues.push(`${g.meta.name} / ${quality}: ${check.errors.join(', ')}`); } }
      catch (err) { row.fail++; issues.push(`${g.meta.name}: ${err.message}`); }
      finally { if (fish) fish.dispose(); }
    }
  };
  try {
    for (const hid of Object.keys(HABITATS)) {
      const row = { name: HABITATS[hid].n, n: 0, m: 0, geo: 0, hero: 0, lod: 0, fail: 0 }; rows.push(row);
      try {
        const concept = invent(hid, 'novel-regression-' + hid);
        testGenome(concept, row, true);
        if (!concept.meta.novel || concept.meta.species || concept.meta.habitat !== hid || !cladeAllowed(concept.meta.clade, HABITATS[hid])) {
          row.fail++; issues.push(`${hid}: invented fish failed habitat or novelty constraints`);
        }
      } catch (error) { row.fail++; issues.push(`${hid}: invention failed: ${error.message}`); }
      for (let i = 0; i < 200 && !TEST_STATE.cancel; i++) {
        const g = generate({ habitat: hid, seed: 'anatomy-test-' + i }); testGenome(g, row, exhaustive || i % 25 === 0);
        const evolved = mutate(g, .85, 'mutation-test-' + hid + '-' + i); row.m++;
        if (violations(evolved).length) { row.fail++; issues.push(`${hid}: mutation constraints failed (${g.meta.clade})`); }
        if (i % 20 === 0) { prog.textContent = `${HABITATS[hid].n}: ${i + 1}/200`; show(); await yieldFrame(); }
      }
