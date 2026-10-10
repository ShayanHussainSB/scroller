// Core engine. Feature scripts (night, pages, wpm, session) load after this one in the same scope and plug in
// by listening on `bus` (start, stop, tick, settings, advance) or by wrapping the `let` hooks marked "hook".
let s = { ...DEFAULTS };
const bus = new EventTarget();
const emit = (type) => bus.dispatchEvent(new Event(type));
// on = what the user asked for; level eases 0..1 so starts, stops and pauses glide instead of jerk.
let on = false, looping = false, level = 0, held = false;
let last = 0, carry = 0, sinceJump = 0, nextJump = null, aim = null, pilledAt = 0, stuckFor = 0, pausedUntil = 0, target = null;
const RAMP = 500; // ms to ease fully in or out
const HOST = location.hostname.replace(/^www\./, '') || 'local';
let speed = () => s.sites[HOST] ?? s.pxs;                       // hook: px/s right now
let speedLabel = () => `${speed()} px/s`;                       // hook: how the pill names the speed
let jump = (from) => target.clientHeight * s.step;            // hook: px for the next jump from scroll position `from`
let canAdvance = () => true;                                    // hook: false stops at the end instead of next chapter
let pillInfo = () => ({});                                      // hook: { left, sleep, progress } for the pill
let pageState = () => ({ running: on, host: HOST, vh: innerHeight }); // hook: what the popup learns about this page

chrome.storage.local.get(DEFAULTS, (v) => { s = v; emit('settings'); });
chrome.storage.onChanged.addListener((c) => {
  for (const k in c) if (k in DEFAULTS) s[k] = c[k].newValue;
  emit('settings');
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
  if (!target.isConnected) { target = findTarget(); aim = null; }
  // the page moved far on its own (in-place chapter swap, keyboard paging): jump from where it is now
  if (aim !== null && Math.abs(target.scrollTop - aim) > 2 * target.clientHeight) aim = nextJump = null;
  if (on && reported !== location.href) report(); // in-place chapter change may have cleared the icon

  const goal = on && !held && now >= pausedUntil ? 1 : 0;
  level = goal > level ? Math.min(1, level + dt / RAMP) : Math.max(0, level - dt / RAMP);
  if (!on && !level) return (looping = false);

  const before = target.scrollTop;
  if (s.mode !== 'smooth') {
    if (goal) sinceJump += dt;
    // Aim from where the last jump will land, not where its smooth scroll is right now,
    // so quick jumps don't come up short.
    const from = aim ?? target.scrollTop;
    nextJump ??= jump(from);
    if (sinceJump >= (nextJump / speed()) * 1000) {
      sinceJump = 0;
      aim = Math.max(0, Math.min(target.scrollHeight - target.clientHeight, from + nextJump * s.dir));
      target.scrollTo({ top: aim, behavior: 'smooth' });
      nextJump = null;
    }
  } else {
    const ease = level * level * (3 - 2 * level); // smoothstep
    carry += (speed() * ease * dt) / 1000;
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
  if (stuckFor > 1500 && s.atEnd === 'next') advance();
  emit('tick');
  if (on && now - pilledAt > 500) badge(); // keep time left fresh

  requestAnimationFrame(tick);
}

function start() {
  on = true;
  sinceJump = stuckFor = pausedUntil = 0;
  nextJump = aim = null;
  if (!looping) {
    looping = true;
    target = findTarget();
    last = performance.now();
    carry = 0;
    requestAnimationFrame(tick);
  }
  emit('start');
  badge();
}
// msg: a farewell for the pill ("Good night…"); it lingers longer than the plain "Stopped".
function stop(msg) { on = false; held = false; emit('stop'); badge(msg, msg && 4000); }

// Tell the background script so the toolbar icon can show "ON".
let reported = null;
function report() {
  reported = on && location.href;
  try { chrome.runtime.sendMessage({ running: on })?.catch(() => {}); } catch {} // extension reloaded underneath us
}
const toggle = () => (on ? stop() : start());

// Best guess at the reader's "next chapter" control. Scored, because every site labels it differently.
function findNext() {
  let best = null, top = 1;
  for (const el of document.querySelectorAll('a[href], button, [role="button"], link[rel~="next"][href]')) {
    if (el.tagName !== 'LINK' && !el.getClientRects().length) continue; // hidden
    const label = `${el.textContent} ${el.getAttribute('aria-label') || ''} ${el.title || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
    const attrs = `${el.id} ${el.getAttribute('class') || ''} ${el.getAttribute('rel') || ''}`.toLowerCase();
    if (/\bprev|\bback\b/.test(label + ' ' + attrs)) continue; // prev, previous, back (not background)
    let score = 0;
    if (/\bnext\b/.test(label)) score += 2;
    if (/next/.test(attrs)) score += 1;
    if (!score) continue;
    if (el.tagName === 'LINK' || /\bnext\b/.test(el.getAttribute('rel') || '')) score += 1; // rel=next is the page saying so
    if (/chap|\bch\b|episode|\bep\b/.test(label + ' ' + attrs)) score += 2;
    if (/^[›»→>\s]+$/.test(label)) score += 1; // icon-only arrow
    if (/comment|reply|post|article|story/.test(label)) score -= 2; // "next page of comments" is not the chapter
    if (label.length > 40) score -= 2; // a sentence that happens to say "next"
    if (score > top) { top = score; best = el; }
  }
  return best;
}

// Open the next chapter and resume there. A full page load picks up via sessionStorage;
// readers that swap chapters in place just keep scrolling.
const RESUME = 'scroller:resume';
let advancedFrom = null;
function advance() {
  stuckFor = 0;
  const el = s.dir > 0 && canAdvance() && findNext();
  if (!on) return; // canAdvance stopped us with its own message
  if (!el || advancedFrom === location.href) { stop(); level = 0; return; } // nothing to follow, or it didn't move on
  advancedFrom = location.href;
  emit('advance');
  try { sessionStorage.setItem(RESUME, Date.now()); } catch {}
  badge('Next chapter…');
  if (el.tagName === 'LINK' || el.target === '_blank') location.href = el.href;
  else el.click();
}

let resumed = false; // this page load continues a next-chapter run
try {
  const t = +sessionStorage.getItem(RESUME);
  sessionStorage.removeItem(RESUME);
  if (Date.now() - t < 60000) {
    resumed = true;
    const go = () => setTimeout(start, 800); // let the first images settle
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  }
} catch {}

let nudge = function (up) { // hook
  const cur = speed();
  let pxs = Math.round(up ? cur * s.nudge : cur / s.nudge);
  if (pxs === cur) pxs += up ? 1 : -1; // small speeds would otherwise round back to themselves
  pxs = Math.min(MAX, Math.max(MIN, pxs));
  chrome.storage.local.set({ pxs, sites: { ...s.sites, [HOST]: pxs } });
};

// On-page pill, inside a shadow root so site CSS can't touch it.
let host, pill, hideTimer;
// linger: ms a stopped-state message stays up.
function badge(text, linger = 1200) {
  pilledAt = performance.now();
  if (on !== !!reported) report();
  if (!s.badge) return host?.remove();
  if (!host) {
    host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      div{position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:7px 12px;border-radius:999px;
        font:600 12px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:#f5f5f5;background:#000000eb;
        border:1px solid #333;box-shadow:0 6px 20px #0006;transition:opacity .25s ease-out;pointer-events:none}
      div.on::before{content:"";display:inline-block;width:6px;height:6px;margin-right:7px;border-radius:50%;
        background:#ff4f5a;vertical-align:1px}
    </style><div></div>`;
    pill = root.querySelector('div');
  }
  if (!host.isConnected) document.documentElement.append(host);
  pill.className = on ? 'on' : '';
  const { left, sleep } = pillInfo();
  pill.textContent = text || (!on ? 'Stopped' : held ? 'Paused'
    : [`${speedLabel()}${s.dir < 0 ? ' · up' : ''}`, left, sleep].filter(Boolean).join(' · '));
  pill.style.opacity = 1;
  clearTimeout(hideTimer);
  if (!on) hideTimer = setTimeout(() => (pill.style.opacity = 0), linger);
}

const same = (a, b) => a.length === 1 ? a.toLowerCase() === b.toLowerCase() : a === b;

addEventListener('keydown', (e) => {
  const t = e.target;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (same(e.key, s.holdKey)) {
    if (on && !held) { held = true; badge(); }
    // modifiers pass through so Shift+click etc. keep working; other keys would scroll the page
    if (on && !MODIFIERS.includes(e.key)) e.preventDefault();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (same(e.key, s.key)) toggle();
  else if (on && same(e.key, s.fasterKey)) nudge(true);
  else if (on && same(e.key, s.slowerKey)) nudge(false);
  else return;
  e.preventDefault();
  e.stopPropagation();
}, true);

const release = () => { if (held) { held = false; badge(); } };
addEventListener('keyup', (e) => same(e.key, s.holdKey) && release(), true);
addEventListener('blur', release); // key let go while the window was in the background

// Your own scrolling wins instantly; we ease back in two seconds after you stop.
const manual = () => {
  aim = nextJump = null; // you moved the page; jump from wherever you left it
  if (on && s.pauseOnManual) { pausedUntil = performance.now() + 2000; level = 0; }
};
addEventListener('wheel', manual, { passive: true, capture: true });
addEventListener('touchmove', manual, { passive: true, capture: true });

chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg === 'toggle') toggle();
  reply(pageState());
});
