// At the end of a chapter: stop, wait for more, or find and open the next chapter.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from './cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

// Start scrolling right at the bottom, so the end comes quickly.
const atBottom = async (p) => { await p.eval('scrollTo(0, document.body.scrollHeight)'); await p.key('s'); };

test('stop: stops at the end', async () => {
  const p = await b.open('chapters.html?v=none', { atEnd: 'stop', pxs: 2000 });
  await atBottom(p);
  await p.until('!on', 4000);
  await p.close();
});

test('wait: keeps going when more content loads in', async () => {
  const p = await b.open('chapters.html?v=wait', { atEnd: 'wait', pxs: 2000 });
  await atBottom(p);
  await sleep(2000); // longer than the 1.5s that would end a 'stop' run
  assert.equal(await p.eval('on'), true, 'still waiting');
  const y = await p.eval('scrollY');
  await p.eval(`document.body.insertAdjacentHTML('beforeend', '<div style="height:3000px"></div>')`);
  await p.until(`scrollY > ${y + 500}`);
  await p.close();
});

for (const [v, why] of [['rel', 'a <link rel=next>'], ['prevnext', 'previous and next links side by side'],
  ['comments', '"Next ›" over the comments\' louder "Next comments ›"'], ['arrow', 'an arrow-only link'],
  ['shared', 'an arrow when previous and next share a "next-prev" class'], ['bem', 'BEM classes (prev-next__next)']]) {
  test(`next: follows ${why}`, async () => {
    const p = await b.open(`chapters.html?v=${v}`, { atEnd: 'next', pxs: 2000 });
    await atBottom(p);
    await p.until('location.search.includes("ch=2") && window.__ready && on', 6000);
    assert.equal(await p.eval('window.chapter'), 2);
    await p.close();
  });
}

test('the finder never picks previous, back or comment links', async () => {
  for (const [v, want] of [['comments', 'Next ›'], ['prevnext', 'Next chapter ›'], ['shared', '›'], ['bem', 'Chapter 2']]) {
    const p = await b.open(`chapters.html?v=${v}`);
    assert.equal(await p.eval('findNext()?.textContent'), want, v);
    await p.close();
  }
});

test('a previous link with a copy-pasted next class is never picked', async () => {
  const p = await b.open('chapters.html?v=copied');
  assert.notEqual(await p.eval('findNext()?.textContent'), 'Previous chapter');
  await p.close();
});

test('next: no next chapter on the page stops instead', async () => {
  const p = await b.open('chapters.html?v=none', { atEnd: 'next', pxs: 2000 });
  await atBottom(p);
  await p.until('!on', 4000);
  assert.equal(await p.eval('location.search'), '?v=none');
  await p.close();
});

test('next: a button that goes nowhere stops instead of clicking forever', async () => {
  const p = await b.open('chapters.html?v=dead', { atEnd: 'next', pxs: 2000 });
  await p.eval(`window.clicks = 0; document.querySelector('button').addEventListener('click', () => clicks++)`);
  await atBottom(p);
  await p.until('!on', 8000);
  assert.ok(await p.eval('clicks') <= 1, `clicked ${await p.eval('clicks')} times`);
  await p.close();
});

test('next: a chapter swapped in place keeps scrolling from the top', async () => {
  const p = await b.open('chapters.html?v=swap', { atEnd: 'next', pxs: 2000 });
  await atBottom(p);
  await p.until('window.chapter === 2', 6000);
  await p.until('on && scrollY > 100');
  assert.equal(await p.eval('location.search'), '?v=swap&ch=2');
  await p.close();
});

test('next: scrolling up never opens a chapter', async () => {
  const p = await b.open('chapters.html?v=prevnext', { atEnd: 'next', pxs: 2000, dir: -1 });
  await p.key('s'); // already at the top
  await p.until('!on', 4000);
  assert.equal(await p.eval('location.search'), '?v=prevnext');
  await p.close();
});
