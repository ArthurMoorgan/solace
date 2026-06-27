'use strict';

/*
 * Fetches uBlock Origin into extensions/uBlock0.chromium when it's missing.
 *
 * uBlock Origin is GPL-licensed and is NOT vendored in this repo. It ships *with
 * the built app* (electron-builder bundles whatever is on disk), so this script
 * downloads it on demand — automatically after `npm install` (postinstall) and
 * before `npm run dist` (predist). If it's already present, it does nothing.
 *
 * Extraction uses PowerShell's Expand-Archive (this project targets Windows).
 * The script never fails the install/build — if the download can't complete,
 * it warns and exits 0; Drift still runs, just without the bundled blocker
 * until you run `npm run fetch-ublock` again.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const VERSION = '1.71.0';
const EXT_PARENT = path.join(__dirname, '..', 'extensions');
const EXT_DIR = path.join(EXT_PARENT, 'uBlock0.chromium');
const URL = 'https://github.com/gorhill/uBlock/releases/download/' + VERSION + '/uBlock0_' + VERSION + '.chromium.zip';

if (fs.existsSync(path.join(EXT_DIR, 'manifest.json'))) {
  console.log('uBlock Origin already present — skipping.');
  process.exit(0);
}

function download(url, dest, redirects) {
  return new Promise((resolve, reject) => {
    if ((redirects || 0) > 6) return reject(new Error('too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'solace-build' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(download(res.headers.location, dest, (redirects || 0) + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const f = fs.createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => f.close(() => resolve()));
      f.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  try {
    fs.mkdirSync(EXT_PARENT, { recursive: true });
    const zip = path.join(EXT_PARENT, '_ublock.zip');
    console.log('Downloading uBlock Origin ' + VERSION + '…');
    await download(URL, zip, 0);
    console.log('Extracting…');
    if (process.platform === 'win32') {
      execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \'' + zip + '\' -DestinationPath \'' + EXT_PARENT + '\' -Force"', { stdio: 'ignore' });
    } else {
      execSync('unzip -q -o "' + zip + '" -d "' + EXT_PARENT + '"', { stdio: 'ignore' });
    }
    try { fs.unlinkSync(zip); } catch (_) {}
    if (fs.existsSync(path.join(EXT_DIR, 'manifest.json'))) console.log('uBlock Origin ready.');
    else console.warn('Warning: extracted but manifest.json not found at ' + EXT_DIR);
  } catch (e) {
    console.warn('Could not fetch uBlock Origin (' + (e && e.message) + ').');
    console.warn('Drift will run without the bundled ad-blocker until you run: npm run fetch-ublock');
  }
  process.exit(0);
})();
