const $ = (q) => document.querySelector(q);
const pxsEl = $('#pxs'), slider = $('#slider'), nameEl = $('#name'), run = $('#run'), hint = $('#hint');
const save = (o) => chrome.storage.local.set(o);
const clamp = (n) => Math.round(Math.min(MAX, Math.max(MIN, n)));

// Slider is logarithmic so both ends get room: 1 px/s up to 5000 px/s.
const toSlider = (pxs) => Math.round((1000 * Math.log(pxs / MIN)) / Math.log(MAX / MIN));
const fromSlider = (v) => clamp(MIN * Math.pow(MAX / MIN, v / 1000));

const keyLabel = (k) => ({ ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' })[k]
  || (k.length === 1 ? k.toUpperCase() : k);

// Presets
for (const [name, pxs] of PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.pxs = pxs;
  b.innerHTML = `${name}<small>${pxs} px/s</small>`;
  b.onclick = () => save({ pxs });
  $('#presets').append(b);
}

function showSpeed(pxs) {
  if (document.activeElement !== pxsEl) pxsEl.value = pxs;
  if (document.activeElement !== slider) slider.value = toSlider(pxs);
  slider.style.setProperty('--fill', (toSlider(pxs) / 10) + '%');
  const near = PRESETS.reduce((a, b) => (Math.abs(Math.log(b[1] / pxs)) < Math.abs(Math.log(a[1] / pxs)) ? b : a));
  nameEl.textContent = near[1] === pxs ? near[0] : (pxs < near[1] ? 'just under ' : 'just over ') + near[0].toLowerCase();
  for (const b of $('#presets').children) b.setAttribute('aria-pressed', +b.dataset.pxs === pxs);
}

function render(s) {
  showSpeed(s.pxs);
  for (const name of ['mode', 'step', 'dir', 'atEnd'])
    for (const r of document.getElementsByName(name)) r.checked = r.value === String(s[name]);
  for (const r of document.getElementsByName('step')) r.disabled = s.mode !== 'step';
  $('#pauseOnManual').checked = s.pauseOnManual;
  $('#badge').checked = s.badge;
  for (const b of document.querySelectorAll('.key')) if (!b.classList.contains('listening')) b.textContent = keyLabel(s[b.dataset.k]);
}

let s = { ...DEFAULTS };
chrome.storage.local.get(DEFAULTS, (v) => {
  render((s = v));
  requestAnimationFrame(() => document.body.classList.add('ready'));
});
chrome.storage.onChanged.addListener((c) => {
  for (const k in c) if (k in DEFAULTS) s[k] = c[k].newValue;
  render(s);
});

slider.addEventListener('input', () => save({ pxs: fromSlider(+slider.value) }));
pxsEl.addEventListener('change', () => {
  const n = parseFloat(pxsEl.value);
  save({ pxs: Number.isFinite(n) ? clamp(n) : s.pxs });
  pxsEl.value = Number.isFinite(n) ? clamp(n) : s.pxs;
});
pxsEl.addEventListener('keydown', (e) => e.key === 'Enter' && pxsEl.blur());

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.type === 'radio') save({ [t.name]: t.name === 'mode' || t.name === 'atEnd' ? t.value : +t.value });
  if (t.type === 'checkbox') save({ [t.id]: t.checked });
});

// Key capture: click a key button, press any key. Esc cancels.
let listening = null;
for (const b of document.querySelectorAll('.key')) {
  b.addEventListener('click', () => {
    if (listening) listening.classList.remove('listening');
    listening = b;
    b.classList.add('listening');
    b.textContent = 'Press…';
  });
}
document.addEventListener('keydown', (e) => {
  if (!listening || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
  e.preventDefault();
  const b = listening, k = b.dataset.k;
  listening = null;
  b.classList.remove('listening');
  if (e.key !== 'Escape') {
    const clash = ['key', 'fasterKey', 'slowerKey'].find((o) => o !== k && s[o].toLowerCase() === e.key.toLowerCase());
    if (clash) hint.textContent = `“${keyLabel(e.key)}” is already used. Pick another.`;
    else { save({ [k]: e.key }); hint.textContent = 'Saved.'; }
  }
  b.textContent = keyLabel(s[k]);
});

// Start/stop the current tab. Pages opened before install need a reload first.
let tabId;
const setRun = (r) => {
  run.disabled = !r;
  run.classList.toggle('on', !!r?.running);
  run.textContent = r?.running ? 'Stop' : 'Start';
  if (!r) hint.textContent = 'Can’t run on this page. Reload it, or try a normal website.';
};
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  tabId = tab?.id;
  chrome.tabs.sendMessage(tabId, 'state', { frameId: 0 }, (r) => setRun(chrome.runtime.lastError ? null : r));
});
run.addEventListener('click', () =>
  chrome.tabs.sendMessage(tabId, 'toggle', { frameId: 0 }, (r) => setRun(chrome.runtime.lastError ? null : r)));
