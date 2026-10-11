// Sanity checks for the extension: run with `npm run check` (also runs in CI and before every release).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { releaseNotes } from './release-notes.mjs';
import { firefoxManifest } from './build.mjs';
import { PAGES, published } from './site.mjs';

const ext = 'extension';
const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

const manifest = JSON.parse(readFileSync(`${ext}/manifest.json`, 'utf8'));
check(manifest.manifest_version === 3, 'manifest_version must be 3');
check(/^\d+\.\d+\.\d+$/.test(manifest.version), `version "${manifest.version}" is not x.y.z`);

// every file the manifest points at must exist
const refs = [
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...(manifest.content_scripts ?? []).flatMap((c) => [...(c.js ?? []), ...(c.css ?? [])]),
].filter(Boolean);
for (const f of refs) check(existsSync(`${ext}/${f}`), `manifest references missing file: ${f}`);

// the derived Firefox manifest is complete too
const ff = firefoxManifest(manifest);
for (const f of ff.background.scripts) check(existsSync(`${ext}/${f}`), `Firefox background script missing: ${f}`);
check(!ff.background.service_worker, 'Firefox manifest must not use background.service_worker');
check(ff.browser_specific_settings?.gecko?.id, 'Firefox manifest needs browser_specific_settings.gecko.id');

// the test harness loads the same content scripts, in the same order
const stub = readFileSync('test/harness/stub.js', 'utf8').match(/for \(const f of (\[[^\]]*\])/)?.[1];
const content = manifest.content_scripts[0].js.map((f) => f.replace('scripts/', ''));
check(stub && JSON.stringify(JSON.parse(stub.replace(/'/g, '"'))) === JSON.stringify(content),
  'test/harness/stub.js script list must match manifest content_scripts');

// every script parses
const js = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? js(`${dir}/${d.name}`) : d.name.endsWith('.js') ? [`${dir}/${d.name}`] : []));
for (const f of js(ext)) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail.push(`${f} does not parse:\n${e.stderr}`); }
}

// the version being shipped is documented well enough to become release notes (summary + changes)
try { releaseNotes(manifest.version); } catch (e) { fail.push(e.message); }

// the website: every file it publishes exists, and every local file the page points at exists and gets published
for (const f of PAGES) check(existsSync(`site/${f}`), `site/${f} is missing`);
const page = existsSync('site/index.html') ? readFileSync('site/index.html', 'utf8') : '';
check(/<meta name="version" content="\d+\.\d+\.\d+">/.test(page), 'site/index.html needs <meta name="version" content="x.y.z">');
for (const [, f] of page.matchAll(/(?:src|href)="(?!https?:|#|mailto:|data:)([^"]+)"/g)) {
  check(existsSync(`site/${f}`), `site/index.html links to ${f}, which doesn't exist`);
  check(published(f), `site/index.html links to ${f}, which npm run site doesn't publish`);
}

if (fail.length) { console.error('✗ ' + fail.join('\n✗ ')); process.exit(1); }
console.log(`✓ Scroller ${manifest.version}: Chrome + Firefox manifests, ${refs.length} referenced files, scripts, changelog, release notes and website OK`);
