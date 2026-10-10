// Everyday controls from 1.0–1.2: keys, hold to pause, faster/slower, manual scrolling, easing, direction.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from '../harness/cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

test('hold Shift pauses with "Paused" on the pill; letting go carries on', async () => {
  const p = await b.open('webtoon.html', { pxs: 300 });
  await p.key('s');
  await p.until('level === 1');
  await p.key('Shift', 'down');
  await p.until('held && level === 0');
  assert.equal(await p.eval('parts.label.textContent'), 'Paused');
  const y = await p.eval('scrollY');
  await sleep(400); // paused: time passes, the page must not move
  assert.equal(await p.eval('scrollY'), y);
  await p.key('Shift', 'up');
  await p.until(`!held && scrollY > ${y + 20}`);
  await p.close();
});

test('leaving the window releases a held key', async () => {
  const p = await b.open('webtoon.html');
  await p.key('s');
  await p.key('Shift', 'down');
  await p.until('held');
  await p.eval(`dispatchEvent(new Event('blur'))`);
  await p.until('!held');
  await p.close();
});

test('keys are ignored while typing in a text box', async () => {
  const p = await b.open('webtoon.html');
  for (const el of ['input', 'textarea', 'div contenteditable']) {
    const [tag, attr] = el.split(' ');
    await p.eval(`(() => { const e = document.createElement('${tag}'); ${attr ? `e.setAttribute('${attr}', '')` : ''}; document.body.prepend(e); e.focus() })()`);
    await p.key('s');
    assert.equal(await p.eval('on'), false, `${el} swallowed the start key`);
    await p.eval('document.activeElement.remove()');
  }
  await p.close();
});

test('Ctrl, Cmd and Alt with the start key are left to the browser', async () => {
  const p = await b.open('webtoon.html');
  for (const mod of [1, 2, 4]) {
    await p.key('s', 'press', mod);
    assert.equal(await p.eval('on'), false, `modifier ${mod} toggled`);
  }
  await p.close();
});

test('remapped keys work and the old ones stop working', async () => {
  const p = await b.open('webtoon.html', { key: 'k', fasterKey: '=', slowerKey: '-', holdKey: 'Alt' });
  await p.key('s');
  assert.equal(await p.eval('on'), false);
  await p.key('k');
  assert.equal(await p.eval('on'), true);
  await p.key('=');
  await p.until('__store.pxs === 50');
  await p.key('Alt', 'down');
  await p.until('held');
  await p.close();
});

test('faster and slower step by the chosen size and save for this site', async () => {
  const p = await b.open('webtoon.html', { pxs: 40, nudge: 1.25 });
  await p.key('s');
  await p.key(']');
  await p.until('__store.pxs === 50 && speed() === 50'); // the page has the new speed, as before a person's next press
  assert.deepEqual(await p.eval('__store.sites'), { local: 50 });
  await p.key('[');
  await p.until('__store.pxs === 40');
  await p.close();
});

test('faster and slower never get stuck at small speeds and stay inside 1..5000', async () => {
  const p = await b.open('webtoon.html', { pxs: 2, nudge: 1.1 });
  await p.key('s');
  await p.key(']');
  await p.until('__store.pxs === 3'); // 2 × 1.1 rounds back to 2, so it steps by one
  await p.eval('__set({ pxs: 1, sites: { local: 1 } })');
  await p.key('[');
  await sleep(200); // give a wrong write the chance to land
  assert.equal(await p.eval('speed()'), 1);
  await p.eval('__set({ pxs: 5000, sites: { local: 5000 } })');
  await p.key(']');
  await sleep(200);
  assert.equal(await p.eval('speed()'), 5000);
  await p.close();
});

test('faster and slower do nothing while stopped', async () => {
  const p = await b.open('webtoon.html', { pxs: 40 });
  await p.key(']');
  await sleep(200);
  assert.equal(await p.eval('__store.sites'), undefined);
  await p.close();
});

test('starts ease in rather than lurch', async () => {
  const p = await b.open('webtoon.html', { pxs: 1000 });
  // sample position on every frame with the page's own clock, so a slow machine can't skew the comparison
  await p.eval(`window.samples = []; (function f() { samples.push([performance.now(), scrollY]); requestAnimationFrame(f) })()`);
  await p.key('s');
  const t0 = await p.eval('performance.now()');
  await p.until('level === 1');
  await p.until(`performance.now() > ${t0} + 1200`);
  const [early, full] = await p.eval(`(() => {
    const at = (t) => samples.find(([s]) => s >= t)?.[1] ?? scrollY;
    return [at(${t0} + 200) - at(${t0}), at(${t0} + 1000) - at(${t0} + 800)];
  })()`);
  assert.ok(early < full * 0.6, `eased: ${early}px in the first 200ms vs ${full}px at full speed`);
  await p.close();
});

test('scrolling yourself pauses for two seconds, then it eases back in', async () => {
  const p = await b.open('webtoon.html', { pxs: 300 });
  await p.key('s');
  await p.until('level === 1');
  await p.wheel(200);
  await p.until('level === 0');
  assert.ok(await p.eval('pausedUntil - performance.now() > 1500'));
  await p.until('level === 1', 4000);
  await p.close();
});

test('with "Pause when I scroll" off, your scrolling does not pause it', async () => {
  const p = await b.open('webtoon.html', { pxs: 300, pauseOnManual: false });
  await p.key('s');
  await p.until('level === 1');
  await p.wheel(200);
  await sleep(150); // a pause would drop the level within a frame or two
  assert.equal(await p.eval('pausedUntil'), 0);
  assert.equal(await p.eval('level'), 1);
  await p.close();
});

test('direction up scrolls toward the top and the pill says so', async () => {
  const p = await b.open('webtoon.html', { pxs: 400, dir: -1 });
  await p.eval('scrollTo(0, 4000)');
  await p.key('s');
  await p.until('scrollY < 3900');
  assert.match(await p.eval('parts.label.textContent'), /· up$/);
  await p.close();
});

test('the toolbar badge hears about every start and stop', async () => {
  const p = await b.open('webtoon.html');
  await p.key('s');
  await p.until('__sent.some((m) => m.running === true)');
  await p.key('s');
  await p.until('__sent.at(-1)?.running === false');
  await p.close();
});

test('"Status on page" off: no pill at all', async () => {
  const p = await b.open('webtoon.html', { badge: false });
  await p.key('s');
  await p.until('scrollY > 0');
  assert.equal(await p.eval('!!host?.isConnected'), false);
  await p.close();
});

test('stopping shows "Stopped" briefly, then the pill hides', async () => {
  const p = await b.open('webtoon.html');
  await p.key('s');
  await p.key('s');
  assert.equal(await p.eval('parts.label.textContent'), 'Stopped');
  await p.until(`pill.classList.contains('gone')`, 3000);
  await p.close();
});

test('sites with CSS smooth scrolling still glide at the set speed', async () => {
  const p = await b.open('webtoon.html', { pxs: 300 });
  await p.eval(`document.documentElement.style.scrollBehavior = 'smooth'`);
  await p.eval(`window.samples = []; (function f() { samples.push([performance.now(), scrollY]); requestAnimationFrame(f) })()`);
  await p.key('s');
  await p.until('level === 1');
  const t = await p.eval('performance.now()');
  await p.until(`performance.now() > ${t} + 1100`);
  // one second at full speed, timed by the page's own clock
  const moved = await p.eval(`(() => { const at = (x) => samples.find(([s]) => s >= x)[1]; return at(${t} + 1000) - at(${t}) })()`);
  assert.ok(moved > 240 && moved < 360, `~300px in 1s, got ${moved}`);
  await p.close();
});
