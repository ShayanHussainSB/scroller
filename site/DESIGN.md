---
name: Scroller
description: The site for a hands-free reading scroller, built in the extension's own black, ink and one-red world.
colors:
  ground: "#000000"
  surface-1: "#0e0e0e"
  surface-2: "#171717"
  line: "#262626"
  line-2: "#383838"
  ink: "#f5f5f5"
  ink-2: "#a3a3a3"
  scroll-red: "#ff4f5a"
  paper: "#f2f1ee"
  manga-ink: "#111111"
typography:
  display:
    fontFamily: "Bricolage, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(3.4rem, 7.6vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.045em"
  numeral:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(4.5rem, 10vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Bricolage, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 6vw, 4.75rem)"
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
rounded:
  sm: "6px"
  md: "12px"
  lg: "14px"
  xl: "16px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  section: "clamp(96px, 13vw, 168px)"
  block: "56px"
  stack: "40px"
  max: "1240px"
  head: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 20px 0 22px"
    height: "48px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "#ffffff"
    textColor: "{colors.ground}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px 0 22px"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-1}"
  button-small:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "38px"
  keycap:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    size: "84px"
  keycap-running:
    backgroundColor: "{colors.scroll-red}"
    textColor: "{colors.ground}"
  preset-tile:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "58px"
  preset-tile-selected:
    backgroundColor: "{colors.surface-2}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 12px 0 14px"
  segmented-choice:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
  segmented-choice-selected:
    backgroundColor: "{colors.line-2}"
    textColor: "{colors.ink}"
  reader-pill:
    backgroundColor: "#000000eb"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 13px 9px 12px"
  browser-frame:
    backgroundColor: "#0b0b0b"
    rounded: "{rounded.lg}"
  panel:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "20px 22px 18px"
---

# Design System: Scroller

## Overview

**Creative North Star: "The Reader at 2 a.m."**

The site lives inside the extension's own world: a pure black room, white ink, gray for everything secondary, and one red that only ever means the page is moving right now. It reads like the popup grown to page size. Every feature is shown inside a dark browser frame holding a lit paper page of original manga art, so the light on screen comes from what you are reading, not from the chrome around it.

Density is calm and generous: huge, tightly tracked Bricolage headlines, short gray ledes, wide section gaps, and live demos given most of the width. Depth is tonal (black, then two near-black steps) with soft black drop shadows only under things that float. Manga vocabulary carries the character: screentone dot fields that fade in from one side, speed lines that stream only while something scrolls, keycaps with heavy bottom edges, and the black pill.

The site shares its tokens with the extension popup (`extension/popup/popup.html`). The popup is the incumbent; the site must not drift from it.

**Key Characteristics:**
- Pure black ground, ink-white primary actions, no brand-color fills.
- Red is a state, not a brand color: it appears only while scrolling.
- One family, Bricolage Grotesque 400 to 800, tabular numerals everywhere.
- Paper-white manga pages live only inside dark reader frames.
- Screentone and speed lines are the only texture.

## Colors

A near-monochrome dark palette with one state color.

### Primary
- **Scroll Red** (scroll-red): the running state and nothing else. The header's speed lines, the wordmark's period and the headline periods, the pressed S keycap, the pill's pulsing dot, the popup's Stop button, the active step in the bedtime log, the zoom lines past Fast. At rest it is absent from the page.

### Neutral
- **Ground Black** (ground): page background, header, popup and panel fill. Never lifted to gray.
- **Surface One** (surface-1): resting tiles, install boxes, ghost button hover.
- **Surface Two** (surface-2): selected tiles, segmented control tray, kbd and code chips.
- **Hairline** (line): section dividers, list rules, inner frame borders, slider track.
- **Hairline Strong** (line-2): outer borders of frames, panels, chips, ghost buttons and keycaps; scrollbar thumb.
- **Ink** (ink): text, primary button fill, slider fill and thumb, selected outlines, focus ring.
- **Ink Gray** (ink-2): ledes, captions, nav at rest, secondary readouts.
- **Paper** (paper): the page inside a reader frame, and the light tone inside the manga art.
- **Manga Ink** (manga-ink): line work, panel borders and screentone dots in the drawn art.

### Named Rules
**The One Red Rule.** Red means "scrolling right now". If nothing on screen is moving, nothing is red. Never use it for a resting button, a link, a highlight or an error.

**The Ink Action Rule.** The primary action is an ink-white pill with black text. Emphasis comes from contrast with the black, never from hue.

**The Paper Stays Framed Rule.** Paper appears only as the content inside a reader frame or popup mock. The site's own surfaces are always black or near-black.

## Typography

**Display Font:** Bricolage Grotesque, bundled as `Bricolage` (with system-ui, -apple-system, Segoe UI)
**Body Font:** the same family
**Reader content (inside frames only):** Georgia serif for the mock novel page

**Character:** One grotesque doing everything. Display weights at 800 with tight negative tracking feel loud and cheeky; body at 400 stays soft and readable on black.

### Hierarchy
- **Display** (800, up to 6rem, 0.9): the hero headline and the closing line, set as stacked lines.
- **Numeral** (800, up to 6rem, 0.85, tabular): big live readouts such as speed and the bedtime clock, and the oversized privacy list.
- **Headline** (800, up to 4.75rem, 0.98): one per section, short and declarative, ending in a period.
- **Title** (800, 1.35rem, 1.15): install box and card titles; figure and key captions use 18 to 20px bold at -0.02em.
- **Lede** (400, up to 1.2rem): gray, max 34em, with bold ink for the product name.
- **Body** (400, 17px, 1.55; 16px under 560px): FAQ answers and notes, max about 44 to 46em.
- **Label** (600, 15px): nav, notes, preset names; 14px for fine print and footer.

### Named Rules
**The Tight Display Rule.** Every heading is 800 weight with negative tracking (-0.02em to -0.045em, tighter as it grows) and balanced wrapping.

**The Tabular Rule.** Numerals are tabular site-wide so live counters never jitter.

**The Sentence Case Rule.** Site chrome is sentence case with no eyebrow labels above headings. Uppercase tracked lettering belongs only to the drawn manga art and mock reader pages.

## Layout

A centered column, max 1240px, with a fluid gutter of 16 to 48px. Sections stack with a large fluid top gap (96 to 168px); grids open 56px under their headline, readouts 40px. Feature sections use a two-column split (equal, or 1.15 to 0.85) with a live reader frame on one side. Sets of demos run in grids of three (modes), four (keys) and five (popup shots, with even items dropped 72px for a staggered strip). The header is sticky at 64px.

At 900px splits collapse to one column with the demo first; mode and screenshot rows become edge-to-edge horizontal scroll-snap carousels. At 560px body drops to 16px, download buttons go full width and the popup mock hides. Demo viewports size with svh clamps so a frame never outgrows the screen.

## Elevation & Depth

Depth is tonal first: black ground, surface-1 for resting containers, surface-2 for selected ones, and hairline borders to separate. Shadows exist only under floating objects and are always black, large and soft, reading as shade in a dark room rather than lift.

### Shadow Vocabulary
- **Frame drop** (`box-shadow: 0 40px 100px -30px #000, 0 2px 0 #ffffff08 inset`): reader browser frames.
- **Float** (`box-shadow: 0 30px 80px -30px #000`): panels and screenshot cards.
- **Popup** (`box-shadow: 0 30px 70px -10px #000, 0 10px 24px #000c`): the popup mock open from the toolbar.
- **Pill** (`box-shadow: 0 8px 24px #0009, 0 1px 2px #000`): the on-page reading pill.
- **Keycap** (`box-shadow: 0 10px 30px -8px #000, inset 0 1px 0 #ffffff14`): keycaps, with a heavy bottom border as the key's side.

### Named Rules
**The Dark Room Rule.** Shadows are black and diffuse. No colored glows, no hard offset shadows.

## Shapes

Round and soft. Every action, chip, pill and URL bar is a full pill (999px). Containers step up in radius with size: 6px for code and the focus ring, 12px for tiles and segmented trays, 14px for browser frames and screenshots, 16px for panels and keycaps, 20 to 22px for the install boxes and large keycaps. Borders are 1px hairlines; 1.5px on buttons and keycaps. Keycaps carry a thick bottom border (7px, 10px when large) that compresses on press. Inside the manga art, panels are square with 3px ink borders, the only hard corners in the system.

## Components

### Buttons
- **Shape:** full pill (999px), 48px tall, 1.5px border, 700 weight.
- **Primary:** ink fill, black text, optional 18px stroke icon; hover goes to pure white; press scales to 0.97.
- **Ghost:** transparent with a line-2 border; hover lifts the border to ink-2 and fills surface-1.
- **Small:** 38px tall, 14px text, used in the header.

### Keycap (signature)
A real key: surface gradient, line-2 border, heavy bottom edge, 800 weight letter. Pressing translates it down and thins the bottom edge. The hero S key starts this page scrolling; while running it fills red with black text and a pulsing black dot.

### Reader Pill (signature)
The extension's on-page pill, drawn exactly: near-black translucent pill, 12px system-ui at 600, a 6px status dot (gray idle, red pulsing while running, light gray when held), segments split by thin dividers, and a thin progress hairline along the bottom. The site uses it fixed bottom right when Scroller reads this page.

### Chips and Tiles
- **Chip / unit toggle:** pill outline in line-2, ink-2 text, ink on hover.
- **Preset tile:** surface-1, hairline border, 12px radius, name over a gray value; selected gets an ink border on surface-2.

### Inputs
- **Slider:** 4px track in hairline with an ink fill, 24px ink thumb ringed in black; focus adds an ink outer ring.
- **Segmented choice:** surface-2 tray, selected segment lifts to line-2 with ink text.
- **Switch:** 44 by 26 pill; off is line-2 with a gray knob, on is ink with a black knob.
- **Focus:** a 2px ink outline, 3px offset, everywhere.

### Navigation
Sticky black header, wordmark "Scroller." with the period in ink-2 at rest and red while running, 15px 600 gray links that turn ink on hover. A hairline appears under the header once scrolled; red speed lines stream through it only while the page scrolls itself.

### Reader Frame (signature)
A dark browser mock with a 42px toolbar, a pill URL bar, the Scroller toolbar icon with an ON badge, and a viewport whose center column is paper holding original manga art or a Georgia novel page. Night, warmth and focus effects are layers over the viewport.

## Do's and Don'ts

### Do:
- **Do** show every feature running inside a reader frame rather than describing it.
- **Do** keep primary actions ink-white pills on black.
- **Do** use screentone dots (about 7px grid, white at 15% alpha, masked to fade) and speed lines as the only textures.
- **Do** let every motion settle to a still, readable state under prefers-reduced-motion.
- **Do** keep tokens identical to the extension popup.

### Don't:
- **Don't** show red on anything at rest.
- **Don't** put paper or any light surface behind site chrome.
- **Don't** add eyebrow labels or uppercase tracked kickers above headings.
- **Don't** use colored, glowing or hard offset shadows.
- **Don't** introduce a second typeface outside reader content.
