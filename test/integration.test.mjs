// Features meeting each other: the popup and the page, old settings, and feature scripts stacked together.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from './cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

// Everything the popup reads from the page (popup.js: page.*, r.*).
const POPUP_READS = { running: 'boolean', host: 'string', vh: 'number', kind: 'string', pxPerWord: 'number',
  leftSec: 'number', estimating: 'boolean', progress: 'number', sleepSec: 'number' };

test('contract: the page sends every field the popup reads, with the right type', async () => {
  const p = await b.open('novel.html', { stopAfterMin: 30, atEnd: 'wait' });
  await p.key('s');
  await p.until('level === 1');
  const state = await p.eval(`__send('state')`);
  for (const [k, type] of Object.entries(POPUP_READS)) assert.equal(typeof state[k], type, `${k}: ${JSON.stringify(state[k])}`);
  await p.close();
});

test('contract: the popup renders the real page state', async () => {
  const p = await b.open('webtoon.html', { pxs: 40, atEnd: 'wait', stopAfterMin: 30 });
  await p.key('s');
  await p.until('level === 1');
  const state = await p.eval(`__send('state')`);
  await p.close();
  const pop = await b.popup({ pxs: 40, atEnd: 'wait', stopAfterMin: 30 }, state);
  assert.match(await pop.eval('$("#status-text").textContent'), /^~\d+:\d\d left in this chapter$/); // 'wait' = an estimate
  assert.match(await pop.eval('$("#bed-desc").textContent'), /^Lights out in (30|29) min\.$/);
  await pop.close();
});

const V121 = { // storage exactly as Scroller 1.2.1 left it
  key: 's', fasterKey: ']', slowerKey: '[', holdKey: 'Shift', nudge: 1.5, pxs: 55,
  sites: { local: 55, 'mangadex.org': 70 }, favs: ['mangadex.org'], mode: 'step', step: 0.5, dir: 1,
  atEnd: 'next', pauseOnManual: false, badge: true,
};

test('upgrade from 1.2.1: the page keeps old settings and gets the new defaults', async () => {
  const p = await b.open('webtoon.html', V121);
  assert.equal(await p.eval('speed()'), 55);
  await p.key('s');
  await p.until('nightOn() && nightHost.isConnected'); // Night is on by default, while scrolling
  assert.deepEqual(await p.eval('[s.dim, s.warm, s.focus, s.stopAfterMin, s.stopAfterCh]'), [0.2, 0, false, 0, 0]);
  await p.close();
});

test('upgrade from 1.2.1: the popup opens on every tab without errors', async () => {
  const pop = await b.popup(V121, { running: false, host: 'mangadex.org', vh: 800, kind: 'image', pxPerWord: null });
  for (const t of ['read', 'night', 'feel', 'keys', 'sites']) await pop.click('#t-' + t);
  assert.match(await pop.eval('$("#site-list").textContent + $("#fav-list").textContent'), /mangadex\.org70 px\/s/);
  await pop.close(); // fails on any uncaught error
});

test('wpm × pages: a text page in Pages style jumps a screen at a time at reading pace', async () => {
  const p = await b.open('novel.html', { mode: 'pages', step: 0.75 });
  await p.key('s');
  await p.until('level === 1');
  assert.equal(await p.eval('jump(0)'), 600); // no page images: screen fraction
  assert.ok(await p.eval('speed()') < 20, 'wpm pace, not px/s');
  await p.close();
});

test('wpm × time left: time left uses the wpm speed', async () => {
  const p = await b.open('novel.html');
  await p.key('s');
  await p.until('level === 1');
  const [leftSec, remaining, pxs] = await p.eval(`(() => { const i = sessionInfo(); return [i.leftSec, endY - scrollY - innerHeight, speed()] })()`);
  assert.ok(Math.abs(leftSec - remaining / pxs) <= Math.max(5, leftSec * 0.1), `${leftSec}s vs ${remaining / pxs}s`);
  await p.close();
});

test('wpm × keys: ] on a text page steps wpm, not px/s', async () => {
  const p = await b.open('novel.html', { wpm: 250 });
  await p.key('s');
  await p.key(']');
  await p.until('__store.wpmSites?.local === 313');
  assert.equal(await p.eval('__store.sites'), undefined);
  await p.close();
});

test('night × next chapter: the next chapter opens already dimmed', async () => {
  const p = await b.open('webtoon.html', { atEnd: 'next', pxs: 5000, dim: 0.5 });
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  await p.until('location.search === "?ch=2" && window.__ready', 6000);
  assert.equal(await p.eval('on'), false, 'checked before the run resumes');
  assert.equal(await p.eval('nightHost?.isConnected'), true);
  await p.close();
});

test('session × pages: the chapter limit stops a Pages run too', async () => {
  const p = await b.open('manga.html', { atEnd: 'next', mode: 'pages', pxs: 5000, stopAfterCh: 1 });
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  await p.until('!on', 6000);
  assert.match(await p.eval('parts.label.textContent'), /That's 1 chapter\. Good night\./);
  await p.close();
});

test('every feature contributes to the popup state at once', async () => {
  const p = await b.open('novel.html');
  const state = await p.eval(`__send('state')`);
  for (const k of ['running', 'host', 'vh', 'kind', 'unit', 'wpm', 'pxPerWord', 'session', 'sleepSec', 'leftSec', 'progress', 'estimating'])
    assert.ok(k in state, `missing ${k}`);
  await p.close();
});
