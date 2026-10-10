// Snap to pages (mode 'pages'): jumps land on page tops, below sticky headers, stepping through tall pages.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from './cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

// Run the real engine until it has aimed `n` distinct jumps, stop, let the last smooth scroll land.
async function jumps(p, n) {
  await p.eval(`window.aims = []; bus.addEventListener('tick', () => aim !== null && aim !== aims.at(-1) && aims.push(aim))`);
  await p.key('s');
  await p.until(`aims.length >= ${n}`, 20000);
  await p.key('s');
  await sleep(1000);
  const aims = await p.eval('aims');
  assert.equal(await p.eval('target.scrollTop'), aims.at(-1), 'settled where it aimed');
  return aims;
}
// scroll positions that put each element's top at the top of target's view, minus a header
const tops = (p, sel, head = 0) => p.eval(`(() => {
  const t = findTarget(), v = t === document.scrollingElement ? 0 : t.getBoundingClientRect().top + t.clientTop;
  return [...document.querySelectorAll('${sel}')].map((el) => Math.round(el.getBoundingClientRect().top - v + t.scrollTop) - ${head});
})()`);

test('manga: each jump lands on the next page top, never the banner or logo', async () => {
  const p = await b.open('manga.html', { mode: 'pages', pxs: 4000 }, { height: 1300 });
  const pages = await tops(p, 'img.page');
  const aims = await jumps(p, 10);
  assert.deepEqual(aims.slice(0, 10), pages);
  for (const ad of await tops(p, '.banner, .logo')) assert.ok(!aims.includes(ad), `snapped to ad/logo at ${ad}`);
  await p.close();
});

test('manga up: mirrors down', async () => {
  const p = await b.open('manga.html', { mode: 'pages', pxs: 4000, dir: -1 }, { height: 1300 });
  const pages = await tops(p, 'img.page');
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  const aims = await jumps(p, 10);
  assert.deepEqual(aims.slice(0, 10), pages.reverse());
  await p.close();
});

test('manga pages taller than the screen are stepped through, then snapped', async () => {
  const p = await b.open('manga.html', { mode: 'pages', pxs: 4000 }); // 800px tall: a 1150px page needs two jumps
  const pages = await tops(p, 'img.page');
  const aims = await jumps(p, 6);
  let y = 0;
  for (const a of aims) { assert.ok(a - y <= 800, `skipped ${a - y - 800}px between ${y} and ${a}`); y = a; }
  for (const t of pages.slice(0, 3)) assert.ok(aims.includes(t), `page top ${t} snapped in ${aims}`);
  await p.close();
});

test('webtoon: tall panels stepped without skipping, next panel snaps below the sticky header', async () => {
  const p = await b.open('webtoon.html', { mode: 'pages', pxs: 4000 });
  const panels = await tops(p, 'main img', 56);
  const aims = await jumps(p, 12);
  const vis = 800 - 56;
  let y = 0;
  for (const a of aims) { assert.ok(a - y > 0 && a - y <= vis, `step ${y} → ${a}`); y = a; }
  const reached = panels.filter((t) => t > 0 && t <= y);
  assert.ok(reached.length >= 3, `reached ${reached}`);
  for (const t of reached) assert.ok(aims.includes(t), `panel top ${t} snapped in ${aims}`);
  // and the panel really starts right under the header there
  await p.eval(`target.scrollTo({ top: ${reached[1]}, behavior: 'instant' })`);
  assert.equal(await p.eval(`document.querySelectorAll('main img')[2].getBoundingClientRect().top`), 56);
  await p.close();
});

test('novel: no pages falls back to screen-fraction jumps', async () => {
  const p = await b.open('novel.html', { mode: 'pages', pxs: 4000, units: { local: 'px' } }); // px/s, not the wpm conversion
  assert.deepEqual(await jumps(p, 3), [600, 1200, 1800]); // 0.75 × 800
  await p.close();
});

test('inner scroll box with canvas pages and a sticky toolbar', async () => {
  const p = await b.open('pages-inner.html', { mode: 'pages', pxs: 4000 }, { height: 1200 });
  assert.equal(await p.eval('findTarget().id'), 'box');
  const pages = await tops(p, 'canvas', 48);
  const aims = await jumps(p, 5);
  assert.deepEqual(aims, pages.slice(1, 6));
  await p.close();
});

test('lazy images are ignored until they have a size', async () => {
  const p = await b.open('pages-lazy.html', { mode: 'pages' }, { height: 1300 });
  await p.eval('target = findTarget()');
  const [, , third] = await tops(p, 'img');
  assert.equal(await p.eval(`jump(${third})`), 1300 * 0.75, 'nothing loaded ahead: screen-fraction fallback');
  await p.eval('loadAll()');
  await p.until(`[...document.images].every((i) => i.complete)`);
  assert.equal(await p.eval(`jump(${third})`), 1174, 'snaps to the freshly loaded page 4');
  await p.close();
});
