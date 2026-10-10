// End-to-end: the real, packaged extension in real Chrome, on the fixture pages served over http.
//   node test/extension.e2e.mjs        (not part of npm test: it needs a desktop Chrome build)
// Branded Chrome ignores --load-extension, so the extension is loaded through the DevTools pipe instead.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);

// fixtures without the test stub: the real extension injects the content scripts
const server = createServer((req, res) => {
  const file = join(here, 'fixtures', new URL(req.url, 'http://x').pathname);
  if (!file.startsWith(join(here, 'fixtures')) || !existsSync(file)) return res.writeHead(404).end();
  let body = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) body = body.replace('<script src="../stub.js"></script>', '');
  res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html' }).end(body);
}).listen(0);
const origin = `http://localhost:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), 'scroller-e2e-'));
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
  `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1280,800', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let id = 0, buf = '';
const pending = new Map();
proc.stdio[4].on('data', (d) => {
  buf += d;
  for (let i; (i = buf.indexOf('\0')) >= 0; buf = buf.slice(i + 1)) {
    const m = JSON.parse(buf.slice(0, i));
    if (pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); }
  }
});
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
  pending.set(++id, { ok, fail });
  proc.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
});

async function page(path, height = 800) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: origin + path }, sessionId);
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error(expression + ': ' + r.exceptionDetails.exception?.description);
    return r.result.value;
  };
  const key = async (k) => {
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, text: k, windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0) }, sessionId);
  };
  for (let i = 0; i < 100 && await ev('document.readyState').catch(() => '') !== 'complete'; i++) await sleep(50);
  await sleep(500); // content scripts run at document_idle
  return { ev, key, close: () => send('Target.closeTarget', { targetId }) };
}
const pill = `(() => { for (const el of document.documentElement.children) { const p = el.shadowRoot?.querySelector('.p'); if (p) return p.textContent; } return null })()`;

let ok = 0;
const check = async (name, fn) => { await fn(); ok++; console.log('✔', name); };
try {
  const { id: ext } = await send('Extensions.loadUnpacked', { path: resolve(here, '..', 'extension') });
  console.log('loaded extension', ext);

  await check('webtoon: S starts, glides, shows the pill with time left, Night dims; S stops', async () => {
    const p = await page('/webtoon.html');
    await p.key('s');
    await sleep(1500);
    assert.ok(await p.ev('scrollY') > 20, 'scrolled');
    assert.match(await p.ev(pill), /40 px\/s.*left/);
    assert.equal(await p.ev('!!document.querySelector("scroller-night")'), true, 'night overlay');
    await p.key('s');
    await sleep(1200);
    assert.match(await p.ev(pill), /Stopped/);
    await p.close();
  });

  await check('novel: speed is in words per minute', async () => {
    const p = await page('/novel.html');
    await p.key('s');
    await sleep(1500);
    assert.match(await p.ev(pill), /250 wpm/);
    const y = await p.ev('scrollY');
    await sleep(2000);
    const v = (await p.ev('scrollY') - y) / 2;
    assert.ok(v > 4 && v < 20, `~10 px/s at 250 wpm, got ${v}`);
    await p.close();
  });

  await check('manga: Pages style snaps to page tops (set from the popup storage)', async () => {
    const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${ext}/popup/popup.html` });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await sleep(800);
    await send('Runtime.evaluate', { expression: `chrome.storage.local.set({ mode: 'pages', pxs: 4000 })`, awaitPromise: true }, sessionId);
    const errors = await send('Runtime.evaluate', { expression: `document.querySelectorAll('[role=tab]').length`, returnByValue: true }, sessionId);
    assert.equal(errors.result.value, 5, 'popup renders five tabs');
    await send('Target.closeTarget', { targetId });
    const p = await page('/manga.html', 1300); // tall enough that every page fits, so every jump is a snap
    const tops = await p.ev(`[...document.querySelectorAll('img.page')].map((i) => Math.round(i.getBoundingClientRect().top + scrollY))`);
    await p.key('s');
    await sleep(2500);
    await p.key('s');
    await sleep(1200);
    const y = await p.ev('Math.round(scrollY)');
    assert.ok(tops.includes(y), `landed on a page top: ${y} in ${tops}`);
    await p.close();
  });
  console.log(`\n${ok} passed`);
} catch (e) {
  console.error('✖', e.message);
  process.exitCode = 1;
} finally {
  const gone = new Promise((r) => proc.once('exit', r));
  proc.kill();
  server.close();
  await Promise.race([gone, sleep(5000)]);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
}
