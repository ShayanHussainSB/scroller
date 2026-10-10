// The harness itself: error guard, throttle, keys with modifiers, resize.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { browser } from './cdp.mjs';

let b;
before(async () => { b = await browser(); });
after(() => b.close());

test('close() fails when the page threw', async () => {
  const p = await b.open('webtoon.html');
  await p.eval('setTimeout(() => { throw new Error("boom") })');
  await p.until('__errors.length === 1');
  await assert.rejects(p.close(), /uncaught errors on page: .*boom/);
});

test('close() passes a clean page and can allow errors on purpose', async () => {
  const p = await b.open('webtoon.html');
  await p.close();
  const q = await b.open('webtoon.html');
  await q.eval('setTimeout(() => { throw new Error("expected") })');
  await q.until('__errors.length === 1');
  await q.close({ allowErrors: true });
});

test('keys carry modifiers', async () => {
  const p = await b.open('webtoon.html');
  await p.eval(`window.got = []; addEventListener('keydown', (e) => got.push([e.key, e.ctrlKey, e.metaKey]))`);
  await p.key('s', 'press', 2);
  await p.key('ArrowRight');
  assert.deepEqual(await p.eval('got'), [['s', true, false], ['ArrowRight', false, false]]);
  await p.close();
});

test('fixtures can take a query string', async () => {
  const p = await b.open('webtoon.html?ch=3');
  assert.equal(await p.eval('location.search'), '?ch=3');
  assert.equal(await p.eval('document.getElementById("ch").textContent'), '3');
  await p.close();
});

test('resize changes the viewport', async () => {
  const p = await b.open('webtoon.html');
  await p.resize(600, 500);
  assert.deepEqual(await p.eval('[innerWidth, innerHeight]'), [600, 500]);
  await p.close();
});

test('throttle slows the page down', async () => {
  // fastest of five runs on each side, so a cold JIT can't fake the difference
  const cost = (p) => p.eval(`Math.min(...Array.from({ length: 5 }, () => { const t = performance.now(); let x = 0; for (let i = 0; i < 3e6; i++) x += i; return performance.now() - t }))`);
  const slow = await browser({ throttle: 6 }), full = await browser({ throttle: 1 }); // explicit, whatever TEST_THROTTLE says
  const p = await slow.open('webtoon.html');
  const q = await full.open('webtoon.html');
  const [ms, fast] = [await cost(p), await cost(q)];
  assert.ok(ms > fast * 2, `throttled ${ms}ms vs ${fast}ms`);
  await p.close(); await q.close(); await slow.close(); await full.close();
});

test('a failing test that leaks a browser ends the run, and its Chrome is gone', async () => {
  const { spawnSync, execFileSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  // the exact command npm test uses, pointed at a test that fails with its browser open
  const cmd = JSON.parse(readFileSync('package.json', 'utf8')).scripts.test.replace(`'test/*.test.mjs'`, 'test/fixtures/leak.mjs');
  const t = Date.now();
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // otherwise the inner run reports to this one instead of running for real
  const r = spawnSync('sh', ['-c', cmd], { encoding: 'utf8', timeout: 60000, env });
  assert.ok(Date.now() - t < 30000, `run took ${Date.now() - t}ms`);
  assert.notEqual(r.status, 0, 'the failure is reported');
  const profile = r.stdout.match(/profile:(\S+)/)?.[1];
  assert.ok(profile, r.stdout);
  // killed at exit; its helper processes take a moment to follow
  const left = () => execFileSync('ps', ['-eo', 'command'], { encoding: 'utf8' }).split('\n').filter((l) => l.includes(profile));
  for (let i = 0; i < 50 && left().length; i++) await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(left(), [], 'Chrome still running');
});
