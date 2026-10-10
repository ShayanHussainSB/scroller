# Running the tests

Scroller's tests drive a real headless Chrome over the DevTools protocol. There is nothing to install: no npm packages, no test framework beyond Node's built-in `node:test`.

## What you need

- **Node.js 22 or newer** (the harness uses Node's built-in `WebSocket`).
- **Google Chrome or Chromium.** Found automatically at the usual macOS and Linux paths. Anywhere else, point to it with `CHROME`:

  ```sh
  CHROME="/path/to/chrome" npm test
  ```

- **macOS or Linux.** One harness test checks for leftover Chrome processes with `ps`.

## Commands

Run from the repository root.

| Command | What it runs | Time |
| --- | --- | --- |
| `npm run check` | Manifests (Chrome and the derived Firefox one), referenced files, script syntax, changelog and release notes. No browser. | 1s |
| `npm test` | Every file in `test/suite/` in headless Chrome. | ~40s |
| `npm run test:slow` | The same suite with the CPU four times slower. Timing bugs show up here. | ~1 min |
| `npm run test:e2e` | The real unpacked extension in real Chrome (see below). | ~25s |

Run a single file, or a single test by name:

```sh
node --test test/suite/night.test.mjs
node --test --test-name-pattern="focus" test/suite/night.test.mjs
TEST_THROTTLE=4 node --test test/suite/pages.test.mjs   # one file on a slow CPU
```

CI runs `npm run check`, `npm test` and `npm run test:slow` on every pull request. The e2e run is by hand.

## Layout

```
test/
├── harness/
│   ├── cdp.mjs        Headless-Chrome driver: open a fixture or the popup, eval, keys, wheel, resize, throttle, screenshots
│   ├── stub.js        Fake chrome API; loads the content scripts into a fixture page in manifest order
│   └── leak.mjs       A deliberately failing test, used by harness.test.mjs to prove a failure can't hang the run
├── suite/             npm test runs every *.test.mjs here
│   ├── core           Start/stop, glide, jumps, the hooks features plug into
│   ├── controls       Keys, hold to pause, faster/slower, manual scrolling, easing, direction, pill
│   ├── chapters       At the end: stop, wait, next chapter across many reader layouts
│   ├── night          Dim, warmth, focus mode
│   ├── pages          Pages style: page tops, sticky headers, tall pages, inner scroll boxes
│   ├── wpm            Text detection, px per word, wpm ⇄ px/s, CJK
│   ├── session        Sleep timer, chapter limit, time left
│   ├── popup          The real popup with a fake extension API: every control, every tab fits in 600px
│   ├── integration    Popup ↔ page contract, settings from older versions, features stacked together
│   ├── robust         Short pages, resizing, zoom, huge chapters and their time budgets
│   └── harness        The harness itself
├── fixtures/          Reader pages: webtoon strip, paged manga with ads, web novel, chapters, CJK, edge cases
│   └── common.js      Builds fixture art and prose (sized SVG images, deterministic text)
└── e2e/
    └── extension.e2e.mjs   The real extension in real Chrome
```

## The real-extension run

```sh
npm run test:e2e
```

Loads `extension/` into a fresh Chrome profile through the DevTools pipe (`Extensions.loadUnpacked`; branded Chrome ignores `--load-extension`) and checks scrolling, words per minute, Pages, the toolbar badge, and a real next-chapter page load with Night on. Fixture pages are served over local http without the stub, so the extension injects its own content scripts. It needs a desktop Chrome build, which is why CI doesn't run it.

## When a test fails

- The failure message names what it waited for (`timed out waiting for: …`) or the assertion that broke. Any uncaught error on a fixture page or in the popup also fails the test, with the error text.
- Fails only under `test:slow`? It has found a timing bug. Fix the code, not the timeout.
- `Chrome not found`: set `CHROME` as above.
- To see a page, add `await p.shot('/tmp/page.png')` (or `{ full: true }` for the whole page) before the failing line.

Writing tests, the layers they cover, and the real-site checklist before a release are in [docs/TESTING.md](../docs/TESTING.md).
