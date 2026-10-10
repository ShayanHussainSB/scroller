// Words per minute for text pages. Tell novels from comics, measure px per word from the page's own layout
// (so font size, line height, column width and zoom all count), and convert wpm to px/s for the core.

// CJK has no spaces, so count characters. Matched-skill readers do ~228 English wpm vs ~255 Chinese and ~357
// Japanese characters per minute (IReST, Trauzettel-Klosinski 2012), so 1.5 characters ≈ 1 word keeps
// "250 wpm" an equally comfortable pace in either script. Korean uses spaces and is split like Latin.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const CJK_PER_WORD = 1.5;
const countWords = (t) => (t.match(CJK)?.length || 0) / CJK_PER_WORD
  + (t.replace(CJK, ' ').match(/\S*[\p{L}\p{N}]\S*/gu)?.length || 0); // bare punctuation is not a word

let kind = 'image', pxPerWord = null, measuredAt = -Infinity;
const wpmNow = () => s.wpmSites[HOST] ?? s.wpm;
// wpm only when the page has text we could measure; otherwise px/s still works
const unit = () => pxPerWord && (s.units[HOST] ?? (kind === 'text' ? 'wpm' : 'px')) === 'wpm' ? 'wpm' : 'px';

// Main text = the blocks sharing the column and font size that hold the most words. That drops headers,
// sidebars, headings and (usually smaller) comments without knowing the site.
function measure() {
  measuredAt = performance.now();
  if (!document.body) return;
  const styles = new Map(), blocks = new Map(), range = document.createRange();
  const style = (el) => styles.get(el) ?? styles.set(el, getComputedStyle(el)).get(el);
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const words = countWords(n.data);
    if (!words) continue;
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (!r.height) continue; // hidden, or script/style
    let el = n.parentElement;
    while (el.parentElement && /^(inline|contents)$/.test(style(el).display)) el = el.parentElement;
    const b = blocks.get(el) ?? blocks.set(el, { el, words: 0, top: r.top, bottom: r.bottom }).get(el);
    b.words += words;
    b.top = Math.min(b.top, r.top);
    b.bottom = Math.max(b.bottom, r.bottom);
  }
  const byKey = new Map();
  for (const b of blocks.values()) {
    const r = b.el.getBoundingClientRect();
    b.width = r.width;
    b.font = parseFloat(style(b.el).fontSize);
    b.key = `${Math.round(r.left)}|${b.font}`;
    byKey.set(b.key, (byKey.get(b.key) || 0) + b.words);
  }
  const key = [...byKey].reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0])[0];
  const main = [...blocks.values()].filter((b) => b.key === key).sort((a, b) => a.top - b.top);
  let words = 0, height = 0, textArea = 0;
  main.forEach((b, i) => {
    words += b.words;
    // text rects skip half the leading and the paragraph margin; count the gap to the next block,
    // but not a heading, image or ad between them
    const gap = Math.max(0, (main[i + 1]?.top ?? b.bottom) - b.bottom);
    height += b.bottom - b.top + Math.min(gap, 3 * b.font);
    textArea += (b.bottom - b.top) * b.width;
  });
  let imageArea = 0;
  for (const m of document.querySelectorAll('img, canvas, video, svg')) {
    const r = m.getBoundingClientRect();
    if (r.width >= 200 && r.height >= 200) imageArea += r.width * r.height; // skip icons and avatars
  }
  pxPerWord = words >= 20 ? height / words : null; // a caption or two is no basis for a reading speed
  kind = pxPerWord && textArea > imageArea ? 'text' : 'image';
}

// Fresh on start, every couple of seconds while running (in-place chapter swaps, zoom), and when asked.
bus.addEventListener('start', measure);
bus.addEventListener('tick', () => on && performance.now() - measuredAt > 2000 && measure());

const wpmSpeed = speed;
speed = () => unit() === 'wpm'
  ? Math.min(MAX, Math.max(MIN, (wpmNow() * pxPerWord) / 60))
  : wpmSpeed();

const wpmLabel = speedLabel;
speedLabel = () => (unit() === 'wpm' ? `${wpmNow()} wpm` : wpmLabel());

const wpmNudge = nudge;
nudge = (up) => {
  if (unit() !== 'wpm') return wpmNudge(up);
  const cur = wpmNow();
  let wpm = Math.round(up ? cur * s.nudge : cur / s.nudge);
  if (wpm === cur) wpm += up ? 1 : -1;
  wpm = Math.min(WPM_MAX, Math.max(WPM_MIN, wpm));
  chrome.storage.local.set({ wpm, wpmSites: { ...s.wpmSites, [HOST]: wpm } });
};

const wpmState = pageState;
pageState = () => { measure(); return { ...wpmState(), kind, unit: unit(), wpm: wpmNow(), pxPerWord }; };
