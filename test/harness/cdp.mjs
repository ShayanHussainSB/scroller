// Tiny headless-Chrome driver over the DevTools protocol. No dependencies: Node 22+ has WebSocket.
//   const b = await browser(); const p = await b.open('novel.html', { dim: 0.5 });
//   await p.eval('speed()'); await p.key('s'); await p.shot('out.png'); await b.close();
// Fixture pages load the extension's content scripts with a fake `chrome` API (test/harness/stub.js),
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

// A test that fails before closing its browser must not leave Chrome running (it also kept runs from ending).
const live = new Set();
process.on('exit', () => { for (const p of live) p.kill('SIGKILL'); });

// throttle: CPU slowdown for every page (TEST_THROTTLE=4 npm test, or npm run test:slow)
export async function browser({ width = 1280, height = 800, throttle = +process.env.TEST_THROTTLE || 1 } = {}) {
  if (!CHROME) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
  const profile = mkdtempSync(join(tmpdir(), 'scroller-test-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files', '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    // After a key press Chrome holds page tasks until the next frame. Headless draws no frame unless the page
    // changes, so callbacks could wait forever. Real browsers draw frames all the time.
    '--disable-features=DeferRendererTasksAfterInput',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  live.add(proc);
  proc.once('exit', () => live.delete(proc));
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
      if (throttle > 1) await cmd('Emulation.setCPUThrottlingRate', { rate: throttle });
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
        // modifiers: Alt 1, Ctrl 2, Meta 4, Shift 8 (added together)
        async key(key, type = 'press', modifiers = 0) {
          const CODES = { Shift: 16, Control: 17, Alt: 18, Meta: 91, Escape: 27, Tab: 9, Enter: 13, PageDown: 34,
            End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
          const code = key.length === 1 ? key.toUpperCase().charCodeAt(0) : CODES[key] || 0;
          const base = { key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: code, modifiers,
            text: key.length === 1 && !(modifiers & 6) ? key : undefined };
          if (type !== 'up') await cmd('Input.dispatchKeyEvent', { type: base.text ? 'keyDown' : 'rawKeyDown', ...base });
          if (type !== 'down') await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
        },
        resize: (w, h) => cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false }),
        async wheel(dy, x = 640, y = 400) { await cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); },
        // simulate a slow machine (CI, old laptops): rate 4 = four times slower
        throttle: (rate) => cmd('Emulation.setCPUThrottlingRate', { rate }),
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
        // fails the test if the page threw anything uncaught, unless that was the point
        async close({ allowErrors = false } = {}) {
          const errors = await page.eval('window.__errors || []').catch(() => []);
          await send('Target.closeTarget', { targetId });
          if (errors.length && !allowErrors) throw new Error(`uncaught errors on page: ${errors.join(' | ')}`);
        },
      };
      await page.until(`document.readyState === "complete" && ${ready}`);
      // again on the loaded page: the file:// page can get a new renderer, which sometimes starts unthrottled
      if (throttle > 1) await cmd('Emulation.setCPUThrottlingRate', { rate: throttle });
      return page;
  }

  return {
    profile,
    // settings: storage values the page starts with (merged over DEFAULTS), e.g. { mode: 'pages' }
    // fixture may carry a query string: 'chapters.html?v=rel' (pathToFileURL alone would encode the ?)
    open: (fixture, settings = {}, size) => {
      const [file, query] = fixture.split('?');
      return load(pathToFileURL(join(here, '..', 'fixtures', file)).href + (query ? '?' + query : '') + '#' + encodeURIComponent(JSON.stringify(settings)), size);
    },
    // The real popup with a fake extension API. state: what the page answers (null = unreachable page).
    // In the popup, __set(o) changes storage, __state(o) changes what the page answers on the next ask.
    popup: (settings = {}, state = { running: false, host: 'example.com', vh: 800 }, size = {}) =>
      load(pathToFileURL(join(here, '..', '..', 'extension', 'popup', 'popup.html')).href, {
        width: 320, height: 600, ...size, ready: 'document.body.classList.contains("ready")',
        pre: `(${fakePopupApi})(${JSON.stringify(settings)}, ${JSON.stringify(state)})`,
      }),
    async close() {
      // Browser.close shuts down every Chrome process (on Linux, helpers outlive a killed parent)
      const gone = new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)));
      await Promise.race([send('Browser.close').catch(() => {}), sleep(2000)]);
      await Promise.race([gone, sleep(5000)]);
      ws.close();
      proc.kill();
      try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} // just a temp dir
    },
  };
}

// Runs inside the popup page before its scripts.
function fakePopupApi(store, state) {
  window.__errors = [];
  addEventListener('error', (e) => window.__errors.push(e.message));
  addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason?.message || e.reason)));
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
