const $ = (q) => document.querySelector(q);
const pxsEl = $('#pxs'), slider = $('#slider'), run = $('#run'), hint = $('#hint'), undoBtn = $('#undo');
const save = (o) => chrome.storage.local.set(o);
const clamp = (n) => Math.round(Math.min(MAX, Math.max(MIN, n)));

// Slider is logarithmic so both ends get room: 1 px/s up to 5000 px/s.
const toSlider = (pxs) => Math.round((1000 * Math.log(pxs / MIN)) / Math.log(MAX / MIN));
const fromSlider = (v) => clamp(MIN * Math.pow(MAX / MIN, v / 1000));

const keyLabel = (k) => ({ ' ': 'Space', Control: 'Ctrl', Meta: 'Cmd', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' })[k]
  || (k.length === 1 ? k.toUpperCase() : k);

// A line of personality for each preset, shown under the speed.
const QUIPS = {
  'Too damn slow': 'Savoring every screentone.',
  'Slow': 'A slow burn. Very literary.',
  'Reading': 'The sweet spot for most chapters.',
  'Brisk': 'Training-arc pace.',
  'Fast': 'Filler arc? Say no more.',
  'Too damn fast': 'Speed lines activated.',
};
const END = {
  stop: 'Stops at the last panel. The end… or is it?',
  wait: 'Keeps rolling when more pages load in.',
  next: 'Binge mode: opens the next chapter and keeps going.',
};
const MODE = { smooth: 'One smooth, steady glide', step: 'A chunk at a time' };
const KEY_NAMES = { key: 'start/stop', holdKey: 'hold to pause', fasterKey: 'faster', slowerKey: 'slower' };

// Speed is remembered per site; the last speed used anywhere is the starting point for new sites.
let s = { ...DEFAULTS }, host = null, vh = 0, tabId, running = false;
const speedOf = () => (host && s.sites[host]) ?? s.pxs;
const setSpeed = (pxs) => save(host ? { pxs, sites: { ...s.sites, [host]: pxs } } : { pxs });

// ── Footer messages ───────────────────────────────────────────
let hintTimer;
function say(text, { undo } = {}) {
  hint.textContent = text;
  undoBtn.hidden = !undo;
  undoBtn.onclick = undo ? () => { undo(); say('Back where it was.'); } : null;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(tip, undo ? 6000 : 3500);
}
function tip() {
  const tips = [
    `Hold ${keyLabel(s.holdKey)} to linger on a panel.`,
    `${keyLabel(s.fasterKey)} and ${keyLabel(s.slowerKey)} nudge speed mid-chapter.`,
    'Every site remembers its own speed.',
    'Scroll yourself. Scroller backs off.',
    'Next chapter: a series, one long scroll.',
  ];
  hint.textContent = 'Tip: ' + tips[Math.floor(Math.random() * tips.length)];
  undoBtn.hidden = true;
}

// ── Presets ───────────────────────────────────────────────────
for (const [name, pxs] of PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.pxs = pxs;
  b.innerHTML = `${name}<small>${pxs} px/s</small>`;
  b.onclick = () => setSpeed(pxs);
  $('#presets').append(b);
}

function showSpeed(pxs) {
  if (document.activeElement !== pxsEl) pxsEl.value = pxs;
  if (document.activeElement !== slider) slider.value = toSlider(pxs);
  slider.style.setProperty('--fill', (toSlider(pxs) / 10) + '%');
  const near = PRESETS.reduce((a, b) => (Math.abs(Math.log(b[1] / pxs)) < Math.abs(Math.log(a[1] / pxs)) ? b : a));
  const name = near[1] === pxs ? near[0] : (pxs < near[1] ? 'Just under ' : 'Just over ') + near[0].toLowerCase();
  $('#name').textContent = name;
  $('#quip').textContent = QUIPS[near[0]];
  slider.setAttribute('aria-valuetext', `${pxs} pixels per second, ${name}`);
  for (const b of $('#presets').children) b.setAttribute('aria-pressed', +b.dataset.pxs === pxs);
  // a human unit: how long one screen takes
  const t = vh / pxs;
  $('#pace').textContent = !vh ? '' : t < 1 ? '1 screen in under a second' : t < 90 ? `1 screen every ${Math.round(t)}s` : `1 screen every ${Math.round(t / 60)} min`;
}

function render() {
  showSpeed(speedOf());
  $('#site').textContent = host || '';
  for (const name of ['mode', 'step', 'dir', 'atEnd'])
    for (const r of document.getElementsByName(name)) r.checked = r.value === String(s[name]);
  $('#step-row').hidden = s.mode !== 'step';
  $('#mode-desc').textContent = MODE[s.mode];
  $('#end-desc').textContent = END[s.atEnd];
  $('#pauseOnManual').checked = s.pauseOnManual;
  $('#badge').checked = s.badge;
  for (const b of document.querySelectorAll('.key')) {
    if (b.classList.contains('listening')) continue;
    b.textContent = keyLabel(s[b.dataset.k]);
    b.setAttribute('aria-label', `${KEY_NAMES[b.dataset.k]} key: ${keyLabel(s[b.dataset.k])}. Press to change.`);
  }
  $('#run-key').textContent = keyLabel(s.key);
  $('#cheat').innerHTML = '';
  for (const [k, what] of [[s.key, 'start'], [s.holdKey, 'hold to pause'], [`${s.slowerKey} ${s.fasterKey}`, 'speed']]) {
    const span = document.createElement('span');
    for (const part of k === ' ' ? [k] : k.split(' ')) { const kb = document.createElement('kbd'); kb.textContent = keyLabel(part); span.append(kb); }
    span.append(` ${what}`);
    $('#cheat').append(span);
  }
  renderSites();
}

// ── Saved sites: this site first, then A–Z. Forget with undo. ──
const X = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function renderSites() {
  const hosts = Object.keys(s.sites).sort((a, b) => (b === host) - (a === host) || a.localeCompare(b));
  $('#site-count').textContent = hosts.length ? ` ${hosts.length}` : '';
  $('#site-empty').hidden = hosts.length > 0;
  $('#sites-intro').hidden = !hosts.length;
  $('#site-list').replaceChildren(...hosts.map((h) => {
    const li = document.createElement('li');
    li.classList.toggle('here', h === host);
    const name = document.createElement('span');
    name.className = 'host';
    name.title = h;
    name.textContent = h; // hostnames come from pages: text only, never HTML
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = `${s.sites[h]} px/s`;
    const forget = document.createElement('button');
    forget.type = 'button';
    forget.innerHTML = X;
    forget.setAttribute('aria-label', `Forget ${h}`);
    forget.title = 'Forget this site';
    forget.onclick = () => {
      const i = hosts.indexOf(h), old = s.sites[h];
      const { [h]: _, ...rest } = s.sites;
      save({ sites: rest });
      say(`Forgot ${h}.`, { undo: () => save({ sites: { ...s.sites, [h]: old } }) });
      // keep keyboard focus in the list after the row disappears
      requestAnimationFrame(() => ($('#site-list').querySelectorAll('button')[Math.min(i, hosts.length - 2)] || $('#t-sites')).focus());
    };
    li.append(name, v, forget);
    return li;
  }));
}

// ── Tabs (WAI-ARIA tabs pattern, automatic activation) ────────
const tabs = [...document.querySelectorAll('[role=tab]')];
function select(tab, focus) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  }
  const bar = $('.bar');
  bar.style.setProperty('--x', tab.offsetLeft + tab.offsetWidth * 0.2 + 'px');
  bar.style.setProperty('--w', tab.offsetWidth * 0.6 + 'px');
  if (focus) tab.focus();
}
for (const t of tabs) t.addEventListener('click', () => select(t));
$('[role=tablist]').addEventListener('keydown', (e) => {
  const i = tabs.indexOf(document.activeElement);
  const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
  if (i < 0 || to === undefined) return;
  e.preventDefault();
  select(tabs[(to + tabs.length) % tabs.length], true);
});

// ── Storage ───────────────────────────────────────────────────
chrome.storage.local.get(DEFAULTS, (v) => {
  s = v;
  render();
  select(tabs[0]);
  tip();
  requestAnimationFrame(() => document.body.classList.add('ready'));
});
chrome.storage.onChanged.addListener((c) => {
  for (const k in c) if (k in DEFAULTS) s[k] = c[k].newValue;
  render();
});

// ── Inputs ────────────────────────────────────────────────────
slider.addEventListener('input', () => setSpeed(fromSlider(+slider.value)));
pxsEl.addEventListener('change', () => {
  const n = parseFloat(pxsEl.value);
  const pxs = Number.isFinite(n) ? clamp(n) : speedOf();
  if (Number.isFinite(n) && pxs !== Math.round(n)) say(n > MAX ? `Easy there. ${MAX} px/s is the limit.` : `${MIN} px/s is as slow as it goes.`);
  setSpeed(pxs);
  pxsEl.value = pxs;
});
pxsEl.addEventListener('keydown', (e) => e.key === 'Enter' && pxsEl.blur());

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.type === 'radio') save({ [t.name]: t.name === 'mode' || t.name === 'atEnd' ? t.value : +t.value });
  if (t.type === 'checkbox') save({ [t.id]: t.checked });
});

// ── Key capture: click a key, press any key. Esc cancels. ─────
let listening = null;
for (const b of document.querySelectorAll('.key')) {
  b.addEventListener('click', () => {
    if (listening) { listening.classList.remove('listening'); render(); }
    listening = b;
    b.classList.add('listening');
    b.textContent = 'Press…';
    say('Press any key. Your move. (Esc cancels)');
  });
}
document.addEventListener('keydown', (e) => {
  if (!listening || e.key === 'Tab') return;
  if (MODIFIERS.includes(e.key) && listening.dataset.k !== 'holdKey') return; // only the hold key can be a modifier
  e.preventDefault();
  const b = listening, k = b.dataset.k;
  listening = null;
  b.classList.remove('listening');
  if (e.key === 'Escape') say('Never mind. Nothing changed.');
  else {
    const clash = Object.keys(KEY_NAMES).find((o) => o !== k && s[o].toLowerCase() === e.key.toLowerCase());
    if (clash) say(`${keyLabel(e.key)} is already ${KEY_NAMES[clash]}. Pick another.`);
    else { save({ [k]: e.key }); say(`Locked in: ${keyLabel(e.key)} is ${KEY_NAMES[k]}.`); }
  }
  render();
});
$('#reset-keys').addEventListener('click', () => {
  const keys = Object.fromEntries(Object.keys(KEY_NAMES).map((k) => [k, DEFAULTS[k]]));
  const old = Object.fromEntries(Object.keys(KEY_NAMES).map((k) => [k, s[k]]));
  save(keys);
  say('Keys back to factory settings.', { undo: () => save(old) });
});

// ── Start/stop the current tab ────────────────────────────────
function setRun(r) {
  const ok = !!r;
  running = !!r?.running;
  run.disabled = !ok;
  run.classList.toggle('on', running);
  document.body.classList.toggle('running', running);
  $('#run-label').textContent = running ? 'Stop' : 'Start';
  $('#offline').hidden = ok;
  $('.status').hidden = !ok;
  $('#status-text').textContent = !ok ? 'Taking a break on this page.' : running ? 'Scrolling… don’t mind me.' : 'Ready when you are.';
  if (r?.vh) vh = r.vh;
  if (r?.host && r.host !== host) host = r.host;
  render();
}
const ask = (msg) => chrome.tabs.sendMessage(tabId, msg, { frameId: 0 }, (r) => setRun(chrome.runtime.lastError ? null : r));
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => { tabId = tab?.id; ask('state'); });
run.addEventListener('click', () => ask('toggle'));
$('#reload').addEventListener('click', () => { chrome.tabs.reload(tabId); window.close(); });
