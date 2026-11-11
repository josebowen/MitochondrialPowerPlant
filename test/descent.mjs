import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + process.cwd() + '/index.html?dtcap=0.12');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2000); await p.click('[data-act=begin]');
let n = 0, seenDive = false;
for (let i = 0; i < 60; i++) { await wait(500); const s = await p.evaluate(() => ({ n: __demo.state().name, f: document.querySelector('#flash').style.opacity }));
  if (s.n === 'descent' && +s.f > 0.05 && !seenDive) { seenDive = true; await p.screenshot({ path: 'test/out/desc-dive.png' }); }
  if (s.n === 'tour') { if (n++ === 0) await p.screenshot({ path: 'test/out/desc-arrive.png' }); if (n > 6) break; } }
await p.screenshot({ path: 'test/out/desc-settled.png' });
await p.click('[data-act=tourNext]'); await wait(800);
for (let i = 0; i < 4; i++) { await p.click('[data-act=tourNext]'); await wait(500); }
console.log(await p.evaluate(() => __demo.state().name));
for (const sel of ['input[name=ph][value=up]', 'input[name=syn][value=down]', 'input[name=o2][value=down]']) await p.click(sel);
await p.click('[data-act=run]'); await wait(1000); console.log(await p.evaluate(() => __demo.state().name), 'seenDive', seenDive, 'errs', errs);
await b.close();
