    if (App.env && App.env.shafts && App.env.shafts.visible) for (const m of App.env.shafts.children) m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
    if (App.cameraTween) { const v = App.cameraTween, q = clamp((now - v.start) / v.duration, 0, 1), ease = smoother(q); camera.position.lerpVectors(v.from, v.to, ease); controls.target.lerpVectors(v.startTarget, v.target, ease); if (q === 1) { App.cameraTween = null; controls.enableDamping = true; } }
    controls.update(); renderer.render(scene, camera);
  } catch (e) { showError(e); }
}
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 11. UI, PANELS, EXPORT, SELF-TEST, BOOT                          ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const $ = id => document.getElementById(id);
let toastTimer = 0; function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = 0; }, 2600); }
function showError(e) { console.error(e); window.__fgShowError(e && e.stack ? e.stack : String(e)); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const b64enc = s => btoa(unescape(encodeURIComponent(s))), b64dec = s => decodeURIComponent(escape(atob(s)));
function populateSelects() {
  const h = $('selHabitat'); h.innerHTML = Object.values(HABITATS).map(x => `<option value="${x.id}">${esc(x.n)}</option>`).join('');
  const n = $('selNiche'); n.innerHTML = '<option value="">Niche: auto</option>' + Object.values(NICHES).map(x => `<option value="${x.id}">${esc(x.n)}${x.fantasy ? ' ✨' : ''}</option>`).join('');
  const c2 = $('selClade'); const rows = []; const walk = (id, depth) => { rows.push(`<option value="${id}">${'· '.repeat(depth)}${esc(CLADES[id].n)}</option>`); Object.values(CLADES).filter(k => k.p === id).forEach(k => walk(k.id, depth + 1)); }; walk('fish', 0); c2.innerHTML = '<option value="">Clade: auto</option>' + rows.join('');
  const s = $('selSpecies'); const byHab = {}; for (const sp of SPECIES) (byHab[sp.habitat] = byHab[sp.habitat] || []).push(sp); s.innerHTML = '<option value="">Species: none</option>' + Object.keys(byHab).map(hid => `<optgroup label="${esc(HABITATS[hid].n)}">` + byHab[hid].map(sp => `<option value="${sp.id}">${esc(sp.n)}</option>`).join('') + '</optgroup>').join('');
}
function currentOpts() { return { habitat: $('selHabitat').value || undefined, niche: $('selNiche').value || undefined, clade: $('selClade').value || undefined, species: $('selSpecies').value || undefined, seed: $('seed').value.trim() || undefined }; }
function doGenerate(opts) {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  try {
    opts = opts || currentOpts();
    if (!opts.seed) { opts.seed = Math.floor(Math.random() * 1e9).toString(36); $('seed').value = opts.seed; }
    const g = generate(opts); syncSelects(g); setFish(g);
  } catch (e) { if (e instanceof RangeError) toast(e.message); else showError(e); }
}
function syncSelects(g) { $('selHabitat').value = g.meta.habitat; $('seed').value = g.meta.seed; }
/** Top-bar "name → creature": species name (optionally + habitat words) or a free description; species are adapted to the chosen habitat. */
function convertFromName() {
  const text = $('nameInput').value.trim(); if (!text) { toast('Type a species name or describe a creature.'); return; }
  try {
    const sp = findSpecies(text), habitat = findHabitat(text) || $('selHabitat').value || undefined, seed = cyrb128(text + '|' + (habitat || '')).toString(36);
    const g = sp ? generate({ species: sp.id, habitat, seed: 'name:' + seed }) : genomeFromText(text, 'txt:' + seed, habitat);
    syncSelects(g); setFish(g);
    toast(sp ? (g.meta.adapted ? sp.n + ' adapted to ' + HABITATS[g.meta.habitat].n : sp.n + ' in its native habitat') : 'Interpreted as ' + CLADES[g.meta.clade].n.toLowerCase() + ' / ' + NICHES[g.meta.niche].n.toLowerCase());
  } catch (e) { if (e instanceof RangeError) toast(e.message); else showError(e); }
}
/** Invent within one body plan and one habitat; the seed fully determines the result. */
function invent(habId, seed) {
    const hab = HABITATS[habId]; if (!hab) throw new Error('Unknown discovery habitat');
    const rng = new RNG('disc:' + seed);
    const a = generate({ habitat: habId, noSpecies: true, seed: 'disc-a-' + seed });
    /* sister lineage: a nearby leaf clade (tree distance ≤ 3) that is ecologically valid for this habitat */
    const isLeaf = id => !Object.values(CLADES).some(k => k.p === id);
    const plan = anatomyProfile(a);
    const sisters = Object.keys(CLADES).filter(id => {
      if (!isLeaf(id) || id === a.meta.clade || cladeDistance(a.meta.clade, id) > 3 || !cladeAllowed(id, hab)) return false;
      const other = anatomyProfile({ meta: { clade: id } });
      return other.family === plan.family && other.gills === plan.gills && cladeInNiche(id, NICHES[a.meta.niche]);
    });
    const sisterClade = sisters.length && rng.chance(.75) ? rng.pick(sisters) : a.meta.clade;
    const b = generate({ habitat: habId, clade: sisterClade, niche: a.meta.niche, noSpecies: true, seed: 'disc-b-' + seed });
    let child; try { child = breed(a, b, 'disc-x-' + seed); } catch (err) { child = a; }
    child = mutate(child, .25, 'disc-m-' + seed);
    child.meta.habitat = habId; child.meta.niche = a.meta.niche; child.meta.species = null; child.meta.parentSpecies = null;
    child.meta.adapted = null; child.meta.novel = true; child.meta.repairs = [];
    delete child.meta.evolution; delete child.meta.mutation;
    finalize(child);
    return child;
}
FG.invent = invent;
function doDiscover() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  try {
    const habId = $('selHabitat').value || (App.genome ? App.genome.meta.habitat : 'coralReef');
    const child = invent(habId, Math.floor(Math.random() * 1e9).toString(36));
    const cl = CLADES[child.meta.clade];
    $('selSpecies').value = ''; $('selClade').value = ''; $('selNiche').value = ''; $('seed').value = '';
    setFish(child); toast('New concept from the ' + cl.n.toLowerCase() + ' lineage, shaped for ' + HABITATS[habId].n + '.');
  } catch (e) { showError(e); }
}
function doBreed() { if (App.history.length < 2) { toast('Generate a second fish first. Breed crosses the current fish with the previous one.'); return; } const a = App.history[App.history.length - 2], b = App.genome; try { let child = null; for (let i = 0; i < 12 && !child; i++) { try { const c = adaptFinish(hybridize(a, b, .5, a.meta.seed + 'x' + b.meta.seed + ':' + Math.floor(Math.random() * 1e6).toString(36)), b.meta.habitat, 'br' + Math.floor(Math.random() * 1e6).toString(36)); if (acceptable(c)) child = c; } catch (e2) { /* unviable draw */ } } if (!child) throw new Error('These two parents cannot be crossed into a coherent animal. Try another pair.');   /* round 6H: same shared audit as Wonder */ child.meta.evo = { step: 0, base: child.meta.name, nov: {}, don: null, hab: null, last: null, log: [] }; setFish(child); toast('Hybrid cross: ' + a.meta.name + ' + ' + b.meta.name); } catch (e) { toast(e.message); } }
function updateHash() { if (!App.genome) return; if (App.genome.meta.proc && !App.genome.meta.edited) { try { history.replaceState(null, '', '#p=' + encodeURIComponent(App.genome.meta.proc.seed)); } catch (e) { /* sandboxed history */ } return; } const g = App.genome, m = g.meta; const q = new URLSearchParams({ s: m.seed, h: m.habitat, n: m.niche || '', c: m.clade, sp: m.species || '', g: b64enc(JSON.stringify(slimGenome(g))) }); try { history.replaceState(null, '', '#' + q.toString()); } catch (e) { /* Sandboxed or local-file history. */ } }
function stripGenome(g) { const c2 = deepClone(g); delete c2.meta.metrics; delete c2.meta.landmarks; delete c2.meta.repairs; return c2; }
function loadFromHash() { const q = new URLSearchParams(location.hash.slice(1)); if (q.get('p') && FG.proc) { FG.proc.showSeed(q.get('p')); return true; } if (!q.get('s') && !q.get('g')) return false; try { if (q.get('g')) { const { genome, issues } = validateGenome(JSON.parse(b64dec(q.get('g')))); genome.meta.repairs = issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i })); finalize(genome); genome.meta.edited = true; syncSelects(genome); setFish(genome); return true; } const opts = { seed: q.get('s'), habitat: q.get('h') || undefined, niche: q.get('n') || undefined, clade: q.get('c') || undefined, species: q.get('sp') || undefined }; $('selHabitat').value = opts.habitat || ''; $('selNiche').value = opts.niche || ''; $('selClade').value = opts.clade || ''; $('selSpecies').value = ''; $('seed').value = opts.seed; doGenerate(opts); return true; } catch (e) { console.warn('hash load failed', e); return false; } }
function updateHUD() {
  const g = App.genome; if (!g) return; const m = g.meta;
  $('fishName').innerHTML = esc(m.name) + (m.hybrid ? '<span class="badge" style="background:#b45309">HYBRID</span>' : m.novel ? '<span class="badge" style="background:#22644f">NEW CONCEPT</span>' : '')
    + (m.speculative ? '<span class="badge" style="background:#7355a6">SPECULATIVE</span>' : m.fantasy ? '<span class="badge">FANTASY</span>' : '')
    + (m.species ? '<span class="badge" style="background:#0e7490">' + (m.speculative ? 'REFERENCE LINEAGE' : 'SPECIES CARD') + '</span>' : '')
    + (m.adapted ? '<span class="badge" style="background:#925614">HABITAT VARIANT</span>' : '');
  $('fishSci').textContent = m.sci || '';
  $('fishTags').textContent = `${HABITATS[m.habitat].n} / ${NICHES[m.niche] ? NICHES[m.niche].n : 'Generalist'} / ${CLADES[m.clade].n} / ${m.sizeClass} (${g.body.length.toFixed(2)} m) / ${g.swim.mode}` + (m.evoTraits && m.evoTraits.length ? ' / evolved: ' + m.evoTraits.join(', ') : '');
  $('btnUndo').disabled = App.history.length < 2;
  $('btnMutate').title = 'Evolve one generation (drift, gene flow, habitat selection or a new organ). Generation ' + (((m.evo && m.evo.step) || (m.evolution ? m.evolution.step : 0)) + 1) + ' next.';
}
function updateStats(fps) { const f = App.fish; $('stats').textContent = `${fps.toFixed(0)} fps · tier ${App.tier} · ${f ? f.info.tris.toLocaleString() : 0} tris · ${renderer.info.render.calls} draws${App.school && App.schoolOn ? ' · school ' + App.school.count : ''}`; }
/* ── sheet / tabs ── */
let currentTab = null; const inspectorState = { genome: null, inputs: new Map() };
function openSheet(tab) { clearTimeout(GOD.timer); currentTab = tab; $('sheet').classList.remove('hidden'); document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); renderPanel(tab); onResize(); }
function closeSheet() { clearTimeout(GOD.timer); currentTab = null; $('sheet').classList.add('hidden'); document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active')); onResize(); }
function refreshPanels() { if (!currentTab || currentTab === 'tests' || currentTab === 'text' || (currentTab === 'god' && GOD.editing)) return; if (currentTab === 'inspect' && inspectorState.genome === App.genome) { syncInspector(); return; } if (currentTab === 'gallery') return; renderPanel(currentTab); }
function renderPanel(tab) { const body = $('sheetBody'); const titles = { mix: 'Hybrid Lab / lineage & adaptation report', evo: 'Evolution Lab / gradual mutation', god: 'God Mode / Evolution Workbench', inspect: 'Genome inspector', tree: 'Phylogeny', gallery: 'Reference gallery', text: 'Text to genome', export: 'Export & share', debug: 'Debug & rules', tests: 'Anatomy regression tests', proc: 'Procedural generator / seed, gallery & breeding', help: 'Anatomy Engine Guide' }; $('sheetTitle').textContent = titles[tab] || tab; body.innerHTML = ''; try { PANELS[tab](body); } catch (e) { showError(e); } }
// @@PART js/app.part14.js (14/19) lines 2815-2937 of the original module script -- stripped by build.mjs
const PANELS = {
  god(body) {
    const g = App.genome; if (!g) return;
    if (!GOD.baseline || !GOD.editing) { GOD.baseline = deepClone(g); GOD.axes = {}; }
    const a = anatomyProfile(g), protectedPaths = Object.keys(a.locks).length;
    body.innerHTML = `<p class="gene-lock">AUTHORED EVOLUTION, NOT RANDOM GEOMETRY</p><h2 class="god-title">Create beyond the ordinary.</h2><p class="god-copy">Explore a broader range of form without breaking the fish. Every adjustment evolves linked structures; the ${a.label.toLowerCase()} foundation stays intact.</p>
      <div class="god-switch"><div>God Mode<small>Extended variation. Biological safeguards always on.</small></div><button id="godToggle" class="${GOD.enabled ? 'primary' : ''}" aria-pressed="${GOD.enabled}">${GOD.enabled ? 'Enabled' : 'Enable'}</button></div>
      <div class="camera-row"><button data-view="side">Side View</button><button data-view="top">Dorsal View</button><button data-view="head">Head View</button><button data-view="mouth">Mouth</button><button data-view="eye">Eye</button><button data-view="fin">Fin</button><button data-view="tail">Tail</button><button data-view="below">Below</button><button data-view="mouthbelow">Mouth below</button><button id="godPause">${App.paused ? 'Resume' : 'Pause'}</button></div>
      <div class="grp">Anatomical foundation</div><div class="row"><select id="godLineage" aria-label="Anatomical lineage">${Object.values(CLADES).filter(k => !Object.values(CLADES).some(ch => ch.p === k.id)).map(k => `<option value="${k.id}"${k.id === g.meta.clade ? ' selected' : ''}>${esc(k.n)}</option>`).join('')}</select><button id="godEvolve" class="sm">Build Lineage</button></div>
      <div class="grp">Linked adaptation axes</div><div id="godAxes"></div><div class="adaptation"><div class="adaptation-head"><label for="godStrength">Mutation Strength</label><output id="godStrengthOut">${Math.round(GOD.strength * 100)}%</output></div><input id="godStrength" type="range" min=".05" max="1" step=".01" value="${GOD.strength}"></div>
      <div class="god-actions"><button class="primary" id="godMutate">Guided Mutation</button><button id="godUndo">Undo</button><button id="godReset">Reset Axes</button></div><div class="god-actions"><button id="godGenome">Detailed Genome</button><button id="godCheck">Validate Anatomy</button></div>
      <div class="panel-note" id="godStatus">${protectedPaths} lineage traits protected. Mouth, gills, bilateral fin roots and tail propulsion are checked after every edit.</div>${evolutionReport(g)}`;
    const axes = body.querySelector('#godAxes');
    for (const id in ADAPTATIONS) {
      const module = ADAPTATIONS[id], row = document.createElement('div'); row.className = 'adaptation';
      row.innerHTML = `<div class="adaptation-head"><label for="axis-${id}">${module.label}</label><output>Balanced</output></div><p>${module.desc}</p><input id="axis-${id}" type="range" min="-1" max="1" step=".02" value="${GOD.axes[id] || 0}" aria-label="${module.label}">`;
      row.querySelector('input').oninput = e => {
        const v = +e.target.value; GOD.axes[id] = v; row.querySelector('output').textContent = v === 0 ? 'Balanced' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
        clearTimeout(GOD.timer); GOD.timer = setTimeout(() => {
          try { const evolved = deepClone(GOD.baseline); evolved.meta.godMode = GOD.enabled; evolved.meta.parentSpecies = evolved.meta.species || evolved.meta.parentSpecies; evolved.meta.species = null; evolved.meta.edited = true; evolved.meta.repairs = [];
            for (const key in GOD.axes) applyAdaptation(evolved, key, GOD.axes[key], GOD.enabled);
            finalize(evolved); evolved.meta.name = 'Authored ' + evolved.meta.name.toLowerCase(); GOD.editing = true;
            setFish(evolved, { noHistory: true, keepCamera: true }); GOD.editing = false;
            const errors = violations(evolved); body.querySelector('#godStatus').textContent = errors.length ? `${errors.length} unresolved constraints. Open Debug for details.` : `Anatomy valid. ${evolved.meta.repairs.length} automatic corrections; roots sampled directly from the body surface.`;
          } catch (err) { GOD.editing = false; showError(err); }
        }, 130);
      };
      axes.appendChild(row);
    }
    body.querySelector('#godToggle').onclick = () => { GOD.enabled = !GOD.enabled; App.genome.meta.godMode = GOD.enabled; App.genome.meta.edited = true; updateHash(); renderPanel('god'); toast(GOD.enabled ? 'God Mode enabled. Biological constraints remain active.' : 'Species-range editing restored.'); };
    body.querySelector('#godStrength').oninput = e => { GOD.strength = +e.target.value; body.querySelector('#godStrengthOut').textContent = Math.round(GOD.strength * 100) + '%'; };
    body.querySelector('#godMutate').onclick = doMutate;
    body.querySelector('#godUndo').onclick = undoFish;
    body.querySelector('#godReset').onclick = () => { const base = deepClone(GOD.baseline); GOD.axes = {}; setFish(base, { keepCamera: true }); };
    body.querySelector('#godGenome').onclick = () => openSheet('inspect');
    body.querySelector('#godCheck').onclick = () => { const result = checkFishGeometry(App.fish); body.querySelector('#godStatus').textContent = result.errors.length ? result.errors.join('; ') : 'Validated: finite geometry, correct root attachment, bilateral body and triangle budget.'; };
    body.querySelector('#godEvolve').onclick = () => { const id = body.querySelector('#godLineage').value; const evolved = generate({ clade: id, habitat: g.meta.habitat, seed: g.meta.seed + ':lineage:' + id, noSpecies: true }); evolved.meta.godMode = GOD.enabled; evolved.meta.edited = true; setFish(evolved); };
    body.querySelector('#godPause').onclick = e => { App.paused = !App.paused; e.target.textContent = App.paused ? 'Resume' : 'Pause'; };
    body.querySelectorAll('[data-view]').forEach(btn => btn.onclick = () => setCameraView(btn.dataset.view));
  },
  inspect(body) {
    const g = App.genome; if (!g) { body.textContent = 'No fish yet.'; return; } inspectorState.genome = g; inspectorState.inputs.clear(); const map = resolveTraitMap(g.meta);
    const head = document.createElement('div'); head.innerHTML = `<div><b>${esc(g.meta.name)}</b> <small>${esc(g.meta.sci)}</small></div><div class="row"><button class="sm" id="insReset">Regenerate from seed</button><button class="sm" id="insRandomSeed">New seed, same clade/niche</button>${g.skin.inflate ? '<button class="sm" id="insInflate">Inflate / deflate</button>' : ''}</div><small>${GOD.enabled ? 'Extended God Mode ranges.' : 'Clade, species and niche variation ranges.'} Disabled controls are anatomical foundations. Changes are repaired immediately; edited references become authored variants, not new claims about a real species.</small>`; body.appendChild(head);
    head.querySelector('#insReset').onclick = () => doGenerate({ seed: g.meta.seed, habitat: g.meta.habitat, niche: g.meta.niche, clade: g.meta.clade, species: g.meta.species || undefined });
    head.querySelector('#insRandomSeed').onclick = () => doGenerate({ habitat: g.meta.habitat, niche: g.meta.niche, clade: g.meta.clade, species: g.meta.species || undefined });
    const inf = head.querySelector('#insInflate'); if (inf) inf.onclick = () => { App.inflateTarget = App.inflateTarget > 0.5 ? 0 : 1; };
    const evolution = document.createElement('div'); evolution.innerHTML = evolutionReport(g); body.appendChild(evolution);
    let grp = null; for (const p in SCHEMA) { const e = SCHEMA[p]; if (e.g !== grp) { grp = e.g; const h = document.createElement('div'); h.className = 'grp'; h.textContent = grp; body.appendChild(h); }
      const row = document.createElement('div'); row.className = 'row'; const lab = document.createElement('label'); const spec = map[p]; lab.textContent = p.replace(/^(body|head|mouth|fins|swim|skin)\./, '').replace(/\./g, ' › ') + (spec && (spec.r || spec.c) ? ' •' : ''); row.appendChild(lab);
      let input, val;
      if (e.t === 'n' || e.t === 'i') { input = document.createElement('input'); input.type = 'range'; const lim = traitBounds(g, p, GOD.enabled, map); input.min = lim.min; input.max = lim.max; input.disabled = lim.locked; input.step = e.t === 'i' ? 1 : Math.max(.0001, (lim.max - lim.min) / 200); input.value = getP(g, p); val = document.createElement('span'); val.className = 'val'; val.textContent = fmt(getP(g, p)); input.oninput = () => { val.textContent = fmt(+input.value); applyEdit(p, e.t === 'i' ? Math.round(+input.value) : +input.value); }; }
      else if (e.t === 's') { input = document.createElement('select'); input.innerHTML = e.opts.map(o => `<option${o === getP(g, p) ? ' selected' : ''}>${o}</option>`).join(''); input.onchange = () => applyEdit(p, input.value); }
      else if (e.t === 'b') { input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!getP(g, p); input.onchange = () => applyEdit(p, input.checked); }
      else { input = document.createElement('input'); input.type = 'color'; const v = getP(g, p); input.value = hslToHex(v[0], v[1], v[2]); input.oninput = () => applyEdit(p, hexToHsl(input.value)); }
      if (anatomyProfile(g).locks[p] !== undefined) { input.disabled = true; input.title = 'Protected anatomical foundation'; }
      row.appendChild(input); if (val) row.appendChild(val); body.appendChild(row); inspectorState.inputs.set(p, { input, val, e }); }
  },
  tree(body) {
    const g = App.genome; const cur = g ? g.meta.clade : 'fish'; const anc = new Set(cladePath(cur).map(n => n.id)); const nodes = {}; let leafY = 0; const rowH = 18, colW = 118;
    const layout = (id, depth) => { const kids = Object.values(CLADES).filter(k => k.p === id); const node = { id, depth, kids: [] }; if (!kids.length) { node.y = leafY++ * rowH + 14; } else { for (const k of kids) node.kids.push(layout(k.id, depth + 1)); node.y = (node.kids[0].y + node.kids[node.kids.length - 1].y) / 2; } nodes[id] = node; return node; };
    const root = layout('fish', 0); let maxD = 0; for (const id in nodes) maxD = Math.max(maxD, nodes[id].depth); const W = (maxD + 1) * colW + 160, Hh = leafY * rowH + 30; let svg = `<svg class="tree" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">`;
    const draw = n => { const x = 16 + n.depth * colW; for (const k of n.kids) { const kx = 16 + k.depth * colW; svg += `<line x1="${x + 6}" y1="${n.y}" x2="${kx - 4}" y2="${k.y}"/>`; draw(k); } const cls = n.id === cur ? 'cur' : anc.has(n.id) ? 'anc' : ''; svg += `<g class="${cls}" data-clade="${n.id}"><circle cx="${x}" cy="${n.y}" r="4"/><text x="${x + 9}" y="${n.y + 4}">${esc(CLADES[n.id].n)}</text></g>`; };
    draw(root); svg += '</svg>'; body.innerHTML = `<small>Ancestry of the current fish is highlighted. Tap any node to generate a fish from that clade in the current habitat.</small><div style="overflow:auto">${svg}</div>`;
    body.querySelectorAll('g[data-clade]').forEach(el => el.addEventListener('click', () => { const id = el.dataset.clade; const hab = App.genome ? App.genome.meta.habitat : $('selHabitat').value; const desc = new Set([id]); const stack = [id]; while (stack.length) { const c2 = stack.pop(); for (const k of Object.values(CLADES)) if (k.p === c2 && !desc.has(k.id)) { desc.add(k.id); stack.push(k.id); } } const niches = Object.values(NICHES).filter(ni => Object.keys(ni.clades).some(c2 => desc.has(c2) || anc.has(c2) && c2 !== 'fish')); const hw = HABITATS[hab].niches; let niche = niches.find(ni => hw[ni.id]) || niches[0]; $('selClade').value = id; $('selNiche').value = niche ? niche.id : ''; $('selSpecies').value = ''; doGenerate({ habitat: hab, clade: id, niche: niche ? niche.id : undefined, seed: Math.floor(Math.random() * 1e9).toString(36) }); }));
  },
  gallery(body) {
    const sel = document.createElement('select'); sel.innerHTML = '<option value="">All habitats</option>' + Object.values(HABITATS).filter(h => SPECIES.some(s => s.habitat === h.id)).map(h => `<option value="${h.id}">${esc(h.n)}</option>`).join(''); const grid = document.createElement('div'); grid.className = 'thumbs';
    const fill = () => { grid.innerHTML = ''; thumbQueue.length = 0; for (const sp of SPECIES.filter(s => !sel.value || s.habitat === sel.value)) { const d = document.createElement('div'); d.className = 'thumb'; const img = document.createElement('img'); img.alt = sp.n; d.appendChild(img); const cap = document.createElement('div'); cap.innerHTML = `<b>${esc(sp.n)}</b><br><small>${esc(sp.sci)} · ${esc(HABITATS[sp.habitat].n)}</small>`; d.appendChild(cap); d.onclick = () => { $('selSpecies').value = sp.id; $('selHabitat').value = sp.habitat; doGenerate({ species: sp.id, habitat: sp.habitat, seed: 'ref' }); }; grid.appendChild(d); requestThumb(sp.id, img); } };
    sel.onchange = fill; body.appendChild(sel); body.appendChild(document.createElement('br')); body.appendChild(grid); fill();
  },
  text(body) {
    body.innerHTML = `<small>Describe a fish. The offline parser maps keywords to habitat, niche, clade, species cards, colours, pattern, size, shape and features; everything goes through schema validation and the rules engine.</small><textarea id="txtPrompt" placeholder="e.g. a slender silver reef barracuda with dark bars, or: glowing deep sea angler with huge fangs"></textarea><div class="row"><button class="primary" id="txtGo">Parse offline → generate</button><button id="txtLLM">Ask LLM endpoint</button></div><div class="grp">Optional LLM endpoint (POST JSON, returns JSON)</div><div class="row"><label>Endpoint URL</label><input type="url" id="llmUrl" placeholder="https://…" value="${esc(FG.llm.endpoint)}"></div><div class="row"><label>Bearer key</label><input type="password" id="llmKey" value="${esc(FG.llm.key)}"></div><div class="row"><label>Model</label><input type="text" id="llmModel" value="${esc(FG.llm.model)}"></div><small>Request body: {prompt, instruction, ids, schema}. Expected response: {"meta":{habitat,niche,clade},"overrides":{"schema.path":value}} or a full genome. Nothing from the model bypasses validation.</small><div id="txtOut" style="margin-top:8px"></div>`;
    const save = () => { FG.llm.endpoint = body.querySelector('#llmUrl').value.trim(); FG.llm.key = body.querySelector('#llmKey').value; FG.llm.model = body.querySelector('#llmModel').value.trim(); safeStore.set('fg_llm_endpoint', FG.llm.endpoint); safeStore.set('fg_llm_key', FG.llm.key); safeStore.set('fg_llm_model', FG.llm.model); };
    body.querySelector('#txtGo').onclick = () => { const p = body.querySelector('#txtPrompt').value; if (!p.trim()) return; try { const g = genomeFromText(p, 'txt:' + Math.floor(Math.random() * 1e6).toString(36)); syncSelects(g); setFish(g); body.querySelector('#txtOut').textContent = HABITATS[g.meta.habitat].n + ' / ' + NICHES[g.meta.niche].n + ' / ' + CLADES[g.meta.clade].n + ' / ' + g.meta.repairs.length + ' repairs'; } catch (e) { showError(e); } };
    body.querySelector('#txtLLM').onclick = async () => { save(); const p = body.querySelector('#txtPrompt').value; const out = body.querySelector('#txtOut'); out.textContent = 'Asking endpoint…'; try { const g = await genomeFromLLM(p); syncSelects(g); setFish(g); out.innerHTML = `<small>LLM genome accepted after ${g.meta.repairs.length} validation/repair steps.</small>`; } catch (e) { out.innerHTML = `<span class="bad">${esc(e.message)}</span>`; } };
    for (const id of ['llmUrl', 'llmKey', 'llmModel']) body.querySelector('#' + id).onchange = save;
  },
  export(body) {
    body.innerHTML = `<div class="row"><button id="expJson">JSON Genome</button><button id="expGlb">GLB Model</button><button id="expPng">PNG Image</button><button id="expShare" class="primary">Copy Share Link</button></div><div class="row"><label>Import genome JSON</label><input type="file" id="impJson" accept="application/json"></div><small>JSON preserves all anatomical traits and the seed. GLB exports the neutral-pose anatomy with approximate vertex-baked patterns; micro-scales and shader animation stay in the app. Share links include the full validated genome, including authored changes.</small><pre id="expPreview" style="font-size:11px;max-height:30vh;overflow:auto;white-space:pre-wrap"></pre>`;
    const g = App.genome; if (!g) return; const name = g.meta.name.replace(/[^a-z0-9]+/gi, '_');
    body.querySelector('#expPreview').textContent = JSON.stringify(stripGenome(g), null, 1).slice(0, 4000) + '\n…';
    body.querySelector('#expJson').onclick = () => download(new Blob([JSON.stringify(stripGenome(g), null, 2)], { type: 'application/json' }), name + '.json');
    body.querySelector('#expPng').onclick = () => { renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = name + '.png'; a.click(); };
