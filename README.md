<p align="center">
  <img src="extension/icons/icon128.png" width="96" alt="Scroller icon">
</p>

<h1 align="center">Scroller</h1>

<p align="center">
  Hands-free auto-scroll for reading manga, webtoons and long pages.<br>
  Press one key, sit back, read top to bottom at exactly the speed you want.
</p>

<p align="center">
  <img src="docs/read.png" width="320" alt="Scroller's Read tab: a big speed readout, slider, six presets from Too damn slow to Too damn fast, end-of-chapter options and a shortcut strip, on a pure black popup">
</p>

<table align="center">
  <tr>
    <td><img src="docs/feel.png" width="240" alt="Feel tab: glide or jumps, direction, pause when I scroll, status on page"></td>
    <td><img src="docs/keys.png" width="240" alt="Keys tab: start/stop, hold to pause, faster and slower, each remappable"></td>
    <td><img src="docs/sites.png" width="240" alt="Sites tab: every site with its saved speed and a button to forget it"></td>
  </tr>
  <tr>
    <td align="center"><b>Feel</b></td>
    <td align="center"><b>Keys</b></td>
    <td align="center"><b>Sites</b></td>
  </tr>
</table>

## Features

- **A popup that stays out of the way.** Pure black for night reading, four tabs (Read, Feel, Keys, Sites) that each fit without scrolling, and red reserved for one thing: scrolling right now.

- **One key to start and stop.** Defaults to `S`; change it to any key you like.
- **Any speed, 1 to 5000 px/s.** A logarithmic slider gives the slow end as much room as the fast end. Type an exact number, or pick a preset from *Too damn slow* to *Too damn fast*.
- **Remembers speed per site.** Every reader sizes its pages differently, so each site keeps its own speed. New sites start from the last speed you used. The **Sites** tab lists every site's speed; forget any of them (with undo).
- **Favorite sites.** Star the readers you love, from the site chip in the popup or the Sites tab. Favorites are pinned to the top and open in one click. Nothing is starred until you star it.
- **Hold to pause.** Hold `Shift` to freeze on a dense panel; let go and it carries on.
- **Next chapter, automatically.** At the end of a chapter Scroller can find the reader's *Next* button and keep going on the next one. A whole series, hands-free.
- **Adjust while reading.** `]` speeds up, `[` slows down. Pick how big each tap is on the Keys tab: 10%, 25%, 50% or 2×.
- **Glide or page jumps.** Scroll continuously, or jump ½, ¾ or a full screen at a time.
- **Up or down.**
- **Gentle starts and stops.** Eases in and out instead of lurching.
- **Pauses when you scroll yourself**, then eases back in after two seconds.
- **Status at a glance.** A red **ON** badge on the toolbar icon, plus an optional pill on the page showing the speed.
- **Works on tricky readers.** Handles sites that use CSS smooth scrolling and readers that scroll an inner panel instead of the page.

## Install

Scroller isn't in the Chrome Web Store or on Firefox Add-ons yet, so you load it yourself. It takes 30 seconds. Grab the package for your browser from the [latest release](https://github.com/ShayanHussainSB/scroller/releases/latest).

### Chrome, Edge, Brave, Arc, Opera, Vivaldi

1. Download **`scroller-x.y.z-chrome.zip`** and unzip it.
2. Open `chrome://extensions` (or your browser's extensions page).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.
5. Pin Scroller from the puzzle-piece menu so the icon is one click away.

**Updating:** replace the folder with the new release, click the reload arrow on Scroller's card in `chrome://extensions`, then reload your reader tabs. Your settings are kept.

### Firefox (140 or newer)

1. Download **`scroller-x.y.z-firefox.zip`**. No need to unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and pick the zip.
4. Pin Scroller from the puzzle-piece (Extensions) menu.

Firefox only keeps add-ons that Mozilla hasn't signed until it restarts, so after a restart, load it again the same way. Signed Firefox builds are planned.

### Either browser

Tabs that were already open need a reload before Scroller can run in them. [Watch releases](https://github.com/ShayanHussainSB/scroller/subscription) to hear about new versions.

**From source:** `git clone https://github.com/ShayanHussainSB/scroller.git`. In Chrome, load the **`extension`** folder as above. For Firefox, run `node .github/scripts/build.mjs` and load `dist/scroller-x.y.z-firefox.zip`.

## Usage

| Action | Default | Notes |
| --- | --- | --- |
| Start / stop | `S` | Or click **Start** in the popup |
| Hold to pause | `Shift` | Resumes when you let go |
| Faster | `]` | +25% per press by default (Keys → *Step*), saved for this site |
| Slower | `[` | Undoes one faster press, saved for this site |
| Set an exact speed | | Drag the slider, type a number, or click a preset |
| Remap a key | | Click it in the popup, press the new key (`Esc` cancels) |
| See or forget saved sites | | **Sites** tab; × forgets a site, **Undo** brings it back |
| Reset keys | | **Keys** tab → *Restore default keys* |
| Favorite a site | | Click the star on the site chip, or next to any site in the **Sites** tab |

Keys are ignored while you're typing in a text box. Start, faster and slower never fire with `Ctrl`, `Cmd` or `Alt` held, so they won't clash with browser shortcuts. The hold key may be a modifier (`Shift`, `Ctrl`, `Alt`, `Cmd`) and still passes through to the page, so `Shift`+click keeps working.

### At the end of a page

| Option | What happens |
| --- | --- |
| **Stop** | Scrolling stops at the bottom. |
| **Wait** | Keeps going if more pages load in. Good for infinite-scroll readers. |
| **Next chapter** | Finds the reader's next-chapter link or button, opens it, and keeps scrolling. |

**How Next chapter finds the button.** It scores every visible link and button on its text, label, class names and `rel="next"`. Wording like "chapter" and arrow icons count in its favor. Anything that says *prev*, *back* or *comments* is skipped. If it can't find one, or clicking it doesn't move the page on, Scroller stops rather than looping. It works with readers that load a new page and with readers that swap chapters in place. Two limits: auto-resume can't cross to a different website, and it only applies when scrolling down.

### Speed guide

| Preset | px/s | Feels like |
| --- | --- | --- |
| Too damn slow | 2 | Barely moving, for dense panels |
| Slow | 12 | Relaxed reading |
| Reading | 40 | Comfortable default for most manga |
| Brisk | 120 | Light dialogue, action scenes |
| Fast | 500 | Skimming |
| Too damn fast | 3000 | Flying through to find your place |

## Privacy and permissions

No accounts, no tracking, no analytics, no network requests. Settings, including your per-site speeds, stay in your browser's local extension storage. You can review, star and forget saved sites anytime in the popup's **Sites** tab; removing the extension deletes everything.

| Permission | Why |
| --- | --- |
| `storage` | Saves your settings and per-site speeds locally. |
| Runs on all sites | Scroller has to listen for your start key on whatever page you're reading. It does nothing until you press it. |

## Troubleshooting

- **Nothing happens when I press the key.** Open the popup: if it says *Can't reach this page*, click **Reload tab**. Pages opened before installing or updating don't have Scroller yet. Browser pages like `chrome://` and the Chrome Web Store don't allow extensions at all.
- **Next chapter picked the wrong button, or none.** Every site is different. Switch *At the end* to **Stop**, and please [open an issue](https://github.com/ShayanHussainSB/scroller/issues/new?template=bug_report.yml) with the reader's address so detection can improve.
- **Firefox: nothing happens on any site.** Firefox lets you choose which sites an add-on can use. Open `about:addons`, click Scroller → **Permissions**, and allow *Access your data for all websites*.
- **Firefox: Scroller disappeared.** Unsigned add-ons are unloaded when Firefox restarts; load the zip again from `about:debugging`.
- **It stops when I touch the trackpad.** That's *Pause when I scroll*; it eases back in after two seconds. Turn it off in the popup if you'd rather it didn't.

## Project structure

```
extension/
├── manifest.json        Extension manifest (MV3), the source of truth for both browsers
├── scripts/
│   ├── defaults.js      Shared settings, limits and presets
│   ├── content.js       The scroller that runs on each page
│   └── background.js    Toolbar icon badge
├── popup/
│   ├── popup.html       Settings popup (markup + styles)
│   └── popup.js         Popup behavior
├── fonts/               Bricolage Grotesque (SIL OFL 1.1)
└── icons/               Toolbar and store icons
docs/                    README assets
.github/                 Checks, build, release workflow, issue and PR templates
```

No dependencies. For Chrome there's no build step: edit a file, hit reload on `chrome://extensions`, done. `node .github/scripts/build.mjs` packages both browsers into `dist/`. The Firefox manifest is generated from the Chrome one, adding a background-scripts entry, an add-on ID and the all-sites permission Firefox asks for.

## Contributing

Issues and pull requests are welcome. Please keep it dependency-free and small, and test on at least one real reader site before opening a PR. See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

`main` is protected: changes land through pull requests, and the **Check** workflow must pass. Run it locally first:

```sh
node .github/scripts/check.mjs
```

It verifies the manifest, that every file it references exists, that all scripts parse, and that the version has a changelog entry.

### Releasing

Releases publish themselves when a version bump is merged. There's no tagging step.

1. In your PR, bump `version` in `extension/manifest.json` ([semver](https://semver.org/): fixes → patch, features → minor).
2. Add a section to the top of `CHANGELOG.md`:
   ```md
   ## [1.3.0] - YYYY-MM-DD

   One or two sentences on what this release means for readers. This becomes the release's opening paragraph.

   ### Added
   - …
   ```
   and a compare link at the bottom: `[1.3.0]: https://github.com/ShayanHussainSB/scroller/compare/v1.2.0...v1.3.0`.
3. Merge. The **Release** workflow sees a version on `main` that has no release yet, then:
   - builds `scroller-1.3.0-chrome.zip` and `scroller-1.3.0-firefox.zip`
   - tags `v1.3.0`
   - publishes the release, with the summary, a screenshot, what's new, install steps and a full-changelog link

Merges that don't bump the version don't release anything. Preview the notes anytime with `node .github/scripts/release-notes.mjs`. If a release ever needs re-running, use **Actions → Release → Run workflow**.

## License

[MIT](LICENSE). The bundled Bricolage Grotesque font is licensed separately under the [SIL Open Font License 1.1](extension/fonts/OFL.txt).
