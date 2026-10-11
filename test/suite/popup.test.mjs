// Popup: units, presets, Night and Stop after controls, sites. Uses the real popup with a fake extension API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser, sleep } from '../harness/cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

const text = { running: false, host: 'novel.test', vh: 800, kind: 'text', pxPerWord: 4.8 };
const art = { running: false, host: 'manga.test', vh: 800, kind: 'image', pxPerWord: null };
const val = (p, sel) => p.eval(`document.querySelector(${JSON.stringify(sel)}).textContent`);

test('text pages read in wpm, with wpm presets', async () => {
  const p = await b.popup({}, text);
  assert.equal(await val(p, '#unit-text'), 'wpm');
  assert.equal(await p.eval('pxsEl.value'), '250');
  assert.match(await val(p, '#presets'), /Savoring120 wpm/);
  await p.click('#presets button:first-child');
  await sleep(50);
  assert.deepEqual(await p.eval('[__store.wpm, __store.wpmSites]'), [120, { 'novel.test': 120 }]);
  assert.equal(await p.eval('__store.sites'), undefined, 'px/s untouched');
  await p.close();
});

test('art pages read in px/s and the switch is off', async () => {
  const p = await b.popup({}, art);
  assert.equal(await val(p, '#unit-text'), 'px/s');
  assert.equal(await p.eval('$("#unit").disabled'), true);
  assert.match(await val(p, '#presets'), /Reading40 px\/s/);
  await p.close();
});

test('the unit switch overrides per site and switching back returns to automatic', async () => {
  const p = await b.popup({}, text);
  await p.click('#unit');
  await sleep(50);
  assert.deepEqual(await p.eval('__store.units'), { 'novel.test': 'px' });
  assert.equal(await val(p, '#unit-text'), 'px/s');
  assert.match(await val(p, '#hint'), /novel\.test reads in px\/s now/);
  await p.click('#unit');
  await sleep(50);
  assert.deepEqual(await p.eval('__store.units'), {});
  assert.match(await val(p, '#hint'), /Back to automatic/);
  await p.close();
});

test('typing past the wpm limit clamps with a message in wpm', async () => {
  const p = await b.popup({}, text);
  await p.eval(`pxsEl.value = 9000; pxsEl.dispatchEvent(new Event('change'))`);
  await sleep(50);
  assert.equal(await p.eval('__store.wpm'), WPM_MAX_VALUE());
  assert.match(await val(p, '#hint'), /1500 wpm is the limit/);
  await p.close();
  function WPM_MAX_VALUE() { return 1500; }
});

test('night filter: off, while scrolling, always', async () => {
  const p = await b.popup({}, art);
  await p.click('input[name=nightWhen][value=off]');
  await sleep(50);
  assert.equal(await p.eval('__store.night'), false);
  assert.equal(await p.eval('$("#dim").disabled'), true);
  await p.click('input[name=nightWhen][value=always]');
  await sleep(50);
  assert.deepEqual(await p.eval('[__store.night, __store.nightWhen]'), [true, 'always']);
  assert.equal(await p.eval('$("#dim").disabled'), false);
  await p.close();
});

test('dim and warmth save live and preview on the page', async () => {
  const p = await b.popup({}, art);
  await p.eval(`const d = $('#dim'); d.value = 45; d.dispatchEvent(new Event('input', { bubbles: true }))`);
  await sleep(50);
  assert.equal(await p.eval('__store.dim'), 0.45);
  assert.equal(await val(p, '#dim-out'), '45%');
  assert.ok((await p.eval('__sent')).includes('preview'));
  await p.eval(`const w = $('#warm'); w.value = 0; w.dispatchEvent(new Event('input', { bubbles: true }))`);
  await sleep(50);
  assert.equal(await val(p, '#warm-out'), 'Off');
  await p.close();
});

test('a chapter limit turns on Next chapter, with undo', async () => {
  const p = await b.popup({ atEnd: 'stop' }, art);
  await p.click('input[name=stopAfterCh][value="3"]');
  await sleep(50);
  assert.deepEqual(await p.eval('[__store.stopAfterCh, __store.atEnd]'), [3, 'next']);
  assert.match(await val(p, '#bed-desc'), /end of chapter 3/);
  await p.click('#undo');
  await sleep(50);
  assert.deepEqual(await p.eval('[__store.stopAfterCh, __store.atEnd]'), [0, 'stop']);
  await p.close();
});

test('stop after sums up time and chapters in one line', async () => {
  const p = await b.popup({ stopAfterMin: 30, stopAfterCh: 1, atEnd: 'next' }, art);
  assert.equal(await val(p, '#bed-desc'), '1 chapter or 30 min, whichever comes first.');
  await p.close();
});

test('while running, the status shows time left and the sleep timer counts down', async () => {
  const p = await b.popup({ stopAfterMin: 30 }, { ...art, running: true, leftSec: 160, estimating: true, sleepSec: 700 });
  assert.equal(await val(p, '#status-text'), '~2:40 left in this chapter');
  assert.equal(await val(p, '#bed-desc'), 'Lights out in 12 min.');
  await p.eval(`__state({ ...${JSON.stringify(art)}, running: true, leftSec: 100, sleepSec: 30 })`);
  await sleep(1300);
  assert.equal(await val(p, '#status-text'), '1:40 left in this chapter');
  assert.equal(await val(p, '#bed-desc'), 'Lights out in under a minute.');
  await p.close();
});

test('sites list wpm sites and forgetting clears every trace', async () => {
  const p = await b.popup({ sites: { 'manga.test': 40 }, wpmSites: { 'novel.test': 300 }, units: { 'novel.test': 'wpm' } }, art);
  assert.match(await val(p, '#site-list'), /novel\.test300 wpm/);
  await p.click('[data-forget="novel.test"]');
  await sleep(50);
  assert.deepEqual(await p.eval('[__store.wpmSites, __store.units, __store.sites]'), [{}, {}, { 'manga.test': 40 }]);
  await p.close();
});

test('every tab fits the popup without scrolling', async () => {
  const p = await b.popup({ stopAfterMin: 30, stopAfterCh: 3, atEnd: 'next', mode: 'pages' }, { ...text, running: true, leftSec: 100 });
  for (const t of ['read', 'night', 'feel', 'keys', 'sites']) {
    await p.click('#t-' + t);
    const h = await p.eval('document.body.scrollHeight');
    assert.ok(h <= 600, `${t} is ${h}px tall`);
  }
  await p.close();
});

test('every line of copy fits on one line where it should', async () => {
  const p = await b.popup({}, text);
  for (const atEnd of ['stop', 'wait', 'next']) for (const ch of [0, 1, 5]) {
    await p.eval(`__set({ atEnd: '${atEnd}', stopAfterCh: ${ch} })`);
    assert.ok(await p.eval(`$('#end-desc').offsetHeight <= 17`), `end-desc wraps: ${await val(p, '#end-desc')}`);
  }
  for (const [m, ch] of [[0, 0], [15, 0], [0, 1], [0, 3], [60, 5], [45, 2]]) {
    await p.eval(`__set({ stopAfterMin: ${m}, stopAfterCh: ${ch} })`);
    assert.ok(await p.eval(`$('#bed-desc').offsetHeight <= 17`), `bed-desc wraps: ${await val(p, '#bed-desc')}`);
  }
  for (const w of ['off', 'scrolling', 'always']) {
    await p.click(`input[name=nightWhen][value=${w}]`);
    assert.ok(await p.eval(`$('#night-desc').offsetHeight <= 17`), `night-desc wraps: ${await val(p, '#night-desc')}`);
  }
  // every tip
  const tips = await p.eval(`(() => { const out = []; for (let i = 0; i < 60; i++) { tip(); out.push(hint.textContent); } return [...new Set(out)]; })()`);
  for (const t of tips) {
    await p.eval(`hint.textContent = ${JSON.stringify(t)}`);
    assert.ok(await p.eval(`hint.offsetHeight <= 17`), `tip wraps: ${t}`);
  }
  await p.close();
});

test('an unreachable page shows the reload banner, and Reload reloads', async () => {
  const p = await b.popup({}, null);
  assert.equal(await p.eval('$("#offline").hidden'), false);
  assert.equal(await p.eval('$("#run").disabled'), true);
  await p.click('#reload');
  assert.ok((await p.eval('__sent')).includes('reload'));
  await p.close();
});

test('Start and Stop toggle the page and the header', async () => {
  const p = await b.popup({}, art);
  await p.click('#run');
  await p.until('document.body.classList.contains("running")');
  assert.equal(await val(p, '#run-label'), 'Stop');
  await p.click('#run');
  await p.until('!document.body.classList.contains("running")');
  assert.equal(await val(p, '#run-label'), 'Start');
  await p.close();
});

test('remap a key: press it, Esc cancels, clashes are refused, Restore has undo', async () => {
  const p = await b.popup({}, art);
  await p.click('.key[data-k=key]');
  await p.key('k');
  await p.until('__store.key === "k"');
  assert.match(await val(p, '#hint'), /Locked in: K is start\/stop/);
  await p.click('.key[data-k=key]');
  await p.key('Escape');
  assert.match(await val(p, '#hint'), /Never mind/);
  await p.click('.key[data-k=key]');
  await p.key(']');
  assert.match(await val(p, '#hint'), /\] is already faster/);
  assert.equal(await p.eval('__store.key'), 'k');
  await p.click('#reset-keys');
  await p.until('__store.key === "s"');
  await p.click('#undo');
  await p.until('__store.key === "k"');
  await p.close();
});

test('only the hold key may be a modifier', async () => {
  const p = await b.popup({}, art);
  await p.click('.key[data-k=key]');
  await p.key('Shift');
  assert.equal(await p.eval('!!listening'), true, 'still waiting for a real key');
  await p.key('Escape');
  await p.click('.key[data-k=holdKey]');
  await p.key('Alt');
  await p.until('__store.holdKey === "Alt"');
  await p.close();
});

test('tabs follow the keyboard: arrows, Home, End', async () => {
  const p = await b.popup({}, art);
  await p.eval('$("#t-read").focus()');
  const sel = () => p.eval('document.querySelector("[role=tab][aria-selected=true]").id');
  await p.key('ArrowRight'); assert.equal(await sel(), 't-night');
  await p.key('End'); assert.equal(await sel(), 't-sites');
  await p.key('ArrowRight'); assert.equal(await sel(), 't-read');
  await p.key('ArrowLeft'); assert.equal(await sel(), 't-sites');
  await p.key('Home'); assert.equal(await sel(), 't-read');
  assert.equal(await p.eval('document.activeElement.id'), 't-read');
  await p.close();
});

test('the slider maps every preset exactly, in both units', async () => {
  for (const state of [art, text]) {
    const p = await b.popup({}, state);
    const bad = await p.eval(`U().presets.filter(([, v]) => fromSlider(toSlider(v)) !== v)`);
    assert.deepEqual(bad, [], `${state.kind}: ${JSON.stringify(bad)}`);
    await p.close();
  }
});

test('live updates while scrolling keep keyboard focus where it is', async () => {
  const p = await b.popup({ sites: { 'a.test': 10, 'b.test': 20 } }, { ...art, running: true, leftSec: 100 });
  await p.click('#t-sites');
  await p.eval(`document.querySelector('[data-forget="b.test"]').focus()`);
  await sleep(2300); // two live refreshes
  assert.equal(await p.eval('document.activeElement.dataset.forget'), 'b.test');
  await p.close();
});

test('every control has an accessible name', async () => {
  const p = await b.popup({ sites: { 'a.test': 10 } }, text);
  for (const t of ['read', 'night', 'feel', 'keys', 'sites']) {
    await p.click('#t-' + t);
    const unnamed = await p.eval(`[...document.querySelectorAll('button, input')].filter((el) => el.getClientRects().length).filter((el) => {
      const by = el.getAttribute('aria-labelledby');
      const name = el.getAttribute('aria-label') || (by && document.getElementById(by)?.textContent) || el.labels?.[0]?.textContent || el.textContent;
      return !name?.trim();
    }).map((el) => el.outerHTML.slice(0, 80))`);
    assert.deepEqual(unnamed, [], t);
  }
  await p.close();
});

test('the site chip stars and unstars the current site, with undo', async () => {
  const p = await b.popup({}, art);
  await p.click('#site');
  await p.until('__store.favs?.includes("manga.test")');
  assert.equal(await p.eval('$("#site").getAttribute("aria-pressed")'), 'true');
  await p.click('#undo');
  await p.until('!__store.favs.includes("manga.test")');
  await p.close();
});
