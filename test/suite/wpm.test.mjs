// Words per minute: page kind, px per word from the layout, wpm → px/s, nudges. `node --test test/suite/wpm.test.mjs`
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from '../harness/cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= want * tol, `${what}: ${got} vs ${want}`);

test('novel is text and speaks wpm', async () => {
  const p = await b.open('novel.html');
  const st = await p.eval('pageState()');
  assert.equal(st.kind, 'text');
  assert.equal(st.unit, 'wpm');
  assert.equal(st.wpm, 250);
  assert.ok(st.pxPerWord > 1 && st.pxPerWord < 5, `pxPerWord ${st.pxPerWord}`);
  // the core's fields are still there
  assert.equal(st.running, false);
  assert.equal(st.host, 'local');
  assert.equal(st.vh, 800);
  await p.key('s');
  await sleep(100);
  assert.match(await p.eval('pill.textContent'), /^250 wpm/);
  await p.close();
});

test('webtoon, manga and a webtoon with an author\'s note are images in px/s', async () => {
  for (const f of ['webtoon.html', 'manga.html', 'wpm-mixed.html']) {
    const p = await b.open(f, { pxs: 40 });
    const st = await p.eval('pageState()');
    assert.equal(st.kind, 'image', f);
    assert.equal(st.unit, 'px', f);
    assert.equal(await p.eval('speed()'), 40, f);
    assert.equal(await p.eval('speedLabel()'), '40 px/s', f);
    await p.close();
  }
});

test('units[host] overrides the automatic choice', async () => {
  let p = await b.open('novel.html', { pxs: 40, units: { local: 'px' } });
  assert.equal((await p.eval('pageState()')).unit, 'px');
  assert.equal(await p.eval('speed()'), 40);
  await p.close();
  // the note gives the webtoon enough text to measure, so wpm is possible when asked for
  p = await b.open('wpm-mixed.html', { units: { local: 'wpm' } });
  assert.equal((await p.eval('pageState()')).unit, 'wpm');
  await p.close();
  // no text at all: wpm can't work, stay in px
  p = await b.open('webtoon.html', { pxs: 40, units: { local: 'wpm' } });
  assert.equal((await p.eval('pageState()')).unit, 'px');
  assert.equal(await p.eval('speed()'), 40);
  await p.close();
});

test('px/s = wpm × px per word / 60, per-site wpm wins, clamped to the core range', async () => {
  const p = await b.open('novel.html', { wpm: 300, wpmSites: { local: 180 } });
  const { pxPerWord } = await p.eval('pageState()');
  near(await p.eval('speed()'), (180 * pxPerWord) / 60, 1e-9, 'speed');
  await p.eval('pxPerWord = 10000'); // absurdly big type
  assert.equal(await p.eval('speed()'), await p.eval('MAX'));
  await p.eval('pxPerWord = 0.01');
  assert.equal(await p.eval('speed()'), await p.eval('MIN'));
  await p.close();
});

test('nudge steps wpm, saves it per site, stays in bounds', async () => {
  const p = await b.open('novel.html', { wpm: 250 });
  await p.eval('pageState()');
  await p.eval('nudge(true)');
  await sleep(50);
  assert.equal(await p.eval('s.wpm'), 313); // 250 × 1.25
  assert.deepEqual(await p.eval('s.wpmSites'), { local: 313 });
  assert.equal(await p.eval('speedLabel()'), '313 wpm');
  await p.eval('nudge(false)');
  await sleep(50);
  assert.equal(await p.eval('s.wpmSites.local'), 250);
  await p.eval('__set({ wpmSites: { local: 1450 } })');
  await p.eval('nudge(true)');
  await sleep(50);
  assert.equal(await p.eval('s.wpmSites.local'), 1500);
  await p.eval('nudge(true)');
  await sleep(50);
  assert.equal(await p.eval('s.wpmSites.local'), 1500);
  await p.eval('__set({ wpmSites: { local: 51 } })');
  await p.eval('nudge(false)');
  await sleep(50);
  assert.equal(await p.eval('s.wpmSites.local'), 50);
  assert.equal(await p.eval('s.pxs'), 40, 'px speed untouched');
  await p.close();
});

test('250 wpm scrolls ~42 words past in 10s', async () => {
  const p = await b.open('novel.html', { wpm: 250 });
  await p.key('s');
  await sleep(1000); // past the ease-in
  const [y1, t1] = await p.eval('[scrollY, performance.now()]');
  await sleep(10000);
  const [y2, t2] = await p.eval('[scrollY, performance.now()]');
  // Independent density: every word's own box, from the first paragraph's first word to the last one's last.
  const { words, span } = await p.eval(`(() => {
    const r = document.createRange(), boxes = [];
    for (const para of document.querySelectorAll('article p'))
      for (const n of para.childNodes)
        for (const m of n.data.matchAll(/\\S+/g)) {
          r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
          boxes.push(r.getBoundingClientRect());
        }
    // one paragraph's worth of trailing margin closes the last line, like the gaps between the others
    const gap = parseFloat(getComputedStyle(document.querySelector('article p')).marginBottom);
    return { words: boxes.length, span: boxes.at(-1).bottom - boxes[0].top + gap };
  })()`);
  const scrolled = ((y2 - y1) / (span / words)) * (10000 / (t2 - t1));
  console.log(`# ${(y2 - y1).toFixed(0)}px in ${(t2 - t1).toFixed(0)}ms, ${(span / words).toFixed(3)} px/word measured independently → ${scrolled.toFixed(1)} words per 10s (want ${(250 / 6).toFixed(1)})`);
  near(scrolled, 250 / 6, 0.1, 'words per 10s');
  await p.close();
});

test('bigger font → more px per word, re-measured while running', async () => {
  const p = await b.open('novel.html');
  const small = (await p.eval('pageState()')).pxPerWord;
  await p.key('s');
  await sleep(100);
  await p.eval(`document.head.insertAdjacentHTML('beforeend', '<style>article p { font-size: 28px }</style>')`);
  await sleep(2500); // no popup asking: the running timer picks it up
  const big = await p.eval('pxPerWord');
  assert.ok(big > small * 1.8, `${small} → ${big}`); // ~(28/18)² more area per word
  near(await p.eval('speed()'), (250 * big) / 60, 1e-9, 'speed follows');
  await p.close();
});

test('CJK novel: characters count as words, cover image does not make it a comic', async () => {
  const p = await b.open('wpm-cjk.html');
  assert.equal(await p.eval(`countWords('月河夜静小心。')`), 4); // 6 Han / 1.5, punctuation free
  assert.equal(await p.eval(`countWords('他说 hello world「」')`), 2 / 1.5 + 2);
  const st = await p.eval('pageState()');
  assert.equal(st.kind, 'text');
  assert.equal(st.unit, 'wpm');
  // 684px / 18px = 38 characters a line = 25⅓ words in 32.4px; paragraph indents and margins add a bit
  assert.ok(st.pxPerWord > 32.4 / 25.34 && st.pxPerWord < 2.2, `pxPerWord ${st.pxPerWord}`);
  await p.close();
});

test('inner scroll box reader is measured and scrolled in wpm', async () => {
  const p = await b.open('wpm-inner.html', { wpm: 600 });
  const st = await p.eval('pageState()');
  assert.equal(st.unit, 'wpm');
  await p.key('s');
  await sleep(1500);
  assert.ok(await p.eval('box.scrollTop') > 20, 'the box scrolled');
  await p.close();
});
