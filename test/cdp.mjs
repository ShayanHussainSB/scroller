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

  // pre: script run before the page's own (used to fake the extension API for the popup)
  async function load(url, { width: w = width, height: h = height, pre, ready = 'window.__ready' } = {}) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const cmd = (m, p) => send(m, p, sessionId);
      await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false });
      if (pre) { await cmd('Page.enable'); await cmd('Page.addScriptToEvaluateOnNewDocument', { source: pre }); }
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
        async click(sel) { await page.eval(`document.querySelector(${JSON.stringify(sel)}).click()`); },
        async shot(path, { full } = {}) {
          const clip = full && await page.eval('({ x: 0, y: 0, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, scale: 1 })');
          const { data } = await cmd('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: !!full });
          writeFileSync(path, Buffer.from(data, 'base64'));
        },
        async shotClip(path, clip) {
          const { data } = await cmd('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
          writeFileSync(path, Buffer.from(data, 'base64'));
        },
        // navigate this same tab, keeping sessionStorage (like a reader's next-chapter link)
        async go(fixture) { await cmd('Page.navigate', { url: pathToFileURL(join(here, 'fixtures', fixture)).href }); },
        close: () => send('Target.closeTarget', { targetId }),
      };
      await page.until(`document.readyState === "complete" && ${ready}`);
      return page;
  }

  return {
    // settings: storage values the page starts with (merged over DEFAULTS), e.g. { mode: 'pages' }
    open: (fixture, settings = {}, size) =>
      load(pathToFileURL(join(here, 'fixtures', fixture)).href + '#' + encodeURIComponent(JSON.stringify(settings)), size),
    // The real popup with a fake extension API. state: what the page answers (null = unreachable page).
    // In the popup, __set(o) changes storage, __state(o) changes what the page answers on the next ask.
    popup: (settings = {}, state = { running: false, host: 'example.com', vh: 800 }, size = {}) =>
      load(pathToFileURL(join(here, '..', 'extension', 'popup', 'popup.html')).href, {
        width: 320, height: 600, ...size, ready: 'document.body.classList.contains("ready")',
        pre: `(${fakePopupApi})(${JSON.stringify(settings)}, ${JSON.stringify(state)})`,
      }),
    async close() { ws.close(); proc.kill(); await sleep(100); rmSync(profile, { recursive: true, force: true }); },
  };
}

// Runs inside the popup page before its scripts.
function fakePopupApi(store, state) {
  const changed = [];
  const clone = (v) => (v === undefined ? v : structuredClone(v));
  window.__sent = [];
  window.chrome = {
    storage: {
      local: {
        get(defaults, cb) { const v = clone({ ...defaults, ...store }); setTimeout(() => cb(v)); },
        set(o, cb) {
          const c = {};
          for (const k in o) { c[k] = { oldValue: clone(store[k]), newValue: clone(o[k]) }; store[k] = clone(o[k]); }
          setTimeout(() => { for (const f of changed) f(c, 'local'); cb?.(); });
          return Promise.resolve();
        },
      },
      onChanged: { addListener: (f) => changed.push(f) },
    },
    runtime: { lastError: undefined },
    tabs: {
      query: (q, cb) => setTimeout(() => cb([{ id: 1 }])),
      reload: () => window.__sent.push('reload'),
      sendMessage(tabId, msg, opts, cb) {
        window.__sent.push(msg);
        if (msg === 'toggle' && state) state = { ...state, running: !state.running };
        setTimeout(() => {
          chrome.runtime.lastError = state ? undefined : { message: 'Could not establish connection' };
          cb(clone(state));
          chrome.runtime.lastError = undefined;
        });
      },
    },
  };
  window.__store = store;
  window.__set = (o) => new Promise((r) => chrome.storage.local.set(o, () => setTimeout(r, 0)));
  window.__state = (o) => { state = o; };
}
