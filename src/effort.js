// Effort report: time on open decisions, time spent working after a wrong answer, time against
// confidence and correctness, and optional work. A very rough stand-in for effort, not a measure of learning.
// EF.watch(fn): fn returns the label of the decision now open, or null.
// EF.mark({ ok, conf }): how the decision just committed turned out (conf 0 guessing, 1 fairly sure, 2 very sure).
// EF.wrong(): a wrong answer was just shown. EF.resolved(): the player has answered again or moved on.
// EF.extra(label): one piece of optional work or a voluntary return to the evidence.
const EF = (() => {
  const items = [], opt = {}, CONF = ['Guessing', 'Fairly sure', 'Very sure'];
  let cur = null, prev = null, fn = null, last = Date.now(), act = Date.now(), seen = new Set(), aw = null; const after = [];
  const live = (n) => !document.hidden && n - act < 90000;
  const tick = () => {
    const n = Date.now(); let lab = null; try { lab = fn ? fn() : null; } catch (e) { }
    if (cur && lab !== cur.label) { prev = cur; cur = null; }
    if (lab && !cur) { cur = items.find((i) => i.label === lab); if (!cur) { cur = { label: lab, ms: 0, rev: 0 }; items.push(cur); } seen = new Set(); }
    const d = Math.min(n - last, 2000);
    if (cur && live(n)) cur.ms += d;
    if (aw && live(n)) aw.ms += d;
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
  const avg = (a) => (a.length ? mmss(a.reduce((x, i) => x + i.ms, 0) / a.length) : '');
  const sum = () => {
    tick(); const d = items.filter((i) => i.ms > 400), tot = d.reduce((a, i) => a + i.ms, 0), top = d.slice().sort((a, b) => b.ms - a.ms)[0], rev = d.reduce((a, i) => a + i.rev, 0), ex = Object.entries(opt);
    const m = items.filter((i) => i.ok !== undefined), right = m.filter((i) => i.ok), wrong = m.filter((i) => !i.ok);
    const byC = CONF.map((c, k) => { const g = m.filter((i) => i.conf === k); return g.length ? `${c}: ${g.filter((i) => i.ok).length} of ${g.length} right, about ${avg(g)} each` : ''; }).filter(Boolean);
    const aft = after.filter((a) => a.ms > 300);
    return { d, tot, top, rev, ex, right, wrong, byC, aft };
  };
  const lines = () => {
    const { d, tot, top, rev, ex, right, wrong, byC, aft } = sum(); if (!d.length) return [];
    const L = [`Time on decisions: ${mmss(tot)} across ${d.length} ${d.length === 1 ? 'decision' : 'decisions'}.${top ? ` Longest: ${top.label} (${mmss(top.ms)}).` : ''}`];
    if (aft.length) L.push(`After a wrong answer you kept working ${aft.length} ${aft.length === 1 ? 'time' : 'times'}, for ${mmss(aft.reduce((a, i) => a + i.ms, 0))} in all, before answering again or moving on.`);
    if (right.length && wrong.length) L.push(`Decisions you got right took about ${avg(right)} each. Decisions you got wrong took about ${avg(wrong)} each.`);
    if (byC.length) L.push(`Time against confidence. ${byC.join('. ')}.`);
    L.push(`Answers changed before committing: ${rev}. Optional work and returns to the evidence: ${ex.length ? ex.map(([k, n]) => `${k}${n > 1 ? ' ×' + n : ''}`).join(', ') : 'none'}.`);
    return L;
  };
  return {
    watch(f) { fn = f; }, extra(k) { opt[k] = (opt[k] || 0) + 1; }, tick, items, opt, after,
    mark(o) { tick(); const it = cur || prev; if (it && it.ok === undefined) Object.assign(it, o); },
    wrong() { tick(); if (!aw) { aw = { ms: 0 }; after.push(aw); } }, resolved() { tick(); aw = null; },
    html() { const L = lines(); return L.length ? `<h3>Effort</h3>${L.map((l) => `<p class="small ef">${l.replace(/^([^:.]{3,40}:)/, '<b>$1</b>')}</p>`).join('')}<p class="small ef hint">The clock runs only while a decision is open and you are active. Time is a very rough stand-in for effort. It is not a measure of learning, and it is not scored.</p>` : ''; },
    text() { const L = lines(); return L.length ? 'Effort (a very rough stand-in). ' + L.join(' ') : ''; },
  };
})();
export { EF };
