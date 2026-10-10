// Fake `chrome` API for fixture pages, then the extension's content scripts in manifest order.
// Starting settings come from the URL hash as JSON: page.html#{"mode":"pages"}, on top of what earlier
// pages in the same tab saved.
(() => {
  window.__errors = []; // uncaught errors; the harness fails a test that leaves any
  addEventListener('error', (e) => window.__errors.push(e.message));
  addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason?.message || e.reason)));
  // storage outlives page loads in the same tab, like the real thing (next-chapter tests rely on it)
  const store = JSON.parse(sessionStorage.getItem('stub:store') || '{}');
  try { Object.assign(store, JSON.parse(decodeURIComponent(location.hash.slice(1)) || '{}')); } catch {}
  const persist = () => sessionStorage.setItem('stub:store', JSON.stringify(store));
  persist();
  const changed = [], messages = [];
  const clone = (v) => (v === undefined ? v : structuredClone(v));
  window.__sent = []; // messages the page sent to the background script
  window.chrome = {
    storage: {
      local: {
        get(defaults, cb) { const v = clone({ ...defaults, ...store }); setTimeout(() => cb(v)); },
        set(o, cb) {
          const c = {};
          for (const k in o) { c[k] = { oldValue: clone(store[k]), newValue: clone(o[k]) }; store[k] = clone(o[k]); }
          persist();
          setTimeout(() => { for (const f of changed) f(c, 'local'); cb?.(); });
          return Promise.resolve();
        },
      },
      onChanged: { addListener: (f) => changed.push(f) },
    },
    runtime: {
      sendMessage: (m) => { window.__sent.push(m); return Promise.resolve(); },
      onMessage: { addListener: (f) => messages.push(f) },
    },
  };
  window.__store = store;
  window.__set = (o) => new Promise((r) => chrome.storage.local.set(o, () => setTimeout(r, 0)));
  // what the popup gets back from a message ('state' or 'toggle')
  window.__send = (msg) => new Promise((r) => { for (const f of messages) f(msg, {}, r); });
  const ext = new URL('../../extension/scripts/', document.currentScript.src);
  // keep in sync with content_scripts in extension/manifest.json (npm run check verifies)
  for (const f of ['defaults.js', 'content.js', 'night.js', 'pages.js', 'wpm.js', 'session.js'])
    document.write(`<script src="${ext}${f}"><\/script>`);
  // ready once the content scripts have their settings (their storage.get callbacks run first)
  document.write('<script>chrome.storage.local.get({}, () => (window.__ready = true))<\/script>');
})();
