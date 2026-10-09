// Packages the extension for each browser from the single extension/ source.
//   npm run build   ->  dist/scroller-<version>-chrome.zip, dist/scroller-<version>-firefox.zip
// The Chrome manifest is the source of truth; Firefox's is derived from it here.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const GECKO_ID = 'scroller@shayanhussainsb.github.io';

export function firefoxManifest(chrome) {
  const m = structuredClone(chrome);
  // Firefox runs MV3 background code as event-page scripts, not a service worker.
  m.background = { scripts: [chrome.background.service_worker] };
  // Firefox treats sites as a permission in MV3; ask for them up front so the start key works everywhere.
  m.host_permissions = ['<all_urls>'];
  m.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] }, // Scroller collects nothing
    },
  };
  return m;
}

function build() {
  const chrome = JSON.parse(readFileSync('extension/manifest.json', 'utf8'));
  const { version } = chrome;
  rmSync('dist', { recursive: true, force: true });
  const out = [];
  for (const [browser, manifest] of [['chrome', chrome], ['firefox', firefoxManifest(chrome)]]) {
    const dir = `dist/${browser}`;
    mkdirSync(dir, { recursive: true });
    cpSync('extension', dir, { recursive: true, filter: (src) => !/(^|\/)\./.test(src.replace(/^extension\/?/, '')) });
    writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
    const zip = `scroller-${version}-${browser}.zip`;
    execFileSync('zip', ['-qr', `../${zip}`, '.'], { cwd: dir });
    out.push(`dist/${zip}`);
  }
  console.log(out.join('\n'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
