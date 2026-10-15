// Headless playthrough + screenshot for Bridge Penalties (playwright-core + system Chrome).
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.BP_URL || pathToFileURL(join(ROOT, 'index.html')).href;
const SHOT = process.env.BP_SHOT || join(ROOT, '..', 'out-oct15', 'bridge-penalties-00-best.png');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
function watch(page, tag, errors, external) {
  page.on('console', m => { if (m.type() === 'error') errors.push(`${tag} console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${tag} pageerror: ${e.message}`));
  page.on('request', r => { const u = r.url(); if (!/^(file:|data:|blob:|about:)/.test(u) && !u.startsWith(URL.replace(/[^/]*$/, ''))) external.push(u); });
}
async function phase(page) { return page.evaluate(() => window.__BP__.phase); }
async function waitPhase(page, list, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const p = await phase(page); if (list.includes(p)) return p; await sleep(40); }
  throw new Error('timeout waiting for ' + list + ' (now ' + await phase(page) + ')');
}
async function toScreen(page, x, y) { return page.evaluate(([x, y]) => window.__BP__.toScreen(x, y), [x, y]); }

// ---- 1) Desktop: full shootout with real mouse drags + clicks ----
async function desktop() {
  const errors = [], external = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(page, 'desktop', errors, external);
  await page.goto(URL); await page.waitForFunction(() => !!window.__BP__);
  await page.evaluate(() => { localStorage.clear(); window.__BP__.setSeed(12345); });
  const c = await toScreen(page, 240, 400); await page.mouse.click(c.x, c.y); // title -> kick off
  let kicks = 0; const log = [];
  while (kicks < 40) {
    const p = await waitPhase(page, ['aimWait', 'runup', 'over']);
    if (p === 'over') break;
    if (p === 'aimWait') {
      const aims = [[-70, -95, 25], [70, -60, -20], [-40, -40, 0], [80, -100, 30], [-85, -70, -25]];
      const [dx, dy, bend] = aims[kicks % aims.length];
      const s = await toScreen(page, 240, 620); const scale = (await toScreen(page, 1, 0)).x - (await toScreen(page, 0, 0)).x;
      await page.mouse.move(s.x, s.y); await page.mouse.down();
      for (let i = 1; i <= 10; i++) { const u = i / 10; await page.mouse.move(s.x + (dx * u + bend * Math.sin(Math.PI * u)) * scale, s.y + dy * u * scale); await sleep(30); }
      await sleep(170); // ~0.47s total hold -> ~70% power
      await page.mouse.up();
    } else {
      await sleep(300 + (kicks * 137) % 500);
      const tgt = [[130, 290], [350, 240], [240, 280], [140, 230], [345, 300]][kicks % 5];
      const d = await toScreen(page, tgt[0], tgt[1]); await page.mouse.click(d.x, d.y);
    }
    await waitPhase(page, ['result', 'over']);
    const o = await page.evaluate(() => ({ o: window.__BP__.outcome, t: window.__BP__.shot.team }));
    log.push(`${o.t}:${o.o}`); kicks++;
  }
  await waitPhase(page, ['over'], 8000);
  const end = await page.evaluate(() => ({ A: window.__BP__.A, B: window.__BP__.B, w: window.__BP__.winner, stats: window.__BP__.stats,
    ls: JSON.parse(localStorage.getItem('bridgePenalties.v1') || 'null') }));
  await sleep(1000);
  await page.screenshot({ path: join(ROOT, 'tests', 'desktop-final.png') });
  // play again works
  const c2 = await toScreen(page, 240, 400); await page.mouse.click(c2.x, c2.y);
  const again = await waitPhase(page, ['aimWait'], 4000);
  console.log('DESKTOP kicks:', log.join(' '));
  console.log('DESKTOP result:', JSON.stringify({ A: end.A, B: end.B, winner: end.w, stored: end.ls, replay: again }));
  if (!end.w || !end.ls || end.ls.played !== 1) { failures++; console.log('FAIL: no winner / storage'); }
  report('desktop', errors, external);
  await page.close();
}
// ---- 2) iPhone-sized touch run: touch drags + taps, full shootout ----
async function mobile() {
  const errors = [], external = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage(); watch(page, 'mobile', errors, external);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(p => ({ x: p.x, y: p.y, id: 1 })) });
  await page.goto(URL); await page.waitForFunction(() => !!window.__BP__);
  await page.evaluate(() => { localStorage.clear(); window.__BP__.setSeed(777); });
  const c = await toScreen(page, 240, 400); await touch('touchStart', [c]); await touch('touchEnd', []);
  let kicks = 0; const log = [];
  while (kicks < 40) {
    const p = await waitPhase(page, ['aimWait', 'runup', 'over']);
    if (p === 'over') break;
    if (p === 'aimWait') {
      const s = await toScreen(page, 240, 620); const scale = (await toScreen(page, 1, 0)).x - (await toScreen(page, 0, 0)).x;
      const dx = [60, -60, 20, -75, 75][kicks % 5], dy = [-90, -70, -100, -50, -85][kicks % 5];
      await touch('touchStart', [s]);
      for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: s.x + dx * scale * i / 8, y: s.y + dy * scale * i / 8 }]); await sleep(35); }
      await sleep(190); await touch('touchEnd', []);
    } else {
      await sleep(250);
      const tgt = [[120, 300], [360, 250], [240, 240], [360, 300], [125, 240]][kicks % 5];
      const d = await toScreen(page, tgt[0], tgt[1]); await touch('touchStart', [d]); await touch('touchEnd', []);
    }
    await waitPhase(page, ['result', 'over']);
    const o = await page.evaluate(() => ({ o: window.__BP__.outcome, t: window.__BP__.shot.team }));
    log.push(`${o.t}:${o.o}`); kicks++;
  }
  await waitPhase(page, ['over'], 8000);
  const end = await page.evaluate(() => ({ A: window.__BP__.A, B: window.__BP__.B, w: window.__BP__.winner }));
  await sleep(900); await page.screenshot({ path: join(ROOT, 'tests', 'mobile-final.png') });
  console.log('MOBILE kicks:', log.join(' '));
  console.log('MOBILE result:', JSON.stringify(end));
  if (!end.w) { failures++; console.log('FAIL: mobile no winner'); }
  report('mobile', errors, external);
  // mid-shot hero screenshot (iPhone portrait)
  await page.evaluate(() => { localStorage.setItem('bridgePenalties.v1', JSON.stringify({ played: 6, wins: 4, losses: 2, streak: 3, bestStreak: 3, bestGoals: 5, goals: 24, saves: 9 })); });
  await page.reload(); await page.waitForFunction(() => !!window.__BP__);
  await page.evaluate(() => { const b = window.__BP__; b.setSeed(2026); b.start(); });
  await waitPhase(page, ['aimWait']);
  await page.evaluate(() => { const b = window.__BP__; b.timeScale = 0.3; b.shoot(118, 214, 0.74, 0.7); });
  for (let i = 0; i < 200; i++) { const u = await page.evaluate(() => { const s = window.__BP__.shot; return s ? s.t / s.dur : 0; }); if (u >= 0.55) break; await sleep(10); }
  await page.evaluate(() => { window.__BP__.timeScale = 0; });
  await sleep(120); await page.screenshot({ path: SHOT });
  console.log('screenshot ->', SHOT);
  await ctx.close();
}
function report(tag, errors, external) {
  console.log(`${tag.toUpperCase()} console errors: ${errors.length}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  console.log(`${tag.toUpperCase()} external requests: ${external.length}${external.length ? '\n  ' + external.join('\n  ') : ''}`);
  if (errors.length || external.length) failures++;
}
try { await desktop(); await mobile(); } catch (e) { failures++; console.log('ERROR', e.stack); }
await browser.close();
console.log(failures ? `FAILED (${failures})` : 'ALL PASS');
process.exit(failures ? 1 : 0);
