'use strict';

/*
 * Renders build/icon.svg to build/icon.png (1024x1024) using Electron's
 * offscreen capture, so we get a real raster icon without native image deps.
 * electron-builder then derives the platform icons (.ico) from this PNG.
 *
 * Run with:  npm run make-icon
 */

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

try { app.disableHardwareAcceleration(); } catch (_) {}

app.whenReady().then(async () => {
  const buildDir = path.join(__dirname, '..', 'build');
  const svg = fs.readFileSync(path.join(buildDir, 'icon.svg'), 'utf8');
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>html,body{margin:0;padding:0;width:1024px;height:1024px;overflow:hidden;background:transparent}' +
    'svg{display:block;width:1024px;height:1024px}</style></head><body>' + svg + '</body></html>';

  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,            // keep the squircle's rounded corners transparent
    backgroundColor: '#00000000',
    useContentSize: true,
    webPreferences: { offscreen: false },
  });

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 700));

  const img = await win.webContents.capturePage();
  const png = img.toPNG();

  if (png && png.length > 2000) {
    fs.writeFileSync(path.join(buildDir, 'icon.png'), png);
    const size = img.getSize();
    console.log(`OK icon.png written: ${png.length} bytes (${size.width}x${size.height})`);
  } else {
    console.error('FAILED: captured PNG too small:', png ? png.length : 0);
    process.exitCode = 1;
  }

  win.destroy();
  app.quit();
});
