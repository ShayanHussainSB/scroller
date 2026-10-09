# Security policy

## Supported versions

Only the [latest release](https://github.com/ShayanHussainSB/scroller/releases/latest) receives fixes. Please update before reporting.

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Report them privately through GitHub instead:

**[Report a vulnerability](https://github.com/ShayanHussainSB/scroller/security/advisories/new)**

Include what you found, how to reproduce it, and the browser and Scroller version. You'll get a reply as soon as possible. Once it's fixed, you'll be credited in the advisory unless you'd rather not be.

## Scope

Scroller runs a content script on every page and keeps its settings in the browser's local extension storage. It makes no network requests. Things worth reporting include:

- a page being able to read or change Scroller's settings, or trigger its actions without the user
- page content (such as hostnames) being rendered as HTML in the popup
- anything that sends data off the device
