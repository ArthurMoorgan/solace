'use strict';

/*
 * Builds a fully self-contained, portable Solace app — offline, no electron-builder,
 * no downloads. Output: dist/Solace-portable/Solace.exe (double-click to run).
 *
 * It copies the Electron runtime already in node_modules, drops our app into
 * resources/app, and bundles the runtime dependencies. Re-run any time with:
 *   node tools/make-portable.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist', 'Solace-portable');
const electronDist = path.join(root, 'node_modules', 'electron', 'dist');

// Build-only packages that are never required at runtime — skip to keep it lean.
const EXCLUDE = new Set([
  'electron', 'electron-builder', 'electron-winstaller', 'app-builder-lib',
  'app-builder-bin', 'dmg-builder', 'dmg-license', '@develar', '@electron',
  '.bin', '.cache', '.package-lock.json',
]);

function cp(src, dest) {
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

console.log('Cleaning', out);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

console.log('Copying Electron runtime...');
cp(electronDist, out);
fs.renameSync(path.join(out, 'electron.exe'), path.join(out, 'Solace.exe'));
fs.rmSync(path.join(out, 'resources', 'default_app.asar'), { force: true });

console.log('Adding app files...');
const appDir = path.join(out, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });
for (const f of ['main.js', 'preload.js', 'package.json']) cp(path.join(root, f), path.join(appDir, f));
cp(path.join(root, 'src'), path.join(appDir, 'src'));

console.log('Bundling runtime dependencies...');
const nm = path.join(root, 'node_modules');
const appNm = path.join(appDir, 'node_modules');
fs.mkdirSync(appNm, { recursive: true });
let copied = 0, skipped = 0;
for (const entry of fs.readdirSync(nm)) {
  if (EXCLUDE.has(entry)) { skipped++; continue; }
  try { cp(path.join(nm, entry), path.join(appNm, entry)); copied++; }
  catch (e) { console.warn('  ! skip', entry, '-', e.code || e.message); }
}
console.log(`  deps copied: ${copied}, build-only skipped: ${skipped}`);

console.log('\nDone. Standalone app: ' + path.join(out, 'Solace.exe'));
