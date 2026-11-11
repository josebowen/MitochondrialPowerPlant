// Headless walkthrough: screenshots of every state plus model outcome checks.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const [w, h, tag, only] = [+process.argv[2] || 1600, +process.argv[3] || 900, process.argv[4] || 'desk', process.argv[5]];
mkdirSync('test/out', { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`] });
const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto('file://' + process.cwd() + '/index.html?dtcap=0.3');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { if (only && !n.includes(only)) return; await wait(1200); await p.screenshot({ path: `test/out/${tag}-${n}.png` }); };
const D = (f, ...a) => p.evaluate(f, ...a);
await wait(2500); await shot('01-title');
if (!only || only === 'descent') { await D(() => __demo.act('begin')); await wait(3500); await shot('02-descent'); }
await D(() => { __demo.go('tour', 0); }); await shot('03-tour0');
await D(() => { __demo.act('tourNext'); __demo.warm(25); __demo.view('chain'); }); await shot('04-tour1');
await D(() => { __demo.act('tourNext'); __demo.advance(3); __demo.view('ims'); }); await shot('05-tour2');
await D(() => { __demo.act('tourNext'); __demo.advance(3); __demo.view('syn'); }); await shot('06-tour3');
await D(() => { __demo.act('tourNext'); __demo.advance(3); __demo.view('c4'); }); await shot('07-tour4');
const out = { normal: await D(() => __demo.state().vals) };
const preds = [{ ph: 'up', syn: 'down', o2: 'down' }, { grad: 'down', atp: 'up', o2: 'up' }, { grad: 'down', lac: 'up', tot: 'zero' }];
for (let i = 0; i < 3; i++) {
  await D((i) => { __demo.go('brief', i); __demo.warm(20); }, i); await shot(`1${i}a-brief`);
  await D((pr) => { __demo.predict(pr); __demo.go('run'); __demo.advance(6); }, preds[i]); await shot(`1${i}b-run`);
  await D(() => { __demo.advance(5.9); }); await wait(1500);
  const s = await D(() => __demo.state()); out[s.results.at(-1)?.id || 'x' + i] = { vals: s.vals, counts: s.counts, name: s.name, res: s.results.map((r) => [r.id, r.correct, JSON.stringify(r.truth)]) , lactate: s.lactate};
  await shot(`1${i}c-result`);
}
await D(() => __demo.go('debrief')); await shot('20-debrief');
await D(() => { __demo.go('lab'); __demo.set({ dnp: true }); __demo.advance(8); }); await shot('21-lab');
await D(() => __demo.act('about')); await shot('22-about');
console.log(JSON.stringify(out, null, 1)); console.log('ERRORS', errs.length, errs.slice(0, 8));
await b.close();
