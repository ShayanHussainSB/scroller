// Core engine: start/stop, glide, jumps, hooks, next chapter. Run all tests with `npm test`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from '../harness/cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

test('start key glides down, stop key stops', async () => {
  const p = await b.open('webtoon.html', { pxs: 400 });
  await p.key('s');
  await sleep(1200);
  const y = await p.eval('scrollY');
  assert.ok(y > 150, `scrolled ${y}px`);
  await p.key('s');
  await sleep(700);
  const y2 = await p.eval('scrollY');
  await sleep(300);
  assert.equal(await p.eval('scrollY'), y2, 'stopped');
  await p.close();
});

test('pill shows the speed label hook', async () => {
  const p = await b.open('webtoon.html', { pxs: 40 });
  await p.key('s');
  await sleep(100);
  assert.match(await p.eval('pill.textContent'), /^40 px\/s/);
  await p.eval('speedLabel = () => "250 wpm"');
  await sleep(700);
  assert.match(await p.eval('pill.textContent'), /^250 wpm/);
  await p.close();
});

test('bus emits start, tick and stop', async () => {
  const p = await b.open('webtoon.html');
  await p.eval(`window.seen = new Set(); for (const t of ['start','tick','stop']) bus.addEventListener(t, () => seen.add(t))`);
  await p.key('s'); await sleep(200); await p.key('s'); await sleep(100);
  assert.deepEqual(await p.eval('[...seen].sort()'), ['start', 'stop', 'tick']);
  await p.close();
});

test('jumps use the jump hook and its size sets the pace', async () => {
  const p = await b.open('webtoon.html', { mode: 'step', pxs: 2000 });
  await p.eval('jump = () => 300');
  await p.key('s');
  await sleep(1000); // 300px at 2000px/s = a jump every 150ms, eased in
  await p.key('s');
  await sleep(1000); // let the last smooth jump land
  const y = await p.eval('scrollY');
  assert.ok(y >= 600 && y % 300 === 0, `jumped to ${y}`);
  await p.close();
});

test('canAdvance can veto next chapter', async () => {
  const p = await b.open('webtoon.html', { atEnd: 'next', pxs: 5000 });
  await p.eval(`canAdvance = () => { stop('Enough for tonight.'); return false }`);
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  await p.until('!on', 4000);
  assert.equal(await p.eval('pill.textContent'), 'Enough for tonight.');
  assert.match(await p.eval('location.search'), /^$/, 'stayed on chapter 1');
  await p.close();
});

test('next chapter resumes on the new page', async () => {
  const p = await b.open('webtoon.html', { atEnd: 'next', pxs: 5000 });
  await p.eval('scrollTo(0, document.body.scrollHeight)');
  await p.key('s');
  await p.until('location.search === "?ch=2" && window.__ready && on', 6000);
  assert.equal(await p.eval('resumed'), true);
  await p.close();
});

test('popup state comes from the pageState hook', async () => {
  const p = await b.open('novel.html');
  const st = await p.eval(`__send('state')`);
  assert.equal(st.running, false);
  assert.equal(st.host, 'local');
  await p.close();
});

test('fast jumps on a slow machine never go backwards', async () => {
  for (const mode of ['step', 'pages']) {
    const p = await b.open('webtoon.html', { mode, pxs: 5000 });
    await p.throttle(20);
    // where each jump aims: smooth scrolls lag far behind here, which must not make a jump re-aim backwards
    await p.eval(`window.aims = []; bus.addEventListener('tick', () => aim !== null && aim !== aims.at(-1) && aims.push(aim))`);
    await p.key('s');
    await sleep(4000);
    const aims = await p.eval('aims');
    const back = aims.findIndex((y, i) => i && y <= aims[i - 1]);
    assert.equal(back, -1, `${mode}: aimed back ${aims[back - 1]} → ${aims[back]}`);
    assert.ok(aims.length > 5, `${mode}: jumped (${aims})`);
    await p.close();
  }
});

test('jumps follow a reader that swaps the chapter in place and jumps to the top', async () => {
  const p = await b.open('webtoon.html', { mode: 'step', pxs: 3000 });
  await p.eval(`window.aims = []; bus.addEventListener('tick', () => aim !== null && aim !== aims.at(-1) && aims.push(aim))`);
  await p.key('s');
  await p.until('scrollY > 3000');
  await p.eval(`scrollTo({ top: 0, behavior: 'instant' }); aims.length = 0`); // the new chapter starts at the top
  await p.until('aims.length >= 2');
  const aims = await p.eval('aims');
  assert.ok(aims[0] <= 1200, `kept jumping from the new top: ${aims}`);
  await p.close();
});
