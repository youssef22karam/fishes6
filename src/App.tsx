import { useEffect, useRef } from 'react';
import './engine/fish.css';

export default function App() {
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (window as any).__fgShowError = function (msg: string) {
      const o = document.getElementById('errOverlay'), t = document.getElementById('errText');
      if (o && t) { t.textContent += (t.textContent ? '\n\n' : '') + msg; o.classList.remove('hidden'); }
      else console.error(msg);
    };
    const onErr = (e: ErrorEvent) => (window as any).__fgShowError((e.message || 'Error') + '\n' + (e.filename || '') + ':' + (e.lineno || '') + (e.error && e.error.stack ? '\n' + e.error.stack : ''));
    const onRej = (e: PromiseRejectionEvent) => (window as any).__fgShowError('Unhandled rejection: ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason)));
    addEventListener('error', onErr); addEventListener('unhandledrejection', onRej);
    import('./engine/fishgen.js').then(m => m.boot()).catch(e => (window as any).__fgShowError(String(e && e.stack ? e.stack : e)));
    return () => { removeEventListener('error', onErr); removeEventListener('unhandledrejection', onRej); };
  }, []);

  return (
    <>
      <canvas id="gl" />
      <header className="bar top">
        <div className="brand">IchthyoGen<small>Hyperreal Anatomy Engine / 04 · Procedural genome</small></div>
        <select id="selHabitat" title="Habitat" aria-label="Habitat"></select>
        <button id="btnRandom" className="primary" title="Invent a never-before-seen species adapted to the selected habitat">Random</button>
        <select id="selNiche" title="Niche" aria-label="Ecological niche"></select>
        <select id="selClade" title="Clade" aria-label="Evolutionary clade"></select>
        <select id="selSpecies" title="Species card" aria-label="Reference species"></select>
        <select id="selMix" title="Second parent" aria-label="Mix with"></select>
        <input id="mixRatio" type="range" min="10" max="90" defaultValue="50" title="Share of the second parent (10-90%)" aria-label="Mix ratio" style={{ width: 60, padding: 0, minHeight: 28, border: 0, background: 'none' }} />
        <button id="btnMix" className="primary" title="Cross the current fish with the selected parent">Mix</button>
        <input id="seed" type="text" placeholder="seed" style={{ width: 90 }} title="Seed" aria-label="Generation seed" />
        <button id="btnGenerate">Generate</button>
        <input id="nameInput" type="text" placeholder="Name a creature… e.g. yellowfin tuna" style={{ width: 230, maxWidth: '52vw' }} aria-label="Creature name or description" />
        <button id="btnConvert" className="primary">Convert</button>
      </header>
      <div id="hud"><div id="fishName">…</div><div id="fishSci"></div><div id="fishTags"></div><div id="stats"></div></div>
      <nav className="bar bottom">
        <button data-tab="proc" id="btnProc" className="primary" title="Seeded procedural genome: Random, seed, Mutate, Breed, gallery">Procedural</button>
        <button data-act="generate">New Fish</button>
        <button data-act="discover" title="Invent a coherent species that has never existed">Discover</button>
        <select id="selMutation" title="Which anatomical module to evolve" aria-label="Mutation target" defaultValue="auto">
          <option value="auto">Mutation: guided</option>
          <option value="drift">Adaptive drift</option>
          <option value="donor">Gene flow (from Mix parent)</option>
          <option value="habitat">Adapt to habitat (gradual)</option>
          <option value="innovate">Innovate: new organ</option>
          <option value="speed">Streamlining</option>
          <option value="agility">Body depth</option>
          <option value="finShape">Fin silhouette</option>
          <option value="display">Fin growth</option>
          <option value="tail">Tail propulsion</option>
          <option value="feeding">Head and jaw</option>
          <option value="shelter">Elongation</option>
        </select>
        <button data-act="mutate" id="btnMutate">Mutate</button>
        <button data-act="undo" id="btnUndo" title="Restore the previous genome">Undo</button>
        <button data-act="breed" title="Constrained virtual crossover with the previous fish">Breed</button>
        <button data-act="school" id="btnSchool">School</button>
        <button data-act="mode" id="btnMode">Studio</button>
        <button data-tab="mix" id="btnMixTab">Hybrid Lab</button>
        <button data-tab="evo" id="btnEvoTab">Evolution</button>
        <button data-tab="god" id="btnGod">God Mode</button>
        <button data-tab="inspect">Genome</button>
        <button data-tab="tree">Tree</button>
        <button data-tab="gallery">Gallery</button>
        <button data-tab="text">Text</button>
        <button data-tab="export">Export</button>
        <button data-tab="debug">Debug</button>
        <button data-tab="tests">Tests</button>
        <button data-tab="help">Guide</button>
      </nav>
      <section id="sheet" className="hidden" aria-label="Fish creation tools">
        <div className="sheet-head"><span id="sheetTitle"></span><button id="sheetClose" className="sm" aria-label="Close tools">Close</button></div>
        <div id="sheetBody"></div>
      </section>
      <div id="toast" role="status" aria-live="polite"></div>
      <div id="errOverlay" className="hidden"><h3>Something went wrong</h3><pre id="errText"></pre><button id="errClose">Dismiss</button></div>
    </>
  );
}
