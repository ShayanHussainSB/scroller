// Builds a version's GitHub release notes from CHANGELOG.md.
//   node .github/scripts/release-notes.mjs [version]   (defaults to the manifest version)
// Used by the Release workflow, and checked by check.mjs so a broken changelog fails in the PR, not at release time.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = process.env.GITHUB_REPOSITORY || 'ShayanHussainSB/scroller';

const git = (...args) => { try { execFileSync('git', args, { stdio: 'ignore' }); return true; } catch { return false; } };
// Look at the version's tag if it exists, otherwise at HEAD (the commit about to be tagged).
const refFor = (version) => (git('rev-parse', '--verify', '--quiet', `v${version}^{}`) ? `v${version}` : 'HEAD');

const UPDATE = `**Updating?** Replace your Scroller folder with the new one, click the reload arrow on Scroller's card in \`chrome://extensions\`, then refresh your reader tabs. Your settings are kept.`;

// Releases built by build.mjs ship a package per browser; older ones shipped a single Chrome zip.
const installBoth = (v) => `## Install

**Chrome, Edge, Brave, Arc, Opera, Vivaldi**
1. Download **scroller-${v}-chrome.zip** below and unzip it.
2. Open \`chrome://extensions\` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.

${UPDATE}

**Firefox 140+**
1. Download **scroller-${v}-firefox.zip** below (no need to unzip).
2. Open \`about:debugging#/runtime/this-firefox\` and click **Load Temporary Add-on…**.
3. Pick the zip.

Firefox keeps unsigned add-ons only until it restarts, so load it again after a restart until Scroller is signed by Mozilla.`;

const installChromeOnly = (v) => `## Install

1. Download **scroller-${v}.zip** below and unzip it.
2. Open \`chrome://extensions\` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.

${UPDATE}`;

export function releaseNotes(version, changelog = readFileSync('CHANGELOG.md', 'utf8')) {
  const heads = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\][^\n]*$/gm)];
  const i = heads.findIndex((m) => m[1] === version);
  if (i < 0) throw new Error(`CHANGELOG.md has no section for ${version}`);
  const start = heads[i].index + heads[i][0].length;
  const end = heads[i + 1]?.index ?? changelog.search(/^\[\d+\.\d+\.\d+\]:/m);
  const body = changelog.slice(start, end < 0 ? undefined : end).trim();
  const at = body.search(/^### /m);
  const summary = (at < 0 ? body : body.slice(0, at)).trim();
  const changes = at < 0 ? '' : body.slice(at).trim();
  if (!summary) throw new Error(`CHANGELOG.md ${version} needs a summary paragraph before its ### sections`);
  if (!changes) throw new Error(`CHANGELOG.md ${version} lists no changes`);

  const prev = heads[i + 1]?.[1];
  const ref = refFor(version);
  const shot = ['docs/read.png', 'docs/popup.png'].find((p) => git('cat-file', '-e', `${ref}:${p}`));

  return [
    summary,
    shot && `<p align="center"><img src="https://raw.githubusercontent.com/${REPO}/v${version}/${shot}" width="320" alt="Scroller ${version} popup"></p>`,
    `## What's new\n\n${changes}`,
    git('cat-file', '-e', `${ref}:.github/scripts/build.mjs`) ? installBoth(version) : installChromeOnly(version),
    prev
      ? `**Full changelog:** [v${prev}...v${version}](https://github.com/${REPO}/compare/v${prev}...v${version})`
      : '**Full changelog:** this is the first release.',
  ].filter(Boolean).join('\n\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = process.argv[2] || JSON.parse(readFileSync('extension/manifest.json', 'utf8')).version;
  process.stdout.write(releaseNotes(version));
}
