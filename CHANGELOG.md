# Changelog

All notable changes to Scroller are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-10-08

### Added
- **Sites** tab: every site with a remembered speed, the current site first, each with a button to forget it (and Undo).
- **Favorite sites**: star a site from the status chip or the Sites tab. Favorites are pinned on top and open in one click. Nothing is starred by default.
- **Step** setting on the Keys tab: faster/slower taps change speed by 10%, 25% (default), 50% or 2×.
- **Reload tab** banner when the popup can't reach the page, instead of a disabled button.
- Status line under the header showing whether it's scrolling and which site you're on.
- Speed in human terms: how long one screen takes, plus a line of personality per preset.
- **Restore default keys**, with Undo.
- The Start button shows its key, and a strip on the Read tab lists every shortcut.

### Changed
- Popup redesigned: pure black theme and four tabs (Read, Feel, Keys, Sites) that each fit without scrolling. Red now only means "scrolling right now", with speed lines streaming through the header while it runs.
- *At the end* explains the selected option on screen instead of in a tooltip. Jump size only shows in Jumps mode. "Page jumps" is now "Jumps".
- Larger tap targets, screen-reader labels for the slider and key buttons, and announced status messages.
- The on-page status pill is black to match.

### Fixed
- Faster/slower taps no longer do nothing at very low speeds; each tap moves at least 1 px/s.

## [1.1.0] - 2026-10-08

### Added
- **Next chapter** option under *At the end*: finds the reader's next-chapter control, opens it and keeps scrolling. Works with full page loads and with readers that swap chapters in place.
- **Per-site speed.** Speed is remembered for each website; new sites start from the last speed used. The popup shows which site it's editing.
- **Hold to pause** key, `Shift` by default and remappable. The on-page pill reads "Paused" while it's held.
- **ON badge** on the toolbar icon in tabs where Scroller is running.
- Scrolling eases in and out on start, stop and resume.
- Releases ship a ready-to-load `scroller-x.y.z.zip`.

### Changed
- *At the end* choices are now Stop, Wait and Next chapter, on a full-width row.
- The popup key grid holds four keys.

## [1.0.0] - 2026-10-08

### Added
- First release: one-key start/stop, 1–5000 px/s logarithmic speed with presets, glide or page-jump modes, up/down, stop or wait at the end, pause on manual scroll, on-page status pill, remappable faster/slower keys and a dark popup.

[1.2.0]: https://github.com/ShayanHussainSB/scroller/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ShayanHussainSB/scroller/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ShayanHussainSB/scroller/releases/tag/v1.0.0
