// Assembles the website into dist/site/ for GitHub Pages.
//   npm run site   ->  dist/site/ : site/ plus the icons and popup screenshots it borrows from the repo
// site/index.html works straight from the repo (file:// or an editor preview): the font is inlined and the
// images point into the repo with ../ paths. Here those paths are rewritten to copies next to the page.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const OUT = 'dist/site';
// published files from site/ (PRODUCT.md and DESIGN.md are notes for designers, not pages)
export const PAGES = ['index.html', 'og.png', 'robots.txt', 'sitemap.xml', 'llms.txt'];
// repo folders the page borrows from: path in the page -> path once published
export const BORROWED = { '../extension/icons/': 'icons/', '../docs/screenshots/': 'screenshots/' };

// where a local reference in site/index.html ends up on the published site (null: it won't be there)
export function published(ref) {
  if (PAGES.includes(ref)) return ref;
  const from = Object.keys(BORROWED).find((p) => ref.startsWith(p));
  return from ? BORROWED[from] + ref.slice(from.length) : null;
}

function site() {
  const { version } = JSON.parse(readFileSync('extension/manifest.json', 'utf8'));
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const f of PAGES) cpSync(`site/${f}`, `${OUT}/${f}`);
  for (const [from, to] of Object.entries(BORROWED)) {
    const dir = from.replace('../', '');
    mkdirSync(`${OUT}/${to}`, { recursive: true });
    for (const f of readdirSync(dir, { withFileTypes: true })) if (f.isFile()) cpSync(`${dir}/${f.name}`, `${OUT}/${to}${f.name}`);
  }
  // The page states the version it was written for in a few marked places; llms.txt names it in prose.
  // The download buttons don't depend on it: they ask GitHub for the latest release when the page loads.
  let page = readFileSync(`${OUT}/index.html`, 'utf8');
  const was = page.match(/<meta name="version" content="([^"]+)">/)[1];
  for (const [from, to] of Object.entries(BORROWED)) page = page.replaceAll(`"${from}`, `"${to}`);
  page = page.replace(`<meta name="version" content="${was}">`, `<meta name="version" content="${version}">`)
    .replace(`"softwareVersion": "${was}"`, `"softwareVersion": "${version}"`)
    .replaceAll(`<span data-ver>${was}</span>`, `<span data-ver>${version}</span>`);
  writeFileSync(`${OUT}/index.html`, page);
  writeFileSync(`${OUT}/llms.txt`, readFileSync(`${OUT}/llms.txt`, 'utf8').replaceAll(was, version));
  console.log(`${OUT}/ (Scroller ${version})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) site();
