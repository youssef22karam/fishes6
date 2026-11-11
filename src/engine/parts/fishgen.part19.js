    let f = p0 >= 1 ? 1 : (p1 - p0) / (1 - p0); const gap = gapOf(c, p => getP(D, p), new Set(ORG_PATHS[id])); if (gap > 0) f = Math.min(f, Math.max(.07, STEP_LIM / gap)); if (p0 < 1) p1 = p0 + f * (1 - p0);
    const flip = (p1 >= .5 && p0 < .5) || p1 >= .999; if (p1 >= .999) p1 = 1;
    for (const p of ORG_PATHS[id]) {
      if (p === 'body.length') continue;
      const e = SCHEMA[p], cv = getP(c, p), dv = getP(D, p);
      if (e.t === 'n' || e.t === 'i') setN(c, p, blendN(p, cv, dv, f)); else if (e.t === 'hsl') setP(c, p, mixC(cv, dv, f)); else if (flip) setP(c, p, cp3(dv));
    }
    if (id === 'body') { dn.L0 = dn.L0 || c.body.length; const target = Math.exp(lerp(Math.log(dn.L0), Math.log(D.body.length), p1)); setN(c, 'body.length', clamp(target, c.body.length / 1.4, c.body.length * 1.4)); }
    dn.prog[id] = p1; moved.push({ id, p0, p1, flip });
  }
  }
  dn.anc = a1; const finished = a1 >= 1 && adopt.every(id => (dn.prog[id] || 0) >= .99); if (finished) { dn.done = true; dn.anc = 1; }
  if (!moved.length) return finished ? { kind: 'gene flow', title: 'Gene flow complete (100%)', lines: ['Every adoptable organ now matches ' + cleanName(D.meta.name) + '.'] } : null;
  moved.sort((x, y) => (y.p1 - y.p0) - (x.p1 - x.p0));
  lines.push(`Donor ancestry ${pct(a0)}% → ${pct(a1)}%.`);
  for (const m of moved.slice(0, 3)) lines.push(`${ORGAN_LABEL[m.id]} ${pct(m.p0)}% → ${pct(m.p1)}% of ${cleanName(D.meta.name)}${m.p1 >= 1 ? ' (fixed)' : m.flip && m.p0 < .5 ? ' (discrete traits switch)' : ''}`);
  if (moved.length > 3) lines.push(`${moved.length - 3} more organs shifting.`);
  return { kind: 'gene flow', title: 'Gene flow from ' + cleanName(D.meta.name) + ' (' + pct(a1) + '%)', lines };
}
/* ── event 3: selection toward a habitat. The fully adapted target is computed once; each step closes part of the gap ── */
function evHabitat(c, st, rng, X, mag, habId) {
  const id = habId || (st.hab && st.hab.id); if (!id || !HABITATS[id]) return null; const hab = HABITATS[id];
  if (!st.hab && c.meta.adapted && c.meta.adapted.to === id && c.meta.habitat === id && c.meta.adaptDone === id) return null;
  if (st.hab && st.hab.id === id && (!st.hab.t || !Object.keys(st.hab.t).length)) st.hab = null;
  if (!st.hab || st.hab.id !== id) {
    const pre = deepClone(c), base = c.meta.adaptBase; if (base) for (const p in base) if (SCHEMA[p]) setP(pre, p, cp3(base[p]));
    const seed = Math.random().toString(36).slice(2, 8), T = adaptFinish(pre, id, seed), t = {};
    for (const p in SCHEMA) { if (ORG_OF[p] === 'gills') continue; const a = getP(c, p), b = getP(T, p), e = SCHEMA[p]; const diff = e.t === 'n' || e.t === 'i' ? Math.abs(a - b) > (e.max - e.min) * .004 : e.t === 'hsl' ? Math.abs(((a[0] - b[0] + 540) % 360) - 180) > 2 || Math.abs(a[1] - b[1]) > .02 || Math.abs(a[2] - b[2]) > .02 : a !== b; if (diff) t[p] = cp3(b); }
    st.hab = { id, p: 0, t, seed, notes: T.meta.notes, base: T.meta.adaptBase, adapted: T.meta.adapted };
  }
  const h = st.hab, p0 = h.p; let f = Math.min(1, rng.range(.24, .36) * (.8 + mag * 2) / Math.max(.05, 1 - p0)); const gap = gapOf(c, p => h.t[p]); if (gap > 0) f = Math.min(f, Math.max(.07, STEP_LIM / gap));
  let p1 = Math.min(1, p0 + f * (1 - p0)); if (p1 >= .995) { p1 = 1; f = 1; } const flip = p1 >= .5 && p0 < .5 || p1 >= 1;
  let moved = 0; for (const p in h.t) { const e = SCHEMA[p], cv = getP(c, p), tv = h.t[p]; if (e.t === 'n' || e.t === 'i') { setN(c, p, blendN(p, cv, tv, f)); moved++; } else if (e.t === 'hsl') { setP(c, p, mixC(cv, tv, f)); moved++; } else if (flip) { setP(c, p, cp3(tv)); moved++; } }
  h.p = p1; if (p1 >= .4 && c.meta.habitat !== id) { c.meta.adapted = { from: c.meta.habitat, to: id, speculative: false }; c.meta.habitat = id; }
  const notes = h.notes || [], lines = [`${Math.round(p0 * 100)}% → ${Math.round(p1 * 100)}% adapted to ${hab.n.toLowerCase()} (${moved} traits shifting).`]; if (notes.length) lines.push(notes[st.step % notes.length]);
  if (p1 >= 1) { c.meta.adapted = h.adapted || c.meta.adapted; c.meta.notes = notes; if (h.base) c.meta.adaptBase = h.base; c.meta.adaptDone = id; st.hab = null; lines.push('Adaptation complete.'); }
  return { kind: 'selection', title: 'Selection toward ' + hab.n, lines };
}
/* ── event 4: innovation. New organs develop in stages (bud → working organ → elaborated) and only where ecology allows ── */
function evInnovate(c, st, rng, X, only) {
  const cur = id => st.nov[id] || 0;
  const open = NOVELTIES.filter(n => cur(n.id) > 0 && cur(n.id) < n.st.length), fresh = NOVELTIES.filter(n => !cur(n.id) && n.can(c, X));
  let pick = null;
  if (only) pick = NOV[only]; else if (open.length && (!fresh.length || rng.chance(.55))) pick = rng.pick(open);
  else if (fresh.length) { const w = {}; for (const n of fresh) w[n.id] = Math.max(.05, n.w(c, X)); pick = NOV[rng.weighted(w)]; }
  if (!pick || cur(pick.id) >= pick.st.length || (!cur(pick.id) && !pick.can(c, X))) return null;
  /* a stage whose effect is already present in this fish does not count: development continues to the next visible stage */
  const base = deepClone(c), applied = []; let stage = cur(pick.id);
  while (stage < pick.st.length) {
    stage++; pick.ap(c, stage, rng, X); applied.push(stage);
    const t = deepClone(c); t.meta.repairs = []; finalize(t, new RNG('probe:' + stage)); if (phenoDelta(base, t) >= .05) break;
  }
  st.nov[pick.id] = stage;
  return { kind: 'innovation', title: `${pick.n} (stage ${stage}/${pick.st.length})`, lines: applied.map(k => pick.st[k - 1][0].toUpperCase() + pick.st[k - 1].slice(1) + '.') };
}
/** largest relative change of the shape-defining traits in one step (rule repairs can otherwise snap a body into a new shape) */
function stepJump(a, b) {
  let m = 0; const rel = (p, fl) => { const x = getP(a, p), y = getP(b, p); if (typeof x === 'number' && typeof y === 'number') m = Math.max(m, Math.abs(y - x) / Math.max(Math.abs(x), fl)); };
  rel('body.fineness', 1); rel('body.width', .3); rel('body.pedDepth', .1); rel('head.lengthFrac', .1); rel('mouth.gape', .15);
  for (const p of ['fins.dorsal.height', 'fins.pectoral.len', 'fins.anal.height']) rel(p, .3); if (a.fins.caudal.present && b.fins.caudal.present) rel('fins.caudal.span', .6);
  return m;
}
function flipCount(a, b) { let n = 0; for (const p in SCHEMA) { const t = SCHEMA[p].t; if ((t === 's' || t === 'b') && getP(a, p) !== getP(b, p)) n++; } return n; }
/**
 * One evolutionary event = one click. Events: drift, gene flow, habitat selection, innovation (or a single named module). Each candidate is repaired,
 * audited for body-plan soundness (no tail loss, no impossible fins) and must change the phenotype visibly; the best valid candidate is kept.
 */
// @@PART js/app.part18.js (18/19) lines 3569-3749 of the original module script -- stripped by build.mjs
function evolve(g0, o = {}) {
  const strength = clamp(o.strength == null ? .55 : o.strength, .05, 1), seed = String(o.seed != null ? o.seed : g0.meta.seed + ':e' + Math.random()), rng = new RNG(seed), mode = o.mode || 'auto', st0 = evoState(g0);
  if (o.donor) st0.don = st0.don && st0.don.val === o.donor ? st0.don : { val: o.donor, seed: 'd' + Math.random().toString(36).slice(2, 7), anc: 0, th: null, prog: {} };
  if (o.habId && (mode === 'habitat' || mode === 'auto' && st0.hab)) { if (!st0.hab || st0.hab.id !== o.habId) st0.hab = null; }
  const mag = lerp(.07, .2, strength), minD = .07 + .1 * strength, tries = [];
  const plan = k => k === 'drift' ? ['drift'] : k === 'donor' ? ['donor', 'drift'] : k === 'habitat' ? ['habitat', 'drift'] : k === 'innovate' ? (o.only ? ['innovate'] : ['innovate', 'drift']) : ['module'];
  let kinds; if (ADAPTATIONS[mode]) kinds = ['module']; else if (mode !== 'auto') kinds = plan(mode); else { const w = { drift: 3, innovate: st0.step >= 1 ? 1.5 : .8, donor: st0.don ? 3.5 : 0, habitat: st0.hab ? 3.5 : 0 }, a = []; for (let i = 0; i < 3; i++) { const k = rng.weighted(w); if (!a.includes(k)) a.push(k); delete w[k]; if (!Object.keys(w).some(x => w[x] > 0)) break; } kinds = a.concat('drift'); }
  let best = null, bd = -1;
  for (let attempt = 0; attempt < Math.min(25, 5 * kinds.length); attempt++) {
    const kind = kinds[Math.min(kinds.length - 1, Math.floor(attempt / 5))], ai = attempt % 5, c = deepClone(g0), st = deepClone(st0), X = ecoCtx(c), m = mag * (1 + ai * .09);
    c.meta.repairs = []; c.meta.edited = true; c.meta.seed = seed; delete c.meta.evolution; delete c.meta.mutation; c.meta.parentSpecies = g0.meta.species || g0.meta.parentSpecies || null; c.meta.species = null;
    let ev = null; try {
      if (kind === 'drift') ev = evDrift(c, st, rng, X, m); else if (kind === 'module') ev = evDrift(c, st, rng, X, m, mode);
      else if (kind === 'donor') ev = evDonor(c, st, rng, X, m); else if (kind === 'habitat') ev = evHabitat(c, st, rng, X, m, o.habId); else if (kind === 'innovate') ev = evInnovate(c, st, rng, X, o.only);
    } catch (e) { ev = null; }
    if (!ev) continue; finalize(c, rng);
    if (violations(c).length || structuralAudit(c).length) continue;
    if (ai < 4 && stepJump(g0, c) > (.3 + .14 * strength) * (1 + .12 * ai)) continue;
    if (ai < 3 && flipCount(g0, c) > 5) continue;
    const d = phenoDelta(g0, c); if (d > bd) { best = { c, st, ev, d }; bd = d; } if (d >= minD || (ev.kind === 'innovation' && d >= .04) || (ev.kind === 'gene flow' && d >= .05)) break;
  }
  if (o.only && !best) throw new Error((NOV[o.only] ? NOV[o.only].n : 'That organ') + ' cannot develop any further in this body plan and habitat.');
  if (!best || best.d < (best.ev.kind === 'innovation' ? (o.only ? -1 : .015) : best.ev.kind === 'gene flow' ? -1 : minD * .35)) throw new Error('This lineage has no visible step left for that pressure. Try another mutation type, set a gene-flow donor, or Innovate.');
  const { c, st, ev } = best; st.step += 1; st.log.push({ n: st.step, k: ev.kind, t: ev.title, l: ev.lines.slice(0, 3).map(s => String(s).slice(0, 150)) }); st.log = st.log.slice(-8);
  c.meta.evo = { step: st.step, base: st.base, nov: st.nov, don: st.don, hab: st.hab ? { id: st.hab.id, p: st.hab.p, t: st.hab.t, seed: st.hab.seed, notes: st.hab.notes, base: st.hab.base, adapted: st.hab.adapted } : null, last: st.last, log: st.log };
  c.meta.name = `Evolved ${st.base} · gen ${st.step}`;
  const novs = Object.keys(st.nov).filter(k => st.nov[k] > 0).map(k => NOV[k] && NOV[k].n.toLowerCase()).filter(Boolean); c.meta.evoTraits = novs.slice(0, 8);
  c.meta.mutation = { source: g0.meta.name, modules: [], strength, shapeChange: +best.d.toFixed(4), changes: mutationChanges(g0, c), event: ev };
  return c;
}
FG.evolve = evolve; FG.NOVELTIES = NOVELTIES; FG.phenoDelta = phenoDelta;

/* ── Random = Wonder: 2–3 parents from every species, niche archetype and invented concept, crossed, given staged key innovations, adapted to the habitat ── */
const WONDER_HIST = [];
function wonderCandidate(habId, seed) {
  const rng = new RNG('wonder:' + seed), pick = () => { const x = rng.next(); return x < .6 ? 'sp:' + rng.pick(SPECIES).id : x < .8 ? 'ni:' + rng.pick(Object.keys(NICHES)) : 'inv'; };
  const A = parentFrom(pick(), habId, seed + 'a'), B = parentFrom(pick(), habId, seed + 'b'); let pre = hybridize(A, B, rng.range(.3, .7), seed), parents = 2;
  if (rng.chance(.4)) { pre = hybridize(pre, parentFrom(pick(), habId, seed + 'c'), rng.range(.2, .4), seed + 'c'); parents = 3; }
  pre.meta.habitat = habId; const X = ecoCtx(pre), nov = {};
  for (let i = rng.int(1, 2); i > 0; i--) {
    const fresh = NOVELTIES.filter(n => !nov[n.id] && n.can(pre, X)); if (!fresh.length) break; const w = {}; for (const n of fresh) w[n.id] = Math.max(.05, n.w(pre, X)), 0;
    const nv = NOV[rng.weighted(w)], stage = rng.int(2, nv.st.length); for (let s = 1; s <= stage; s++) nv.ap(pre, s, rng, X); nov[nv.id] = stage; pre.meta.hybrid.syn.push({ id: 'nov:' + nv.id, t: `Key innovation, ${nv.n}: ${nv.st[stage - 1]}.` });
  }
  const c = adaptFinish(pre, habId, seed); c.meta.evo = { step: 0, base: c.meta.name, nov, don: null, hab: null, last: null, log: [] };
  return { c, A, B, parents, key: [nounOf(A.meta.name), nounOf(B.meta.name)].sort().join('+') + Object.keys(nov).join(',') };
}
function doWonder() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  const habId = $('selHabitat').value || 'coralReef', base = Math.floor(Math.random() * 1e9).toString(36); let best = null, bs = -1e9;
  $('selSpecies').value = ''; $('selClade').value = ''; $('selNiche').value = ''; $('seed').value = '';
  for (let i = 0; i < 12; i++) {
    try { const w = wonderCandidate(habId, base + ':' + i), c = w.c; if (violations(c).length || structuralAudit(c).length) continue;
      const score = Math.min(phenoDelta(c, w.A), phenoDelta(c, w.B)) + c.meta.hybrid.syn.length * .45 + (w.parents === 3 ? .35 : 0) - (WONDER_HIST.includes(w.key) ? 2 : 0);
      if (score > bs) { bs = score; best = w; } } catch (e) { /* unviable draw */ }
  }
  if (!best) { toast('No viable wonder this time, press Random again.'); return; }
  WONDER_HIST.push(best.key); if (WONDER_HIST.length > 24) WONDER_HIST.shift();
  setFish(best.c); toast(`${best.c.meta.name}: ${(best.c.meta.hybrid.syn.slice(-1)[0] || { t: 'a new hybrid' }).t}`);
}
/* niche pressure for the Niche menu on hybrids and evolved fish */
function pressNiche(g, ni, s) {
  const ff = new Set(ni.ff), A = (id, a) => applyAdaptation(g, id, a * s, true), up = planOf(g) === 'upright';
  if (!up) { if (ff.has('fastSwimmer')) A('speed', .6); if (ff.has('maneuverer')) A('agility', .6); if (ff.has('crevice')) A('shelter', .6); }
  if (ff.has('predator')) A('feeding', .7);
  if (ff.has('large')) setN(g, 'body.length', g.body.length * (1 + 1.2 * s));
  if (ff.has('filterFeeder')) { g.mouth.gape = lerp(g.mouth.gape, .85, s); if (!NOSNOUT(g)) g.mouth.teeth = 'rasp'; }
  if (ff.has('grazer')) { g.mouth.gape = lerp(g.mouth.gape, .2, s); if (s > .4 && !NOSNOUT(g)) g.mouth.teeth = 'molar'; }
  if (ff.has('schooler')) { g.skin.iridescence = lerp(g.skin.iridescence, .85, s); g.skin.countershade = lerp(g.skin.countershade, .85, s); }
  if (ff.has('camouflage') || ff.has('ambusher')) { if (s > .3) g.skin.pattern = 'mottle'; g.skin.patternStrength = lerp(g.skin.patternStrength, .75, s); g.skin.iridescence *= 1 - .6 * s; }
  if ((ff.has('bottomDweller') || ff.has('flatBenthic')) && !up) { g.body.ventralFlat = lerp(g.body.ventralFlat, .7, s); g.head.eyeV = lerp(g.head.eyeV, .75, s); }
  if (ff.has('deepSea')) { setN(g, 'head.eyeSize', g.head.eyeSize * (1 + .3 * s)); setN(g, 'skin.photophores', Math.max(g.skin.photophores, Math.round(20 * s))); g.skin.gloss = Math.max(g.skin.gloss, .7); }
  if (ff.has('armored')) { if (s > .4) g.skin.scale = 'plates'; g.skin.scaleSize = lerp(g.skin.scaleSize, 2, s); }
  return g;
}
function doMix() {
  if (!App.genome) return; clearTimeout(GOD.timer); clearTimeout(editTimer);
  const val = $('selMix').value; if (!val) { toast('Choose a second parent in "Mix with…" first.'); return; }
  try {
    const habId = $('selHabitat').value, seed = Math.floor(Math.random() * 1e9).toString(36), ratio = +$('mixRatio').value / 100;
    const A = deepClone(App.genome), B = parentFrom(val, habId, 'b' + seed), pre = hybridize(A, B, ratio, seed);
    if (val.startsWith('ni:') && ratio >= .5) pre.meta.niche = val.slice(3);
    const c = adaptFinish(pre, habId, seed); if (!acceptable(c)) throw new Error('That cross is not anatomically coherent. Try another ratio or partner.'); c.meta.evo = { step: 0, base: c.meta.name, nov: {}, don: null, hab: null, last: null, log: [] }; setFish(c);
    toast(`${c.meta.name}: ${(c.meta.hybrid.syn[0] || { t: 'organ-by-organ blend' }).t} Open Hybrid Lab for the full report.`);
  } catch (e) { console.error(e); toast(e.message || 'Mix failed'); }
}
/* ── Mutate: gradual evolution (drift · gene flow · habitat selection · innovation) ── */
function runEvolve(o = {}) {
  if (!App.genome) return; clearTimeout(GOD.timer); clearTimeout(editTimer);
  try {
    const source = deepClone(App.genome); source.meta.godMode = GOD.enabled; let mode = o.mode || $('selMutation').value || 'auto'; const mixVal = $('selMix').value;
    if (mode === 'donor' && !o.donor) { if (!mixVal) { toast('Gene flow needs a donor: pick one in "Mix with…" first.'); return; } o.donor = mixVal; }
    if (mode === 'auto' && mixVal && source.meta.evo && source.meta.evo.don && source.meta.evo.don.val !== mixVal && !o.donor) o.donor = mixVal;
    const g = evolve(source, Object.assign({ mode, strength: GOD.strength, habId: $('selHabitat').value, seed: source.meta.seed + ':e' + Math.floor(Math.random() * 1e9).toString(36) }, o));
    setFish(g, { keepCamera: true }); if (g.meta.evo.hab && HABITATS[g.meta.evo.hab.id]) $('selHabitat').value = g.meta.evo.hab.id; const ev = g.meta.mutation.event; toast(`Gen ${g.meta.evo.step} · ${ev.title}. ${ev.lines[0]}`);
  } catch (e) { toast(e.message || 'Mutation failed'); console.warn(e); }
}
function doMutate() { runEvolve(); }
/* ── panels ── */
const pct = x => Math.round(x * 100);
const list = a => a && a.length ? '<ul>' + a.map(t => `<li class="god-copy" style="margin:0 0 6px">${esc(typeof t === 'string' ? t : t.t)}</li>`).join('') + '</ul>' : '<p class="god-copy">Nothing recorded yet.</p>';
const bar = (p, label) => `<div class="evo-row"><span class="evo-lab">${esc(label)}</span><span class="bar-prog"><i style="width:${pct(clamp(p, 0, 1))}%"></i></span><span class="evo-pct">${pct(clamp(p, 0, 1))}%</span></div>`;
PANELS.mix = body => {
  const g = App.genome; if (!g) return; const h = g.meta.hybrid;
  const rows = h ? Object.entries(h.organs).map(([k, v]) => `<tr><td>${esc(ORGAN_LABEL[k] || k)}</td><td>${v.from === 'plan' ? 'locked to body plan' : v.from === 'blend' ? 'blended' : esc(v.from)}</td><td>${esc(v.mode)}</td></tr>`).join('') : '';
  body.innerHTML = `<p class="gene-lock">HYBRID LAB</p><h2 class="god-title">${esc(g.meta.name)}</h2>` + (h ? `<p class="god-copy">${esc(h.a)} × ${esc(h.b)} (second-parent share ${pct(h.ratio)}%). Body plan: <b>${esc(h.chassis)}</b> (${esc(h.plan)})${h.compat ? '' : ', incompatible with ' + esc(h.donorPlan) + ', so structural organs stay with the chassis and only surface organs cross'}.</p><div class="grp">Organ inheritance</div><table><tr><th>Organ</th><th>From</th><th>Mode</th></tr>${rows}</table><div class="grp">Emergent hybrid traits</div>${list(h.syn)}` : '<p class="god-copy">Pick a second parent in the top bar (Mix with…), set the share slider, choose a habitat and press Mix. Random builds a never-seen wonder for the chosen habitat.</p>')
    + `<div class="grp">Habitat adaptation / ${esc(HABITATS[g.meta.habitat].n)}</div>${list(g.meta.notes)}<div class="panel-note">Changing the Habitat menu re-adapts this fish from its unadapted form, so each habitat produces its own coherent set of changes. Use Mutate with "Adapt to habitat" for the gradual version.</div>`;
};
PANELS.evo = body => {
  const g = App.genome; if (!g) return; const st = evoState(g), mixVal = $('selMix').value;
  const donor = st.don ? (() => { try { return parentFrom(st.don.val, g.meta.habitat, st.don.seed); } catch (e) { return null; } })() : null, X = ecoCtx(g);
  const progs = donor ? bar(st.don.anc || 0, 'Donor ancestry') + Object.entries(st.don.prog).sort((x, y) => y[1] - x[1]).map(([k, p]) => bar(p, ORGAN_LABEL[k] || k)).join('') : '';
  const avail = NOVELTIES.filter(n => (st.nov[n.id] || 0) < n.st.length && (n.can(g, X) || st.nov[n.id] > 0));
  const dev = Object.keys(st.nov).filter(k => st.nov[k] > 0 && NOV[k]).map(k => bar(st.nov[k] / NOV[k].st.length, `${NOV[k].n} ${st.nov[k]}/${NOV[k].st.length}`)).join('');
  body.innerHTML = `<p class="gene-lock">EVOLUTION LAB</p><h2 class="god-title">${esc(g.meta.name)}</h2><p class="god-copy">Generation ${st.step}. Each Mutate click is one evolutionary event: coupled drift, gene flow from a donor, selection toward a habitat, or a new organ developing in stages. Every step is repaired and audited, so the body plan stays sound. Undo restores the previous generation exactly.</p>`
    + `<div class="grp">Gene flow</div>` + (donor ? `<p class="god-copy">Donor: <b>${esc(cleanName(donor.meta.name))}</b>. Organs move toward it a little each step; discrete traits switch at 50%.</p>${progs || '<p class="god-copy">No organ has started to change yet.</p>'}` : '<p class="god-copy">No donor set. Choose any species, niche or invented fish below.</p>')
    + `<div class="row"><select id="evoDonor" aria-label="Gene-flow donor">${mixOptions(st.don ? st.don.val : mixVal)}</select><button class="sm" id="evoSetDonor">Set donor</button>${donor ? '<button class="sm" id="evoClearDonor">Clear</button>' : ''}</div>`
    + `<div class="grp">Habitat selection</div>` + (st.hab ? bar(st.hab.p, 'Adapting to ' + HABITATS[st.hab.id].n) : '<p class="god-copy">No pressure set. Pick Mutation → "Adapt to habitat (gradual)" and choose a habitat in the top bar to begin.</p>')
    + `<div class="grp">Key innovations</div>${dev || '<p class="god-copy">None yet. Use the buttons below or Mutation → Innovate.</p>'}<div class="evo-chips">${avail.map(n => `<button class="sm" data-nov="${n.id}" title="${esc(n.st[Math.min(n.st.length - 1, st.nov[n.id] || 0)])}">${st.nov[n.id] ? 'Develop' : 'Evolve'}: ${esc(n.n)}</button>`).join('') || '<span class="god-copy">No innovation fits this body plan and habitat.</span>'}</div>`
    + `<div class="grp">Lineage log</div>${st.log.length ? '<ul>' + st.log.slice().reverse().map(e => `<li class="god-copy" style="margin:0 0 8px"><b>Gen ${e.n} · ${esc(e.t)}</b><br>${e.l.map(esc).join('<br>')}</li>`).join('') + '</ul>' : '<p class="god-copy">No generations yet.</p>'}`;
  const redo = () => renderPanel('evo');
  body.querySelector('#evoSetDonor').onclick = () => { const v = body.querySelector('#evoDonor').value; if (!v) { toast('Pick a donor first.'); return; } g.meta.evo = Object.assign({ step: 0, base: st.base, nov: st.nov, hab: st.hab, last: st.last, log: st.log }, { don: { val: v, seed: 'd' + Math.random().toString(36).slice(2, 7), anc: 0, th: null, prog: {} } }); redo(); toast('Donor set. Press Mutate (or Mutation → Gene flow) to start the transfer.'); };
  const cl = body.querySelector('#evoClearDonor'); if (cl) cl.onclick = () => { g.meta.evo = Object.assign({}, g.meta.evo, { don: null }); redo(); };
  body.querySelectorAll('[data-nov]').forEach(b => b.onclick = () => runEvolve({ mode: 'innovate', only: b.dataset.nov }));
};
function mixOptions(sel) { return '<option value="">Pick a fish…</option><option value="inv"' + (sel === 'inv' ? ' selected' : '') + '>✦ Invented concept fish</option><optgroup label="Niche archetypes">' + Object.values(NICHES).map(x => `<option value="ni:${x.id}"${sel === 'ni:' + x.id ? ' selected' : ''}>${esc(x.n)}</option>`).join('') + '</optgroup><optgroup label="Species">' + [...SPECIES].sort((a, b) => a.n.localeCompare(b.n)).map(s => `<option value="sp:${s.id}"${sel === 'sp:' + s.id ? ' selected' : ''}>${esc(s.n)}</option>`).join('') + '</optgroup>'; }
function evolutionReport(g) {
  const ev = g.meta.mutation && g.meta.mutation.event, st = g.meta.evo; if (!ev || !st) return '';
  const changes = (g.meta.mutation.changes || []).filter(i => /^(body|head|fins|mouth)\./.test(i.path)).slice(0, 12);
  return `<div class="grp">Generation ${st.step} / ${esc(ev.title)}</div>${list(ev.lines)}<table><tr><th>Trait</th><th>Before</th><th>Now</th><th>Change</th></tr>${changes.map(i => `<tr><td>${esc(i.path)}</td><td>${esc(i.from)}</td><td>${esc(i.to)}</td><td>${i.percent === null ? 'switched' : (i.percent > 0 ? '+' : '') + i.percent + '%'}</td></tr>`).join('')}</table>`;
}
function bindHybrid() {
  const m = $('selMix'); m.innerHTML = '<option value="">Mix with…</option>' + mixOptions('').replace('<option value="">Pick a fish…</option>', '');
  $('btnMix').onclick = doMix; $('btnRandom').onclick = doWonder;
  $('selHabitat').addEventListener('change', () => {
    if (!App.genome || $('selSpecies').value) return; const mode = $('selMutation').value;
    if (mode === 'habitat') { toast('Selection pressure set: ' + HABITATS[$('selHabitat').value].n + '. Press Mutate to adapt step by step.'); return; }
    const sg = App.genome.meta; if (sg.species && !sg.edited && !sg.hybrid && !sg.evo) { doGenerate({ species: sg.species, habitat: $('selHabitat').value, seed: sg.seed }); return; }
    try { const c = rehabitat(App.genome, $('selHabitat').value); setFish(c, { keepCamera: true }); toast(`Adapted to ${HABITATS[c.meta.habitat].n}: ${(c.meta.notes || []).length} coupled changes (see Hybrid Lab).`); } catch (e) { console.error(e); toast(e.message || 'Adaptation failed'); }
  });
  $('selNiche').addEventListener('change', () => {
    const g = App.genome, id = $('selNiche').value; if (!g || !g.meta.hybrid || !id) return;
    try { const c = deepClone(g); pressNiche(c, NICHES[id], .8); c.meta.niche = id; c.meta.repairs = []; c.meta.notes = (c.meta.notes || []).concat('Niche shift to ' + NICHES[id].n.toLowerCase() + ': traits pushed toward that role.'); finalize(c); if (violations(c).length || structuralAudit(c).length) throw new Error('That niche does not fit this body plan.'); setFish(c, { keepCamera: true }); toast('Niche pressure applied: ' + NICHES[id].n); } catch (e) { console.error(e); toast(e.message || 'Niche shift failed'); }
  });
}
FG.hybridize = hybridize; FG.adaptHab = adaptHab; FG.evolve = evolve; FG.structuralAudit = structuralAudit; FG.generate = generate; FG.stepJump = stepJump; FG.planOf = planOf; FG.wonderCandidate = wonderCandidate; FG.adaptFinish = adaptFinish; FG.evDonor = evDonor; FG.evoState = evoState; FG.ecoCtx = ecoCtx; FG.finalize = finalize; FG.violations = violations; FG.phenoDelta = phenoDelta;
/* ── import hardening for the new meta fields (genomes arrive from URLs and files) ── */
function sanitizeMetaExtras(src, dst) {
  const str = (v, n) => String(v == null ? '' : v).slice(0, n), isn = v => typeof v === 'number' && isFinite(v);
  const sval = (p, v) => { const e = SCHEMA[p]; if (!e) return undefined; if (e.t === 'n' || e.t === 'i') return isn(v) ? clamp(e.t === 'i' ? Math.round(v) : v, e.min, e.max) : undefined; if (e.t === 's') return e.opts.includes(v) ? v : undefined; if (e.t === 'b') return typeof v === 'boolean' ? v : undefined; if (e.t === 'hsl') return Array.isArray(v) && v.length === 3 && v.every(isn) ? [((v[0] % 360) + 360) % 360, clamp(v[1], 0, 1), clamp(v[2], 0, 1)] : undefined; };
  const sparse = m => { const o = {}; if (m && typeof m === 'object') for (const p in m) { const v = sval(p, m[p]); if (v !== undefined) o[p] = v; } return o; };
  const strs = (a, n, k) => Array.isArray(a) ? a.filter(t => typeof t === 'string').slice(0, n).map(t => t.slice(0, k)) : [];
  if (src.hybrid && typeof src.hybrid === 'object') {
    const h = src.hybrid, o = { ratio: isn(h.ratio) ? clamp(h.ratio, 0, 1) : .5, compat: h.compat === true, organs: {} };
    for (const k of ['a', 'b', 'na', 'nb', 'chassis', 'plan', 'donorPlan']) o[k] = str(h[k], 96); o.nouns = strs(h.nouns, 3, 32);
    o.chain = strs(h.chain, 8, 64); o.syn = (Array.isArray(h.syn) ? h.syn : []).slice(0, 12).map(s => ({ id: str(s && s.id, 24), t: str(s && s.t, 260) }));
    if (h.organs && typeof h.organs === 'object') for (const k in h.organs) if (ORGAN_KIND[k]) { const v = h.organs[k] || {}; o.organs[k] = { from: str(v.from, 12), mode: str(v.mode, 12), sig: Array.isArray(v.sig) ? v.sig.slice(0, 2).map(x => isn(x) ? x : 0) : [0, 0] }; }
    dst.hybrid = o;
  }
  if (Array.isArray(src.notes)) dst.notes = strs(src.notes, 40, 260);
  if (src.adaptBase && typeof src.adaptBase === 'object') dst.adaptBase = sparse(src.adaptBase);
  if (Array.isArray(src.evoTraits)) dst.evoTraits = strs(src.evoTraits, 8, 40);
  if (src.evo && typeof src.evo === 'object') {
    const e = src.evo, o = { step: Math.round(clamp(Number(e.step) || 0, 0, 100000)), base: str(e.base, 96), nov: {}, don: null, hab: null, last: null, log: [] };
    if (e.nov && typeof e.nov === 'object') for (const k in e.nov) if (NOV[k] && isn(e.nov[k])) o.nov[k] = Math.round(clamp(e.nov[k], 0, NOV[k].st.length));
    if (e.don && typeof e.don === 'object' && typeof e.don.val === 'string') { o.don = { val: str(e.don.val, 64), seed: str(e.don.seed, 32), done: e.don.done === true, L0: isn(e.don.L0) ? clamp(e.don.L0, 0, 40) : 0, anc: isn(e.don.anc) ? clamp(e.don.anc, 0, 1) : 0, th: null, prog: {} }; for (const k in e.don.prog || {}) if (ORGAN_KIND[k] && isn(e.don.prog[k])) o.don.prog[k] = clamp(e.don.prog[k], 0, 1); }
    if (e.hab && typeof e.hab === 'object' && HABITATS[e.hab.id]) { const a = e.hab.adapted; o.hab = { id: e.hab.id, p: isn(e.hab.p) ? clamp(e.hab.p, 0, 1) : 0, seed: str(e.hab.seed, 16), t: sparse(e.hab.t), notes: strs(e.hab.notes, 40, 260), base: e.hab.base ? sparse(e.hab.base) : null, adapted: a && HABITATS[a.from] && HABITATS[a.to] ? { from: a.from, to: a.to, speculative: a.speculative === true } : null }; }
    if (e.last && typeof e.last.id === 'string') o.last = { id: str(e.last.id, 32), dir: e.last.dir === -1 ? -1 : 1 };
