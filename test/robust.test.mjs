// Odd pages, changing windows, and huge chapters.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from './cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

test('a page too short to scroll: starts, says almost done, stops cleanly', async () => {
  const p = await b.open('short.html', { atEnd: 'stop' });
  await p.key('s');
  assert.equal(await p.eval('sessionInfo().left'), 'almost done');
  await p.until('!on', 4000);
  await p.close(); // and no errors
});

test('resizing while paused moves the focus column at once; scrolling carries on after', async () => {
  const p = await b.open('webtoon.html', { pxs: 300, focus: true });
  await p.key('s');
  await p.until('col !== null');
  await p.key('Shift', 'down'); // paused: the page isn't moving, so only the resize can trigger a re-check
  await p.until('level === 0');
  const before = await p.eval('col.l');
  await p.resize(1000, 700);
  await p.until(`Math.abs(col.l - ${before - 140}) < 30`, 1500); // the strip re-centred: 140px to the left
  await p.key('Shift', 'up');
  const y = await p.eval('scrollY');
  await p.until(`scrollY > ${y + 50}`);
  await p.close();
});

test('a huge chapter (3000 paragraphs) stays fast', async () => {
  const p = await b.open('novel.html?n=3000', { focus: true });
  const time = (expr) => p.eval(`(() => { const t = performance.now(); ${expr}; return performance.now() - t })()`);
  const budget = 150 * (+process.env.TEST_THROTTLE || 1); // ms, generous for CI
  const costs = { measure: await time('measure()'), column: await time('column()'), findEnd: await time('findEnd(findTarget(), performance.now())') };
  for (const [k, ms] of Object.entries(costs)) assert.ok(ms < budget, `${k} took ${Math.round(ms)}ms`);
  // and while running, no frame-blocking task longer than the budget
  await p.eval(`window.long = []; new PerformanceObserver((l) => long.push(...l.getEntries().map((e) => e.duration))).observe({ type: 'longtask' })`);
  await p.key('s');
  await sleep(4500); // spans two wpm re-measures and four focus checks
  const worst = Math.max(0, ...await p.eval('long'));
  assert.ok(worst < budget, `longest task ${Math.round(worst)}ms`);
  await p.close();
});

test('zooming text mid-run re-measures words per minute', async () => {
  const p = await b.open('novel.html');
  await p.key('s');
  await p.until('level === 1');
  const before = await p.eval('speed()');
  await p.eval(`document.body.style.fontSize = '27px'`);
  await p.until(`speed() > ${before * 1.3}`, 4000); // bigger text = more px per word = more px/s at the same wpm
  await p.close();
});
