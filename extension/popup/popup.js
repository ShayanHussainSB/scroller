const $ = (q) => document.querySelector(q);
const pxsEl = $('#pxs'), slider = $('#slider'), run = $('#run'), hint = $('#hint'), undoBtn = $('#undo');
const save = (o) => chrome.storage.local.set(o);

// Speed is px/s for art and wpm for prose. Each unit has its own range, presets and personality.
const UNITS = {
  px: { min: MIN, max: MAX, presets: PRESETS, short: 'px/s', long: 'pixels per second' },
  wpm: { min: WPM_MIN, max: WPM_MAX, presets: WPM_PRESETS, short: 'wpm', long: 'words per minute' },
};
const U = () => UNITS[unit()];
const clamp = (n) => Math.round(Math.min(U().max, Math.max(U().min, n)));

// Slider is logarithmic so both ends get room (1 to 5000 px/s, 50 to 1500 wpm).
const toSlider = (v) => Math.round((1000 * Math.log(v / U().min)) / Math.log(U().max / U().min));
const fromSlider = (v) => clamp(U().min * Math.pow(U().max / U().min, v / 1000));

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
  // wpm
  'Savoring': 'Every word gets its moment.',
  'Relaxed': 'Tea in one hand, page in the other.',
  'Reading:wpm': 'A comfortable reading pace.',
  'Brisk:wpm': 'The plot is heating up.',
  'Fast:wpm': 'Gliding past the exposition.',
  'Skimming': 'Just here for the dialogue.',
};
const END = {
  stop: 'Stops at the last panel. The end… or is it?',
  wait: 'Keeps rolling when more pages load in.',
  next: 'Binge mode: the next chapter opens itself.',
};
const MODE = { smooth: 'One smooth, steady glide', step: 'A chunk at a time', pages: 'Snaps to each page, like turning it' };
const NIGHT = {
  off: 'Pages look exactly the way the site made them.',
  scrolling: 'Fades in when you press start, out when you stop.',
  always: 'On every page, scrolling or not.',
};
const KEY_NAMES = { key: 'start/stop', holdKey: 'hold to pause', fasterKey: 'faster', slowerKey: 'slower' };

// Speed is remembered per site; the last speed used anywhere is the starting point for new sites.
// page: what the tab reports (kind 'text' | 'image', pxPerWord, time left, sleep timer...).
let s = { ...DEFAULTS }, host = null, vh = 0, tabId, running = false, page = {};
// wpm needs text to measure; otherwise px/s. Your per-site choice beats the automatic one.
const canWpm = () => !!page.pxPerWord;
const unit = () => (!canWpm() ? 'px' : (host && s.units[host]) || (page.kind === 'text' ? 'wpm' : 'px'));
const speedOf = () => unit() === 'wpm' ? (host && s.wpmSites[host]) ?? s.wpm : (host && s.sites[host]) ?? s.pxs;
const setSpeed = (v) => unit() === 'wpm'
  ? save(host ? { wpm: v, wpmSites: { ...s.wpmSites, [host]: v } } : { wpm: v })
  : save(host ? { pxs: v, sites: { ...s.sites, [host]: v } } : { pxs: v });
const pxsNow = () => unit() === 'wpm' ? (speedOf() * page.pxPerWord) / 60 : speedOf();

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
    'Night tab: dim it, warm it, sleep.',
    'Novels switch to words per minute.',
    'Feel → Pages snaps to each page.',
  ];
  hint.textContent = 'Tip: ' + tips[Math.floor(Math.random() * tips.length)];
  undoBtn.hidden = true;
}

// ── Presets (rebuilt when the unit changes) ───────────────────
let presetsFor;
function presets() {
  if (presetsFor === unit()) return;
  presetsFor = unit();
  $('#presets').replaceChildren(...U().presets.map(([name, v]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = v;
    b.innerHTML = `${name}<small>${v} ${U().short}</small>`;
    b.onclick = () => setSpeed(v);
    return b;
  }));
  pxsEl.min = U().min;
  pxsEl.max = U().max;
}

// Width follows the digits (field-sizing isn't available everywhere).
const fitPxs = () => {
  const n = Math.min(5, Math.max(1, pxsEl.value.length));
  pxsEl.style.width = `calc(${n}ch - ${n * 0.04}em + 2px)`; // digits are tabular; undo the -0.04em tracking
};
pxsEl.addEventListener('input', fitPxs);

function showSpeed(v) {
  presets();
  const u = unit();
  if (document.activeElement !== pxsEl) pxsEl.value = v;
  fitPxs();
  if (document.activeElement !== slider) slider.value = toSlider(v);
  slider.style.setProperty('--fill', (toSlider(v) / 10) + '%');
  const near = U().presets.reduce((a, b) => (Math.abs(Math.log(b[1] / v)) < Math.abs(Math.log(a[1] / v)) ? b : a));
  const name = near[1] === v ? near[0] : (v < near[1] ? 'Just under ' : 'Just over ') + near[0].toLowerCase();
  $('#name').textContent = name;
  $('#quip').textContent = QUIPS[`${near[0]}:${u}`] || QUIPS[near[0]];
  pxsEl.setAttribute('aria-label', `Speed in ${U().long}`);
  slider.setAttribute('aria-label', `Speed in ${U().long}, slow to fast`);
  slider.setAttribute('aria-valuetext', `${v} ${U().long}, ${name}`);
  for (const b of $('#presets').children) b.setAttribute('aria-pressed', +b.dataset.v === v);
  // the unit switch
  const ub = $('#unit');
  $('#unit-text').textContent = U().short;
  ub.disabled = !canWpm();
  const other = u === 'wpm' ? 'pixels per second' : 'words per minute';
  ub.setAttribute('aria-label', `Unit: ${U().long}.${canWpm() ? ` Switch to ${other}.` : ''}`);
  ub.title = !canWpm() ? 'Pixels per second' : host && s.units[host]
    ? `You picked ${U().short} for ${host}. Tap for ${other}.`
    : `Picked for this ${page.kind === 'text' ? 'text' : 'art'} page. Tap for ${other}.`;
  // a human unit: how long one screen takes
  const t = vh / pxsNow();
  $('#pace').textContent = !vh ? '' : t < 1 ? '1 screen in under a second' : t < 90 ? `1 screen every ${Math.round(t)}s` : `1 screen every ${Math.round(t / 60)} min`;
}

function render() {
  showSpeed(speedOf());
  for (const name of ['mode', 'step', 'dir', 'atEnd', 'nudge', 'stopAfterMin', 'stopAfterCh'])
    for (const r of document.getElementsByName(name)) r.checked = r.value === String(s[name]);
  renderNight();
  $('#step-row').hidden = s.mode === 'smooth';
  $('#step-desc').textContent = s.mode === 'pages' ? 'Step size inside tall pages' : 'Screen per jump';
  $('#mode-desc').textContent = MODE[s.mode];
  $('#end-desc').textContent = s.atEnd === 'next' && s.stopAfterCh ? `Binge mode, ${plural(s.stopAfterCh, 'chapter')} and done.` : END[s.atEnd];
  $('#faster-desc').textContent = s.nudge === 2 ? 'Doubles it per tap' : `+${Math.round((s.nudge - 1) * 100)}% per tap`;
  $('#slower-desc').textContent = s.nudge === 2 ? 'Halves it per tap' : `−${Math.round((1 - 1 / s.nudge) * 100)}% per tap`;
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

// ── Night + Stop after ────────────────────────────────────────
const pct = (v) => (v ? `${Math.round(v * 100)}%` : 'Off');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const mins = (m) => (m >= 60 ? '1 hour' : `${m} min`);
function renderNight() {
  const when = s.night ? s.nightWhen : 'off';
  for (const r of document.getElementsByName('nightWhen')) r.checked = r.value === when;
  $('#night-desc').textContent = NIGHT[when];
  for (const [id, max] of [['dim', 80], ['warm', 100]]) {
    const el = $('#' + id);
    if (document.activeElement !== el) el.value = Math.round(s[id] * 100);
    el.style.setProperty('--fill', (s[id] * 100 / max) * 100 + '%');
    el.disabled = !s.night;
    $(`#${id}-out`).textContent = pct(s[id]);
    el.setAttribute('aria-valuetext', pct(s[id]));
  }
  $('#dials').classList.toggle('off', !s.night);
  $('#focus').checked = s.focus;
  $('#focus').disabled = !s.night;
  $('#focus-row').classList.toggle('off', !s.night);
  // Stop after, in one sentence. Live while a session runs.
  const m = s.stopAfterMin, ch = s.stopAfterCh;
  const live = running && page.sleepSec > 0 && `Lights out in ${page.sleepSec < 60 ? 'under a minute' : mins(Math.ceil(page.sleepSec / 60))}.`;
  $('#bed-desc').textContent = live || (
    m && ch ? `${plural(ch, 'chapter')} or ${mins(m)}, whichever comes first.`
    : m ? `Stops ${mins(m)} after you press start.`
    : ch ? `Stops at the end of chapter ${ch}${ch > 1 ? ', counting from where you start' : ''}.`
    : 'Keeps going until you stop it.');
}
// Sliders preview on the page while you drag, even when Night only runs while scrolling.
for (const id of ['dim', 'warm']) {
  $('#' + id).addEventListener('input', (e) => { save({ [id]: +e.target.value / 100 }); ask('preview'); });
}

// ── Sites: favorites (starred by you) on top, then every site with a saved speed ──
const X = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const STAR = '<svg class="star" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.4l1.7 3.6 3.9.5-2.9 2.7.8 3.9L7 10.2l-3.5 1.9.8-3.9L1.4 5.5l3.9-.5z"/></svg>';
const isFav = (h) => s.favs.includes(h);
const byHere = (a, b) => (b === host) - (a === host) || a.localeCompare(b);

function toggleFav(h) {
  const was = isFav(h), old = s.favs;
  save({ favs: was ? s.favs.filter((f) => f !== h) : [...s.favs, h] });
  say(was ? `${h} is off your favorites.` : `${h} is a favorite now. Good taste.`, { undo: () => save({ favs: old }) });
}
function forget(h) {
  const old = { sites: s.sites, wpmSites: s.wpmSites, units: s.units, favs: s.favs };
  const drop = (o) => { const { [h]: _, ...rest } = o; return rest; };
  save({ sites: drop(s.sites), wpmSites: drop(s.wpmSites), units: drop(s.units), favs: s.favs.filter((f) => f !== h) });
  say(`Forgot ${h}.`, { undo: () => save(old) });
}

function row(h) {
  const li = document.createElement('li');
  li.classList.toggle('here', h === host);
  const fav = isFav(h);
  const star = document.createElement('button');
  star.type = 'button';
  star.innerHTML = STAR;
  star.dataset.star = h;
  star.setAttribute('aria-pressed', fav);
  star.setAttribute('aria-label', `Favorite ${h}`);
  star.title = fav ? 'Remove from favorites' : 'Add to favorites';
  star.onclick = () => { toggleFav(h); requestAnimationFrame(() => document.querySelector(`[data-star="${CSS.escape(h)}"]`)?.focus()); };
  // favorites open in a new tab; hostnames come from pages, so text only, never HTML
  const name = document.createElement(fav && h.includes('.') ? 'a' : 'span');
  name.className = 'host';
  name.textContent = h;
  name.title = fav ? `Open ${h}` : h;
  if (name.tagName === 'A') { name.href = `https://${h}/`; name.target = '_blank'; name.rel = 'noopener'; }
  const v = document.createElement('span');
  v.className = 'v';
  // show the unit that site reads in (a site can have both if you switched)
  const wpmFirst = s.units[h] === 'wpm' || (!(h in s.sites) && h in s.wpmSites);
  v.textContent = wpmFirst && h in s.wpmSites ? `${s.wpmSites[h]} wpm` : h in s.sites ? `${s.sites[h]} px/s` : 'default';
  const x = document.createElement('button');
  x.type = 'button';
  x.innerHTML = X;
  x.setAttribute('aria-label', `Forget ${h}`);
  x.dataset.forget = h;
  x.title = 'Forget this site';
  x.onclick = () => {
    const li = x.closest('li'), next = (li.nextElementSibling || li.previousElementSibling)?.querySelector('[data-forget]').dataset.forget;
    forget(h);
    // keep keyboard focus in the list after the row disappears
    requestAnimationFrame(() => ((next && document.querySelector(`[data-forget="${CSS.escape(next)}"]`)) || $('#t-sites')).focus());
  };
  li.append(star, name, v, x);
  return li;
}

function renderSites() {
  const favs = s.favs.slice().sort(byHere);
  const others = [...new Set([...Object.keys(s.sites), ...Object.keys(s.wpmSites)])].filter((h) => !isFav(h)).sort(byHere);
  const total = favs.length + others.length;
  $('#site-count').textContent = total ? ` ${total}` : '';
  $('#fav-list').replaceChildren(...favs.map(row));
  $('#site-list').replaceChildren(...others.map(row));
  // nothing at all: one friendly empty state. Otherwise: Favorites (or a hint), then Other sites.
  $('#site-empty').hidden = !!total;
  $('#sites-intro').hidden = !total;
  $('#fav-title').hidden = !total;
  $('#fav-list').hidden = !favs.length;
  $('#fav-empty').hidden = !total || !!favs.length;
  $('#other-title').hidden = $('#site-list').hidden = !others.length;
  // the header chip stars the site you're on
  const chip = $('#site');
  chip.hidden = !host;
  if (host) {
    chip.innerHTML = STAR;
    const t = document.createElement('span');
    t.textContent = host;
    chip.append(t);
    chip.setAttribute('aria-pressed', isFav(host));
    chip.setAttribute('aria-label', `Favorite ${host}`);
    chip.title = isFav(host) ? 'Remove from favorites' : 'Add to favorites';
  }
}
$('#site').addEventListener('click', () => host && toggleFav(host));

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
  if (Number.isFinite(n) && pxs !== Math.round(n)) say(n > U().max ? `Easy there. ${U().max} ${U().short} is the limit.` : `${U().min} ${U().short} is as slow as it goes.`);
  setSpeed(pxs);
  pxsEl.value = pxs;
});
pxsEl.addEventListener('keydown', (e) => e.key === 'Enter' && pxsEl.blur());

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.type !== 'radio' && t.type !== 'checkbox') return;
  if (t.name === 'nightWhen') save(t.value === 'off' ? { night: false } : { night: true, nightWhen: t.value });
  else if (t.name === 'stopAfterCh' && +t.value && s.atEnd !== 'next') {
    // counting chapters only makes sense when Scroller opens them
    const old = s.atEnd;
    save({ stopAfterCh: +t.value, atEnd: 'next' });
    say('At the end is now Next chapter, so there’s something to count.', { undo: () => save({ stopAfterCh: 0, atEnd: old }) });
  } else if (t.type === 'radio') save({ [t.name]: ['mode', 'atEnd'].includes(t.name) ? t.value : +t.value });
  else save({ [t.id]: t.checked });
  if (t.name === 'nightWhen' || t.id === 'focus') ask('preview');
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
  if (r?.vh) vh = r.vh;
  if (r?.host && r.host !== host) host = r.host;
  page = r || {};
  $('#status-text').textContent = !ok ? 'Taking a break on this page.' : running ? statusLine() : 'Ready when you are.';
  render();
}
const clock = (sec) => sec < 60 ? `${Math.max(1, Math.round(sec))}s` : sec < 3600 ? `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}` : `${Math.floor(sec / 3600)}h ${String(Math.floor(sec % 3600 / 60)).padStart(2, '0')}m`;
function statusLine() {
  if (page.leftSec > 10) return `${page.estimating ? '~' : ''}${clock(page.leftSec)} left in this chapter`;
  if (page.leftSec >= 0 && page.leftSec <= 10 && page.progress > 0.5) return 'Almost at the end…';
  return 'Scrolling… don’t mind me.';
}
const ask = (msg) => chrome.tabs.sendMessage(tabId, msg, { frameId: 0 }, (r) => setRun(chrome.runtime.lastError ? null : r));
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => { tabId = tab?.id; ask('state'); });
run.addEventListener('click', () => ask('toggle'));
// time left and the sleep timer tick while the popup is open
// (text only: a full render would rebuild lists under your cursor)
setInterval(() => running && chrome.tabs.sendMessage(tabId, 'state', { frameId: 0 }, (r) => {
  if (chrome.runtime.lastError || !r) return;
  if (!r.running || r.kind !== page.kind || r.pxPerWord !== page.pxPerWord) return setRun(r); // something real changed
  page = r;
  $('#status-text').textContent = statusLine();
  renderNight();
}), 1000);
$('#unit').addEventListener('click', () => {
  if (!host || !canWpm()) return;
  const old = s.units, to = unit() === 'wpm' ? 'px' : 'wpm';
  const auto = page.kind === 'text' ? 'wpm' : 'px';
  const { [host]: _, ...rest } = s.units;
  save({ units: to === auto ? rest : { ...s.units, [host]: to } }); // back to automatic when it matches
  say(to === auto ? `Back to automatic: ${UNITS[to].short} here.` : `${host} reads in ${UNITS[to].short} now.`, { undo: () => save({ units: old }) });
});
$('#reload').addEventListener('click', () => { chrome.tabs.reload(tabId); window.close(); });
