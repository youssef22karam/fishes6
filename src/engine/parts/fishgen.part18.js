  const R = roleOf(g), P = AX(g), role = R.top, plan = planOf(g), upright = plan === 'upright';
  const H = { dark: clamp(1 - Math.pow(hab.light, .35), 0, 1), deep: hab.tags.includes('deep'), cold: hab.tags.includes('cold') || ['abyssal', 'hadal'].includes(hab.id), flow: { fastRiver: 1, mountainStream: 1, slowRiver: .3, rockyShore: .5, kelpForest: .25 }[hab.id] || 0,
    cover: ['coralReef', 'kelpForest', 'mangrove', 'floodplain', 'blackwater', 'crystalCavern', 'deepReef', 'rockyShore', 'seagrass'].includes(hab.id), open: hab.floor === false, bottom: hab.tags.includes('benthic') || ['abyssal', 'hadal', 'sandFlat', 'cave', 'deepReef'].includes(hab.id), turbid: hab.fog > .1 && hab.light < .7 && !hab.fantasy };
  notes.push(`Ecological role here: ${ROLE_TXT[role]}${R.second !== role ? ', with ' + ROLE_TXT[R.second] + ' tendencies' : ''}.`);
  if (H.dark > .25) {
    if (['bottom', 'grazer', 'ribbon', 'armor'].includes(role) || tag.has('cave')) { M('head.eyeSize', 1 - .55 * H.dark); S('skin.lateralLine', 1); if (!['beak', 'tube'].includes(g.mouth.type)) { Dd('head.barbels', Math.round(2 * H.dark)); S('head.barbelLen', Math.max(g.head.barbelLen, .6)); } if (H.dark > .9 && tag.has('cave')) S('head.eyeSide', 'none'); notes.push('Little light reaches the bottom: eyes shrink while a full lateral line and barbels take over sensing.'); }
    else if (role === 'ambush' && H.dark > .55 && !upright) { S('head.special', 'esca'); S('head.specialLen', .22 + .4 * P.pred); S('head.specialWidth', .05); S('skin.photophores', Math.max(g.skin.photophores, 10)); S('skin.glow', [185, .9, .65]); M('mouth.gape', 1.2); if (!['beak', 'tube'].includes(g.mouth.type)) { S('mouth.teeth', 'needle'); S('mouth.teethCount', Math.max(g.mouth.teethCount, 30)); } notes.push('Sit-and-wait predator in the dark: a glowing lure, a wider gape and needle teeth.'); }
    else if (role === 'hunter' && H.dark > .45) { M('head.eyeSize', 1 + .6 * H.dark); M('mouth.gape', 1 + .35 * H.dark); if (!['beak', 'tube'].includes(g.mouth.type)) S('mouth.teeth', 'fang'); S('skin.photophores', Math.round(14 + 30 * H.dark)); S('skin.glow', [rng.range(185, 215), 1, .62]); S('skin.iridescence', 0); Lm('skin.base', .55); notes.push('Dark-water hunter: huge light-gathering eyes, fang-like teeth and a row of belly photophores.'); }
    else if (H.dark > .35) { S('skin.photophores', Math.round(18 + 40 * H.dark * (1 - P.armor * .6))); S('skin.glow', [rng.range(185, 215), 1, .62]); M('head.eyeSize', 1 + .7 * H.dark); S('skin.countershade', .3); Lm('skin.base', .6); notes.push('Counter-illumination: belly light organs match the faint glow from above, and the eyes grow large.'); }
    else { M('head.eyeSize', 1 + H.dark); S('skin.eye', [165, .85, .5]); M('skin.iridescence', 1 - .6 * H.dark); notes.push('Eyes enlarge and gain a reflective layer; the skin sheen is dulled.'); }
    if (H.deep && H.dark > .6 && !upright) { S('skin.translucency', clamp(.2 + .45 * (1 - P.armor), 0, .7)); M('swim.freq', .55); M('fins.dorsal.height', .8); M('body.width', 1.15); S('skin.gloss', .8); notes.push('Food is scarce at depth: watery, low-density tissues and slow strokes save energy.'); }
  }
  if (H.cold) { M('body.length', 1.12); M('skin.iridescence', .6); if (['bottom', 'ambush', 'hunter'].includes(role)) { Dd('skin.translucency', .12); Lm('skin.base', 1.25); } notes.push('Cold water: a larger body, dulled sheen and paler pigment.'); }
  if (H.flow > .3 && !upright) { M('body.fineness', 1 + .18 * H.flow); M('body.pedDepth', 1 - .2 * H.flow); M('fins.pectoral.len', 1 + .3 * H.flow); Dd('body.ventralFlat', .3 * H.flow); Dd('fins.pectoral.insertAngle', 25 * H.flow); M('swim.freq', 1 + .25 * H.flow); notes.push('Fast water: a streamlined trunk, narrow tail root and broad pectorals that pin the body to the bottom.'); }
  if (H.cover && !upright) { M('body.fineness', .87); M('fins.pectoral.len', 1.2); M('fins.caudal.aspect', .85); if (role === 'ambush' || role === 'bottom') { S('skin.pattern', 'disruptive'); S('skin.patternStrength', Math.max(g.skin.patternStrength, .75)); S('skin.patternScale', 1.4); notes.push('Structured habitat: a deeper body, rowing fins and a broken pattern that dissolves against rock and weed.'); } else if (role === 'school') { S('skin.pattern', 'stripes'); notes.push('Structured habitat: a deeper body, rowing fins and vertical-flicker stripes for shoaling among obstacles.'); } else { if (rng.chance(.5)) S('skin.pattern', rng.pick(['bars', 'mottle', 'stripes'])); S('skin.patternStrength', Math.max(g.skin.patternStrength, .65)); notes.push('Structured habitat: a deeper, more manoeuvrable body, rowing fins and bolder markings.'); } if (hab.id === 'coralReef' || hab.id === 'deepReef') Dd('skin.iridescence', .25); }
  if (H.open && H.dark < .5 && !upright) { M('body.fineness', 1.12); S('skin.countershade', .85); Dd('skin.iridescence', .25); M('fins.caudal.aspect', 1.15); M('fins.dorsal.height', .88); notes.push('Open water: a sleeker body, silvered counter-shaded skin and a higher-aspect tail.'); }
  if (H.bottom && !upright) { Dd('body.ventralFlat', .3); Dd('head.eyeV', .18); if (H.deep) M('fins.pelvic.len', 1.5); notes.push('Bottom-hugging form: flattened belly and upward-set eyes' + (H.deep ? ', pelvic fins lengthened into stilts.' : '.')); }
  if (H.turbid && H.dark < .6) { if (['bottom', 'grazer', 'armor'].includes(role) && !['beak', 'tube'].includes(g.mouth.type)) { Dd('head.barbels', 2); S('head.barbelLen', Math.max(g.head.barbelLen, .45)); } S('skin.lateralLine', 1); M('head.eyeSize', .9); if (['school', 'display', 'generalist', 'hunter'].includes(role) && !upright) { S('mouth.type', 'superior'); Dd('body.dorsalFlat', .25); notes.push('Murky surface water: an upturned mouth for the surface film and an enhanced lateral line.'); } else notes.push('Murky water: touch-sensing barbels and a full lateral line replace sight.'); }
  const FX = {
    lavaLake: () => { S('skin.scale', 'plates'); S('skin.photophores', 26); S('skin.glow', [25, 1, .55]); if (g.fins.dorsal.present) S('fins.dorsal.shape', 'spines'); S('skin.base', [10, .3, .08]); S('skin.belly', [18, .9, .45]); return 'Ember form: heat-proof plates, a glowing belly and a spined crest.'; },
    skySea: () => { if (!upright) { S('fins.pectoral.shape', 'wing'); S('fins.pectoral.len', Math.max(g.fins.pectoral.len, 1.9)); S('fins.pectoral.insertAngle', 10); } S('skin.translucency', .6); S('skin.iridescence', 1); return 'Sky form: wing-like pectorals, translucent skin and a rainbow sheen.'; },
    crystalCavern: () => { S('skin.scale', 'plates'); S('skin.translucency', .75); S('skin.gloss', 1); S('skin.iridescence', 1); S('skin.photophores', 10); S('skin.glow', [285, .8, .7]); return 'Crystal form: faceted translucent plates that refract glow.'; },
    void: () => { M('head.eyeSize', 1.6); S('skin.photophores', 60); S('skin.glow', [275, 1, .7]); S('skin.base', [265, .3, .04]); S('skin.belly', [265, .3, .08]); if (!['beak', 'tube'].includes(g.mouth.type)) { S('head.barbels', 4); S('head.barbelLen', 1.2); } return 'Void form: huge eyes, near-black skin, a star-field of lights and long sensory barbels.'; }
  };
  if (FX[hab.id]) notes.push(FX[hab.id]());
  if (['cave', 'mountainStream', 'rockyShore', 'coralReef', 'seagrass'].includes(hab.id) && g.body.length > .9) { M('body.length', .6); notes.push('A small, structured habitat caps body size.'); } else if (hab.id === 'openOcean' && g.body.length < .4) M('body.length', 1.25);
  /* palette: functional colour (camouflage) is pulled strongly toward the habitat; reef colour hardly at all */
  const k = clamp((PAL_PULL[hab.id] || .4) * (.6 + .5 * (P.camo + H.dark * .5)), .1, .9), hr = rng.pick(hab.pal.h), th = rng.range(hr[0], hr[1]), tl = (hab.pal.l[0] + hab.pal.l[1]) / 2, ts = (hab.pal.s[0] + hab.pal.s[1]) / 2;
  for (const [p, w] of [['skin.base', 1], ['skin.accent', .6], ['skin.fin', .75], ['skin.belly', .5]]) { keep(p); const c2 = getP(g, p).slice(), dh = ((th - c2[0] + 540) % 360) - 180; c2[0] = (c2[0] + dh * k * w + 360) % 360; c2[1] = clamp(lerp(c2[1], Math.min(c2[1], ts * 1.35 + .1), k * .6 * w), 0, 1); if (p !== 'skin.belly') c2[2] = clamp(lerp(c2[2], tl, (.3 * H.dark + .1) * k), .03, .95); setP(g, p, c2); }
  const ba = g.skin.base, ac = g.skin.accent; if (Math.abs(ac[2] - ba[2]) < .14) S('skin.accent', [ac[0], ac[1], clamp(ba[2] + (ba[2] > .45 ? -.28 : .28), .05, .95)]);
  notes.push(`Colour is pulled ${Math.round(k * 100)}% toward the ${hab.n.toLowerCase()} palette.`);
  g.meta.adapted = { from: (g.meta.adapted && g.meta.adapted.from) || g.meta.habitat, to: hab.id, speculative: false }; g.meta.habitat = hab.id;
  return { notes, touched };
}
function nameHybrid(c, hab) { if (!c.meta.hybrid) return; const h = c.meta.hybrid, ad = HAB_ADJ[hab.id] || hab.n.toLowerCase(); c.meta.name = (ad.charAt(0).toUpperCase() + ad.slice(1) + ' ' + (h.nouns || [h.na, h.nb]).join('-')).trim(); c.meta.sci = 'Chimaerichthys ' + h.na.slice(0, 4) + h.nb.slice(0, 4) + 'ensis (hybrid concept)'; }
// @@PART js/app.part17.js (17/19) lines 3391-3568 of the original module script -- stripped by build.mjs
/** Adapt an unfinalised genome to a habitat, repair, audit and name it (retries with fresh draws if anything is unsound). */
function adaptFinish(pre, habId, seed) {
  const hab = HABITATS[habId]; let c;
  for (let i = 0; i < 4; i++) {
    c = deepClone(pre); c.meta.repairs = []; const r2 = new RNG('adapt:' + seed + habId + i);
    c.meta.adapted = { from: pre.meta.adapted ? pre.meta.adapted.from : pre.meta.habitat, to: habId, speculative: false }; c.meta.habitat = habId; finalize(c, r2);
    const res = adaptHab(c, hab, r2); c.meta.notes = res.notes; c.meta.adaptBase = res.touched; c.meta.repairs = []; finalize(c, r2);
    if (c.meta.hybrid) c.meta.hybrid.syn = c.meta.hybrid.syn.filter(s => !SYN[s.id] || SYN[s.id][3](c));
    if (!violations(c).length && !structuralAudit(c).length) break;
    if (i === 2) { pre = deepClone(pre); pre.head.special = 'none'; pre.head.specialLen = SCHEMA['head.specialLen'].def; }
  }
  nameHybrid(c, hab); return c;
}
/** Re-adapt to another habitat from the pre-adaptation state, so habitat changes never compound. */
function rehabitat(g, habId) {
  const pre = deepClone(g), base = g.meta.adaptBase; if (base) for (const p in base) if (SCHEMA[p]) setP(pre, p, cp3(base[p]));
  return adaptFinish(pre, habId, Math.random().toString(36).slice(2, 8));
}
function parentFrom(val, habId, seed) {
  const [k, id] = val.split(':');
  if (k === 'sp') { const s = SPECIES.find(x => x.id === id); return generate({ species: id, habitat: s.habitat, seed, noAdapt: true }); }
  if (k === 'ni') { let best = null, bw = 0; for (const h in HABITATS) { const w = HABITATS[h].niches[id] || 0; if (w > bw) { bw = w; best = h; } } return generate({ niche: id, habitat: best || habId, noSpecies: true, seed }); }
  return invent(habId, seed);
}

/* ── phenotype distance: every evolutionary event must change something visible ── */
function phenoDelta(a, b) {
  let s = 0;
  for (const p in SCHEMA) {
    const e = SCHEMA[p], x = getP(a, p), y = getP(b, p);
    if (e.t === 'n' || e.t === 'i') s += (/^(fins|body|head|mouth)\./.test(p) ? 1 : .6) * Math.min(.5, Math.abs(x - y) / Math.max(1e-6, e.max - e.min));
    else if (e.t === 'hsl') s += .5 * Math.abs(((x[0] - y[0] + 540) % 360) - 180) / 180 + .25 * Math.abs(x[1] - y[1]) + .25 * Math.abs(x[2] - y[2]);
    else if (x !== y) s += .12;
  }
  return s;
}
const mx = (g, p, v) => setN(g, p, Math.max(getP(g, p), v)), mn = (g, p, v) => setN(g, p, Math.min(getP(g, p), v));
const NOSNOUT = g => ['beak', 'tube'].includes(g.mouth.type), STDLIKE = X => ['std', 'flat', 'ribbon', 'pipe', 'chimaera', 'rigid'].includes(X.plan);
/** Key innovations: each develops through stages (bud → working organ → elaborated), only where the fish's ecology and body plan allow it. */
const NOVELTIES = [
  { id: 'lure', n: 'Glowing lure', st: ['a fleshy bud sprouts on the snout', 'the bud lengthens into a flexible rod', 'the rod ends in a luminous bulb'], can: (g, X) => !['esca', 'bill', 'sword', 'hammer'].includes(g.head.special) && STDLIKE(X) && (X.role === 'ambush' || X.role === 'bottom' || X.dark > .3), w: (g, X) => .6 + (X.role === 'ambush' ? 2.2 : 0) + X.dark * 2, ap: (g, s, r, X) => { g.head.special = 'esca'; setN(g, 'head.specialLen', [.1, .24, .4][s - 1]); setN(g, 'head.specialWidth', [.03, .042, .055][s - 1]); if (s >= 2 && X.dark > .12) { mx(g, 'skin.photophores', s * 7); g.skin.glow = [r.range(170, 200), .9, .65]; } if (s === 3) mx(g, 'mouth.gape', .55); } },
  { id: 'barbels', n: 'Sensory barbels', st: ['two short taste-buds appear at the lip', 'the barbels lengthen', 'a full whisker set senses prey by touch'], can: (g, X) => !NOSNOUT(g) && STDLIKE(X) && g.head.barbels < 4 && (['bottom', 'grazer', 'ambush', 'ribbon'].includes(X.role) || X.dark > .3 || X.turbid), w: (g, X) => .8 + (X.role === 'bottom' ? 1.6 : 0) + X.dark * 1.5, ap: (g, s) => { mx(g, 'head.barbels', [2, 2, 4][s - 1]); mx(g, 'head.barbelLen', [.3, .55, .85][s - 1]); if (s === 3) g.skin.lateralLine = 1; } },
  { id: 'photo', n: 'Light organs', st: ['a few light organs dot the belly', 'rows of photophores form along the flanks', 'a dense constellation of lights covers the body'], can: (g, X) => (X.dark > .25 || X.fantasy) && g.skin.photophores < 50, w: (g, X) => .6 + X.dark * 2.6, ap: (g, s, r) => { mx(g, 'skin.photophores', [8, 22, 44][s - 1]); if (s === 1) g.skin.glow = [r.range(170, 215), .95, .62]; if (s === 3) mn(g, 'skin.gloss', 1); } },
  { id: 'armor', n: 'Bony armour', st: ['scales thicken and gloss over', 'ridged scutes run along the keel', 'interlocking armour plates cover the flanks'], can: (g, X) => STDLIKE(X) && g.skin.scale !== 'plates' && X.plan !== 'ribbon', w: (g, X) => .5 + (X.role === 'armor' ? 2 : 0) + (X.role === 'bottom' ? 1 : 0) - X.P.fast * .3, ap: (g, s) => { if (s === 1) { setN(g, 'skin.scaleSize', g.skin.scaleSize * 1.25); mx(g, 'skin.gloss', .55); } if (s === 2) { g.skin.scale = 'scutes'; mx(g, 'body.keel', .7); } if (s === 3) { g.skin.scale = 'plates'; setN(g, 'skin.scaleSize', Math.max(1.8, g.skin.scaleSize)); for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) g.fins[k].flex = Math.min(g.fins[k].flex, .35); } } },
  { id: 'sail', n: 'Sail fin', st: ['the dorsal fin lifts and sweeps back', 'the fin extends into a tall crest', 'a full display sail fans open'], can: (g, X) => STDLIKE(X) && g.fins.dorsal.present && g.fins.dorsal.shape !== 'sail' && g.fins.dorsal.height < 1.3, w: (g, X) => .6 + X.P.show * 1.5 + (X.role === 'display' ? 1.5 : 0), ap: (g, s, r) => { if (s === 1) { g.fins.dorsal.shape = g.fins.dorsal.shape === 'spines' ? 'spines' : 'falcate'; setN(g, 'fins.dorsal.height', g.fins.dorsal.height * 1.3); } if (s === 2) setN(g, 'fins.dorsal.height', Math.max(g.fins.dorsal.height * 1.25, .8)); if (s === 3) { g.fins.dorsal.shape = 'sail'; mx(g, 'fins.dorsal.height', 1); g.fins.dorsal.u0 = Math.min(g.fins.dorsal.u0, .18); g.fins.dorsal.u1 = Math.max(g.fins.dorsal.u1, .6); g.skin.fin = [(g.skin.base[0] + r.range(120, 200)) % 360, .75, .5]; } } },
  { id: 'streamers', n: 'Trailing streamers', st: ['the pelvic fins lengthen', 'pelvic fins draw out into filaments', 'filaments trail from pelvic and dorsal fins'], can: (g, X) => STDLIKE(X) && g.fins.pelvic.present && g.fins.pelvic.shape !== 'filament', w: (g, X) => .6 + X.P.show, ap: (g, s) => { setN(g, 'fins.pelvic.len', g.fins.pelvic.len * (s === 1 ? 1.5 : 1.2)); if (s >= 2) g.fins.pelvic.shape = 'filament'; if (s === 3 && g.fins.dorsal.present && g.fins.dorsal.shape !== 'sail') { g.fins.dorsal.shape = 'filament'; setN(g, 'fins.dorsal.height', g.fins.dorsal.height * 1.25); } } },
  { id: 'veil', n: 'Veil tail', st: ['the tail broadens', 'the tail flows into long, soft lobes', 'a full veil-tail with floating margins'], can: (g, X) => STDLIKE(X) && g.fins.caudal.present && g.fins.caudal.type !== 'fantail' && X.P.fast < .55 && X.plan !== 'ribbon' && X.plan !== 'rigid', w: (g, X) => .5 + (1 - X.P.fast) + (X.role === 'display' ? 1.4 : 0), ap: (g, s) => { setN(g, 'fins.caudal.span', g.fins.caudal.span * [1.12, 1.18, 1.15][s - 1]); if (s >= 2) { g.swim.mode = 'subcarangiform'; g.fins.caudal.type = 'fantail'; g.fins.caudal.flex = Math.max(g.fins.caudal.flex, .8); g.fins.caudal.opacity = Math.min(g.fins.caudal.opacity, .75); } if (s === 3) setN(g, 'fins.caudal.len', Math.max(g.fins.caudal.len, .34)); } },
  { id: 'spines', n: 'Venomous spines', st: ['dorsal rays harden into spines', 'the spines lengthen and spread', 'a crown of warning-coloured spines'], can: (g, X) => STDLIKE(X) && g.fins.dorsal.present && !(g.fins.dorsal.shape === 'spines' && g.fins.dorsal.spines >= 12), w: (g, X) => .6 + (X.role === 'bottom' ? 1.2 : 0) + (X.role === 'ambush' ? 1 : 0), ap: (g, s, r) => { mx(g, 'fins.dorsal.spines', [6, 9, 13][s - 1]); if (s >= 2) g.fins.dorsal.shape = 'spines'; if (s === 3) g.skin.accent = [r.pick([6, 28, 46]), .9, .52]; } },
  { id: 'warn', n: 'Warning bands', st: ['a pale band appears across the flank', 'the band hardens into bold contrast', 'bold warning bars advertise danger'], can: (g, X) => g.skin.band < .75 && g.skin.pattern !== 'bars', w: (g, X) => .6 + (X.hab.id === 'coralReef' ? 1.4 : 0) + (X.P.spiny ? 1.6 : 0), ap: (g, s, r) => { setN(g, 'skin.band', [.4, .6, .8][s - 1]); g.skin.bandColor = [(g.skin.base[0] + r.range(150, 210)) % 360, .8, .55]; if (s === 3) { g.skin.pattern = 'bars'; mx(g, 'skin.patternStrength', .75); } } },
  { id: 'silver', n: 'Mirror skin', st: ['the flanks begin to silver', 'a counter-shaded mirror sheen forms', 'mirror-bright flanks blink as it turns'], can: (g, X) => g.skin.iridescence < .9 && X.dark < .6, w: (g, X) => .5 + (X.role === 'school' ? 2 : 0) + (X.hab.floor === false ? 1.2 : 0), ap: (g, s) => { mx(g, 'skin.iridescence', [.45, .7, .95][s - 1]); mx(g, 'skin.countershade', [.5, .75, .9][s - 1]); } },
  { id: 'eyes', n: 'Night vision', st: ['the eyes enlarge and warm in colour', 'the eyes grow a reflective layer', 'huge, forward-set tapetum eyes gather every photon'], can: (g, X) => g.head.eyeSide !== 'none' && X.dark > .15 && g.head.eyeSize < .45, w: (g, X) => .5 + X.dark * 2.2, ap: (g, s) => { setN(g, 'head.eyeSize', g.head.eyeSize * [1.15, 1.12, 1.15][s - 1]); g.skin.eye = [[150, .6, .46], [165, .85, .5], [178, .95, .58]][s - 1]; if (s === 3) setN(g, 'head.eyeForward', g.head.eyeForward + .08); } },
  { id: 'periscope', n: 'Periscope eyes', st: ['the eyes shift upward on the skull', 'the eyes ride higher on bony brows', 'periscope eyes watch from the waterline'], can: (g, X) => g.head.eyeSide !== 'none' && STDLIKE(X) && g.head.eyeV < .8 && (X.role === 'bottom' || X.role === 'ambush' || X.P.surface > .3), w: (g, X) => .4 + (X.role === 'bottom' ? 1.5 : 0) + X.P.surface * 2, ap: (g, s) => { mx(g, 'head.eyeV', [.5, .68, .85][s - 1]); if (s >= 2) mx(g, 'head.brow', .5); } },
  { id: 'fangs', n: 'Piercing teeth', st: ['the teeth sharpen', 'long needle teeth line the jaws', 'fangs and a wider gape for gripping prey'], can: (g, X) => !NOSNOUT(g) && g.mouth.teeth !== 'fang' && STDLIKE(X) && X.role !== 'filter' && X.role !== 'grazer', w: (g, X) => .5 + X.P.pred * 2, ap: (g, s) => { g.mouth.teeth = ['villiform', 'needle', 'fang'][s - 1]; mx(g, 'mouth.teethCount', [30, 26, 16][s - 1]); setN(g, 'mouth.gape', g.mouth.gape * 1.08); } },
  { id: 'crushers', n: 'Crushing jaws', st: ['the teeth blunt into pavement', 'a stout jaw bears molar plates', 'a powerful beak-like crushing mouth'], can: (g, X) => !NOSNOUT(g) && STDLIKE(X) && !['molar', 'beak'].includes(g.mouth.teeth) && (X.role === 'grazer' || X.role === 'armor' || X.role === 'bottom'), w: (g, X) => .4 + X.P.grazer * 2 + X.P.armor, ap: (g, s) => { g.mouth.teeth = s === 1 ? 'villiform' : 'molar'; if (s === 3) setN(g, 'head.cheek', Math.max(g.head.cheek, .6)); setN(g, 'mouth.gape', g.mouth.gape * .9); mx(g, 'mouth.teethCount', 14); } },
  { id: 'electric', n: 'Electric organ', st: ['muscle tissue begins to hum with charge', 'an electric organ lights the flanks', 'a strong electric discharge organ'], can: (g, X) => !g.skin.electric && (['ribbon', 'knife', 'std'].includes(X.plan)) && (X.turbid || X.dark > .25 || X.hab.id === 'blackwater' || X.hab.id === 'floodplain'), w: (g, X) => .4 + (X.plan === 'ribbon' || X.plan === 'knife' ? 1.8 : 0) + X.dark, ap: (g, s) => { if (s >= 2) g.skin.electric = true; if (s === 3) { g.skin.glow = [200, .8, .62]; mx(g, 'skin.photophores', 6); } } },
  { id: 'inflate', n: 'Defensive inflation', st: ['the belly stretches', 'the skin hardens into prickles', 'it can balloon into a spiny sphere'], can: (g, X) => !g.skin.inflate && ['std', 'rigid'].includes(X.plan) && g.body.fineness < 5, w: () => .5, ap: (g, s) => { if (s === 1) setN(g, 'body.width', Math.min(.8, g.body.width * 1.15)); if (s === 2) { g.skin.scale = 'denticle'; setN(g, 'body.width', Math.min(.85, g.body.width * 1.1)); } if (s === 3) { g.skin.inflate = true; mx(g, 'fins.dorsal.spines', 4); } } },
  { id: 'glass', n: 'Glass tissue', st: ['pigment thins out', 'the body turns half-transparent', 'near-invisible glass body'], can: (g, X) => g.skin.translucency < .6 && STDLIKE(X) && (X.dark > .2 || X.hab.floor === false), w: (g, X) => .4 + X.dark * 1.5 + (X.hab.floor === false ? .8 : 0), ap: (g, s) => { mx(g, 'skin.translucency', [.25, .45, .68][s - 1]); g.skin.belly[2] = Math.max(g.skin.belly[2], .86); } },
  { id: 'finlets', n: 'Speed finlets', st: ['small finlets bud behind the dorsal', 'a row of finlets forms', 'keeled finlets and a scute-ridged tail root'], can: (g, X) => g.fins.finlets.count < 5 && X.plan === 'std' && X.P.fast > .3 && g.fins.caudal.present, w: (g, X) => .3 + X.P.fast * 2.2, ap: (g, s) => { mx(g, 'fins.finlets.count', [3, 5, 7][s - 1]); if (s === 3) mx(g, 'body.keel', .8); } },
  { id: 'walk', n: 'Walking fins', st: ['the pectoral fins thicken at the base', 'the fins grow muscular and limb-like', 'it props itself on limb-fins to walk'], can: (g, X) => STDLIKE(X) && g.fins.pectoral.present && g.fins.pectoral.shape !== 'limb' && X.role === 'bottom' && !X.deep, w: () => .6, ap: (g, s) => { if (s === 1) mx(g, 'fins.pectoral.baseLen', .3); if (s >= 2) g.fins.pectoral.shape = 'limb'; if (s === 3) { g.fins.pectoral.opacity = 1; mx(g, 'head.eyeV', .75); } } },
  { id: 'camo', n: 'Cryptic skin', st: ['blotches break up the outline', 'the pattern deepens into mottle', 'a leaf-litter disguise hides the fish'], can: (g, X) => g.skin.pattern !== 'mottle' || g.skin.patternStrength < .85, w: (g, X) => .5 + (X.role === 'bottom' || X.role === 'ambush' ? 2 : 0) + (X.hab.id === 'kelpForest' || X.hab.id === 'seagrass' ? 1 : 0), ap: (g, s) => { g.skin.pattern = s === 1 ? 'spots' : 'mottle'; mx(g, 'skin.patternStrength', [.5, .7, .88][s - 1]); g.skin.iridescence = Math.min(g.skin.iridescence, [.5, .3, .15][s - 1]); } },
  { id: 'wings', n: 'Gliding wings', st: ['the pectoral fins broaden', 'the fins stretch into airfoils', 'wing-like pectorals let it glide'], can: (g, X) => STDLIKE(X) && g.fins.pectoral.present && g.fins.pectoral.shape !== 'wing' && X.plan === 'std' && (X.hab.floor === false || X.hab.id === 'skySea') && X.role !== 'bottom', w: () => .35, ap: (g, s) => { setN(g, 'fins.pectoral.len', g.fins.pectoral.len * [1.25, 1.3, 1.2][s - 1]); if (s >= 2) g.fins.pectoral.shape = 'wing'; if (s === 3) mx(g, 'fins.pectoral.len', 1.7); } }
];
const NOV = Object.fromEntries(NOVELTIES.map(n => [n.id, n]));
function ecoCtx(g) {
  const hab = HABITATS[g.meta.habitat] || HABITATS.coralReef, P = AX(g), R = roleOf(g), plan = planOf(g), dark = clamp(1 - Math.pow(hab.light, .35), 0, 1);
  return { hab, P, role: R.top, plan, upright: plan === 'upright', dark, deep: hab.tags.includes('deep'), fantasy: !!hab.fantasy, turbid: hab.fog > .1 && hab.light < .7 && !hab.fantasy };
}
const cleanName = n => String(n || 'fish').replace(/^Evolved\s+/i, '').replace(/\s*[/·]\s*(step|gen)\s*\d+$/i, '');
function evoState(g) {
  const e = g.meta.evo || {}, st = { step: e.step || 0, base: e.base || cleanName(g.meta.name), nov: Object.assign({}, e.nov), don: e.don ? { val: e.don.val, seed: e.don.seed, done: !!e.don.done, anc: e.don.anc || 0, L0: e.don.L0 || 0, th: e.don.th ? Object.assign({}, e.don.th) : null, prog: Object.assign({}, e.don.prog) } : null, hab: e.hab ? { id: e.hab.id, p: e.hab.p, t: Object.assign({}, e.hab.t), seed: e.hab.seed, notes: (e.hab.notes || []).slice(), base: e.hab.base ? Object.assign({}, e.hab.base) : null, adapted: e.hab.adapted ? Object.assign({}, e.hab.adapted) : null } : null, last: e.last ? Object.assign({}, e.last) : null, log: (e.log || []).slice(-13) };
  return st;
}
/* ── event 1: coupled adaptive drift (momentum gives orthogenetic trends instead of a random walk) ── */
function evDrift(c, st, rng, X, mag, only) {
  const ids = ['speed', 'agility', 'feeding', 'shelter', 'display', 'finShape', 'tail', 'robust', 'pigment'], tags = new Set(c.meta.tags || []), w = {};
  for (const id of ids) w[id] = (tags.has(ADAPTATIONS[id].weight) ? 3 : 1) * (X.upright && ['speed', 'agility', 'tail', 'shelter'].includes(id) ? .2 : 1) * (id === 'tail' && !c.fins.caudal.present ? 0 : 1);
  const picks = only ? [only] : []; if (!only && st.last && w[st.last.id] && rng.chance(.55)) picks.push(st.last.id);
  const want = only ? 1 : rng.int(2, 3); while (picks.length < want) { const id = rng.weighted(w); if (!picks.includes(id)) picks.push(id); }
  const lines = []; let first = null;
  for (const id of picks) {
    const dir = st.last && id === st.last.id && rng.chance(.7) ? st.last.dir : (rng.chance(.5) ? 1 : -1); first = first || { id, dir };
    applyAdaptation(c, id, dir * mag * rng.range(.85, 1.2) * (picks.length > 1 ? .8 : 1), true); lines.push(`${ADAPTATIONS[id].label} ${dir > 0 ? 'increases' : 'decreases'}: ${ADAPTATIONS[id].desc}`);
  }
  const dh = rng.range(-9, 9) * (.5 + mag * 3); for (const p of ['skin.base', 'skin.accent', 'skin.fin']) { const v = getP(c, p).slice(); v[0] = (v[0] + dh + 360) % 360; setP(c, p, v); }
  setN(c, 'skin.patternScale', c.skin.patternScale * rng.range(.92, 1.1)); st.last = first;
  return { kind: 'drift', title: 'Adaptive drift', lines: lines.concat(`Pigment drifts ${dh > 0 ? '+' : ''}${dh.toFixed(0)}° in hue.`) };
}
const JUMP_TRAITS = [['body.fineness', 1], ['body.width', .3], ['body.pedDepth', .1], ['head.lengthFrac', .1], ['mouth.gape', .15], ['fins.dorsal.height', .3], ['fins.pectoral.len', .3], ['fins.anal.height', .3], ['fins.caudal.span', .6]];
/** largest relative distance between the fish and a target on the shape-defining traits (used to cap how much of the gap one step may close) */
function gapOf(c, getT, paths) { let w = 0; for (const [p, fl] of JUMP_TRAITS) { if (paths && !paths.has(p)) continue; const x = getP(c, p), y = getT(p); if (typeof x === 'number' && typeof y === 'number') w = Math.max(w, Math.abs(y - x) / Math.max(Math.abs(x), fl)); } return w; }
const STEP_LIM = .27;
/* ── event 2: gene flow. Donor ancestry rises a little each step; every organ has its own adoption threshold, so
   body, colour, fins and jaws move at different times (continuous traits blend, discrete traits switch at 50%) ── */
const TH_RANGE = { body: [.12, .34], palette: [.05, .4], pattern: [.1, .55], scales: [.2, .65], sheen: [.1, .55], light: [.3, .75], face: [.2, .5], jaw: [.25, .55], eye: [.15, .55], ornament: [.45, .85], barbels: [.3, .75], dorsal: [.2, .5], anal: [.2, .55], pectoral: [.2, .55], pelvic: [.3, .65], tail: [.4, .75], extras: [.4, .85] };
const easeP = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
function donorThresholds(seed) {
  const r = new RNG('th:' + seed), th = {}; for (const id in TH_RANGE) th[id] = r.range(TH_RANGE[id][0], TH_RANGE[id][1]);
  th.tail = Math.max(th.tail, th.body + .14); th.anal = (th.anal + th.dorsal) / 2; th.face = (th.face + th.jaw) / 2 + .02; return th;
}
function evDonor(c, st, rng, X, mag) {
  if (!st.don) return null; const dn = st.don; if (dn.done) return null;
  if (!dn.th) dn.th = donorThresholds(dn.seed);
  const D = parentFrom(dn.val, c.meta.habitat, dn.seed), cp = planOf(c), compat = cp === planOf(D), W = .46, lines = [];
  const adopt = ORGAN_DEFS.filter(([id, kind]) => id !== 'gills' && id in dn.th && !(kind === 'struct' && !compat) && !(id === 'jaw' && ['upright', 'pipe'].includes(cp))).map(x => x[0]);
  const a0 = dn.anc, moved = []; let a1 = a0;
  /* if no organ is due yet at this ancestry, let ancestry rise further within the same click so a step never stalls */
  for (let spin = 0; spin < 10 && !moved.length && a1 < 1; spin++) {
  a1 = Math.min(1, a1 + rng.range(.075, .115) * (.8 + mag * 2.2));
  for (const [id, kind] of ORGAN_DEFS) {
    if (id === 'gills' || !(id in dn.th)) continue; if (kind === 'struct' && !compat) continue; if (id === 'jaw' && ['upright', 'pipe'].includes(cp)) continue;
    const p0 = dn.prog[id] || 0; if (a1 >= 1 && p0 >= .99 && p0 < 1) { dn.prog[id] = 1; continue; } let p1 = a1 >= 1 ? 1 : easeP((a1 - dn.th[id] + W) / (2 * W)); if (p1 <= p0 + .004) continue;
