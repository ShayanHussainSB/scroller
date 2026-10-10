// Night: dimmer, warm tint, focus mode. Run with `node --test test/suite/night.test.mjs`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { browser, sleep } from '../harness/cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

const SHOTS = process.env.SHOTS || tmpdir(); // screenshots to look at by eye
const present = 'document.querySelector("scroller-night")?.isConnected === true';
const op = (cls) => `+getComputedStyle(nightHost.shadowRoot.querySelector('.${cls}')).opacity`;
// the column focus leaves bright: from the left side's right edge to the right side's left edge
const gap = `(() => { const [l, r] = nightHost.shadowRoot.querySelectorAll('.l, .r');
  return [l.getBoundingClientRect().right, r.getBoundingClientRect().left] })()`;

test('scrolling mode: off before start, on while running and paused, gone after stop', async () => {
  const p = await b.open('webtoon.html', { dim: 0.3 });
  assert.equal(await p.eval(present), false, 'no overlay before start');
  await p.key('s');
  await p.until(`${present} && ${op('dim')} > 0.29`);
  await p.key('Shift', 'down');
  await sleep(700);
  assert.equal(await p.eval(op('dim')), 0.3, 'stays on while held');
  await p.key('Shift', 'up');
  await p.wheel(200);
  await sleep(300);
  assert.equal(await p.eval(op('dim')), 0.3, 'stays on while paused by manual scroll');
  await p.key('s');
  await p.until(`!document.querySelector("scroller-night")`, 2000);
  await p.close();
});

test('always mode works without start; night=false disables it', async () => {
  const p = await b.open('novel.html', { nightWhen: 'always', dim: 0.4 });
  await p.until(`${present} && ${op('dim')} > 0.39`);
  await p.eval(`__set({ night: false })`);
  await p.until(`!document.querySelector("scroller-night")`, 2000);
  await p.close();
  const q = await b.open('novel.html', { nightWhen: 'always', night: false });
  await q.key('s');
  await sleep(700);
  assert.equal(await q.eval(present), false);
  await q.close();
});

test('popup slider changes dim and warm live', async () => {
  const p = await b.open('manga.html', { nightWhen: 'always', dim: 0.2 });
  await p.until(present);
  await p.eval(`__set({ dim: 0.6, warm: 1 })`);
  assert.equal(await p.eval(`dimEl.style.opacity`), '0.6');
  assert.ok(+(await p.eval(`warmEl.style.opacity`)) > 0);
  await p.until(`${op('dim')} > 0.59`);
  await p.close();
});

test('focus: webtoon strip stays bright, fixed side ad does not count', async () => {
  const p = await b.open('webtoon.html', { focus: true });
  await p.key('s');
  await p.until(`${op('l')} > 0.84 && ${op('r')} > 0.84`);
  const [l, r] = await p.eval(gap);
  // strip is 720px centred in 1280: 280..1000
  assert.ok(l <= 280 && l >= 240 && r >= 1000 && r <= 1040, `column ${l}..${r}`);
  await p.close();
});

test('focus: novel article stays bright, sidebar is darkened', async () => {
  const p = await b.open('novel.html', { focus: true, nightWhen: 'always' });
  await p.until(`${op('l')} > 0.84`);
  const [l, r] = await p.eval(gap);
  const art = await p.eval(`(() => { const a = text.getBoundingClientRect(), s = document.querySelector('aside').getBoundingClientRect(); return [a.left, a.right, s.left] })()`);
  assert.ok(l <= art[0] && r >= art[1], `article ${art[0]}..${art[1]} inside ${l}..${r}`);
  assert.ok(r < art[2], `sidebar at ${art[2]} is darkened (column ends ${r})`);
  await p.close();
});

test('overlay never blocks clicks', async () => {
  const p = await b.open('novel.html', { nightWhen: 'always', focus: true, dim: 0.8, warm: 1 });
  await p.until(`${op('l')} > 0.84`);
  assert.equal(await p.eval(`(() => { const a = document.querySelector('aside a'), r = a.getBoundingClientRect();
    return document.elementFromPoint(r.left + 5, r.top + 5) === a })()`), true);
  await p.close();
});

test('screenshots: dim 0.4, warm 0.6, focus', async () => {
  const set = { nightWhen: 'always', dim: 0.4, warm: 0.6, focus: true };
  for (const f of ['webtoon', 'manga', 'novel']) {
    const p = await b.open(`${f}.html`, set);
    await p.eval('scrollTo(0, 500)');
    await sleep(1600);
    await p.shot(`${SHOTS}/night-${f}.png`);
    await p.close();
  }
});

test('the popup previews Night on the page, then it fades back out', async () => {
  const p = await b.open('novel.html', { night: true, nightWhen: 'scrolling', dim: 0.5 });
  assert.equal(await p.eval('nightOn()'), false);
  await p.eval(`__send('preview')`);
  assert.equal(await p.eval('nightOn() && nightHost.isConnected'), true);
  await p.until('!nightHost.isConnected', 4000);
  await p.close();
});
