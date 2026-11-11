// The Mitochondrial Power Plant. App shell: renderer, camera rig, state machine, UI.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createMacro } from './macro.js';
import { createMicro, wave } from './micro.js';
import { DEFAULTS, createModel, step, steadyState } from './model.js';
import { TOUR, INCIDENTS, OBJECTIVES, ABOUT, cite } from './content.js';
import { clamp, lerp, ease } from './fx.js';

const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const DTCAP = parseFloat(qs.get('dtcap')) || 0.05;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = Math.min(innerWidth, innerHeight) < 700;
const isPhone = () => innerWidth < 820;

// ---------- renderer ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 900);
const macro = createMacro(lite), micro = createMicro(lite);
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: lite ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(macro.scene, camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.6, 0.55, 0.9);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());
let W = 1, H = 1;
function resize() {
  W = innerWidth; H = innerHeight;
  const pr = Math.min(devicePixelRatio || 1, lite ? 1.5 : 2);
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  composer.setPixelRatio(pr); composer.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- model and state ----------
const base = steadyState(DEFAULTS);
const model = createModel();
const ctl = { nadh: 0, fadh: 0, o2: 1, cyanide: false, dnp: false };
const S = { name: 'title', scene: 'macro', tour: 0, inc: 0, preds: {}, results: [], run: null, desc: null, last: null, T: 0, tourDone: false };
const pct = (v, b) => Math.round(100 * v / b);

// ---------- camera rig ----------
const VIEWS = {
  title: { t: [0, 0, 0], w: 21, h: 12.5, yaw: 0.1, pitch: 0.2 },
  cutaway: { t: [0.2, 0.2, 0], w: 17, h: 10.5, yaw: 0.22, pitch: 0.36 },
  overview: { t: [0, -3.2, -1], w: 64, h: 33, yaw: 0, pitch: 0.17 },
  chain: { t: [-7.5, 0, 0], w: 44, h: 24, yaw: -0.14, pitch: 0.2 },
  ims: { t: [-12, 5.5, -2], w: 38, h: 21, yaw: -0.24, pitch: 0.06 },
  syn: { t: [23, -3.2, 0], w: 32, h: 28, yaw: 0.3, pitch: 0.07 },
  c4: { t: [9, -2, 0], w: 32, h: 26, yaw: 0.2, pitch: 0.1 },
  c4run: { t: [3, -0.5, 0], w: 50, h: 27, yaw: 0.1, pitch: 0.16 },
};
const rig = { t: new THREE.Vector3(), d: 40, yaw: 0, pitch: 0.2, view: VIEWS.title, uy: 0, up: 0, zoom: 1, ox: 0, oy: 0, fw: 1, fh: 1, lock: false };
const tf = () => Math.tan(camera.fov * Math.PI / 360);
function layout() { // free screen area and view offset for the current state
  const ph = isPhone();
  if (S.name === 'title') return ph ? { ox: 0, oy: H * 0.2, fw: W, fh: H * 0.5 } : { ox: -W * 0.21, oy: 0, fw: W * 0.56, fh: H };
  if (S.name === 'descent') return { ox: 0, oy: 0, fw: W, fh: H };
  if (ph) { const pb = $('#panel').offsetHeight, top = $('#hud').offsetHeight + 56; return { ox: 0, oy: (pb - top) / 2, fw: W, fh: Math.max(160, H - pb - top) }; }
  const P = $('#panel').offsetWidth + 24; return { ox: P / 2, oy: 0, fw: W - P, fh: H };
}
function fitDist(v, L) { const w = v.w * (W < H && S.scene === 'micro' ? 0.6 : 1); return Math.max(v.h * H / (2 * tf() * L.fh), w * H / (2 * tf() * L.fw)); }
function setView(name, snap) { rig.view = VIEWS[name]; rig.uy *= 0.3; rig.up *= 0.3; rig.zoom = 1; if (snap || reduce) snapRig(); }
function snapRig() { const v = rig.view, L = layout(); rig.t.fromArray(v.t); rig.yaw = v.yaw; rig.pitch = v.pitch; rig.d = fitDist(v, L); rig.ox = L.ox; rig.oy = L.oy; }
const tmpV = new THREE.Vector3();
function updateRig(dt) {
  const v = rig.view, L = layout(), k = 1 - Math.exp(-2.4 * dt);
  if (!rig.lock) { rig.t.lerp(tmpV.fromArray(v.t), k); rig.yaw = lerp(rig.yaw, v.yaw, k); rig.pitch = lerp(rig.pitch, v.pitch, k); rig.d = lerp(rig.d, fitDist(v, L), k); }
  const ko = reduce ? 1 : 1 - Math.exp(-5 * dt); rig.ox = lerp(rig.ox, L.ox, ko); rig.oy = lerp(rig.oy, L.oy, ko);
  const sway = reduce ? 0 : Math.sin(S.T * 0.13) * 0.07, bobp = reduce ? 0 : Math.sin(S.T * 0.1) * 0.02;
  const yaw = rig.yaw + rig.uy + sway, pitch = clamp(rig.pitch + rig.up + bobp, -0.45, 0.9), d = rig.d * rig.zoom;
  camera.position.set(rig.t.x + d * Math.sin(yaw) * Math.cos(pitch), rig.t.y + d * Math.sin(pitch), rig.t.z + d * Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(rig.t);
  camera.setViewOffset(W, H, rig.ox, rig.oy, W, H);
  const fd = Math.min(0.0105, 0.72 / d); micro.scene.fog.density = fd; micro.glow.mat.uniforms.uFog.value = fd; micro.glowX.mat.uniforms.uFog.value = fd;
  const sc = H * renderer.getPixelRatio() * 0.5 / tf();
  macro.glow.mat.uniforms.uScale.value = sc; micro.glow.mat.uniforms.uScale.value = sc; micro.glowX.mat.uniforms.uScale.value = sc;
}
{ // pointer and keyboard look
  let drag = null; const pts = new Map(); let pinch = 0;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, e); drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
    if (pts.size === 2) { const [a, b] = [...pts.values()], dd = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (pinch) rig.zoom = clamp(rig.zoom * pinch / dd, 0.5, 1.7); pinch = dd; return; }
    if (!drag) return; rig.uy = clamp(rig.uy - (e.clientX - drag.x) * 0.004, -0.8, 0.8); rig.up = clamp(rig.up + (e.clientY - drag.y) * 0.003, -0.35, 0.45); drag = { x: e.clientX, y: e.clientY };
  });
  const end = (e) => { pts.delete(e.pointerId); pinch = 0; drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoom = clamp(rig.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.5, 1.7); }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAbout();
    if (/^(INPUT|BUTTON|A|SELECT)$/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft') rig.uy = clamp(rig.uy - 0.08, -0.8, 0.8); if (e.key === 'ArrowRight') rig.uy = clamp(rig.uy + 0.08, -0.8, 0.8);
    if (e.key === 'ArrowUp') rig.up = clamp(rig.up + 0.05, -0.35, 0.45); if (e.key === 'ArrowDown') rig.up = clamp(rig.up - 0.05, -0.35, 0.45);
    if (e.key === '+' || e.key === '=') rig.zoom = clamp(rig.zoom * 0.92, 0.5, 1.7); if (e.key === '-') rig.zoom = clamp(rig.zoom * 1.08, 0.5, 1.7);
  });
}

// ---------- sound (WebAudio, synthesized, starts only after a click) ----------
const audio = { ctx: null, on: true, last: 0, lastAtp: 0,
  init() { if (this.ctx || !this.on) return; try { const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    this.dg = this.ctx.createGain(); this.dg.gain.value = 0; const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240; f.connect(this.dg); this.dg.connect(this.master);
    this.osc = [55, 82.6].map((hz) => { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); return o; }); } catch (e) { this.ctx = null; } },
  tone(hz, g, dur, type = 'sine') { if (!this.ctx || !this.on) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), a = this.ctx.createGain(); o.type = type; o.frequency.value = hz; a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(a); a.connect(this.master); o.start(t); o.stop(t + dur); },
  step(i) { if (!this.ctx) return; const t = this.ctx.currentTime; if (t - this.last < 0.07) return; this.last = t; this.tone([784, 587, 440, 294][i], 0.035, 0.22, 'triangle'); },
  atp() { if (!this.ctx) return; const t = this.ctx.currentTime; if (t - this.lastAtp < 0.16) return; this.lastAtp = t; this.tone(1568, 0.012, 0.12); },
  level(j) { if (this.ctx) { this.dg.gain.setTargetAtTime(this.on ? 0.05 * Math.min(2, j) : 0, this.ctx.currentTime, 0.4); this.osc[1].frequency.setTargetAtTime(82.6 + 22 * j, this.ctx.currentTime, 0.5); } },
  alarm() { this.tone(196, 0.07, 0.6, 'sawtooth'); setTimeout(() => this.tone(185, 0.07, 0.7, 'sawtooth'), 260); },
};
micro.on((type, v) => { if (S.scene !== 'micro') return; if (type === 'step') audio.step(v); else if (type === 'atp') audio.atp(); });

// ---------- 3D labels ----------
const labelBox = $('#labels');
const mkLabel = (text, cls) => { const el = document.createElement('div'); el.className = 'lab ' + (cls || ''); el.textContent = text; labelBox.appendChild(el); return el; };
macro.labels.forEach((l) => { l.el = mkLabel(l.text, 'macro'); });
micro.labels.forEach((l) => { l.el = mkLabel(l.text, (l.small ? 'small ' : '') + (l.zone ? 'zone' : '')); });
function placeLabel(el, v, show) {
  v.project(camera); const on = show && v.z < 1 && v.z > -1 && (1 - v.y) / 2 * H > 62;
  el.style.opacity = on ? 1 : 0; if (on) el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px,${((1 - v.y) / 2 * H).toFixed(1)}px) translate(-50%,-50%)`;
}
function updateLabels() {
  const showMacro = S.scene === 'macro' && S.name === 'descent' && S.desc && S.desc.t > 1.4 && S.desc.t < 5.9;
  macro.labels.forEach((l, i) => placeLabel(l.el, macro.labelWorld(i, tmpV), showMacro && S.desc.t > 1.4 + i * 0.35));
  const showMicro = S.scene === 'micro' && S.name !== 'descent';
  for (const l of micro.labels) { tmpV.fromArray(l.p); tmpV.y += wave(l.p[0], l.p[2], S.T); placeLabel(l.el, tmpV, showMicro && !(isPhone() && (l.small || l.zone))); }
}

// ---------- HUD ----------
const G = [['grad', 'Proton gradient', 130, '#ff9d42'], ['atp', 'ATP rate', 130, '#ffe066'], ['o2', 'Oxygen use', 220, '#7fd8ff'], ['heat', 'Heat released', 320, '#ff6b6b']];
$('#gauges').innerHTML = G.map(([id, name, max, c]) => `<div class="g"><div class="gl"><span><i class="dot" style="background:${c}"></i>${name}</span><b id="v-${id}">0%</b></div><div class="bar" role="img" aria-label="${name}"><i id="b-${id}" style="background:${c}"></i><em style="left:${100 / max * 100}%"></em></div></div>`).join('');
const hist = [], marks = []; let histT = 0;
const vals = () => ({ grad: pct(model.G, base.G), atp: pct(model.atp, base.atp), o2: pct(model.J, base.J), heat: pct(model.heat, base.heat) });
function updateHud(dt) {
  const v = vals();
  for (const [id, , max] of G) { $('#v-' + id).textContent = v[id] + '%'; $('#b-' + id).style.width = clamp(v[id] / max * 100, 0, 100) + '%'; }
  $('#lacfill').style.width = Math.round(model.lactate * 100) + '%';
  $('#lactxt').textContent = model.lactate > 0.5 ? 'Lactate: high' : model.lactate > 0.08 ? 'Lactate: building' : 'Lactate: low';
  $('#atpcount').textContent = micro.stats.atp;
  histT += dt; if (histT > 0.1) { histT = 0; hist.push([S.T, v.grad / 130, v.atp / 130, v.o2 / 220, v.heat / 320]); while (hist.length && hist[0][0] < S.T - 45) hist.shift(); drawChart(); }
}
function drawChart() {
  const c = $('#chart'); if (!c.offsetWidth) return; const r = Math.min(2, devicePixelRatio || 1), w = c.offsetWidth, h = c.offsetHeight;
  if (c.width !== w * r) { c.width = w * r; c.height = h * r; }
  const x = c.getContext('2d'); x.setTransform(r, 0, 0, r, 0, 0); x.clearRect(0, 0, w, h);
  const X = (t) => w - (S.T - t) / 45 * w, Y = (n) => h - 3 - clamp(n, 0, 1) * (h - 8);
  x.strokeStyle = 'rgba(160,220,235,.14)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, Y(100 / 130)); x.lineTo(w, Y(100 / 130)); x.stroke();
  x.font = '10px Inter, sans-serif'; x.fillStyle = 'rgba(200,235,245,.75)';
  for (const m of marks) { const mx = X(m.t); if (mx < 0) continue; x.strokeStyle = 'rgba(255,255,255,.3)'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(mx, 0); x.lineTo(mx, h); x.stroke(); x.setLineDash([]); x.fillText(m.name, Math.min(mx + 4, w - 60), 10); }
  G.forEach(([, , , col], i) => { x.strokeStyle = col; x.lineWidth = 1.8; x.beginPath(); hist.forEach((p, k) => { const px = X(p[0]), py = Y(p[i + 1]); k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); });
}

// ---------- panel ----------
const panel = $('#panelBody');
const cites = (list) => `<p class="src">Source: ${list.map(cite).join(', ')}</p>`;
const optLabel = (q, v) => (q.opts.find((o) => o[0] === v) || [0, 'No answer'])[1];
function truth(inc) {
  const d = (v, b) => v > b * 1.15 ? 'up' : v < b * 0.85 ? 'down' : 'same', m = model;
  const all = { grad: d(m.G, base.G), ph: d(base.G, m.G), syn: d(m.synth, base.synth), atp: d(m.atp, base.atp), o2: d(m.J, base.J), lac: m.lactate > 0.1 ? 'up' : 'same', tot: m.atp < 0.02 * base.atp ? 'zero' : m.atp < 0.85 * base.atp ? 'cont' : 'same' };
  const o = {}; for (const q of inc.qs) o[q.id] = all[q.id]; return o;
}
function render() {
  const n = S.name; let h = '';
  document.body.dataset.state = n;
  document.querySelectorAll('#steps li').forEach((li, i) => { const cur = n === 'tour' ? 0 : n === 'debrief' ? 4 : n === 'lab' ? -1 : 1 + S.inc; li.className = i === cur ? 'cur' : (i < cur || (n === 'lab' && S.results.length === 3)) ? 'done' : ''; });
  if (n === 'tour') {
    const t = TOUR[S.tour];
    h = `<p class="kick">${t.kicker}</p><h2 tabindex="-1">${t.title}</h2>${t.body}${cites(t.cites)}<div class="row"><button class="btn pri" data-act="tourNext">${t.cta}</button>${S.tour > 0 && S.tour < 4 ? '<button class="btn ghost" data-act="skipTour">Skip to the incidents</button>' : ''}</div>`;
  } else if (n === 'brief') {
    const inc = INCIDENTS[S.inc], ready = inc.qs.every((q) => S.preds[q.id]);
    h = `<p class="kick alert">Incident ${S.inc + 1} of 3</p><h2 tabindex="-1">${inc.title}</h2>${inc.brief}<h3>Predict before you run it</h3>` +
      inc.qs.map((q) => `<fieldset class="q"><legend>${q.label}</legend><div class="seg">${q.opts.map(([v, l]) => `<label><input type="radio" name="${q.id}" value="${v}" ${S.preds[q.id] === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>`).join('') +
      `<div class="row"><button class="btn pri" data-act="run" ${ready ? '' : 'disabled'}>Run it</button><span class="hint" id="runhint">${ready ? '' : 'Choose all three to continue.'}</span></div>`;
  } else if (n === 'run') {
    const inc = INCIDENTS[S.inc];
    h = `<p class="kick alert">Incident ${S.inc + 1} of 3 · running</p><h2 tabindex="-1">${inc.title}</h2><div class="prog"><i id="runbar"></i></div><ul class="log" id="runlog"></ul><p class="hint">Watch the membrane and the four gauges.</p>`;
  } else if (n === 'result') {
    const inc = INCIDENTS[S.inc], r = S.last, last = S.inc === 2;
    h = `<p class="kick">Incident ${S.inc + 1} of 3 · result</p><h2 tabindex="-1">${r.correct} of 3 predictions correct</h2><ul class="verdict">` +
      inc.qs.map((q) => { const ok = r.preds[q.id] === r.truth[q.id]; return `<li class="${ok ? 'ok' : 'no'}"><span class="mark" aria-hidden="true">${ok ? '✓' : '✕'}</span><div><b>${q.label}: ${optLabel(q, r.truth[q.id]).toLowerCase()}</b><small>${ok ? 'Correct.' : 'You predicted: ' + optLabel(q, r.preds[q.id]).toLowerCase() + '.'}</small></div></li>`; }).join('') +
      `</ul>${inc.explain}<p class="mis"><b>${r.correct === 3 ? 'Common misconception' : 'Check this idea'}:</b> ${inc.mis(r.preds)}</p>${inc.beyond ? `<p class="beyond">${inc.beyond}</p>` : ''}${cites(inc.cites)}
      <div class="row"><button class="btn pri" data-act="next">${last ? 'See the debrief' : 'Restore the plant. Next incident'}</button><button class="btn ghost" data-act="again">Run it again</button></div>`;
  } else if (n === 'debrief') {
    const tot = S.results.reduce((a, r) => a + r.correct, 0), runs = INCIDENTS.map((inc) => [...S.results].reverse().find((r) => r.id === inc.id)).filter(Boolean);
    h = `<p class="kick">Debrief</p><h2 tabindex="-1">${tot} of ${S.results.length * 3} predictions correct</h2><h3>What you practiced</h3><ul class="obj">` +
      OBJECTIVES.map(([t, s], i) => `<li class="${(i < 2 ? S.tourDone : runs.length === 3) ? 'ok' : ''}"><span class="mark" aria-hidden="true">${(i < 2 ? S.tourDone : runs.length === 3) ? '✓' : '○'}</span><div>${t} <small>${s}</small></div></li>`).join('') +
      `</ul><h3>Your runs, as percent of normal</h3><div class="tw"><table><thead><tr><th>Incident</th><th>Gradient</th><th>ATP</th><th>O<sub>2</sub> use</th><th>Heat</th><th>Correct</th></tr></thead><tbody>` +
      S.results.map((r) => `<tr><th>${r.name}</th><td>${r.v.grad}</td><td>${r.v.atp}</td><td>${r.v.o2}</td><td>${r.v.heat}</td><td>${r.correct}/3</td></tr>`).join('') +
      `</tbody></table></div><p class="src">Source: Clark, Douglas and Choi, <i>Biology 2e</i>, OpenStax, Chapter 7. CC BY 4.0. ${cite('7.1')}, ${cite('7.4')}, ${cite('7.5')}. The numbers come from an illustrative model. See About.</p>
      <div class="row"><button class="btn pri" data-act="lab">Open the free lab</button><button class="btn ghost" data-act="restart">Start over</button></div>`;
  } else if (n === 'lab') {
    const sl = (id, name) => `<label class="sl"><span><span>${name}</span><b id="o-${id}">${Math.round(ctl[id] * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value="${ctl[id]}" data-ctl="${id}"></label>`;
    const tg = (id, name) => `<label class="tg"><input type="checkbox" data-ctl="${id}" ${ctl[id] ? 'checked' : ''}><span class="sw" aria-hidden="true"></span><span>${name}</span></label>`;
    h = `<p class="kick">Free lab</p><h2 tabindex="-1">Run the plant your way</h2>${sl('nadh', 'NADH supply')}${sl('fadh', 'FADH<sub>2</sub> supply')}${sl('o2', 'Oxygen')}${tg('cyanide', 'Cyanide at Complex IV')}${tg('dnp', 'DNP uncoupler in the membrane')}
      <div class="row chips"><button class="chip" data-preset="normal">Normal</button><button class="chip" data-preset="fadh">FADH<sub>2</sub> only</button><button class="chip" data-preset="sprint">Sprint</button></div>
      <h3>Things to try</h3><ul class="try"><li>Feed the chain with FADH<sub>2</sub> only. Complex I goes quiet and fewer protons are pumped per electron.</li><li>Turn on DNP, then cut the oxygen. Predict the heat gauge first.</li><li>Lower oxygen slowly and find where the gradient starts to fall.</li></ul>
      <p class="src">Illustrative model. See About. ${cite('7.4')}, ${cite('7.5')}</p>
      <div class="row">${S.results.length ? '<button class="btn pri" data-act="debrief">Back to the debrief</button>' : '<button class="btn pri" data-act="toIncidents">Go to the incidents</button>'}<button class="btn ghost" data-act="restart">Start over</button></div>`;
  }
  panel.innerHTML = h; panel.parentElement.scrollTop = 0;
  const h2 = panel.querySelector('h2'); if (h2 && S.focusNext) { h2.focus({ preventScroll: true }); } S.focusNext = true;
}
panel.addEventListener('change', (e) => {
  const t = e.target;
  if (t.type === 'radio') { S.preds[t.name] = t.value; const inc = INCIDENTS[S.inc], ready = inc.qs.every((q) => S.preds[q.id]); panel.querySelector('[data-act=run]').disabled = !ready; $('#runhint').textContent = ready ? '' : 'Choose all three to continue.'; }
  if (t.type === 'checkbox' && t.dataset.ctl) { ctl[t.dataset.ctl] = t.checked; marks.push({ t: S.T, name: (t.dataset.ctl === 'dnp' ? 'DNP ' : 'Cyanide ') + (t.checked ? 'on' : 'off') }); }
});
panel.addEventListener('input', (e) => { const t = e.target; if (t.type === 'range') { ctl[t.dataset.ctl] = parseFloat(t.value); $('#o-' + t.dataset.ctl).textContent = Math.round(t.value * 100) + '%'; } });
const PRESETS = { normal: { ...DEFAULTS }, fadh: { ...DEFAULTS, nadh: 0, fadh: 1 }, sprint: { ...DEFAULTS, o2: 0.03 } };
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act],[data-preset]'); if (!b) return;
  if (b.dataset.preset) { Object.assign(ctl, PRESETS[b.dataset.preset]); S.focusNext = false; render(); return; }
  act(b.dataset.act);
});
function act(a) {
  if (a === 'begin') { audio.init(); go('descent'); }
  else if (a === 'skipDescent') { if (S.desc) S.desc.t = 99; }
  else if (a === 'tourNext') { if (S.tour === 0) { Object.assign(ctl, DEFAULTS); marks.push({ t: S.T, name: 'NADH on' }); } if (S.tour < TOUR.length - 1) { S.tour++; setView(TOUR[S.tour].focus); render(); } else { S.tourDone = true; go('brief', 0); } }
  else if (a === 'skipTour') { S.tourDone = true; go('brief', 0); }
  else if (a === 'run') go('run');
  else if (a === 'next') { if (S.inc < 2) go('brief', S.inc + 1); else go('debrief'); }
  else if (a === 'again') go('brief', S.inc);
  else if (a === 'lab') go('lab');
  else if (a === 'debrief') go('debrief');
  else if (a === 'toIncidents') { S.tourDone = true; go('brief', 0); }
  else if (a === 'restart') { S.results = []; S.tourDone = false; micro.reset(); Object.assign(model, createModel()); hist.length = 0; marks.length = 0; go('tour', 0); }
  else if (a === 'about') openAbout();
  else if (a === 'closeAbout') closeAbout();
  else if (a === 'sound') { audio.on = !audio.on; if (audio.on) audio.init(); $('#soundBtn').setAttribute('aria-pressed', audio.on); $('#soundBtn').textContent = audio.on ? 'Sound on' : 'Sound off'; }
}
let lastFocus = null;
function openAbout() { lastFocus = document.activeElement; $('#modal').hidden = false; $('#modalClose').focus(); }
function closeAbout() { if ($('#modal').hidden) return; $('#modal').hidden = true; if (lastFocus) lastFocus.focus(); }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeAbout(); });
$('#aboutBody').innerHTML = ABOUT;

const caption = $('#caption');
function say(t) { caption.textContent = t || ''; caption.classList.toggle('on', !!t); }

function enterMicro() {
  S.scene = 'micro'; renderPass.scene = micro.scene; camera.fov = 40; camera.updateProjectionMatrix(); rig.lock = false;
}
function go(name, arg) {
  S.name = name; say('');
  if (name === 'descent') {
    S.desc = { t: 0, d0: 0 }; { const z = rig.zoom; setView('cutaway'); rig.d *= z; }
    if (reduce) S.desc.t = 99;
  } else if (name === 'tour') {
    if (S.scene !== 'micro') enterMicro();
    S.tour = arg || 0; if (S.tour === 0) Object.assign(ctl, { nadh: 0, fadh: 0, o2: 1, cyanide: false, dnp: false });
    setView(TOUR[S.tour].focus);
  } else if (name === 'brief') {
    if (S.scene !== 'micro') enterMicro();
    S.inc = arg; S.preds = {}; Object.assign(ctl, DEFAULTS); setView('overview');
  } else if (name === 'run') {
    const inc = INCIDENTS[S.inc]; S.run = { t: 0, dur: 12, cap: 0 }; setView(inc.focus); marks.push({ t: S.T, name: inc.name });
    if (inc.id === 'cyanide') ctl.cyanide = true; if (inc.id === 'dnp') ctl.dnp = true;
    document.body.classList.add('alarm'); setTimeout(() => document.body.classList.remove('alarm'), 2600); audio.alarm();
  } else if (name === 'debrief') { Object.assign(ctl, DEFAULTS); setView('overview'); }
  else if (name === 'lab') { if (S.scene !== 'micro') enterMicro(); if (ctl.nadh + ctl.fadh === 0) Object.assign(ctl, DEFAULTS); setView('overview'); }
  render();
}
function finishRun() {
  const inc = INCIDENTS[S.inc], tr = truth(inc); let correct = 0; for (const q of inc.qs) if (S.preds[q.id] === tr[q.id]) correct++;
  S.last = { id: inc.id, name: inc.name, preds: { ...S.preds }, truth: tr, correct, v: vals() };
  S.results = S.results.filter((r) => r.id !== inc.id); S.results.push(S.last);
  S.results.sort((x, y) => INCIDENTS.findIndex((i) => i.id === x.id) - INCIDENTS.findIndex((i) => i.id === y.id));
  S.name = 'result'; say(''); render();
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(DTCAP, Math.max(0.001, (now - last) / 1000)); last = now; S.T += dt;
  if (S.name === 'title') { rig.zoom = reduce ? 1 : 1 - 0.14 * ease(S.T / 40); }
  if (S.name === 'descent') {
    const D = S.desc; D.t += dt;
    if (D.t < 2.6) say('This is one mitochondrion inside a muscle cell.');
    else if (D.t < 5.8) say('Its inner membrane folds into cristae. The electron transport chain sits in that membrane.');
    else say('Shrinking to molecular scale.');
    if (D.t >= 5.8 && D.t < 90) {
      if (!rig.lock) { rig.lock = true; D.d0 = rig.d; D.t0 = rig.t.clone(); D.y0 = rig.yaw; D.p0 = rig.pitch; }
      const u = clamp((D.t - 5.8) / 2.1, 0, 1), e = u * u;
      rig.d = D.d0 * Math.pow(0.012, e); rig.t.lerpVectors(D.t0, tmpV.set(0.75, 0.55, 0.9), ease(u)); rig.yaw = lerp(D.y0, 0.75, ease(u)); rig.pitch = lerp(D.p0, 0.12, ease(u));
      camera.fov = 40 + 34 * e; camera.updateProjectionMatrix();
      $('#flash').style.opacity = ease((u - 0.55) / 0.45);
    }
    if (D.t >= 7.9) {
      enterMicro(); S.desc = null; go('tour', 0); snapRig();
      if (!reduce) { rig.d *= 2.8; rig.pitch = 0.75; rig.yaw = -0.5; }
      $('#flash').style.opacity = 0;
    }
  }
  if (S.scene === 'micro') {
    if (S.name === 'run') {
      const R = S.run, inc = INCIDENTS[S.inc]; R.t += dt;
      if (inc.id === 'o2') ctl.o2 = Math.max(0, 1 - R.t / 3);
      while (R.cap < inc.captions.length && R.t >= inc.captions[R.cap][0]) { const txt = inc.captions[R.cap][1]; say(txt); const li = document.createElement('li'); li.textContent = txt; const lg = $('#runlog'); if (lg) lg.appendChild(li); R.cap++; }
      const bar = $('#runbar'); if (bar) bar.style.width = clamp(R.t / R.dur * 100, 0, 100) + '%';
      if (R.t >= R.dur) finishRun();
    }
    step(model, ctl, dt, base);
    micro.update(dt, S.T, model, ctl, base);
    audio.level(model.J / base.J);
    updateHud(dt); $('#heat').style.opacity = (micro.out.heatX * (isPhone() ? 0.2 : 0.36)).toFixed(2);
  } else macro.update(dt, S.T, reduce);
  updateRig(dt); updateLabels();
  composer.render();
  requestAnimationFrame(frame);
}

// ---------- test hook ----------
window.__demo = {
  state: () => ({ name: S.name, scene: S.scene, tour: S.tour, inc: S.inc, results: S.results, vals: S.scene === 'micro' ? vals() : null, counts: micro.counts(), ctl: { ...ctl }, lactate: model.lactate }),
  go: (name, arg) => { if (name !== 'title' && name !== 'descent' && S.scene !== 'micro') { enterMicro(); } go(name, arg); snapRig(); },
  set: (o) => Object.assign(ctl, o),
  predict: (p) => { S.preds = { ...p }; },
  warm: (sec = 20) => { Object.assign(ctl, DEFAULTS); for (let i = 0; i < sec * 20; i++) { step(model, ctl, 0.05, base); micro.update(0.05, S.T += 0.05, model, ctl, base); } },
  advance: (sec) => { for (let i = 0; i < sec * 20; i++) { if (S.name === 'run' && INCIDENTS[S.inc].id === 'o2') ctl.o2 = Math.max(0, 1 - (S.run.t += 0.05) / 3); else if (S.name === 'run') S.run.t += 0.05; step(model, ctl, 0.05, base); micro.update(0.05, S.T += 0.05, model, ctl, base); } },
  act, base, view: (n) => setView(n, true),
};

snapRig(); render();
requestAnimationFrame(frame);
