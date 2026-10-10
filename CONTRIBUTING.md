# Contributing to Scroller

Thanks for helping make hands-free reading better. Bug reports, reader sites where *Next chapter* misses, ideas and pull requests are all welcome.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). For security issues, see [SECURITY.md](SECURITY.md) instead of opening an issue.

## Reporting a bug

Use the [bug report form](https://github.com/ShayanHussainSB/scroller/issues/new?template=bug_report.yml). The most useful details are:

- the reader site (leave out anything private)
- your *At the end* and motion settings
- browser and Scroller version (shown on Scroller's card in `chrome://extensions` or `about:addons`)

## Development setup

You need a Chromium browser and/or Firefox 140+, and Node.js 20+ for the checks and packaging. There are **no dependencies** to install.

```sh
git clone https://github.com/ShayanHussainSB/scroller.git
cd scroller
```

**Chrome and Chromium browsers:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the `extension/` folder. After editing, click the reload arrow on Scroller's card and refresh the page you're testing.

**Firefox:** run `npm run build`, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…** and pick `dist/scroller-<version>-firefox.zip`. Rebuild and click **Reload** after editing.

## Project layout

```
extension/               Everything the browser loads
├── manifest.json        MV3 manifest: the source of truth (Firefox's is derived from it)
├── scripts/
│   ├── defaults.js      Settings, limits and presets shared by page and popup
│   ├── content.js       The core scroller on each page, its pill, and the hooks features plug into
│   ├── night.js         Dimmer, warm tint and focus mode
│   ├── pages.js         Pages style: snap to each page image
│   ├── wpm.js           Words per minute: text detection and px-per-word measuring
│   ├── session.js       Stop after (sleep timer, chapter limit) and time left in the chapter
│   └── background.js    Toolbar icon badge
├── popup/               Settings popup (popup.html holds markup and styles)
├── fonts/               Bricolage Grotesque (SIL OFL 1.1)
└── icons/
scripts/                 Tooling (Node, no dependencies)
├── check.mjs            npm run check: validates manifests, files, syntax, changelog
├── build.mjs            npm run build: packages dist/*-chrome.zip and *-firefox.zip
└── release-notes.mjs    npm run release-notes: release notes from CHANGELOG.md
test/                    npm test: headless Chrome on fixture pages, no dependencies
├── cdp.mjs              Tiny DevTools-protocol driver (pages and the popup)
├── stub.js              Fake chrome API that loads the content scripts into fixtures
├── fixtures/            Webtoon, manga and novel pages, plus edge cases
├── extension.e2e.mjs    The real extension in real Chrome (run by hand)
└── *.test.mjs           One file per concern: core, controls, chapters, night, pages, wpm, session,
                         popup, integration (popup ↔ page, upgrades, features together), robust, harness
docs/screenshots/        Images used by the README and release notes
.github/                 CI workflows, Dependabot, issue and PR templates
```

## Guidelines

- **Keep it small and dependency-free.** Plain JavaScript, HTML and CSS that the browser loads directly; no bundler, no npm packages.
- **Match the surrounding code**: its naming, comment density and formatting (`.editorconfig` covers the basics).
- **Features plug into the core.** Content scripts share one scope and load in manifest order. A feature listens on `bus` (`start`, `stop`, `tick`, `settings`, `advance`) or wraps a hook from `content.js` (`speed`, `jump`, `canAdvance`, `pillInfo`, `pageState`…) and calls the previous one, so features stack instead of overwriting each other.
- **Both browsers.** Use APIs that exist in Chrome and Firefox (`chrome.*` works in both). Prefix-specific CSS needs its counterpart, in separate rules.
- **Popup:** stays pure black, keeps red for "scrolling right now", and every tab must fit in 600px (Chrome's popup limit).
- **Privacy:** no network requests, analytics or new permissions without a very good reason, called out in the PR.

## Pull requests

1. Branch from `main`.
2. Write commits that each do one thing, with [Conventional Commit](https://www.conventionalcommits.org/) prefixes (`feat:`, `fix:`, `docs:`, `ci:`, `chore:`, `refactor:`).
3. Run `npm run check`, `npm test` and `npm run test:slow` (needs Chrome; set `CHROME=/path/to/chrome` if it isn't found). For changes to the content scripts, `node test/extension.e2e.mjs` also loads the real extension. [docs/TESTING.md](docs/TESTING.md) explains the layers, how to write a test, and the real-site checklist for releases.
4. Test on at least one real reader site, in each browser your change touches.
5. Open the PR and fill in the template, with screenshots for anything visual.

`main` is protected: changes land through pull requests, the **Check** workflow must pass, and review conversations must be resolved. PRs are merged with merge commits so individual commits stay in history.

## Releasing

Merging a version bump publishes the release. There is no tagging step.

1. In your PR, bump `version` in `extension/manifest.json` ([semver](https://semver.org/): fixes → patch, new features → minor).
2. Add a section to the top of `CHANGELOG.md`:

   ```md
   ## [x.y.z] - YYYY-MM-DD

   One or two sentences on what this release means for readers. This becomes the release's opening paragraph.

   ### Added
   - …
   ```

   and a compare link at the bottom: `[x.y.z]: https://github.com/ShayanHussainSB/scroller/compare/vPREVIOUS...vx.y.z`.
3. Preview the notes with `npm run release-notes`.
4. Merge. The **Release** workflow sees a version on `main` with no release yet, builds `scroller-x.y.z-chrome.zip` and `scroller-x.y.z-firefox.zip`, tags `vx.y.z` and publishes the release.

Merges that don't change the version don't release anything. To re-run a release, use **Actions → Release → Run workflow**. Release tags are protected and can't be moved or deleted.
