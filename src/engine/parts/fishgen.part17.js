      show(); if (TEST_STATE.cancel) break;
    }
    if (!TEST_STATE.cancel) {
      const row = { name: 'All reference species', n: 0, m: 0, geo: 0, hero: 0, lod: 0, fail: 0 }; rows.push(row);
      for (const sp of SPECIES) {
        if (TEST_STATE.cancel) break;
        const g = generate({ species: sp.id, seed: 'reference-anatomy' }); testGenome(g, row, true);
        const a = anatomyProfile(g), locks = a.locks;
        if (Object.keys(locks).some(p => getP(g, p) !== locks[p])) { row.fail++; issues.push(sp.n + ': lineage architecture failed'); }
        const again = generate({ species: sp.id, seed: 'reference-anatomy' });
        if (JSON.stringify(stripGenome(g)) !== JSON.stringify(stripGenome(again))) { row.fail++; issues.push(sp.n + ': generation is not deterministic'); }
        const mutant = mutate(g, .7, 'breed-' + sp.id), offspring = breed(g, mutant, 'cross-' + sp.id); row.m++;
        if (violations(offspring).length) { row.fail++; issues.push(sp.n + ': crossover rules failed'); }
        prog.textContent = 'Reference anatomy: ' + sp.n; show(); await yieldFrame();
      }
    }
    const failed = rows.reduce((n, r) => n + r.fail, 0); TEST_STATE.last = { rows, issues, exhaustive, canceled: TEST_STATE.cancel };
    prog.textContent = TEST_STATE.cancel ? 'Canceled. Partial results shown.' : failed ? `${failed} checks failed. Details below.` : 'All completed checks passed.';
  } finally { TEST_STATE.running = App.testing = false; App.paused = beforePause; }
  return TEST_STATE.last;
}
FG.checkFishGeometry = checkFishGeometry; FG.TEST_STATE = TEST_STATE;
/* close-up / test hook: scripted cameras, rest pose and held jaw (used by the render check) */
FG.shoot = { App, setCameraView, look(pos, tgt) { camera.position.set(pos[0], pos[1], pos[2]); controls.target.set(tgt[0], tgt[1], tgt[2]); controls.update(); }, get controls() { return controls; }, rest(on) { window.__fgRest = !!on; }, jaw(v) { window.__fgJaw = v; }, fin(v) { window.__fgFin = v || null; }, get scene() { return scene; }, get camera() { return camera; }, bg(c) { scene.background = new THREE.Color(c); scene.fog = null; }, hide(names) { App.fish.group.traverse(o => { if (o.userData && o.userData.layer && names.includes(o.userData.layer)) o.visible = false; }); } };
/* ── events & boot ── */
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 9. HYBRID + EVOLUTION ENGINE                                     ║
   ║    body-plan aware crossing, habitat syndromes, wonder search,   ║
   ║    gradual evolution (drift · selection · gene flow · novelty)   ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const mixC = (a, b, t) => { const dh = ((b[0] - a[0] + 540) % 360) - 180; return [(a[0] + dh * t + 360) % 360, clamp(lerp(a[1], b[1], t), 0, 1), clamp(lerp(a[2], b[2], t), 0, 1)]; };
const nounOf = n => String(n || 'fish').replace(/\(.*?\)/g, '').trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z-]/g, '') || 'fish';
const LOGP = new Set(['body.length', 'body.fineness', 'body.width', 'body.pedDepth', 'body.snoutDepth', 'head.lengthFrac', 'head.eyeSize', 'mouth.gape', 'swim.freq', 'fins.dorsal.height', 'fins.dorsal2.height', 'fins.dorsal3.height', 'fins.anal.height', 'fins.pectoral.len', 'fins.pelvic.len', 'fins.caudal.len', 'fins.caudal.span', 'fins.caudal.aspect', 'fins.adipose.size', 'head.specialLen', 'head.specialWidth', 'head.barbelLen']);
const blendN = (p, a, b, t) => LOGP.has(p) && a > 0 && b > 0 ? Math.exp(lerp(Math.log(a), Math.log(b), t)) : lerp(a, b, t);
const setN = (g, p, v) => { const e = SCHEMA[p]; v = clamp(v, e.min, e.max); setP(g, p, e.t === 'i' ? Math.round(v) : v); };
const cp3 = v => Array.isArray(v) ? v.slice() : v;
/* every schema path belongs to exactly one organ; organs are inherited as functional units */
const ORGAN_DEFS = [
  ['body', 'struct', p => p.startsWith('body.')], ['face', 'surface', p => /^head\.(lengthFrac|snoutTaper|foreheadSlope|brow|cheek)$/.test(p)],
  ['jaw', 'surface', p => p.startsWith('mouth.')], ['eye', 'surface', p => /^head\.eye/.test(p) || p === 'skin.eye'],
  ['ornament', 'surface', p => /^head\.special/.test(p)], ['barbels', 'surface', p => /^head\.barbel/.test(p)],
  ['gills', 'lineage', p => /^head\.(operculum|gill|spiracles|nostrils)/.test(p)],
  ['dorsal', 'struct', p => /^fins\.dorsal/.test(p)], ['anal', 'struct', p => /^fins\.anal\./.test(p)], ['pectoral', 'struct', p => /^fins\.pectoral\./.test(p)],
  ['pelvic', 'struct', p => /^fins\.pelvic\./.test(p)], ['tail', 'struct', p => /^fins\.caudal\./.test(p) || p.startsWith('swim.')],
  ['extras', 'surface', p => /^fins\.(adipose|finlets)/.test(p)], ['scales', 'surface', p => p === 'skin.scale' || p === 'skin.scaleSize'],
  ['pattern', 'surface', p => /^skin\.(pattern|band)/.test(p)], ['palette', 'surface', p => ['skin.base', 'skin.belly', 'skin.accent', 'skin.fin'].includes(p)],
  ['sheen', 'surface', p => /^skin\.(iridescence|gloss|countershade|lateralLine)$/.test(p)], ['light', 'surface', p => /^skin\.(photophores|glow|translucency|electric|inflate)$/.test(p)]
];
const ORGAN_KIND = {}, ORG_OF = {}, ORG_PATHS = {}, ORGAN_LABEL = { body: 'Body plan', face: 'Head shape', jaw: 'Jaws & teeth', eye: 'Eyes', ornament: 'Head ornament', barbels: 'Barbels', gills: 'Gills', dorsal: 'Dorsal fins', anal: 'Anal fin', pectoral: 'Pectoral fins', pelvic: 'Pelvic fins', tail: 'Tail & swimming', extras: 'Finlets & adipose', scales: 'Scales', pattern: 'Pattern', palette: 'Palette', sheen: 'Sheen & lateral line', light: 'Light organs & skin' };
for (const [id, kind] of ORGAN_DEFS) ORGAN_KIND[id] = kind;
for (const p in SCHEMA) { const d = ORGAN_DEFS.find(x => x[2](p)); ORG_OF[p] = d ? d[0] : '?'; (ORG_PATHS[ORG_OF[p]] = ORG_PATHS[ORG_OF[p]] || []).push(p); }
let _GEN = null; const generic = () => _GEN || (_GEN = defaultGenome());
/** how far an organ departs from a generic fish (0..1): the organ's "signature" */
function signature(g, id) {
  let s = 0, n = 0; const d0 = generic();
  for (const p of ORG_PATHS[id] || []) { const e = SCHEMA[p], v = getP(g, p), d = getP(d0, p); n++;
    if (e.t === 'n' || e.t === 'i') s += Math.min(1, Math.abs(v - d) / Math.max(1e-6, e.max - e.min) * 3);
    else if (e.t === 'hsl') s += Math.min(1, Math.abs(((v[0] - d[0] + 540) % 360) - 180) / 180 * .6 + Math.abs(v[1] - d[1]) * .5 + Math.abs(v[2] - d[2]) * .5);
    else s += v !== d ? 1 : 0; }
  return n ? s / n : 0;
}
/** body-plan class: structural organs are only exchanged between identical plans (names follow the real anatomy families) */
function planOf(g) {
  const fam = anatomyProfile(g).family, b = g.body;
  if (fam === 'upright' || b.posture > 60) return 'upright';
  if (fam === 'ray') return 'ray'; if (fam === 'benthicShark') return 'flatShark'; if (fam === 'flatfish' || Math.abs(b.roll) > 45) return 'flat';
  if (fam === 'knife') return 'knife'; if (fam === 'molid') return 'molid'; if (fam === 'rigid') return 'rigid'; if (fam === 'jawless') return 'jawless'; if (fam === 'pipe') return 'pipe';
  if (fam === 'ribbon' && b.fineness > 8) return 'ribbon'; if (fam === 'chimaera') return 'chimaera';
  return 'std';
}
const shuffle = (rng, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** functional axes (0..1) measured from the genome itself, so every rule reacts to the real fish, invented or not */
const AX = g => {
  const f = g.fins, s = g.skin, m = g.mouth, b = g.body, pierce = ['fang', 'needle', 'triangular'].includes(m.teeth);
  return {
    fast: clamp((b.fineness - 3) / 6, 0, 1) * (f.caudal.present && f.caudal.aspect > 2.6 ? 1 : .55), agile: clamp(f.pectoral.len / 1.1, 0, 1) * (b.fineness < 4.5 ? 1 : .5),
    pred: clamp(m.gape * .8 + (pierce ? .35 : 0), 0, 1), flat: clamp(b.ventralFlat * .8 + (g.head.eyeV > .7 ? .25 : 0) + (Math.abs(b.roll) > 45 ? .6 : 0), 0, 1),
    armor: ['plates', 'scutes', 'ganoid'].includes(s.scale) ? 1 : s.scale === 'denticle' ? .45 : 0,
    camo: ['mottle', 'disruptive', 'saddles', 'spots'].includes(s.pattern) ? clamp(s.patternStrength * (1 - s.iridescence * .5), 0, 1) : 0,
    show: clamp((f.dorsal.height + f.pectoral.len * .5) / 1.6, 0, 1) * (.4 + s.iridescence * .6), dark: clamp(s.photophores / 30, 0, 1), eel: clamp((b.fineness - 7) / 6, 0, 1),
    size: clamp(Math.log10(b.length / .05) / 2.6, 0, 1), glass: s.translucency,
    filter: m.gape > .68 && ['none', 'rasp'].includes(m.teeth) ? clamp((m.gape - .6) / .3, 0, 1) : 0,
    grazer: m.gape < .3 && ['molar', 'beak', 'villiform', 'rasp'].includes(m.teeth) ? clamp((.34 - m.gape) / .2, 0, 1) : 0,
    surface: (m.type === 'superior' ? .6 : 0) + b.dorsalFlat * .4, spiny: f.dorsal.shape === 'spines' || f.dorsal.spines >= 14 ? 1 : 0,
    school: clamp((s.iridescence - .45) * 2, 0, 1) * (b.length < .5 ? 1 : .4), sail: f.dorsal.shape === 'sail' || f.dorsal.height > 1.1 ? 1 : 0, whisker: clamp(g.head.barbels / 4, 0, 1)
  };
};
/* ── plan-coherence rules: these remove the "missing tail" class of defects everywhere (mix, mutate, god mode) ── */
RULE('plan_swim_posture', 'Swim mode, posture and curl agree with the body plan', (g, lm, log) => {
  const a = anatomyProfile(g), lockNoTail = a.locks && a.locks['fins.caudal.present'] === false;
  if (g.swim.mode === 'hippocampiform' && g.body.posture <= 60 && !lockNoTail) setLog(g, log, 'plan_swim_posture', 'swim.mode', g.body.fineness > 9 ? 'anguilliform' : 'subcarangiform');
  if (g.swim.mode === 'rajiform' && a.family !== 'ray') setLog(g, log, 'plan_swim_posture', 'swim.mode', 'subcarangiform');
  if (g.body.curl > .02 && g.body.posture <= 60 && a.family !== 'upright') setLog(g, log, 'plan_swim_posture', 'body.curl', 0);
});
// @@PART js/app.part16.js (16/19) lines 3228-3390 of the original module script -- stripped by build.mjs
RULE('tail_presence', 'A caudal fin exists unless the lineage truly lacks one', (g, lm, log) => {
  const c = g.fins.caudal, a = anatomyProfile(g), plan = planOf(g);
  const may = (a.locks && a.locks['fins.caudal.present'] === false) || ['upright', 'ray', 'knife', 'flatShark'].includes(plan) || !!(g.meta.clade && ['batoid'].some(id => cladePath(g.meta.clade).some(n => n.id === id)));
  if (c.present || may) return;
  setLog(g, log, 'tail_presence', 'fins.caudal.present', true);
  const type = (SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES).find(t => !['filamentous', 'diphycercal'].includes(t)) || 'rounded', ar = CAUDAL_AR[type];
  setLog(g, log, 'tail_presence', 'fins.caudal.type', type); setLog(g, log, 'tail_presence', 'fins.caudal.aspect', +((ar[0] + ar[1]) / 2).toFixed(2));
  setLog(g, log, 'tail_presence', 'fins.caudal.len', .17); setLog(g, log, 'tail_presence', 'fins.caudal.span', +clamp(g.body.pedDepth * 2.4, .85, 1.5).toFixed(2));
  setLog(g, log, 'tail_presence', 'fins.caudal.lobeAsym', 0); setLog(g, log, 'tail_presence', 'fins.caudal.opacity', .85);
});
RULE('tail_visibility', 'The caudal fin flares clearly beyond the peduncle and is never a stub', (g, lm, log) => {
  const c = g.fins.caudal; if (!c.present) return; const a = anatomyProfile(g), molid = a.family === 'molid';
  const need = Math.max(.5, g.body.pedDepth * (molid ? 1.15 : 1.65)), cap = a.tailSpan[1];
  if (c.span < need) { if (need <= cap) setLog(g, log, 'tail_visibility', 'fins.caudal.span', +need.toFixed(3)); else { setLog(g, log, 'tail_visibility', 'fins.caudal.span', cap); clampLog(g, log, 'tail_visibility', 'body.pedDepth', .03, Math.max(.03, cap / (molid ? 1.15 : 1.65))); } }
});
RULE('fin_scale_cap', 'No fin is longer than ~90% of the body (guards crossed and evolved genomes)', (g, lm, log) => {
  const a = anatomyProfile(g), b = g.body, f = g.fins; if (['ray', 'benthicShark', 'glider', 'lion', 'molid'].includes(a.family)) return;
  if (f.pectoral.present) clampLog(g, log, 'fin_scale_cap', 'fins.pectoral.len', .05, Math.max(.2, .86 * b.fineness));
  if (f.dorsal.present) clampLog(g, log, 'fin_scale_cap', 'fins.dorsal.height', .03, Math.max(.3, .9 * b.fineness));
  if (f.anal.present) clampLog(g, log, 'fin_scale_cap', 'fins.anal.height', .03, Math.max(.3, .8 * b.fineness));
});
/** analytic structural audit used to gate every generated fish (returns a list of issues, empty = sound) */
function structuralAudit(g, opts = {}) {
  const out = [], a = anatomyProfile(g), plan = planOf(g), c = g.fins.caudal, f = g.fins, b = g.body;
  const noTailOk = (a.locks && a.locks['fins.caudal.present'] === false) || ['upright', 'ray', 'knife', 'flatShark'].includes(plan);
  if (!c.present && !noTailOk) out.push('tail: no caudal fin on a swimming body plan');
  if (c.present) {
    if (g.swim.mode === 'hippocampiform') out.push('tail: hippocampiform swimmer with a caudal fin');
    if (!(SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES).includes(c.type)) out.push('tail: caudal type does not match swim mode');
    if (c.span < Math.max(.45, b.pedDepth * (a.family === 'molid' ? 1.1 : 1.5))) out.push('tail: fin does not flare beyond the peduncle');
  }
  if (b.posture > 60 && g.swim.mode !== 'hippocampiform') out.push('plan: upright posture without hippocampiform swimming');
  if (g.swim.mode === 'hippocampiform' && !c.present && plan !== 'upright') out.push('tail: hippocampiform swimmer on a non-upright body plan');
  if (b.curl > .05 && b.posture <= 60 && a.family !== 'upright') out.push('plan: curled tail on a non-upright body');
  if (!['ray', 'flatShark', 'molid'].includes(plan) && !['glider', 'lion'].includes(a.family)) {
    if (f.dorsal.present && f.dorsal.height / b.fineness > .95) out.push('fin: dorsal fin taller than 95% of body length');
    if (f.pectoral.present && f.pectoral.len / b.fineness > .9) out.push('fin: pectoral fin longer than 90% of body length');
    if (f.anal.present && f.anal.height / b.fineness > .85) out.push('fin: anal fin taller than 85% of body length');
  }
  if (b.fineness < 1.3 || b.fineness > 17.1) out.push('body: fineness out of range');
  for (const v of coherenceAudit(g, { mesh: !opts.analytic })) out.push(v.code + ': ' + v.msg);   /* round 6H: laws L1-L6, the one shared audit */
  return out;
}

/* ── crossing: organs are inherited as functional units; structure only moves between identical body plans ── */
const both = (P, Q, f1, f2) => (f1(P) && f2(Q)) || (f1(Q) && f2(P));
const SYN = {
  burst: ['Burst-glider', (P, Q) => both(P, Q, p => p.fast > .5, p => p.agile > .55), g => { if (planOf(g) !== 'std') return null; g.fins.pectoral.shape = 'pointed'; setN(g, 'fins.pectoral.len', g.fins.pectoral.len * 1.2); if (g.fins.dorsal.present) g.fins.dorsal.shape = 'falcate'; if (g.fins.caudal.present && ['forked', 'lunate', 'emarginate'].includes(g.fins.caudal.type)) setN(g, 'fins.caudal.aspect', Math.max(g.fins.caudal.aspect, 2.8)); setN(g, 'body.keel', Math.max(g.body.keel, .6)); return 'swept pectorals and a falcate dorsal give speed without losing steering'; }, g => g.fins.pectoral.shape === 'pointed'],
  armour: ['Armoured sprinter', (P, Q) => both(P, Q, p => p.armor > .5, p => p.fast > .5), g => { if (planOf(g) !== 'std') return null; g.skin.scale = 'scutes'; setN(g, 'skin.scaleSize', g.skin.scaleSize * 1.3); setN(g, 'body.keel', 1); for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) g.fins[k].flex = Math.min(g.fins[k].flex, .35); return 'armour is confined to keel scutes, keeping the trunk stiff yet streamlined'; }, g => g.skin.scale === 'scutes'],
  dazzle: ['Dazzle camouflage', (P, Q) => both(P, Q, p => p.camo > .35, p => p.show > .5), g => { g.skin.pattern = 'disruptive'; g.skin.patternStrength = .85; g.skin.band = Math.max(g.skin.band, .6); g.skin.bandColor = [(g.skin.base[0] + 150) % 360, .75, .55]; return 'a broken pattern with a bright flash band confuses predators'; }, g => g.skin.pattern === 'disruptive'],
  counter: ['Counter-illumination', (P, Q) => both(P, Q, p => p.dark > .3, p => p.show > .4), g => { g.skin.photophores = Math.max(g.skin.photophores, 18); g.skin.countershade = .9; return 'silvered flanks over a light-emitting belly erase the silhouette'; }, g => g.skin.photophores >= 10],
  ribbon: ['Ribbon-fin body', (P, Q) => both(P, Q, p => p.eel > .4, p => p.eel < .1), g => { if (planOf(g) !== 'std') return null; setN(g, 'body.fineness', Math.max(g.body.fineness, lerp(g.body.fineness, 7, .6))); Object.assign(g.fins.dorsal, { shape: 'continuous', u0: .2, u1: .97 }); Object.assign(g.fins.anal, { shape: 'continuous', u1: .97 }); g.swim.mode = 'subcarangiform'; g.fins.caudal.type = 'rounded'; return 'a long body whose continuous dorsal and anal fins ripple like an eel\'s'; }, g => g.fins.dorsal.shape === 'continuous'],
  aposematic: ['Warning colours', (P, Q) => P.spiny || Q.spiny, (g, rng) => { if (!g.fins.dorsal.present) return null; g.fins.dorsal.shape = 'spines'; setN(g, 'fins.dorsal.spines', Math.max(g.fins.dorsal.spines, 9)); g.skin.accent = [rng.pick([8, 30, 48]), .85, .52]; return 'a spined dorsal fin is paired with a bright aposematic accent'; }, g => g.fins.dorsal.shape === 'spines'],
  engulfer: ['Engulfing filter-predator', (P, Q) => both(P, Q, p => p.pred > .5, p => p.filter > .4), g => { setN(g, 'mouth.gape', Math.max(g.mouth.gape, .8)); g.mouth.teeth = 'villiform'; setN(g, 'head.lengthFrac', g.head.lengthFrac * 1.08); setN(g, 'swim.freq', g.swim.freq * .8); return 'a very wide gape with fine teeth lets it gulp whole shoals'; }, g => g.mouth.gape >= .7],
  omnivore: ['Omnivore dentition', (P, Q) => both(P, Q, p => p.pred > .45, p => p.grazer > .3), g => { g.mouth.teeth = 'triangular'; setN(g, 'mouth.teethCount', Math.max(10, g.mouth.teethCount * .7)); g.mouth.protrusible = true; return 'piercing teeth are reduced and set behind a protrusible jaw, so it can grab and crop'; }, g => g.mouth.teeth === 'triangular'],
  benthicSprint: ['Low-drag benthic sprinter', (P, Q) => both(P, Q, p => p.flat > .5, p => p.fast > .5), g => { if (planOf(g) !== 'std') return null; setN(g, 'body.ventralFlat', Math.max(g.body.ventralFlat, .45)); setN(g, 'head.eyeV', Math.max(g.head.eyeV, .55)); setN(g, 'fins.pectoral.insertAngle', g.fins.pectoral.insertAngle + 15); setN(g, 'fins.pectoral.len', g.fins.pectoral.len * 1.12); return 'a flat belly and high-set eyes on a streamlined trunk; broad pectorals brace it against current'; }, g => g.body.ventralFlat >= .4],
  mudwalk: ['Walking fins', (P, Q) => both(P, Q, p => p.flat > .4, p => p.surface > .5), g => { if (planOf(g) !== 'std') return null; g.fins.pectoral.shape = 'limb'; g.fins.pectoral.opacity = 1; setN(g, 'head.eyeV', Math.max(g.head.eyeV, .85)); return 'muscular limb-like pectorals and periscope eyes let it prop itself at the water line'; }, g => g.fins.pectoral.shape === 'limb'],
  flash: ['Flash shoaling', (P, Q) => both(P, Q, p => p.show > .45, p => p.school > .5), g => { g.skin.pattern = 'stripes'; g.skin.iridescence = 1; g.skin.countershade = Math.max(g.skin.countershade, .85); return 'bold stripes over mirror-bright flanks make a shoal flicker as it turns'; }, g => g.skin.pattern === 'stripes'],
  ambushSprint: ['Ambush-sprinter', (P, Q) => both(P, Q, p => p.camo > .35, p => p.fast > .5), g => { g.skin.pattern = 'saddles'; g.skin.patternStrength = Math.max(g.skin.patternStrength, .6); setN(g, 'body.keel', Math.max(g.body.keel, .4)); return 'saddle camouflage hides it until a powerful tail launches the strike'; }, g => g.skin.pattern === 'saddles'],
  glass: ['Glass tissue', (P, Q) => P.glass > .35 || Q.glass > .35, (g, rng, P, Q) => { setN(g, 'skin.translucency', Math.max(g.skin.translucency, Math.max(P.glass, Q.glass) * .8)); g.skin.belly[2] = Math.max(g.skin.belly[2], .9); return 'pigment-poor, watery tissue shows through the skin'; }, g => g.skin.translucency >= .25],
  biocamo: ['Living-light camouflage', (P, Q) => both(P, Q, p => p.dark > .3, p => p.camo > .35), g => { g.skin.photophores = Math.max(g.skin.photophores, 14); g.skin.pattern = 'mottle'; return 'a mottled skin dotted with light organs matches the flicker of its surroundings'; }, g => g.skin.photophores >= 8 && g.skin.pattern === 'mottle'],
  sailrun: ['Sail runner', (P, Q) => both(P, Q, p => p.fast > .5, p => p.sail > 0), g => { if (planOf(g) !== 'std' || !g.fins.dorsal.present) return null; g.fins.dorsal.shape = 'sail'; setN(g, 'fins.dorsal.height', Math.max(g.fins.dorsal.height, .9)); g.fins.dorsal.u0 = Math.min(g.fins.dorsal.u0, .15); g.fins.dorsal.u1 = Math.max(g.fins.dorsal.u1, .55); return 'a tall sail raised on a fast, slim body steers shoals of prey'; }, g => g.fins.dorsal.shape === 'sail'],
  whisker: ['Whisker net', (P, Q) => both(P, Q, p => p.whisker > .4, p => p.dark > .3), g => { if (['beak', 'tube'].includes(g.mouth.type)) return null; setN(g, 'head.barbels', Math.max(g.head.barbels, 3)); setN(g, 'head.barbelLen', Math.max(g.head.barbelLen, .6)); g.skin.lateralLine = 1; return 'long barbels and a full lateral line feel prey in the dark'; }, g => g.head.barbels >= 2]
};
/**
 * Cross two genomes. The chassis parent keeps the structural body plan (axis, tail, fins, gills); every other organ is inherited as a unit from whichever
 * parent expresses it more distinctively, then coupled trade-off traits emerge. Structural organs never move between incompatible plans.
 */
function hybridize(A, B, ratio, seed) {
  const rng = new RNG('hyb:' + seed + ':' + ratio), wB = clamp(ratio + rng.gauss() * .07, .03, .97), bIsC = rng.chance(wB);
  const C = bIsC ? B : A, D = bIsC ? A : B, wC = bIsC ? wB : 1 - wB, wD = 1 - wC, cp = planOf(C), dp = planOf(D), compat = cp === dp, g = deepClone(C), organs = {}, dec = {};
  const take = (id, fromD, mode) => {
    const src = fromD ? D : C, oth = fromD ? C : D, w = mode === 'blend' ? rng.range(.2, .48) : mode === 'over' ? -rng.range(.1, .22) : 0;
    for (const p of ORG_PATHS[id] || []) {
      const e = SCHEMA[p], vs = getP(src, p), vo = getP(oth, p);
      if (e.t === 'n' || e.t === 'i') setN(g, p, w > 0 ? blendN(p, vs, vo, w) : w < 0 ? vs + (vs - vo) * -w : vs);
      else if (e.t === 'hsl') setP(g, p, w > 0 ? mixC(vs, vo, w) : vs.slice()); else setP(g, p, cp3(vs));
    }
  };
  const hardHead = x => ['hammer', 'bill', 'sword'].includes(x.head.special), headUnit = hardHead(C) || hardHead(D), headFromD = headUnit ? (hardHead(D) && !hardHead(C) ? rng.chance(.5 + .35 * (wD - .5)) : hardHead(C) && !hardHead(D) ? rng.chance(wD * .35) : rng.chance(wD)) : false;
  for (const [id, kind] of ORGAN_DEFS) {
    if (id === 'gills' || id === 'palette' || id === 'body') continue;
    const blocked = kind === 'struct' && !compat, sC = signature(C, id), sD = signature(D, id); let fromD = false, mode = 'whole';
    if (!blocked) {
      if (headUnit && ['face', 'jaw', 'ornament', 'eye'].includes(id)) { fromD = headFromD; mode = 'whole'; }
      else if (id === 'face' && dec.jaw !== undefined && rng.chance(.65)) fromD = dec.jaw; else if (id === 'anal' && dec.dorsal !== undefined && rng.chance(.7)) fromD = dec.dorsal;
      else fromD = rng.chance(clamp(wD + rng.gauss() * .06 + .22 * (sD - sC), .04, .96));
      if (!(headUnit && ['face', 'jaw', 'ornament', 'eye'].includes(id))) mode = fromD ? rng.weighted({ whole: 4.5, blend: 3.6, over: .9 }) : rng.weighted({ whole: 5.5, blend: 3.5, over: .5 }); take(id, fromD, mode);
    }
    dec[id] = fromD; organs[id] = { from: blocked ? 'plan' : fromD ? 'donor' : 'chassis', mode: blocked ? '-' : mode, sig: [+sC.toFixed(2), +sD.toFixed(2)] };
  }
  const tBody = clamp(wD + rng.gauss() * .06, .04, .96), simple = x => ['std', 'ribbon', 'molid'].includes(x);
  for (const p of ORG_PATHS.body) {
    const vc = getP(C, p), vd = getP(D, p);
    if (compat) setN(g, p, blendN(p, vc, vd, tBody)); else if (['body.fineness', 'body.width', 'body.snoutDepth'].includes(p) && simple(cp) && simple(dp)) setN(g, p, blendN(p, vc, vd, tBody * .38));
  }
  organs.body = { from: compat ? 'blend' : 'plan', mode: compat ? 'blend' : 'pull', sig: [+signature(C, 'body').toFixed(2), +signature(D, 'body').toFixed(2)] };
  if (dec.tail) for (const p of ['body.pedDepth', 'body.pedWidth', 'body.pedU', 'body.tailTaper', 'body.backPow', 'body.superNTail']) setN(g, p, blendN(p, getP(g, p), getP(D, p), .55));
  /* palette: one parent supplies the body colour, the other re-appears as accent, belly tint and fins */
  const palD = rng.chance(clamp(wD + .2 * (signature(D, 'palette') - signature(C, 'palette')), .05, .95)), P1 = palD ? D : C, P2 = palD ? C : D;
  g.skin.base = mixC(P1.skin.base, P2.skin.base, rng.range(.18, .42)); g.skin.belly = mixC(P1.skin.belly, P2.skin.belly, .35 + rng.range(-.1, .15)); g.skin.accent = mixC(P2.skin.accent, P2.skin.base, .5);
  if (Math.abs(g.skin.accent[2] - g.skin.base[2]) < .18) g.skin.accent[2] = clamp(g.skin.base[2] + (g.skin.base[2] > .5 ? -.3 : .3), .05, .95);
  g.skin.fin = mixC(dec.dorsal ? D.skin.fin : C.skin.fin, dec.dorsal ? C.skin.fin : D.skin.fin, .25); organs.palette = { from: palD ? 'donor' : 'chassis', mode: 'blend', sig: [+signature(C, 'palette').toFixed(2), +signature(D, 'palette').toFixed(2)] };
  const pc = C.skin.pattern, pd = D.skin.pattern;
  if (pc !== pd && pc !== 'none' && pd !== 'none') { const keep = g.skin.pattern, other = keep === pc ? pd : pc; g.skin.band = Math.max(g.skin.band, .55); g.skin.bandColor = mixC(P2.skin.accent, P2.skin.base, .4); if (other !== keep) g.meta.layered = other; }
  g.skin.electric = !!(A.skin.electric || B.skin.electric); g.skin.inflate = !!(A.skin.inflate || B.skin.inflate && g.body.width >= .5);
  g.meta = Object.assign({}, C.meta, { seed: String(seed), surfaceSeed: String(seed), species: null, parentSpecies: null, repairs: [], edited: true, novel: true, adapted: C.meta.adapted || null, parents: [A.meta.name, B.meta.name] });
  for (const k of ['evolution', 'mutation', 'notes', 'adaptBase', 'evo', 'layered', 'adaptDone', 'evoTraits']) delete g.meta[k];
  /* emergent trade-off traits: only appear when the two parents really conflict or complement each other */
  const P = AX(A), Q = AX(B), syn = [], order = shuffle(rng, Object.keys(SYN));
  for (const id of order) { if (syn.length >= 4) break; const s = SYN[id]; if (!s[1](P, Q)) continue; const t = s[2](g, rng, P, Q); if (t) syn.push({ id, t: s[0] + ': ' + t + '.' }); }
  if (Math.abs(P.size - Q.size) > .4) syn.push({ id: 'size', t: `Size compromise: ${A.body.length.toFixed(2)} m × ${B.body.length.toFixed(2)} m settles at ${g.body.length.toFixed(2)} m (geometric blend).` });
  const chain = [].concat(A.meta.hybrid ? A.meta.hybrid.chain : [A.meta.name], B.meta.hybrid ? B.meta.hybrid.chain : [B.meta.name]);
  const nounsOf = X => X.meta.hybrid && X.meta.hybrid.nouns && X.meta.hybrid.nouns.length ? X.meta.hybrid.nouns : [nounOf(X.meta.name)];
  let nouns = [...new Set([...nounsOf(A), ...nounsOf(B)])]; if (nouns.length > 3) nouns = [nouns[0], nouns[1], nouns[nouns.length - 1]];
  g.meta.name = nouns.join('-');
  g.meta.hybrid = { a: A.meta.name, b: B.meta.name, nouns, na: nouns[0], nb: nouns[nouns.length - 1], ratio: +ratio.toFixed(2), chassis: C.meta.name, plan: cp, donorPlan: dp, compat, organs, syn, chain: chain.slice(0, 6) };
  return g;
}
/* ── habitat syndromes: the habitat's physical factors × the fish's own ecological role → coupled anatomical changes ── */
const ROLE_TXT = { ambush: 'ambush predator', hunter: 'pursuit hunter', school: 'shoaling forager', grazer: 'grazer', filter: 'filter feeder', bottom: 'bottom dweller', armor: 'armoured browser', ribbon: 'ribbon-bodied lurker', upright: 'upright hoverer', display: 'display fish', generalist: 'generalist' };
function roleOf(g) {
  const P = AX(g), r = { ambush: P.pred * (.3 + P.camo * .8 + (1 - P.fast) * .5 + P.flat * .3), hunter: P.pred * (.25 + P.fast * 1.1), school: (1 - P.pred) * (.2 + P.school), grazer: P.grazer * 1.1, filter: P.filter * 1.2, bottom: P.flat * .95, armor: P.armor * .85, ribbon: P.eel, upright: g.body.posture > 45 ? 2 : 0, display: P.show * .8 };
  const order = Object.keys(r).sort((a, b) => r[b] - r[a]); return { top: r[order[0]] > .12 ? order[0] : 'generalist', second: r[order[1]] > .12 ? order[1] : order[0], r };
}
const PAL_PULL = { openOcean: .6, mesopelagic: .7, abyssal: .85, hadal: .7, sandFlat: .6, polar: .5, kelpForest: .45, rockyShore: .4, seagrass: .5, mangrove: .5, brackish: .45, fastRiver: .45, slowRiver: .5, mountainStream: .45, lake: .45, blackwater: .5, floodplain: .35, cave: .8, coralReef: .12, deepReef: .25, lavaLake: .9, skySea: .5, crystalCavern: .6, void: .9 };
function adaptHab(g, hab, rng) {
  const touched = {}, notes = [], tag = new Set(g.meta.tags || []), keep = p => { if (!(p in touched)) touched[p] = cp3(getP(g, p)); };
  const M = (p, f) => { keep(p); setN(g, p, getP(g, p) * f); }, Dd = (p, d) => { keep(p); setN(g, p, getP(g, p) + d); }, S = (p, v) => { keep(p); setP(g, p, cp3(v)); }, Lm = (p, l) => { keep(p); const c2 = getP(g, p).slice(); c2[2] = clamp(c2[2] * l, .02, .96); setP(g, p, c2); };
