let s = { ...DEFAULTS };
// on = what the user asked for; level eases 0..1 so starts, stops and pauses glide instead of jerk.
let on = false, looping = false, level = 0;
let last = 0, carry = 0, sinceJump = 0, stuckFor = 0, pausedUntil = 0, target = null;
const RAMP = 500; // ms to ease fully in or out

chrome.storage.local.get(DEFAULTS, (v) => (s = v));
chrome.storage.onChanged.addListener((c) => {
  for (const k in c) if (k in DEFAULTS) s[k] = c[k].newValue;
  if (on) badge();
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
  const dt = Math.min(now - last, 100); // ignore long gaps (tab in background)
  last = now;
  if (!target.isConnected) target = findTarget();

  const goal = on && now >= pausedUntil ? 1 : 0;
  level = goal > level ? Math.min(1, level + dt / RAMP) : Math.max(0, level - dt / RAMP);
  if (!on && !level) return (looping = false);

  const before = target.scrollTop;
  if (s.mode === 'step') {
    if (goal) sinceJump += dt;
    const jump = target.clientHeight * s.step;
    if (sinceJump >= (jump / s.pxs) * 1000) {
      sinceJump = 0;
      target.scrollBy({ top: jump * s.dir, behavior: 'smooth' });
    }
  } else {
    const ease = level * level * (3 - 2 * level); // smoothstep
    carry += (s.pxs * ease * dt) / 1000;
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
  stuckFor = goal && atEdge && target.scrollTop === before ? stuckFor + dt : 0;
  if (stuckFor > 1500 && s.atEnd === 'stop') { stop(); level = 0; }

  requestAnimationFrame(tick);
}

function start() {
  on = true;
  sinceJump = stuckFor = pausedUntil = 0;
  if (!looping) {
    looping = true;
    target = findTarget();
    last = performance.now();
    carry = 0;
    requestAnimationFrame(tick);
  }
  badge();
}
function stop() { on = false; badge(); }
const toggle = () => (on ? stop() : start());

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
  pill.className = on ? 'on' : '';
  pill.textContent = on ? `${s.pxs} px/s${s.dir < 0 ? ' · up' : ''}` : 'Stopped';
  pill.style.opacity = 1;
  clearTimeout(hideTimer);
  if (!on) hideTimer = setTimeout(() => (pill.style.opacity = 0), 1200);
}

const same = (a, b) => a.length === 1 ? a.toLowerCase() === b.toLowerCase() : a === b;

addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (same(e.key, s.key)) toggle();
  else if (on && same(e.key, s.fasterKey)) nudge(1.25);
  else if (on && same(e.key, s.slowerKey)) nudge(0.8);
  else return;
  e.preventDefault();
  e.stopPropagation();
}, true);

// Your own scrolling wins instantly; we ease back in two seconds after you stop.
const manual = () => { if (on && s.pauseOnManual) { pausedUntil = performance.now() + 2000; level = 0; } };
addEventListener('wheel', manual, { passive: true, capture: true });
addEventListener('touchmove', manual, { passive: true, capture: true });

chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg === 'toggle') toggle();
  reply({ running: on });
});
