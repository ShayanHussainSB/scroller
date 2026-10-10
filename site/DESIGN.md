---
name: Scroller
description: The site for a hands-free reading scroller, a manga reader in the extension's own black, ink and one-red world.
colors:
  ground: "#000000"
  surface-1: "#0e0e0e"
  surface-2: "#171717"
  line: "#262626"
  line-2: "#383838"
  ink: "#f5f5f5"
  ink-2: "#a3a3a3"
  outline-gray: "#6b6b6b"
  scroll-red: "#ff4f5a"
  scroll-red-edge: "#c93a44"
  paper: "#f2f1ee"
  paper-shade: "#e2e0da"
  paper-copy: "#444444"
  manga-ink: "#111111"
typography:
  display:
    fontFamily: "Bricolage, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(3.4rem, 8vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.045em"
  wordmark-giant:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(5rem, 21vw, 19rem)"
    fontWeight: 800
    lineHeight: 0.78
    letterSpacing: "-0.06em"
  numeral:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(4.5rem, 10vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
  caption-panel:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 4.8rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 6vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  sfx:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  title-panel:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 2.4rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1.4vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Bricolage, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  label:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
  fine:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  code: "6px"
  tile: "12px"
  frame: "14px"
  panel: "16px"
  key: "18px"
  menu: "20px"
  key-lg: "22px"
  pill: "999px"
  ink-panel: "0px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  section: "clamp(96px, 13vw, 168px)"
  finale-gap: "clamp(120px, 16vw, 200px)"
  block: "56px"
  stack: "40px"
  max: "1240px"
  nav-width: "980px"
  nav-height: "60px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "#ffffff"
    textColor: "{colors.ground}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "52px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-1}"
  button-on-paper:
    backgroundColor: "{colors.manga-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "52px"
  nav-pill:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "{spacing.nav-height}"
    width: "min(calc(100% - 24px), 980px)"
  nav-marker:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  nav-get:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  keycap:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    size: "92px"
  keycap-running:
    backgroundColor: "{colors.scroll-red}"
    textColor: "{colors.ground}"
  keycap-cluster:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key-lg}"
  ink-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.manga-ink}"
    rounded: "{rounded.ink-panel}"
    padding: "clamp(24px, 3vw, 38px)"
  preset-tile:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    height: "58px"
  preset-tile-selected:
    backgroundColor: "{colors.surface-2}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 14px 0 16px"
  segmented-choice:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.tile}"
  segmented-choice-selected:
    backgroundColor: "{colors.line-2}"
    textColor: "{colors.ink}"
  panel:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px 22px 18px"
  browser-frame:
    backgroundColor: "#0b0b0b"
    rounded: "{rounded.frame}"
---

# Design System: Scroller

## Overview

**Creative North Star: "The Reader at 2 a.m."**

The site is a manga reader you hand to Scroller. It lives in the extension's own world: a pure black room, white ink, gray for everything secondary, and one red that only ever means the page is moving right now. Press S and the page scrolls itself with the real pill, while every feature runs inside a dark reader frame holding a lit paper page of original manga art.

The redesign leans harder into manga vocabulary without leaving the dark room. A wall of webtoon strips drifts behind the hero under a black scrim. Headlines slam in over a focus-line burst, with SFX lettering drawn outlined, and a heavy paper-filled SHHHK! whose letters grow as they go. An SFX marquee rules off the hero. Paper appears as square manga panels with a 3px ink border for the privacy captions and the install steps. The keys sit in a real keycap cluster that flashes impact lines when pressed. The popup gallery is fanned like volumes on a nightstand, and the page ends on a last manga panel, "To be continued", and a colophon footer under a giant outlined wordmark.

Density is calm: huge tightly tracked Bricolage headlines, short gray ledes, wide section gaps, demos given most of the width. Depth is tonal, with soft black shade only under floating things. Mock-UI replicas (reader pill, popup, browser chrome) copy the extension exactly and keep their own small scale.

**Key Characteristics:**
- Pure black ground, ink-white primary actions, no brand-color fills.
- Red is a state, not a brand color: it appears only while something scrolls.
- One family, Bricolage Grotesque 400 to 800, tabular numerals everywhere.
- Paper appears only as manga material: pages inside reader frames, and square ink-bordered panels.
- Texture is manga-native: screentone dots, speed lines, focus-line bursts, outlined SFX lettering.

## Colors

A near-monochrome dark palette, a paper-and-ink pair for manga material, and one state color.

### Primary
- **Scroll Red** (scroll-red): the running state and nothing else. The nav's progress hairline and speed lines, the S keycaps when pressed, the wordmark periods and the giant footer wordmark's period, the pill's pulsing dot, the popup's Stop button, the active bedtime step, the zoom lines past Fast. At rest it is absent.
- **Red Key Edge** (scroll-red-edge): the side border of a red keycap, so the pressed key keeps its depth.

### Neutral
- **Ground Black** (ground): page, nav pill, popup mock, panels, finale caption box.
- **Surface One** (surface-1): resting tiles, ghost button and chip hover.
- **Surface Two** (surface-2): nav chapter marker, selected tiles, segmented tray, kbd chips, keycap faces (as a #1f1f1f to #121212 gradient).
- **Hairline** (line): section and marquee rules, list rules, inner frame borders, slider track.
- **Hairline Strong** (line-2): outer borders of the nav, frames, panels, chips, ghost buttons, keycaps; scrollbar thumb.
- **Ink** (ink): text, primary fill, slider, selected outlines, focus ring, nav progress at rest, SFX outlines.
- **Ink Gray** (ink-2): ledes, captions, nav links at rest, footer text.
- **Outline Gray** (outline-gray): the dim stroke on hollow marquee words; the giant wordmark strokes a touch lighter (#7a7a7a).

### Paper and Ink
- **Paper** (paper): manga pages inside reader frames, ink panels, the finale panel.
- **Manga Ink** (manga-ink): line art, the 3px panel border, text and buttons on paper, step numerals.
- **Paper Shade** (paper-shade): code and kbd chips on paper.
- **Paper Copy** (paper-copy): secondary text on paper.

### Named Rules
**The One Red Rule.** Red means "scrolling right now". If nothing on screen is moving, nothing is red. Never a resting button, link, highlight or error.

**The Ink Action Rule.** The primary action is an ink pill with black text on black, and a manga-ink pill with paper text on paper. Emphasis comes from contrast, never hue.

**The Paper Is Manga Rule.** Paper is always manga material: a page in a reader frame or a square panel with a 3px ink border. The page ground, nav and footer are always black.

## Typography

**Display Font:** Bricolage Grotesque, bundled as `Bricolage` (with system-ui, -apple-system, Segoe UI)
**Body Font:** the same family
**Reader content (inside frames only):** Georgia serif for the mock novel page

**Character:** One grotesque doing everything. Display at 800 with tight negative tracking is loud and cheeky; body at 400 stays soft on black. Lettering doubles as manga SFX: hollow outlines and heavy stroked letters.

### Hierarchy
- **Wordmark Giant** (800, up to 19rem, 0.78, -0.06em): the footer's outlined "Scroller." only.
- **Display** (800, up to 6rem, 0.9, -0.045em): the hero headline in stacked lines; the finale headline uses the same voice at up to 6rem, 0.92.
- **Numeral** (800, up to 6rem, 0.85, tabular): live readouts, speed and the bedtime clock.
- **Caption Panel** (800, up to 4.8rem, 1): the privacy statements set inside ink panels.
- **Headline** (800, up to 4.75rem, 0.98): one per section, short, ending in a period.
- **SFX** (800, up to 4rem, 1): marquee words; the hero SHHHK! runs slightly larger (up to 4.6rem) with letters growing from 0.62em to 1.28em.
- **Title Panel** (800, up to 2.4rem): install panel titles.
- **Title** (800, 1.35rem, 1.15): card titles. Figure captions use 18 to 20px bold at -0.02em; FAQ questions 700 at up to 1.45rem.
- **Lede** (400, up to 1.2rem; 1.3rem in the hero): gray, max 30 to 34em, bold ink for key facts.
- **Body** (400, 17px, 1.55; 16px under 560px): answers and notes, max about 40 to 46em.
- **Label** (600, 15px): nav links, notes, preset names; 14px for descriptions.
- **Fine** (13px): colophon, legal line, demo notes.

### Named Rules
**The Tight Display Rule.** Every heading is 800 with negative tracking (-0.02em to -0.06em, tighter as it grows) and balanced wrapping.

**The Outlined SFX Rule.** One emphasized word per big headline may be drawn hollow: transparent fill, ink stroke (2px, 3px at display size). Only the hero SHHHK! is solid: paper-white fill, 7px black stroke, ink outline, skewed and rotated.

**The Tabular Rule.** Numerals are tabular site-wide so live counters never jitter.

**The Sentence Case Rule.** Headings and chrome are sentence case with no eyebrow labels above headings. Uppercase belongs to SFX lettering, the drawn art, mock reader pages and the nav's chapter numbers.

## Layout

A centered column, max 1240px, with a 16 to 48px fluid gutter. Sections open with a 96 to 168px fluid gap; the finale sits 120 to 200px down behind a hairline. Grids open 56px under their headline (64px for the gallery), readouts 40px.

Sections vary how they open: left copy beside a frame (speed, bedtime), frame first on a 1.15 to 0.85 split (night), centered headline over a row (pages, popup), and full-width left headline over a big set piece (keys, privacy, install, FAQ). The speed headline arrives with a scroll-linked streak of speed lines.

The nav is a fixed pill, 60px tall, up to 980px wide, 14px from the top; it shrinks slightly once scrolled. The hero fills the first viewport (up to 940px) in a 1.08 to 0.92 split over a six-column strip wall. The keys are a five-column cluster with Shift spanning two. The gallery is five fanned columns.

At 1080px chapter numbers hide. At 900px the chapters fold into a popover menu, splits stack with the demo first, the wall drops to three columns, the popup mock hides, the keys go to three columns, and pages and gallery become edge-to-edge scroll-snap carousels. At 560px body drops to 16px, the nav to 56px, and CTA buttons go full width. Demo viewports size with svh clamps.

## Elevation & Depth

Depth is tonal: black ground, surface-1 at rest, surface-2 selected, hairlines between. Shadows sit only under floating things and are always black, large and soft, reading as shade in a dark room. Ink panels pair a hard 3px inset ink border with the same soft shade.

### Shadow Vocabulary
- **Nav** (`box-shadow: 0 18px 40px -18px #000, 0 1px 0 #ffffff0d inset`): the floating pill nav.
- **Frame** (`box-shadow: 0 40px 80px -40px #000`): reader browser frames.
- **Float** (`box-shadow: 0 30px 60px -30px #000`): settings panel and install panels; gallery shots use `0 30px 50px -30px #000`.
- **Ink panel** (`box-shadow: inset 0 0 0 3px #111, 0 20px 40px -24px #000`): privacy captions; install panels carry the same inset with the float shade.
- **Keycap** (`box-shadow: 0 14px 30px -10px #000, inset 0 1px 0 #ffffff14`): keycaps, with a heavy bottom border as the key's side.
- **Popup** (`box-shadow: 0 30px 70px -10px #000, 0 10px 24px #000c`): the popup mock.
- **Pill** (`box-shadow: 0 8px 24px #0009, 0 1px 2px #000`): the reader pill.

### Named Rules
**The Dark Room Rule.** Shadows are black and diffuse. No colored glows, no hard offset shadows. The 3px ink border is a drawn panel line, not a shadow.

## Shapes

Two form languages. Site chrome is round and soft: every action, chip, the nav and its marker are full pills (999px), and containers step up with size: 6px code and focus ring, 12px tiles and trays, 14px frames and screenshots, 16px panels, 18px keycaps, 20px the chapter menu, 22px the large keys. Manga material is square: ink panels, the finale panel and the "To be continued" box have 0px corners, 2 to 3px ink borders and a slight tilt (0.5 to 2 degrees). Hairlines are 1px, buttons and keys 1.5px; keycaps carry a heavy bottom edge (8px, 10px in the cluster, 4px on the nav key) that compresses on press. Focus-line bursts are radial line fields masked to fade from the center.

## Components

### Buttons
- **Shape:** full pill, 52px tall, 1.5px border, 700 at 17px, optional 18px stroke icon.
- **Primary:** ink fill, black text; hover pure white; press scales to 0.97.
- **Ghost:** transparent with a line-2 border; hover lifts the border to ink-2 over surface-1.
- **On paper:** manga-ink fill with paper text inside ink panels.

### Pill Nav (signature)
The reader pill scaled up into a table of contents: black pill with a line-2 border, logo and wordmark, chapter links (15px 600, gray, ink when current, with small "CH.n" numbers), the nav S key, and an ink "Get it" pill. A surface-2 marker with a line-2 inset ring slides under the current chapter. A 2px progress hairline runs along the bottom edge, ink at rest and red only while the page scrolls itself, when red speed lines also stream through the pill. Under 900px the chapters fold into a button that opens a black 20px-radius popover menu.

### Hero Wall and Lettering (signature)
Six columns of the manga strip drift upward at different speeds at 42% opacity under a screentone and a black scrim. Behind the headline a focus-line burst lands with a scale-and-rotate settle. Lines slam up with a slight overshoot, one word hollow, the period red while running. SHHHK! sits above it as the one solid SFX.

### SFX Marquee
A full-bleed band between hairlines: SFX words in English and Japanese at up to 4rem, alternating hollow (outline-gray stroke) and solid ink, separated by small rotated line-2 diamonds, looping left over 50s. Paused when off screen.

### Keycap (signature)
A real key: surface gradient, line-2 border, heavy bottom edge, 800 letter. Pressing drops it and thins the edge. The hero S key pulses ink callout rings until pressed; running, every S key fills red with black text and a pulsing black dot. In the keys cluster, keys are square with a label inside, and each press flashes a ring of ink impact lines behind the key.

### Ink Panel (signature)
Paper with a 3px manga-ink inset border, square, tilted slightly, with soft shade. Privacy uses it as staggered caption boxes, each wiped in left to right as it scrolls into view. Install uses it as two tall panels with a screentone corner, ink circle step numbers, paper-shade code chips and an ink button pinned to the bottom.

### Fanned Gallery
Five popup screenshots at 14px radius, fanned from -5 to 5 degrees and dropped at the ends. Hover straightens and lifts one; on scroll they deal in from below. Flat on small screens.

### Finale and Colophon Footer
The last section is a manga last page: screentone fading down, a second burst, the "One more chapter?" headline, an S key that restarts the page, and a tilted ink-bordered strip panel with a black "To be continued" box. The footer carries a colophon card (fine type in a line-2 box), three link columns, and a giant hollow "Scroller." whose period strokes ink, and fills red while the page runs.

### Chips, Tiles and Inputs
- **Unit toggle:** 44px pill outline in line-2, ink-2 text, ink on hover.
- **Preset tile:** surface-1, hairline border, 12px radius; selected gets an ink border on surface-2.
- **Slider:** 4px hairline track with ink fill, 24px ink thumb ringed in black; focus adds an ink outer ring.
- **Segmented choice:** surface-2 tray, selected segment line-2 with ink text.
- **Switch:** 44 by 26 pill; off line-2 with a gray knob, on ink with a black knob.
- **Focus:** 2px ink outline, 3px offset, everywhere; manga ink on paper.

### Mock-UI Replicas (named exception)
The reader pill, popup mock and browser chrome mirror the extension popup exactly and keep its own small scale: system-ui 12px for the pill, 12 to 13px Bricolage in the popup, 8 to 10px radii, chrome grays (#0b0b0b, #111, #121212, #1c1c1c, #2e2e2e) and an always-red ON badge on the toolbar icon. These values belong to the replicas only; site chrome never borrows them.

## Do's and Don'ts

### Do:
- **Do** show every feature running inside a reader frame rather than describing it.
- **Do** keep primary actions ink pills on black, manga-ink pills on paper.
- **Do** set paper as square panels with a 3px manga-ink border.
- **Do** use the world's own textures: screentone dots (6 to 7px grid), speed lines, focus-line bursts, outlined SFX.
- **Do** let every motion settle to a still, readable state under prefers-reduced-motion, and pause loops off screen.
- **Do** keep mock-UI replicas identical to the extension popup.

### Don't:
- **Don't** show red on anything at rest.
- **Don't** put paper behind the page ground, nav or footer.
- **Don't** add eyebrow labels or uppercase tracked kickers above headings.
- **Don't** use colored, glowing or hard offset shadows.
- **Don't** introduce a second typeface outside reader content and mock UI.
- **Don't** round the corners of an ink panel.
