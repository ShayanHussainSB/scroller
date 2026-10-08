// Sanity checks for the extension: run with `node .github/scripts/check.mjs` (also runs in CI).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

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

// every script parses
const js = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? js(`${dir}/${d.name}`) : d.name.endsWith('.js') ? [`${dir}/${d.name}`] : []));
for (const f of js(ext)) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail.push(`${f} does not parse:\n${e.stderr}`); }
}

// the version being shipped is documented
check(readFileSync('CHANGELOG.md', 'utf8').includes(`## [${manifest.version}]`), `CHANGELOG.md has no entry for ${manifest.version}`);

if (fail.length) { console.error('✗ ' + fail.join('\n✗ ')); process.exit(1); }
console.log(`✓ Scroller ${manifest.version}: manifest, ${refs.length} referenced files, scripts and changelog OK`);
