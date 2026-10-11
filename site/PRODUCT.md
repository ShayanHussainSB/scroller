# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML with inline CSS and JS in `site/index.html`. No build step and no npm dependencies. `npm run site` copies the page, the bundled font, the icons and the popup screenshots into `dist/site/` and stamps the version; GitHub Pages deploys that folder from `main`.

## Users

People who read manga, webtoons, web novels and long articles in a browser, often at night, often lying in bed with a laptop or a desktop across the room, who want the page to move by itself at their reading pace. Most find the site through GitHub, a search, or an AI assistant answering "how do I auto-scroll manga".

## Product Purpose

Scroller is a free, open-source (MIT) browser extension for Chrome, Chromium browsers and Firefox 140+. Press one key and the page scrolls hands-free at exactly the speed you want. Success on the site: a visitor understands this in seconds, sees it work, and installs it from the latest GitHub release.

## Positioning

Not a generic auto-scroller. It is built for reading: words per minute measured from the page's own font and column, a Pages style that lands on each manga page, Night mode (dim, warmth, focus), Stop after for falling asleep, time left in the chapter, and next chapter so a whole series reads hands-free. It runs on your machine with no accounts, no tracking and no network requests.

## Operating Context

- Install is manual: download a zip from the latest release, load it unpacked in Chrome (`chrome://extensions`, Developer mode) or as a temporary add-on in Firefox (`about:debugging`). Not in the Chrome Web Store or on Firefox Add-ons yet.
- Default keys: `S` start/stop, `Shift` hold to pause, `]` faster, `[` slower. All remappable.
- Popup has five tabs: Read, Night, Feel, Keys, Sites.

## Capabilities and Constraints

Everything claimed must match README.md and CHANGELOG.md. Speeds 1–5000 px/s, 50–1500 wpm. Presets: Too damn slow 2, Slow 12, Reading 40, Brisk 120, Fast 500, Too damn fast 3000 px/s; wpm presets Savoring 120, Relaxed 180, Reading 250, Brisk 350, Fast 500, Skimming 800. Stop after 15 min to 1 hour or a chapter count. Next chapter can't cross to another website and only applies scrolling down.

## Brand Commitments

- Name: Scroller (with a trailing period in the wordmark: "Scroller.").
- Pure black ground. Red (#ff4f5a) means one thing only: scrolling right now.
- Bricolage Grotesque (bundled at `extension/fonts/bricolage.woff2`, SIL OFL).
- Manga vocabulary already in the popup: screentone dots, speed lines while running.
- Voice: plain, warm, a little cheeky ("Too damn slow" to "Too damn fast", "says good night").

## Evidence on Hand

- Icons: `extension/icons/` (16–128 px).
- Popup screenshots: `docs/screenshots/` (read, night, feel, keys, sites).
- No testimonials, user counts, ratings, store listings or press. Do not invent any.

## Product Principles

1. Show it working; the motion is the argument.
2. Nothing is claimed that the extension doesn't do.
3. Night-first: calm, dark, easy on eyes at 2 a.m.
4. Private by construction: no accounts, tracking or network calls.

## Accessibility & Inclusion

Works on phones, respects prefers-reduced-motion (all demos settle to a still, readable state), keyboard reachable, WCAG AA contrast on black.
