// Tiny localhost static server for electron-builder's helper .7z files.
// Lets the build fetch winCodeSign/nsis from disk instead of flaky GitHub.
// Use with: ELECTRON_BUILDER_BINARIES_DOWNLOAD_OVERRIDE_URL=http://127.0.0.1:8731
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'build-helpers');
const PORT = 8731;

const server = http.createServer((req, res) => {
  const name = path.basename(decodeURIComponent((req.url || '').split('?')[0]));
  const file = path.join(dir, name);
  if (!file.startsWith(dir) || !fs.existsSync(file)) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  const stat = fs.statSync(file);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => console.log('helper-server listening on http://127.0.0.1:' + PORT + ' serving ' + dir));
