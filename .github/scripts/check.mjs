// Sanity checks for the extension: run with `node .github/scripts/check.mjs` (also runs in CI).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { releaseNotes } from './release-notes.mjs';
import { firefoxManifest } from './build.mjs';

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

// every script parses
const js = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? js(`${dir}/${d.name}`) : d.name.endsWith('.js') ? [`${dir}/${d.name}`] : []));
for (const f of js(ext)) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail.push(`${f} does not parse:\n${e.stderr}`); }
}

// the version being shipped is documented well enough to become release notes (summary + changes)
try { releaseNotes(manifest.version); } catch (e) { fail.push(e.message); }

if (fail.length) { console.error('✗ ' + fail.join('\n✗ ')); process.exit(1); }
console.log(`✓ Scroller ${manifest.version}: Chrome + Firefox manifests, ${refs.length} referenced files, scripts, changelog and release notes OK`);
