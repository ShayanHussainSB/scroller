let s = { ...DEFAULTS };
let running = false, last = 0, carry = 0, sinceJump = 0, stuckFor = 0, pausedUntil = 0, target = null;

chrome.storage.local.get(DEFAULTS, (v) => (s = v));
chrome.storage.onChanged.addListener((c) => {
  for (const k in c) if (k in DEFAULTS) s[k] = c[k].newValue;
  if (running) badge();
});

// The page itself usually scrolls, but some readers scroll an inner box. Pick the biggest one that can.
function findTarget() {
  const root = document.scrollingElement || document.documentElement;
  if (root.scrollHeight > root.clientHeight + 1) return root;
  let best = root, area = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY)) continue;
    const a = el.clientWidth * el.clientHeight;
    if (a > area) { area = a; best = el; }
  }
  return best;
}

function tick(now) {
  if (!running) return;
  const dt = Math.min(now - last, 100); // ignore long gaps (tab in background)
  last = now;
  if (now < pausedUntil) return requestAnimationFrame(tick);

  const before = target.scrollTop;
  if (s.mode === 'step') {
    sinceJump += dt;
    const jump = target.clientHeight * s.step;
    if (sinceJump >= (jump / s.pxs) * 1000) {
      sinceJump = 0;
      target.scrollBy({ top: jump * s.dir, behavior: 'smooth' });
    }
  } else {
    carry += (s.pxs * dt) / 1000;
    const px = Math.floor(carry); // scrolling ignores sub-pixel amounts, so bank the fraction
    if (px) {
      carry -= px;
      // 'instant' matters: sites with CSS scroll-behavior:smooth would otherwise swallow each tiny step
      target.scrollBy({ top: px * s.dir, behavior: 'instant' });
    }
  }

  const atEdge = s.dir > 0
    ? target.scrollTop + target.clientHeight >= target.scrollHeight - 1
    : target.scrollTop <= 0;
  stuckFor = atEdge && target.scrollTop === before ? stuckFor + dt : 0;
  if (s.atEnd === 'stop' && stuckFor > 1500) return stop();

  requestAnimationFrame(tick);
}

function start() {
  target = findTarget();
  running = true;
  last = performance.now();
  carry = sinceJump = stuckFor = pausedUntil = 0;
  requestAnimationFrame(tick);
  badge();
}
function stop() { running = false; badge(); }
const toggle = () => (running ? stop() : start());

function nudge(f) {
  const pxs = Math.round(Math.min(MAX, Math.max(MIN, s.pxs * f)));
  chrome.storage.local.set({ pxs });
}

// On-page pill, inside a shadow root so site CSS can't touch it.
let host, pill, hideTimer;
function badge() {
  if (!s.badge) return host?.remove();
  if (!host) {
    host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      div{position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:7px 12px;border-radius:999px;
        font:600 12px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:#f6f3ec;background:#16130fe6;
        box-shadow:0 4px 14px #0004;transition:opacity .25s ease-out;pointer-events:none}
      div.on::before{content:"";display:inline-block;width:6px;height:6px;margin-right:7px;border-radius:50%;
        background:#e5484d;vertical-align:1px}
    </style><div></div>`;
    pill = root.querySelector('div');
  }
  if (!host.isConnected) document.documentElement.append(host);
  pill.className = running ? 'on' : '';
  pill.textContent = running ? `${s.pxs} px/s${s.dir < 0 ? ' · up' : ''}` : 'Stopped';
  pill.style.opacity = 1;
  clearTimeout(hideTimer);
  if (!running) hideTimer = setTimeout(() => (pill.style.opacity = 0), 1200);
}

const same = (a, b) => a.length === 1 ? a.toLowerCase() === b.toLowerCase() : a === b;

addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (same(e.key, s.key)) toggle();
  else if (running && same(e.key, s.fasterKey)) nudge(1.25);
  else if (running && same(e.key, s.slowerKey)) nudge(0.8);
  else return;
  e.preventDefault();
  e.stopPropagation();
}, true);

const manual = () => { if (running && s.pauseOnManual) pausedUntil = performance.now() + 2000; };
addEventListener('wheel', manual, { passive: true, capture: true });
addEventListener('touchmove', manual, { passive: true, capture: true });

chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg === 'toggle') toggle();
  reply({ running });
});
