'use strict';

/*
 * Bumps the patch version in package.json by 1 (e.g. 1.0.3 -> 1.0.4).
 * Runs automatically before every `npm run dist` (via the "predist" script),
 * so each installer build gets a fresh, distinguishable version number.
 */

const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
const parts = String(pkg.version || '1.0.0').split('.').map((n) => parseInt(n, 10) || 0);
while (parts.length < 3) parts.push(0);
parts[2] += 1;
pkg.version = parts.join('.');
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
console.log('Version bumped to ' + pkg.version);
