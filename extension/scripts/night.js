// Night: a dimmer, a warm tint and focus mode, drawn as fixed layers over the page. Never a CSS filter on
// html/body: that would break the site's position:fixed elements. On while Scroller runs (paused included),
// or always (top frame only, so frames don't stack their own dimmers).
let early = resumed; // a next-chapter page dims straight away instead of flashing bright until the run resumes
let previewUntil = 0; // the popup's sliders show their effect even when Night waits for scrolling
const nightOn = () => s.night && (s.nightWhen === 'always' ? window === window.top : on || early || performance.now() < previewUntil);
const WARM = 0.5, FOCUS = 0.85, EDGE = 56, PAD = 16; // WARM: full strength is candlelight, not orange
let nightHost, warmEl, dimEl, sides, nightGone, nightTimer, col = null, colAt = null;

function nightLayers() {
  // a custom tag: site CSS aimed at div or span can't reach it. The host stays static so it doesn't form a
  // stacking context, which would cut the warm layer's blend off from the page underneath.
  nightHost = document.createElement('scroller-night');
  const root = nightHost.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    div{position:fixed;inset:0;z-index:2147483646;pointer-events:none;opacity:0;transition:opacity .5s,transform .5s}
    .warm{background:#ff8a2a;mix-blend-mode:multiply}
    .dim{background:#000}
    .l{transform:translateX(-100%);background:linear-gradient(to left,transparent,#000 ${EDGE}px)}
    .r{transform:translateX(100%);background:linear-gradient(to right,transparent,#000 ${EDGE}px)}
    @media (prefers-reduced-motion:reduce){div{transition:none}}
  </style><div class="warm"></div><div class="dim"></div><div class="l"></div><div class="r"></div>`;
  [warmEl, dimEl, ...sides] = root.querySelectorAll('div');
}

function night() {
  clearTimeout(nightGone);
  clearInterval(nightTimer);
  nightTimer = 0;
  if (!nightOn()) {
    if (nightHost?.isConnected) {
      for (const el of [warmEl, dimEl, ...sides]) el.style.opacity = 0;
      nightGone = setTimeout(() => nightHost.remove(), 600); // after the fade; pages stay untouched when off
    }
    return;
  }
  if (!nightHost) nightLayers();
  if (!nightHost.isConnected) {
    document.documentElement.append(nightHost);
    if (!early) dimEl.offsetWidth; // style the zero opacity first so it fades in
  }
  dimEl.style.opacity = s.dim;
  warmEl.style.opacity = s.warm * WARM;
  if (s.focus) nightTimer = setInterval(focus, 1000); // readers lazy-load, so the column can move
  focus(true);
}

function focus(fresh) {
  // the text scan walks the whole page, so only redo it once you've scrolled a third of a screen
  const y = (target || document.scrollingElement).scrollTop;
  if (s.focus && (fresh === true || colAt === null || Math.abs(y - colAt) > innerHeight / 3)) {
    col = column() || col; // keep the last column through gaps and chapter ends
    colAt = y;
  }
  const [l, r] = sides;
  if (!s.focus || !col) return (l.style.opacity = r.style.opacity = 0);
  const appear = !(l.style.opacity > 0);
  if (appear) l.style.transition = r.style.transition = 'none'; // appear in place instead of sliding in
  // full-screen layers slid aside (transform, not width/left: no relayout while they move)
  l.style.transform = `translateX(${Math.max(0, col.l - PAD) - innerWidth}px)`;
  r.style.transform = `translateX(${Math.min(innerWidth, col.r + PAD)}px)`;
  if (appear) { l.offsetWidth; l.style.transition = r.style.transition = ''; }
  l.style.opacity = r.style.opacity = FOCUS;
}

// The reading column: big images and canvases, and wordy text, near the viewport, grouped by where they sit
// horizontally. The heaviest group wins, so sidebars, side ads and nav lose to the strip or the article.
function column() {
  const vh = innerHeight, items = [];
  const add = (el, big) => {
    const r = el.getBoundingClientRect();
    const h = Math.min(r.bottom, 2 * vh) - Math.max(r.top, -vh);
    if (h > 0 && r.right > 0 && r.left < innerWidth && (!big || (r.width >= 300 && r.height >= 300)))
      items.push({ l: r.left, r: r.right, w: r.width * h });
  };
  for (const el of document.querySelectorAll('img, canvas, video')) add(el, true);
  const chars = new Map();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = walk.nextNode());) chars.set(t.parentElement, (chars.get(t.parentElement) || 0) + t.data.trim().length);
  for (const [el, n] of chars) if (n >= 150) add(el); // a paragraph, not a link or a label
  items.sort((a, b) => b.w - a.w);
  const groups = [];
  for (const it of items) {
    const c = (it.l + it.r) / 2, g = groups.find((g) => c > g.l && c < g.r);
    if (!g) groups.push({ ...it });
    else if (it.r - it.l <= (g.r - g.l) * 1.5) { // a full-width footer centred on the column must not widen it
      g.w += it.w; g.l = Math.min(g.l, it.l); g.r = Math.max(g.r, it.r);
    }
  }
  return groups.sort((a, b) => b.w - a.w)[0] || null;
}

bus.addEventListener('stop', () => { early = false; });
for (const e of ['start', 'stop', 'settings']) bus.addEventListener(e, night);
addEventListener('resize', () => nightTimer && focus(true));
chrome.runtime.onMessage.addListener((msg) => {
  if (msg !== 'preview' || window !== window.top) return;
  previewUntil = performance.now() + 1500;
  night();
  clearTimeout(night.preview);
  night.preview = setTimeout(night, 1600); // fade back out unless scrolling
});
night(); // settings may already be in (the test harness loads scripts one by one)
