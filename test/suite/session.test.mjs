// Session: sleep timer, chapter limit, time left in the chapter. Run with `node --test test/suite/session.test.mjs`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from '../harness/cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

const near = (a, e, tol, what) => assert.ok(Math.abs(a - e) <= tol, `${what}: ${a} vs ${e}`);
// bottom of the last panel on webtoon.html, in page coordinates (the comments come after it)
const LAST_PANEL = `(() => { const i = [...document.querySelectorAll('main img')].at(-1); return i.getBoundingClientRect().bottom + scrollY })()`;

test('sleep timer stops with a farewell', async () => {
  const p = await b.open('webtoon.html', { pxs: 40, stopAfterMin: 0.02 }); // 1.2s
  await p.key('s');
  await sleep(300);
  assert.equal(await p.eval('on'), true);
  const left = await p.eval('pillInfo().sleepSec');
  assert.ok(left > 0 && left <= 2, `sleepSec ${left}`);
  await p.until('!on', 3000);
  assert.equal(await p.eval('pill.textContent'), 'Good night. Stopped after 1 second.');
  await p.close();
});

test('sleep timer applies a setting changed mid-session from the start time', async () => {
  const p = await b.open('webtoon.html', { pxs: 40 });
  await p.key('s');
  await sleep(500);
  assert.equal(await p.eval('pillInfo().sleep'), null);
  await p.eval('__set({ stopAfterMin: 0.005 })'); // 0.3s, already passed
  await p.until('!on', 1000);
  assert.match(await p.eval('pill.textContent'), /^Good night/);
  await p.close();
});

test('manual stop then start begins a fresh session', async () => {
  const p = await b.open('webtoon.html', { pxs: 40 });
  await p.key('s');
  await sleep(100);
  const first = await p.eval('session.startedAt');
  await p.key('s');
  assert.equal(await p.eval('session'), null);
  await sleep(50);
  await p.key('s');
  assert.ok(await p.eval('session.startedAt') > first);
  assert.equal(await p.eval('session.chapters'), 1);
  await p.close();
});

test('session survives a next-chapter page load', async () => {
  const p = await b.open('webtoon.html', { atEnd: 'next', pxs: 5000, stopAfterMin: 10 });
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  await sleep(100);
  const { startedAt } = await p.eval('session');
  await p.until('location.search === "?ch=2" && window.__ready && on', 6000);
  assert.deepEqual(await p.eval('session'), { startedAt, chapters: 2 });
  const st = await p.eval(`__send('state')`);
  assert.equal(st.session.startedAt, startedAt);
  assert.ok(st.sleepSec > 590 && st.sleepSec <= 600, `sleepSec ${st.sleepSec}`);
  await p.close();
});

test('chapter limit 1 stops at the end of chapter 1', async () => {
  const p = await b.open('webtoon.html', { atEnd: 'next', pxs: 5000, stopAfterCh: 1 });
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  assert.deepEqual(await p.eval('pillInfo().chapter'), { n: 1, of: 1 });
  await p.until('!on', 4000);
  assert.equal(await p.eval('pill.textContent'), "That's 1 chapter. Good night.");
  assert.equal(await p.eval('location.search'), '');
  await p.close();
});

test('chapter limit 2 opens one chapter, then stops', async () => {
  const p = await b.open('webtoon.html', { atEnd: 'next', pxs: 5000, stopAfterCh: 2 });
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  await p.until('location.search === "?ch=2" && window.__ready && on', 6000);
  assert.deepEqual(await p.eval('pillInfo().chapter'), { n: 2, of: 2 });
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.until('!on', 4000);
  assert.equal(await p.eval('pill.textContent'), "That's 2 chapters. Good night.");
  assert.equal(await p.eval('location.search'), '?ch=2');
  await p.close();
});

test('chapter limit counts chapters swapped in place', async () => {
  const p = await b.open('webtoon.html', { atEnd: 'next', pxs: 5000, stopAfterCh: 2 });
  // a reader that swaps the chapter without a page load
  await p.eval(`document.querySelector('.next-btn').addEventListener('click', (e) => {
    e.preventDefault(); history.pushState(null, '', '?ch=2'); scrollTo(0, 0); window.swaps = (window.swaps || 0) + 1;
  })`);
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  await p.until('window.swaps === 1', 4000);
  assert.equal(await p.eval('on && session.chapters'), 2);
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.until('!on', 4000);
  assert.equal(await p.eval('pill.textContent'), "That's 2 chapters. Good night.");
  assert.equal(await p.eval('window.swaps'), 1);
  await p.close();
});

test('time left counts to the end of the chapter, not the comments', async () => {
  const p = await b.open('webtoon.html', { pxs: 100 });
  await p.eval('scrollTo(0, 4000)');
  await p.key('s');
  await sleep(1200);
  const { leftSec, left, estimating } = await p.eval('pillInfo()');
  const end = await p.eval(LAST_PANEL);
  near(leftSec, (end - (await p.eval('scrollY')) - 800) / 100, 2, 'leftSec');
  const toDocEnd = (await p.eval('document.documentElement.scrollHeight - scrollY - innerHeight')) / 100;
  assert.ok(toDocEnd - leftSec > 9, `comments ignored (${leftSec}s vs ${toDocEnd}s to the very end)`);
  assert.match(left, /^\d+:\d0 left$/);
  assert.equal(estimating, false);
  assert.match(await p.eval('pill.textContent'), /left/);
  await p.close();
});

test('time left going up is the time to the top', async () => {
  const p = await b.open('webtoon.html', { pxs: 100, dir: -1 });
  await p.eval('scrollTo(0, 3000)');
  await p.key('s');
  await sleep(600);
  near(await p.eval('pillInfo().leftSec'), (await p.eval('scrollY')) / 100, 2, 'leftSec up');
  await p.close();
});

test('time left on a novel stops at the last paragraph', async () => {
  const p = await b.open('novel.html', { pxs: 50 });
  const end = await p.eval(`document.querySelector('article p:last-of-type').getBoundingClientRect().bottom`);
  near(await p.eval('pillInfo().leftSec'), (end - 800) / 50, 1, 'leftSec');
  await p.close();
});

test('progress runs 0 to 1 through the chapter content', async () => {
  const p = await b.open('webtoon.html');
  assert.equal(await p.eval('pillInfo().progress'), 0);
  const end = await p.eval(LAST_PANEL);
  await p.eval(`scrollTo(0, ${(end - 800) / 2})`);
  near(await p.eval('pillInfo().progress'), 0.5, 0.01, 'halfway');
  await p.eval(`scrollTo(0, ${end - 800})`);
  assert.equal(await p.eval('pillInfo().progress'), 1);
  await p.eval('scrollTo(0, document.body.scrollHeight)'); // in the comments
  assert.equal(await p.eval('pillInfo().progress'), 1);
  const st = await p.eval(`__send('state')`);
  assert.equal(st.progress, 1);
  assert.equal(st.session, null);
  await p.close();
});

test('labels', async () => {
  const p = await b.open('webtoon.html');
  const cases = {
    'leftLabel(3)': 'almost done', 'leftLabel(9.9)': 'almost done', 'leftLabel(10)': '10s left', 'leftLabel(44)': '45s left',
    'leftLabel(58)': '1:00 left', 'leftLabel(160)': '2:40 left', 'leftLabel(163)': '2:40 left', 'leftLabel(3569)': '59:30 left',
    'leftLabel(3590)': '1h 00m left', 'leftLabel(3900)': '1h 05m left', 'leftLabel(36000)': '10h 00m left',
    'sleepLabel(0.2)': '1s', 'sleepLabel(45)': '45s', 'sleepLabel(60)': '1m', 'sleepLabel(700)': '12m',
    'sleepLabel(3600)': '1h 00m', 'sleepLabel(3601)': '1h 01m',
  };
  for (const [expr, want] of Object.entries(cases)) assert.equal(await p.eval(expr), want, expr);
  await p.close();
});

test('estimating: waiting pages, a growing chapter, images still loading', async () => {
  let p = await b.open('webtoon.html', { atEnd: 'wait' });
  assert.equal(await p.eval('pillInfo().estimating'), true);
  await p.close();

  p = await b.open('webtoon.html');
  assert.equal(await p.eval('pillInfo().estimating'), false);
  // lazy loading: another panel arrives before the nav
  await p.eval(`document.querySelector('main nav').insertAdjacentHTML('beforebegin', img(720, 1800, 0, 'late'))`);
  await sleep(1100);
  assert.equal(await p.eval('pillInfo().estimating'), true, 'grew');
  await p.eval('endGrewAt = -1e9');
  assert.equal(await p.eval('pillInfo().estimating'), false);
  // a lazy image with no size yet, ahead of us
  await p.eval(`document.querySelector('main nav').insertAdjacentHTML('beforebegin', '<img data-src="x.png">')`);
  await sleep(1100);
  assert.equal(await p.eval('pillInfo().estimating'), true, 'unsized image');
  await p.close();
});
