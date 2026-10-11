# Testing Scroller

Scroller guesses a lot about pages it has never seen: where the next-chapter button is, where the chapter ends, whether a page is prose or art, where the reading column sits. The tests are layered so each kind of mistake has one place that catches it.

To run them, see [test/README.md](../test/README.md): requirements, every command, the folder layout and what to do when a test fails.

## Layers

| Layer | Command | What it proves |
| --- | --- | --- |
| Manifest and changelog | `npm run check` | Every referenced file exists, the Firefox manifest derives cleanly, scripts parse, the release notes build |
| Feature tests | `npm test` (`test/suite/`) | Each content script on realistic fixture pages (webtoon strip, paged manga with ads, novel with a sidebar, inner scroll boxes, lazy images, CJK), driven by real key presses in headless Chrome |
| Popup tests | `npm test` (`popup.test.mjs`) | The real popup with a fake extension API: every control, every tab fits in 600px, every line of copy fits, keyboard use, accessible names |
| Contract and integration | `npm test` (`integration.test.mjs`) | The popup rendering the *real* page state, settings saved by 1.2.1, and features stacked together |
| Slow machines | `npm run test:slow` | The whole suite with the CPU four times slower: timing bugs that only show on CI or old laptops |
| Performance budgets | `npm test` (`robust.test.mjs`) | A 3000-paragraph chapter: no measurement and no frame over 150ms |
| Real extension | `npm run test:e2e` | The unpacked extension in real Chrome: content scripts, background badge, storage, a real next-chapter navigation |
| Real sites | by hand, below | The heuristics against the sites people actually read |

Every test fails if a page or the popup throws an uncaught error, and a failing test can never hang the run: runs force-exit and every Chrome the harness started is killed (`harness.test.mjs` checks both).

## Writing a test

- Open a fixture with the settings you need: `await b.open('manga.html', { mode: 'pages', pxs: 4000 })`. Any content-script global can be read with `p.eval()`.
- Wait for conditions, not time: `await p.until('!on', 4000)`. Use `sleep` only when time passing is the point (measuring a rate, waiting out the 2s manual-scroll pause), and say so in a comment.
- Use real input: `p.key('s')`, `p.key('Shift', 'down')`, `p.wheel(200)`, `p.key('s', 'press', 2)` for Ctrl+S.
- A test that fails only under `test:slow` has found a timing bug. Fix the code, not the timeout.
- A new test file goes in `test/suite/` as `<concern>.test.mjs` and imports `browser` from `../harness/cdp.mjs`; `npm test` picks it up.
- A new fixture goes in `test/fixtures/` and ends with `<script src="../harness/stub.js"></script>`. Fixtures can take a query string: `b.open('chapters.html?v=bem')`.
- Make sure a test can fail. A test that passed first time pins existing behavior; break the code it guards on purpose (delete the guard, flip the condition) and watch the test go red before trusting it. Several tests in this suite were rewritten because a deliberate bug slipped past them.
- Flaky key tests? The harness already turns off Chrome's habit of holding page tasks after a key press until the next frame (`--disable-features=DeferRendererTasksAfterInput`); headless draws no frames when nothing moves, so without it callbacks could wait forever.

## Before each release: real sites

Run `npm run build` and load the packages from `dist/` in Chrome (unzipped) and in Firefox when the release touches it and run through this on one site from each row. Note the site and the result in the PR.

| Kind | Example sites | Check |
| --- | --- | --- |
| Webtoon strip | webtoons.com, tapas.io | Glide at 40 px/s; time left ignores comments; Focus lights only the strip; Next chapter opens and resumes |
| Paged manga | mangadex.org, a reader with a page-by-page strip | Pages style lands on page tops below the site header; ads are never snapped to |
| Inner-scroll reader | any reader whose page scrolls inside a box | Start/stop, Pages and time left work inside the box |
| Web novel | royalroad.com, a novel site | Shows wpm by itself; 250 wpm feels like normal reading; `]` steps wpm; Focus lights the text column |
| CJK novel | a Chinese or Japanese novel site | wpm pace feels comparable |
| Long article | a long Wikipedia article | No stutter while scrolling with Focus on |
| Night | any of the above | Dim and Warmth preview while dragging; filter fades in on start and out on stop; *Always* survives a reload |
| Bedtime | any series | Stop after 15m ends the run with a goodnight; a chapter limit stops at the right chapter across page loads |

Firefox: also confirm the add-on has *Access your data for all websites* (about:addons → Scroller → Permissions).
