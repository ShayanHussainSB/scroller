// Tiny headless-Chrome driver over the DevTools protocol. No dependencies: Node 22+ has WebSocket.
//   const b = await browser(); const p = await b.open('novel.html', { dim: 0.5 });
//   await p.eval('speed()'); await p.key('s'); await p.shot('out.png'); await b.close();
// Fixture pages load the extension's content scripts with a fake `chrome` API (test/stub.js),
// so every global in the content scripts is reachable from p.eval().
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(existsSync);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function browser({ width = 1280, height = 800 } = {}) {
  if (!CHROME) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
  const profile = mkdtempSync(join(tmpdir(), 'scroller-test-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files', '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((ok, fail) => {
    let err = '';
    proc.stderr.on('data', (d) => { err += d; const m = err.match(/ws:\/\/\S+/); if (m) ok(m[0]); });
    proc.on('exit', () => fail(new Error('Chrome exited:\n' + err)));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) {
      const { ok, fail } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? fail(new Error(m.error.message)) : ok(m.result);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
    pending.set(++id, { ok, fail });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  return {
    // settings: storage values the page starts with (merged over DEFAULTS), e.g. { mode: 'pages' }
    async open(fixture, settings = {}, { width: w = width, height: h = height } = {}) {
      const url = pathToFileURL(join(here, 'fixtures', fixture)).href + '#' + encodeURIComponent(JSON.stringify(settings));
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const cmd = (m, p) => send(m, p, sessionId);
      await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await cmd('Page.navigate', { url });
      const page = {
        async eval(expr) {
          const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (r.exceptionDetails) throw new Error(`${expr}\n→ ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
          return r.result.value;
        },
        async until(expr, timeout = 5000) {
          const end = Date.now() + timeout;
          while (Date.now() < end) { if (await page.eval(expr).catch(() => false)) return; await sleep(50); }
          throw new Error(`timed out waiting for: ${expr}`);
        },
        async key(key, type = 'press') {
          const code = key.length === 1 ? key.toUpperCase().charCodeAt(0) : { Shift: 16, Escape: 27 }[key] || 0;
          const base = { key, windowsVirtualKeyCode: code, text: key.length === 1 ? key : undefined };
          if (type !== 'up') await cmd('Input.dispatchKeyEvent', { type: key.length === 1 ? 'keyDown' : 'rawKeyDown', ...base });
          if (type !== 'down') await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
        },
        async wheel(dy, x = 640, y = 400) { await cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); },
        async shot(path) {
          const { data } = await cmd('Page.captureScreenshot', { format: 'png' });
          writeFileSync(path, Buffer.from(data, 'base64'));
        },
        // navigate this same tab, keeping sessionStorage (like a reader's next-chapter link)
        async go(fixture) { await cmd('Page.navigate', { url: pathToFileURL(join(here, 'fixtures', fixture)).href }); },
        close: () => send('Target.closeTarget', { targetId }),
      };
      await page.until('document.readyState === "complete" && window.__ready');
      return page;
    },
    async close() { ws.close(); proc.kill(); await sleep(100); rmSync(profile, { recursive: true, force: true }); },
  };
}
