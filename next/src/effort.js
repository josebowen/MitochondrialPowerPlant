// Effort report: time on open decisions plus optional work. A proxy for effort, not a measure of learning.
// EF.watch(fn): fn returns the label of the decision now open, or null. EF.extra(label): one piece of optional work.
const EF = (() => {
  const items = [], opt = {}; let cur = null, fn = null, last = Date.now(), act = Date.now(), seen = new Set();
  const tick = () => {
    const n = Date.now(); let lab = null; try { lab = fn ? fn() : null; } catch (e) { }
    if (cur && lab !== cur.label) cur = null;
    if (lab && !cur) { cur = items.find((i) => i.label === lab); if (!cur) { cur = { label: lab, ms: 0, rev: 0 }; items.push(cur); } seen = new Set(); }
    if (cur && !document.hidden && n - act < 90000) cur.ms += Math.min(n - last, 2000);
    last = n;
  };
  setInterval(tick, 400);
  ['pointerdown', 'keydown', 'input'].forEach((e) => addEventListener(e, () => { act = Date.now(); }, true));
  addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('input[type=radio],label,.pick,.pred,.chip,.pick button,.opt'); if (!t) return; tick(); if (!cur) return;
    const i = t.matches('label') ? t.querySelector('input') : t; if (!i) return;
    const k = i.name || i.dataset.k || (i.parentElement && (i.parentElement.id || i.parentElement.getAttribute('aria-label'))) || 'x';
    if (seen.has(k)) cur.rev++; else seen.add(k);
  }, true);
  const mmss = (ms) => { const s = Math.round(ms / 1000); return (s >= 60 ? Math.floor(s / 60) + ' min ' : '') + (s % 60) + ' s'; };
  const sum = () => { tick(); const d = items.filter((i) => i.ms > 400), tot = d.reduce((a, i) => a + i.ms, 0), top = d.slice().sort((a, b) => b.ms - a.ms)[0], rev = d.reduce((a, i) => a + i.rev, 0), ex = Object.entries(opt); return { d, tot, top, rev, ex }; };
  return {
    watch(f) { fn = f; }, extra(k) { opt[k] = (opt[k] || 0) + 1; }, tick, items, opt,
    html() {
      const { d, tot, top, rev, ex } = sum(); if (!d.length) return '';
      return `<h3>Effort</h3><p class="small ef">Time on decisions: <b>${mmss(tot)}</b> across ${d.length} ${d.length === 1 ? "decision" : "decisions"}. ${top ? `Longest: ${top.label} (${mmss(top.ms)}). ` : ''}Answers changed before committing: ${rev}. Optional work: ${ex.length ? ex.map(([k, n]) => `${k}${n > 1 ? ' ×' + n : ''}`).join(', ') : 'none'}.</p><p class="small ef hint">The clock runs only while a decision is open and you are active. Time is a very rough stand-in for effort. It is not a measure of learning, and it is not scored.</p>`;
    },
    text() { const { d, tot, top, rev, ex } = sum(); return `Effort: ${mmss(tot)} on ${d.length} decisions${top ? `; longest ${top.label} (${mmss(top.ms)})` : ''}; answers changed before committing ${rev}; optional work: ${ex.length ? ex.map(([k, n]) => k + (n > 1 ? ' x' + n : '')).join(', ') : 'none'}`; },
  };
})();
export { EF };
