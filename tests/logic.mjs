// Fast hook-driven runs: verifies win/loss, sudden death, and streak storage across many seeded shootouts.
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href); await page.waitForFunction(() => !!window.__BP__);
await page.evaluate(() => localStorage.clear());
const res = await page.evaluate(async () => {
  const b = window.__BP__, sleep = ms => new Promise(r => setTimeout(r, ms)); const out = [];
  b.timeScale = 6;
  for (let g = 0; g < 8; g++) {
    b.setSeed(1000 + g * 31); b.start();
    for (let i = 0; i < 2400 && b.phase !== 'over'; i++) {
      if (b.phase === 'aimWait') b.shoot(g % 2 ? 110 : 370, 216, 0.72, 0);   // corners
      await sleep(25);
    }
    out.push({ A: b.A.map(Number).join(''), B: b.B.map(Number).join(''), w: b.winner || ('STUCK:' + b.phase), sd: b.A.length > 5 });
    await sleep(250);
  }
  return { out, stats: b.stats };
});
for (const r of res.out) console.log(r.w.padEnd(6), 'Blues', r.A.padEnd(9), 'Visitors', r.B.padEnd(9), r.sd ? 'SUDDEN DEATH' : '');
console.log('stats', JSON.stringify(res.stats));
const ok = res.out.every(r => r.w) && res.stats.played === 8 && errors.length === 0;
console.log('errors', errors.length, errors.join('; ')); console.log(ok ? 'LOGIC PASS' : 'LOGIC FAIL');
await browser.close(); process.exit(ok ? 0 : 1);
