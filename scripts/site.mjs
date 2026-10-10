// Assembles the website into dist/site/ for GitHub Pages (and for previewing locally).
//   npm run site   ->  dist/site/ : site/ plus the font, icons and popup screenshots, stamped with the manifest version
// The page is written against one version (its <meta name="version">); every mention of it becomes the current one,
// so the download links always point at the release that ships with this manifest.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const OUT = 'dist/site';
// published files from site/ (PRODUCT.md and DESIGN.md are notes for designers, not pages)
export const PAGES = ['index.html', 'og.png', 'robots.txt', 'sitemap.xml', 'llms.txt'];
// assets the page borrows from the rest of the repo: published path -> source
export const ASSETS = {
  'fonts/bricolage.woff2': 'extension/fonts/bricolage.woff2',
  ...Object.fromEntries(readdirSync('extension/icons').map((f) => [`icons/${f}`, `extension/icons/${f}`])),
  ...Object.fromEntries(readdirSync('docs/screenshots').map((f) => [`screenshots/${f}`, `docs/screenshots/${f}`])),
};

function site() {
  const { version } = JSON.parse(readFileSync('extension/manifest.json', 'utf8'));
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const f of PAGES) cpSync(`site/${f}`, `${OUT}/${f}`);
  for (const [to, from] of Object.entries(ASSETS)) cpSync(from, `${OUT}/${to}`);
  for (const f of ['index.html', 'llms.txt']) {
    const text = readFileSync(`${OUT}/${f}`, 'utf8');
    const was = readFileSync('site/index.html', 'utf8').match(/<meta name="version" content="([^"]+)"/)[1];
    writeFileSync(`${OUT}/${f}`, text.replaceAll(was, version));
  }
  console.log(`${OUT}/ (Scroller ${version})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) site();
