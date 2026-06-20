'use strict';

// Dev-only console warnings (we ship a CSP + handle popups deliberately).
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const { app, BrowserWindow, ipcMain, session, dialog, shell, clipboard, nativeImage, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Fix the app identity to "Drift" so the OS, window title, and userData path are
// deterministic regardless of how the app is launched (dev, portable, or installed).
try { app.setName('Drift'); } catch (_) {}
try { app.setAppUserModelId('com.drift.app'); } catch (_) {}

// Window/taskbar icon (bundled with the app so it shows in the portable build too).
const APP_ICON = path.join(__dirname, 'src', 'icon.png');

// ---- Performance switches (must be set before the app is ready) ----
// A few safe GPU accelerations for everyone; an aggressive low-memory mode when the
// user has Lightweight mode on (read straight from the settings file at process start).
try { app.commandLine.appendSwitch('enable-gpu-rasterization'); } catch (_) {}
try { app.commandLine.appendSwitch('enable-zero-copy'); } catch (_) {}
try { app.commandLine.appendSwitch('ignore-gpu-blocklist'); } catch (_) {}
try {
  const raw0 = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'cream-settings.json'), 'utf8'));
  if (raw0 && raw0.lite) {
    app.commandLine.appendSwitch('enable-low-end-device-mode');   // leaner memory footprint
    app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  }
} catch (_) {}

// Harden a session: deny privacy-invasive permission requests by default.
function hardenSession(ses) {
  const DENY = new Set(['notifications', 'geolocation', 'midi', 'midiSysex', 'hid', 'serial', 'usb', 'idle-detection', 'sensors', 'background-sync', 'persistent-storage']);
  try { ses.setPermissionRequestHandler((_wc, permission, cb) => cb(!DENY.has(permission))); } catch (_) {}
  try { ses.setPermissionCheckHandler((_wc, permission) => !DENY.has(permission)); } catch (_) {}
}
// Harden a chrome window: the shell never navigates away or spawns native popups.
function hardenWindow(win) {
  const wc = win.webContents;
  wc.on('will-navigate', (e) => e.preventDefault());
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) { try { win.webContents.send('open-tab', url); } catch (_) {} }
    return { action: 'deny' };
  });
}

// Harden + ad-block EVERY session as it is created — including the per-app
// partitions (persist:app-*) used by the web-app slide-out panel.
try { app.on('session-created', (ses) => { try { applyWebRequestTo(ses); } catch (_) {} }); } catch (_) {}

// Anthropic SDK (CommonJS interop — class may be default or named export).
let Anthropic = null;
try {
  const mod = require('@anthropic-ai/sdk');
  Anthropic = mod.default || mod.Anthropic || mod;
} catch (_) {
  Anthropic = null;
}

/** @type {BrowserWindow | null} */
let mainWindow = null;
// All trusted chrome windows (main + any incognito). Used by isShell and routing.
const chromeWindows = new Set();
const INCOGNITO_PARTITION = 'incognito'; // no "persist:" => in-memory, ephemeral

// ---------------------------------------------------------------------------
//  Drift AI (Claude, bring-your-own-key) — all calls run here in the main
//  process so the API key is never exposed to any renderer or web page.
// ---------------------------------------------------------------------------
const AI_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 · most capable' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 · balanced' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 · fastest' },
];
const AI_DEFAULT_MODEL = 'claude-haiku-4-5';
const AI_SYSTEM_PROMPT =
  "You are Drift, a warm and concise AI assistant built into the Drift web browser's " +
  'new-tab page. Help the user with quick questions, explanations, writing, planning, and ideas. ' +
  'Answer directly and concisely — skip preamble and filler. Prefer short paragraphs and compact ' +
  'lists. Use fenced code blocks for code. Respond only with your final answer; do not narrate your reasoning.';

const DEFAULT_CLEAR_EXIT = { history: false, cookies: false, cache: false };
let settings = { apiKey: '', model: AI_DEFAULT_MODEL, background: '', extensions: [], downloads: [], adblock: true, adblockEngine: 'cream', dnt: true, adblockAllow: [], clearExit: { ...DEFAULT_CLEAR_EXIT } };
let anthropicClient = null;
const aiStreams = new Map();

function settingsPath() {
  return path.join(app.getPath('userData'), 'cream-settings.json');
}
function loadSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    return {
      apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
      model: raw.model || AI_DEFAULT_MODEL,
      background: typeof raw.background === 'string' ? raw.background : '',
      extensions: Array.isArray(raw.extensions) ? raw.extensions : [],
      downloads: Array.isArray(raw.downloads) ? raw.downloads : [],
      adblock: raw.adblock !== false,
      adblockEngine: raw.adblockEngine === 'cream' ? 'cream' : 'ublock',
      uboDefaultApplied: !!raw.uboDefaultApplied,
      defaultAskedAt: Number(raw.defaultAskedAt) || 0,
      dnt: raw.dnt !== false,
      acrylic: !!raw.acrylic,
      lite: !!raw.lite,
      adblockAllow: Array.isArray(raw.adblockAllow) ? raw.adblockAllow : [],
      clearExit: (raw.clearExit && typeof raw.clearExit === 'object')
        ? { history: !!raw.clearExit.history, cookies: !!raw.clearExit.cookies, cache: !!raw.clearExit.cache }
        : { ...DEFAULT_CLEAR_EXIT },
    };
  } catch (_) {
    return { apiKey: '', model: AI_DEFAULT_MODEL, background: '', extensions: [], downloads: [], adblock: true, adblockEngine: 'ublock', uboDefaultApplied: false, dnt: true, adblockAllow: [], clearExit: { ...DEFAULT_CLEAR_EXIT } };
  }
}
function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch (_) {}
}
function getClient() {
  if (!Anthropic || !settings.apiKey) return null;
  if (!anthropicClient || anthropicClient._creamKey !== settings.apiKey) {
    anthropicClient = new Anthropic({ apiKey: settings.apiKey });
    anthropicClient._creamKey = settings.apiKey;
  }
  return anthropicClient;
}
function newTabFileURL() {
  return pathToFileURL(path.join(__dirname, 'src', 'newtab.html')).href;
}
// Trusted = the app shell (chrome window, for the Settings UI) or the local
// new-tab page. Arbitrary websites in webviews are never trusted.
function isTrustedAISender(event) {
  try {
    if (mainWindow && event.sender === mainWindow.webContents) return true;
    const u = (event.senderFrame && event.senderFrame.url) || '';
    return u.split('?')[0].split('#')[0] === newTabFileURL();
  } catch (_) {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 720,
    minHeight: 500,
    icon: APP_ICON,
    frame: false,                 // frameless: we draw our own chrome
    titleBarStyle: 'hidden',
    backgroundColor: settings.acrylic ? '#00000000' : '#F3ECDD',   // cream avoids white flash; transparent enables acrylic
    backgroundMaterial: settings.acrylic ? 'acrylic' : 'none',     // Win11 backdrop, set at creation for reliability
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,           // enable <webview> for tab content
      sandbox: false,
      spellcheck: true,
      backgroundThrottling: true, // throttle when the window is in the background (saves CPU/memory)
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  chromeWindows.add(mainWindow);
  hardenWindow(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));
  mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('window:maximized', false));

  mainWindow.on('closed', () => { chromeWindows.delete(mainWindow); mainWindow = null; });
}

// ---- Window control IPC (custom titlebar buttons) ----
const senderWin = (e) => BrowserWindow.fromWebContents(e.sender);
ipcMain.on('window:minimize', (e) => { const w = senderWin(e); if (w) w.minimize(); });
ipcMain.on('window:toggle-maximize', (e) => {
  const w = senderWin(e); if (!w) return;
  if (w.isMaximized()) w.unmaximize(); else w.maximize();
});
ipcMain.on('window:close', (e) => { const w = senderWin(e); if (w) w.close(); });
ipcMain.handle('window:is-maximized', (e) => { const w = senderWin(e); return w ? w.isMaximized() : false; });
// Windows 11 acrylic/mica backdrop — lets the desktop blur through the chrome (Zen-style).
ipcMain.on('window:set-acrylic', (e, on) => {
  const w = senderWin(e); if (!w) return;
  settings.acrylic = !!on; try { saveSettings(); } catch (_) {}   // so it's applied at creation next launch
  try {
    if (on) { w.setBackgroundColor('#00000000'); w.setBackgroundMaterial('acrylic'); }
    else { w.setBackgroundMaterial('none'); w.setBackgroundColor('#F3ECDD'); }
  } catch (_) {}   // non-Windows / unsupported: silently ignore
});
// Lightweight mode is mirrored to settings so the perf switches apply at next launch.
ipcMain.on('mode:set-lite', (_e, on) => { settings.lite = !!on; try { saveSettings(); } catch (_) {} });

// ---- Incognito window (genuine private browsing: ephemeral in-memory session) ----
const incognitoDlAttached = new Set();
function createIncognitoWindow() {
  const ses = session.fromPartition(INCOGNITO_PARTITION); // no "persist:" => memory-only
  applyWebRequestTo(ses); // ad-block + DNT on the private session too
  if (!incognitoDlAttached.has(ses)) {
    incognitoDlAttached.add(ses);
    // Downloads still save to disk, but are never recorded anywhere.
    ses.on('will-download', (_e, item) => { try { item.setSavePath(uniquePath(app.getPath('downloads'), item.getFilename())); } catch (_) {} });
  }
  const win = new BrowserWindow({
    width: 1180, height: 800, minWidth: 720, minHeight: 500, icon: APP_ICON,
    frame: false, titleBarStyle: 'hidden', backgroundColor: '#221d33', show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, webviewTag: true,
      sandbox: false, spellcheck: true, backgroundThrottling: true,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'), { query: { incognito: '1' } });
  hardenWindow(win);
  win.once('ready-to-show', () => win.show());
  win.on('maximize', () => win.webContents.send('window:maximized', true));
  win.on('unmaximize', () => win.webContents.send('window:maximized', false));
  win.on('enter-full-screen', () => win.webContents.send('window:maximized', true));
  win.on('leave-full-screen', () => win.webContents.send('window:maximized', false));
  chromeWindows.add(win);
  win.on('closed', () => {
    chromeWindows.delete(win);
    const stillPrivate = [...chromeWindows].some((w) => w && !w.isDestroyed() && w !== mainWindow);
    if (!stillPrivate) { try { ses.clearStorageData(); ses.clearCache(); } catch (_) {} }
  });
  return win;
}
ipcMain.on('window:new-incognito', () => createIncognitoWindow());

// ---- Drift AI IPC (validated to the trusted new-tab page) ----
ipcMain.handle('ai:get-config', (event) => {
  if (!isTrustedAISender(event)) return { unauthorized: true, models: AI_MODELS };
  return { hasKey: !!settings.apiKey, model: settings.model || AI_DEFAULT_MODEL, models: AI_MODELS, sdk: !!Anthropic };
});
ipcMain.handle('ai:set-key', (event, key) => {
  if (!isTrustedAISender(event)) return { ok: false, error: 'Unauthorized' };
  settings.apiKey = (typeof key === 'string' ? key : '').trim();
  anthropicClient = null;
  saveSettings();
  return { ok: true, hasKey: !!settings.apiKey };
});
ipcMain.handle('ai:clear-key', (event) => {
  if (!isTrustedAISender(event)) return { ok: false };
  settings.apiKey = '';
  anthropicClient = null;
  saveSettings();
  return { ok: true };
});
ipcMain.handle('ai:set-model', (event, model) => {
  if (!isTrustedAISender(event)) return { ok: false };
  if (AI_MODELS.some((m) => m.id === model)) { settings.model = model; saveSettings(); }
  return { ok: true, model: settings.model };
});

ipcMain.on('ai:chat', async (event, payload) => {
  const id = payload && payload.id;
  const send = (suffix, data) => { try { event.sender.send(`ai:${suffix}:${id}`, data); } catch (_) {} };

  if (!isTrustedAISender(event)) return send('error', 'Unauthorized request.');
  if (!Anthropic) return send('error', 'sdk-missing');
  const client = getClient();
  if (!client) return send('error', 'no-key');

  const raw = (payload && payload.messages) || [];
  const messages = (Array.isArray(raw) ? raw : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-40);
  if (!messages.length) return send('error', 'Empty message.');

  const controller = new AbortController();
  aiStreams.set(id, controller);
  try {
    // Opus 4.8: no temperature/top_p/budget_tokens (those 400); adaptive thinking omitted for snappy chat.
    const stream = client.messages.stream(
      {
        model: settings.model || AI_DEFAULT_MODEL,
        max_tokens: 4096,
        system: AI_SYSTEM_PROMPT,
        messages,
      },
      { signal: controller.signal },
    );
    stream.on('text', (t) => send('text', t));
    await stream.finalMessage();
    send('done', { ok: true });
  } catch (err) {
    if (controller.signal.aborted) { send('error', 'aborted'); }
    else {
      const status = err && err.status;
      let msg = (err && err.message) ? err.message : String(err);
      if (status === 401 || (err && err.name === 'AuthenticationError')) msg = 'auth';
      else if (status === 429) msg = 'Rate limited — please wait a moment and try again.';
      send('error', msg);
    }
  } finally {
    aiStreams.delete(id);
  }
});
ipcMain.on('ai:cancel', (_event, payload) => {
  const c = aiStreams.get(payload && payload.id);
  if (c) { try { c.abort(); } catch (_) {} aiStreams.delete(payload.id); }
});

// ---------------------------------------------------------------------------
//  Browser services: downloads, extensions, custom background, snip
// ---------------------------------------------------------------------------
const PARTITION = 'persist:cream';
function creamSession() { return session.fromPartition(PARTITION); }
function isShell(event) { return [...chromeWindows].some((w) => w && !w.isDestroyed() && event.sender === w.webContents); }
function toChrome(channel, payload) { try { if (mainWindow) mainWindow.webContents.send(channel, payload); } catch (_) {} }

// ----- Downloads -----
const activeDownloads = new Map(); // id -> DownloadItem
let dlSeq = 0;

function uniquePath(dir, filename) {
  let p = path.join(dir, filename);
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let i = 1;
  while (fs.existsSync(path.join(dir, `${base} (${i})${ext}`))) i++;
  return path.join(dir, `${base} (${i})${ext}`);
}
function dlInfo(id, item, extra) {
  return Object.assign({
    id,
    filename: item.getFilename(),
    url: item.getURL(),
    savePath: item.getSavePath(),
    total: item.getTotalBytes(),
    received: item.getReceivedBytes(),
    state: item.getState(),
    paused: item.isPaused(),
    startTime: Date.now(),
  }, extra || {});
}
function attachDownloads() {
  creamSession().on('will-download', (_e, item) => {
    const id = ++dlSeq;
    // Auto-save to Downloads (Chrome-like), with collision-safe naming.
    try { item.setSavePath(uniquePath(app.getPath('downloads'), item.getFilename())); } catch (_) {}
    activeDownloads.set(id, item);
    toChrome('dl:event', { type: 'started', item: dlInfo(id, item) });
    item.on('updated', (_ev, state) => {
      toChrome('dl:event', { type: 'updated', item: dlInfo(id, item, { state: state === 'interrupted' ? 'interrupted' : 'progressing' }) });
    });
    item.once('done', (_ev, state) => {
      const info = dlInfo(id, item, { state, endTime: Date.now() });
      activeDownloads.delete(id);
      if (state === 'completed') {
        settings.downloads.unshift(info);
        settings.downloads = settings.downloads.slice(0, 200);
        saveSettings();
      }
      toChrome('dl:event', { type: 'done', item: info });
    });
  });
}
ipcMain.handle('dl:list', () => ({
  active: [...activeDownloads.entries()].map(([id, item]) => dlInfo(id, item)),
  history: settings.downloads || [],
}));
ipcMain.on('dl:pause', (_e, id) => { const it = activeDownloads.get(id); if (it) it.pause(); });
ipcMain.on('dl:resume', (_e, id) => { const it = activeDownloads.get(id); if (it && it.canResume()) it.resume(); });
ipcMain.on('dl:cancel', (_e, id) => { const it = activeDownloads.get(id); if (it) it.cancel(); });
ipcMain.on('dl:open', (_e, p) => { if (p) shell.openPath(p); });
ipcMain.on('dl:show', (_e, p) => { if (p) shell.showItemInFolder(p); });
ipcMain.handle('dl:remove', (_e, id) => { settings.downloads = (settings.downloads || []).filter((d) => d.id !== id); saveSettings(); return true; });
ipcMain.handle('dl:clear', () => { settings.downloads = []; saveSettings(); return true; });

// ----- Passwords (local encrypted vault) -----
// Stored under userData as cream-vault.dat. When the OS keychain is available the
// blob is encrypted with Electron safeStorage (DPAPI on Windows); otherwise it
// falls back to obfuscated-but-plaintext JSON. Only trusted chrome windows (preload.js)
// can reach these handlers — arbitrary web pages have no bridge to them.
function vaultPath() { return path.join(app.getPath('userData'), 'cream-vault.dat'); }
let vaultCache = null;
function vaultEncAvailable() { try { return safeStorage.isEncryptionAvailable(); } catch (_) { return false; } }
function loadVault() {
  if (vaultCache) return vaultCache;
  try {
    const buf = fs.readFileSync(vaultPath());
    let json;
    if (buf.length && buf[0] === 1) json = safeStorage.decryptString(buf.subarray(1));
    else if (buf.length && buf[0] === 0) json = buf.subarray(1).toString('utf8');
    else json = buf.toString('utf8');
    const arr = JSON.parse(json);
    vaultCache = Array.isArray(arr) ? arr : [];
  } catch (_) { vaultCache = []; }
  return vaultCache;
}
function saveVault() {
  try {
    fs.mkdirSync(path.dirname(vaultPath()), { recursive: true });
    const json = JSON.stringify(vaultCache || []);
    const out = vaultEncAvailable()
      ? Buffer.concat([Buffer.from([1]), safeStorage.encryptString(json)])
      : Buffer.concat([Buffer.from([0]), Buffer.from(json, 'utf8')]);
    fs.writeFileSync(vaultPath(), out);
  } catch (_) {}
}
function pwId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pwHost(u) { try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (_) { return String(u || '').trim().toLowerCase(); } }
function pwKey(u, n) { return pwHost(u) + ' ' + String(n || '').toLowerCase(); }
function pwMergeRows(rows) {
  const list = loadVault();
  const have = new Set(list.map((x) => pwKey(x.url, x.username)));
  let added = 0;
  for (const r of rows) {
    if (!r) continue;
    const url = String(r.url || '').trim(), username = String(r.username || '').trim(), password = String(r.password || '');
    if (!url && !username && !password) continue;
    const k = pwKey(url, username);
    if (have.has(k)) continue;
    have.add(k);
    list.unshift({ id: pwId(), url, username, password, note: String(r.note || ''), created: Date.now(), updated: Date.now() });
    added++;
  }
  if (added) saveVault();
  return added;
}
// Minimal RFC-4180 CSV parser (handles quotes, escaped quotes, CRLF).
function parseCsv(text) {
  text = String(text || '').replace(/^﻿/, '');
  const rows = []; let row = [], field = '', inQ = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function parsePasswordCsv(text) {
  const rows = parseCsv(text).filter((r) => r.length && r.some((c) => c.trim() !== ''));
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names) => { for (const n of names) { const j = header.indexOf(n); if (j >= 0) return j; } return -1; };
  const ui = idx(['url', 'login_uri', 'website', 'site', 'web site', 'hostname']);
  const ni = idx(['username', 'login', 'login_username', 'user', 'email', 'account']);
  const pi = idx(['password', 'login_password', 'pass', 'pwd']);
  const noi = idx(['note', 'notes', 'comment', 'extra']);
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const url = ui >= 0 ? (cells[ui] || '').trim() : '';
    const username = ni >= 0 ? (cells[ni] || '').trim() : '';
    const password = pi >= 0 ? (cells[pi] || '') : '';
    const note = noi >= 0 ? (cells[noi] || '') : '';
    if (!url && !username && !password) continue;
    out.push({ url, username, password, note });
  }
  return out;
}
ipcMain.handle('pw:available', (e) => isShell(e) && vaultEncAvailable());
ipcMain.handle('pw:list', (e) => (isShell(e) ? loadVault() : []));
ipcMain.handle('pw:add', (e, entry) => {
  if (!isShell(e) || !entry) return null;
  const it = { id: pwId(), url: String(entry.url || '').trim(), username: String(entry.username || ''), password: String(entry.password || ''), note: String(entry.note || ''), created: Date.now(), updated: Date.now() };
  loadVault().unshift(it); saveVault(); return it;
});
ipcMain.handle('pw:update', (e, id, patch) => {
  if (!isShell(e)) return false;
  const it = loadVault().find((x) => x.id === id); if (!it) return false;
  ['url', 'username', 'password', 'note'].forEach((k) => { if (patch && patch[k] !== undefined) it[k] = String(patch[k]); });
  it.updated = Date.now(); saveVault(); return true;
});
ipcMain.handle('pw:remove', (e, id) => {
  if (!isShell(e)) return false;
  vaultCache = loadVault().filter((x) => x.id !== id); saveVault(); return true;
});
ipcMain.handle('pw:import', (e, rows) => (isShell(e) && Array.isArray(rows) ? pwMergeRows(rows) : 0));
ipcMain.handle('pw:import-csv', async (e) => {
  if (!isShell(e)) return { ok: false };
  const owner = BrowserWindow.fromWebContents(e.sender) || mainWindow;
  const r = await dialog.showOpenDialog(owner, { title: 'Import passwords from CSV', properties: ['openFile'], filters: [{ name: 'CSV files', extensions: ['csv'] }] });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  let text = '';
  try { text = fs.readFileSync(r.filePaths[0], 'utf8'); } catch (_) { return { ok: false, error: 'Could not read file' }; }
  const rows = parsePasswordCsv(text);
  if (!rows.length) return { ok: false, error: 'No logins found in that file' };
  return { ok: true, added: pwMergeRows(rows), total: rows.length };
});

// ----- Autofill (origin scoped by the sender frame, not the renderer) -----
function senderUrl(e) {
  let url = '';
  try { url = (e.senderFrame && e.senderFrame.url) || ''; } catch (_) {}
  if (!url) { try { url = e.sender.getURL(); } catch (_) {} }
  return url;
}
ipcMain.handle('autofill:lookup', (e) => {
  const host = pwHost(senderUrl(e));
  if (!host) return [];
  return loadVault()
    .filter((x) => pwHost(x.url) === host && (x.username || x.password))
    .map((x) => ({ username: x.username || '', password: x.password || '' }));
});
ipcMain.on('autofill:offer-save', (e, entry) => {
  if (!entry || !entry.password) return;
  const url = senderUrl(e);
  const host = pwHost(url);
  if (!host) return;
  const username = String(entry.username || '');
  const existing = loadVault().find((x) => pwHost(x.url) === host && (x.username || '').toLowerCase() === username.toLowerCase());
  if (existing && existing.password === entry.password) return; // nothing changed
  toChrome('autofill:save-prompt', { host, url, username, password: String(entry.password), existingId: existing ? existing.id : null });
});

// ----- Default browser -----
function isDefaultBrowser() {
  try { return app.isDefaultProtocolClient('http'); } catch (_) { return false; }
}
ipcMain.handle('default:status', (e) => {
  if (!isShell(e)) return { isDefault: true, askedAt: Date.now() };
  return { isDefault: isDefaultBrowser(), askedAt: settings.defaultAskedAt || 0 };
});
ipcMain.handle('default:make', (e) => {
  if (!isShell(e)) return false;
  // Register Drift as an http/https handler (HKCU), then open Windows' default-apps
  // page so the user can confirm — Windows won't let an app self-assign the default browser.
  try { app.setAsDefaultProtocolClient('http'); } catch (_) {}
  try { app.setAsDefaultProtocolClient('https'); } catch (_) {}
  try { shell.openExternal('ms-settings:defaultapps'); } catch (_) {}
  settings.defaultAskedAt = Date.now(); saveSettings();
  return true;
});
ipcMain.handle('default:snooze', (e) => {
  if (isShell(e)) { settings.defaultAskedAt = Date.now(); saveSettings(); }
  return true;
});

// ----- Extensions (unpacked) -----
const loadedExt = new Map(); // id -> path
async function loadExtensionPath(p) {
  const ext = await creamSession().loadExtension(p, { allowFileAccess: true });
  loadedExt.set(ext.id, p);
  return { id: ext.id, name: ext.name, version: ext.version, path: p };
}
async function loadExtensionsFromSettings() {
  for (const p of settings.extensions || []) {
    try { await loadExtensionPath(p); } catch (_) { /* skip broken/removed paths */ }
  }
}
// uBlock Origin ships with Drift and loads whenever it's the chosen ad-block engine.
// It is kept out of the user "Extensions" list and managed via Privacy → engine.
const UBO_PATH = path.join(__dirname, 'extensions', 'uBlock0.chromium');
let uboId = null;
async function loadBundledUbo() {
  if (uboId) return;
  try {
    if (!fs.existsSync(path.join(UBO_PATH, 'manifest.json'))) return;
    const ext = await creamSession().loadExtension(UBO_PATH, { allowFileAccess: true });
    uboId = ext.id;
  } catch (_) { uboId = null; }
}
function unloadBundledUbo() {
  if (!uboId) return;
  try { creamSession().removeExtension(uboId); } catch (_) {}
  uboId = null;
}
async function syncAdblockEngine() {
  if (settings.adblockEngine === 'ublock') await loadBundledUbo();
  else unloadBundledUbo();
}
ipcMain.handle('ext:list', () => [...loadedExt.entries()].map(([id, p]) => {
  let info = null;
  try { info = creamSession().getExtension(id); } catch (_) {}
  return { id, path: p, name: info ? info.name : path.basename(p), version: info ? info.version : '' };
}));
ipcMain.handle('ext:add', async (event) => {
  if (!isShell(event)) return { ok: false };
  const r = await dialog.showOpenDialog(mainWindow, { title: 'Select an unpacked extension folder', properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  try {
    const info = await loadExtensionPath(r.filePaths[0]);
    if (!settings.extensions.includes(info.path)) { settings.extensions.push(info.path); saveSettings(); }
    return { ok: true, ext: info };
  } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
});
ipcMain.handle('ext:remove', (event, id) => {
  if (!isShell(event)) return { ok: false };
  const p = loadedExt.get(id);
  try { creamSession().removeExtension(id); } catch (_) {}
  loadedExt.delete(id);
  if (p) { settings.extensions = settings.extensions.filter((x) => x !== p); saveSettings(); }
  return { ok: true };
});

// ----- Custom new-tab background -----
function backgroundFileURL() { return settings.background ? pathToFileURL(settings.background).href : null; }
ipcMain.handle('bg:get', () => backgroundFileURL());
ipcMain.handle('bg:choose', async (event) => {
  if (!isShell(event)) return { ok: false };
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a background image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'] }],
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  try {
    const src = r.filePaths[0];
    const dest = path.join(app.getPath('userData'), 'background' + (path.extname(src) || '.img'));
    try {
      for (const f of fs.readdirSync(app.getPath('userData'))) {
        if (/^background\./i.test(f)) fs.rmSync(path.join(app.getPath('userData'), f), { force: true });
      }
    } catch (_) {}
    fs.copyFileSync(src, dest);
    settings.background = dest;
    saveSettings();
    return { ok: true, url: backgroundFileURL() };
  } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
});
ipcMain.handle('bg:clear', (event) => {
  if (!isShell(event)) return { ok: false };
  // Only delete user-uploaded copies in userData — never the packaged preset SVGs.
  try { if (settings.background && settings.background.startsWith(app.getPath('userData'))) fs.rmSync(settings.background, { force: true }); } catch (_) {}
  settings.background = '';
  saveSettings();
  return { ok: true };
});
ipcMain.handle('bg:set-preset', (event, name) => {
  if (!isShell(event)) return { ok: false };
  if (!/^[a-z0-9_-]+\.svg$/i.test(name || '')) return { ok: false };
  const p = path.join(__dirname, 'src', 'backgrounds', name);
  if (!fs.existsSync(p)) return { ok: false };
  settings.background = p;
  saveSettings();
  return { ok: true, url: pathToFileURL(p).href };
});

// ----- Snip (region screenshot) -----
ipcMain.handle('snip:save', (_e, dataUrl) => {
  try {
    const img = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(img);
    const file = uniquePath(app.getPath('downloads'), `Drift-snip-${Date.now()}.png`);
    fs.writeFileSync(file, img.toPNG());
    const info = { id: ++dlSeq, filename: path.basename(file), url: 'snip://capture', savePath: file, total: img.toPNG().length, received: img.toPNG().length, state: 'completed', paused: false, startTime: Date.now(), endTime: Date.now(), snip: true };
    settings.downloads.unshift(info);
    settings.downloads = settings.downloads.slice(0, 200);
    saveSettings();
    toChrome('dl:event', { type: 'done', item: info });
    return { ok: true, path: file };
  } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
});

// ----- Privacy + ad/tracker blocker -----
let adblockEnabled = true;
let dntEnabled = true;
let blockedCount = 0;
let webRequestApplied = false;
const allowSet = new Set(); // hostnames where ad blocking is disabled
const wcHost = new Map(); // webContents id -> current top hostname
const AD_HOSTS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'google-analytics.com',
  'googletagmanager.com', 'googletagservices.com', 'adservice.google.com', 'analytics.google.com',
  'stats.g.doubleclick.net', 'amazon-adsystem.com', 'adnxs.com', 'adsrvr.org', 'advertising.com',
  'adform.net', 'adcolony.com', 'applovin.com', 'criteo.com', 'criteo.net', 'taboola.com',
  'outbrain.com', 'scorecardresearch.com', 'quantserve.com', 'quantcast.com', 'moatads.com',
  'rubiconproject.com', 'pubmatic.com', 'openx.net', 'casalemedia.com', 'smartadserver.com',
  '3lift.com', 'sharethrough.com', 'teads.tv', 'indexww.com', 'bidswitch.net', 'mathtag.com',
  'bluekai.com', 'krxd.net', 'demdex.net', 'everesttech.net', 'rlcdn.com', 'agkn.com', 'adroll.com',
  'doubleverify.com', 'zedo.com', 'exponential.com', 'contextweb.com', 'gumgum.com', 'yieldmo.com',
  'conversantmedia.com', 'districtm.io', 'media.net', 'revcontent.com', 'mgid.com', 'propellerads.com',
  'popads.net', 'onclickads.net', 'admaven.com', 'hilltopads.net', 'hotjar.com', 'mixpanel.com',
  'segment.com', 'segment.io', 'fullstory.com', 'mouseflow.com', 'crazyegg.com', 'optimizely.com',
  'appsflyer.com', 'kochava.com', 'chartbeat.com', 'newrelic.com', 'nr-data.net', 'an.yandex.ru',
  'mc.yandex.ru', 'serving-sys.com', 'flashtalking.com', 'adsafeprotected.com', 'adsymptotic.com',
  'tapad.com', 'liveintent.com', 'crwdcntrl.net', 'yieldlab.net', 'smaato.net', 'inmobi.com',
  'mopub.com', 'chartboost.com', 'vungle.com', 'startappservice.com', 'omtrdc.net', '2o7.net',
  'sail-horizon.com', 'analytics.tiktok.com', 'ads.linkedin.com', 'ads.yahoo.com', 'adtechus.com',
];
function hostBlocked(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return AD_HOSTS.some((d) => h === d || h.endsWith('.' + d));
  } catch (_) { return false; }
}
const wrSessions = new Set();
function applyWebRequest() { applyWebRequestTo(creamSession()); }
function applyWebRequestTo(ses) {
  if (wrSessions.has(ses)) return;
  wrSessions.add(ses);
  hardenSession(ses);
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, cb) => {
    if (adblockEnabled && details.url && hostBlocked(details.url)) {
      const id = details.webContentsId;
      const pageHost = id != null ? wcHost.get(id) : null;
      if (pageHost && allowSet.has(pageHost)) { cb({ cancel: false }); return; } // site allow-listed
      blockedCount++;
      cb({ cancel: true });
      return;
    }
    cb({ cancel: false });
  });
  ses.webRequest.onBeforeSendHeaders({ urls: ['http://*/*', 'https://*/*'] }, (details, cb) => {
    const headers = details.requestHeaders || {};
    if (dntEnabled) { headers['DNT'] = '1'; headers['Sec-GPC'] = '1'; }
    else { delete headers['DNT']; delete headers['Sec-GPC']; }
    cb({ requestHeaders: headers });
  });
}
ipcMain.handle('privacy:get', () => ({ adblock: settings.adblock !== false, adblockEngine: settings.adblockEngine || 'cream', dnt: dntEnabled, blocked: blockedCount, allow: [...allowSet], clearExit: settings.clearExit || { ...DEFAULT_CLEAR_EXIT } }));
ipcMain.handle('privacy:set-clear-exit', (event, p) => {
  if (!isShell(event)) return { ok: false };
  settings.clearExit = { history: !!(p && p.history), cookies: !!(p && p.cookies), cache: !!(p && p.cache) };
  saveSettings();
  return { ok: true, clearExit: settings.clearExit };
});
ipcMain.handle('privacy:allow-site', (event, host, allowed) => {
  if (!isShell(event)) return { ok: false };
  host = (host || '').toLowerCase().replace(/^www\./, '');
  if (!host) return { ok: false };
  if (allowed) allowSet.add(host); else allowSet.delete(host);
  settings.adblockAllow = [...allowSet];
  saveSettings();
  return { ok: true, allowed: allowSet.has(host) };
});
ipcMain.handle('privacy:set', (event, p) => {
  if (!isShell(event)) return { ok: false };
  if (p && typeof p.adblock === 'boolean') settings.adblock = p.adblock;
  if (p && (p.adblockEngine === 'cream' || p.adblockEngine === 'ublock')) settings.adblockEngine = p.adblockEngine;
  if (p && typeof p.dnt === 'boolean') { dntEnabled = p.dnt; settings.dnt = p.dnt; }
  // Drift's built-in blocker is active only when chosen as the engine.
  adblockEnabled = (settings.adblockEngine !== 'ublock') && (settings.adblock !== false);
  syncAdblockEngine();
  saveSettings();
  return { ok: true, adblock: settings.adblock !== false, adblockEngine: settings.adblockEngine, dnt: dntEnabled };
});
ipcMain.handle('privacy:clear', async (event, what) => {
  if (!isShell(event)) return { ok: false };
  const ses = creamSession();
  try {
    if (what === 'cache') await ses.clearCache();
    else if (what === 'cookies') await ses.clearStorageData({ storages: ['cookies'] });
    else { await ses.clearStorageData(); await ses.clearCache(); }
    return { ok: true };
  } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
});

// ----- Background music -----
ipcMain.handle('music:choose', async (event) => {
  if (!isShell(event)) return { ok: false };
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose background music',
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'weba', 'webm'] }],
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  const p = r.filePaths[0];
  return { ok: true, path: p, name: path.basename(p), url: pathToFileURL(p).href };
});

// ---- Wire up <webview> web contents ----
// ---------------------------------------------------------------------------
//  Import bookmarks from other browsers (Chromium family — plain JSON, no deps)
// ---------------------------------------------------------------------------
const BROWSER_SOURCES = [
  { id: 'chrome', name: 'Google Chrome', env: 'LOCALAPPDATA', sub: 'Google/Chrome/User Data' },
  { id: 'edge', name: 'Microsoft Edge', env: 'LOCALAPPDATA', sub: 'Microsoft/Edge/User Data' },
  { id: 'brave', name: 'Brave', env: 'LOCALAPPDATA', sub: 'BraveSoftware/Brave-Browser/User Data' },
  { id: 'vivaldi', name: 'Vivaldi', env: 'LOCALAPPDATA', sub: 'Vivaldi/User Data' },
  { id: 'operagx', name: 'Opera GX', env: 'APPDATA', sub: 'Opera Software/Opera GX Stable' },
  { id: 'opera', name: 'Opera', env: 'APPDATA', sub: 'Opera Software/Opera Stable' },
  { id: 'chromium', name: 'Chromium', env: 'LOCALAPPDATA', sub: 'Chromium/User Data' },
];
function bookmarkFileFor(s) {
  const base = process.env[s.env]; if (!base) return null;
  const root = path.join(base, ...s.sub.split('/'));
  const cands = [path.join(root, 'Default', 'Bookmarks'), path.join(root, 'Bookmarks'), path.join(root, 'Profile 1', 'Bookmarks'), path.join(root, 'Profile 2', 'Bookmarks')];
  for (const c of cands) { try { if (fs.existsSync(c)) return c; } catch (_) {} }
  return null;
}
function flattenBookmarks(node, out) {
  if (!node) return;
  if (node.type === 'url' && node.url && /^https?:/i.test(node.url)) out.push({ title: node.name || node.url, url: node.url });
  if (Array.isArray(node.children)) for (const c of node.children) flattenBookmarks(c, out);
}
function readBrowserBookmarks(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const roots = (raw && raw.roots) || {};
  const out = [];
  for (const k of Object.keys(roots)) flattenBookmarks(roots[k], out);
  const seen = new Set();
  return out.filter((b) => (seen.has(b.url) ? false : (seen.add(b.url), true)));
}
ipcMain.handle('import:list', (e) => {
  if (!isShell(e)) return [];
  const list = [];
  for (const s of BROWSER_SOURCES) {
    const f = bookmarkFileFor(s); if (!f) continue;
    let count = 0; try { count = readBrowserBookmarks(f).length; } catch (_) {}
    list.push({ id: s.id, name: s.name, count });
  }
  return list;
});
ipcMain.handle('import:bookmarks', (e, id) => {
  if (!isShell(e)) return { ok: false };
  const s = BROWSER_SOURCES.find((x) => x.id === id); if (!s) return { ok: false };
  const f = bookmarkFileFor(s); if (!f) return { ok: false };
  try { return { ok: true, items: readBrowserBookmarks(f) }; } catch (_) { return { ok: false }; }
});

app.on('web-contents-created', (event, contents) => {
  if (contents.getType() !== 'webview') return;

  // Glass theme: give the webview a transparent base so a transparent page (the
  // new tab) reveals the window's acrylic. Opaque sites paint their own background.
  if (settings && settings.acrylic) { try { contents.setBackgroundColor('#00000000'); } catch (_) {} }

  // Route target=_blank / window.open into a new tab in the owning window.
  contents.setWindowOpenHandler(({ url }) => {
    const owner = BrowserWindow.getFocusedWindow() || mainWindow;
    if (owner) owner.webContents.send('open-tab', url);
    return { action: 'deny' };
  });

  // Track each webview's current top hostname (for per-site ad-block allow-listing).
  const setHost = (url) => { try { wcHost.set(contents.id, new URL(url).hostname.replace(/^www\./, '')); } catch (_) {} };
  contents.on('did-navigate', (_e, url) => setHost(url));
  contents.on('did-navigate-in-page', (_e, url, isMain) => { if (isMain) setHost(url); });
  contents.on('destroyed', () => wcHost.delete(contents.id));

  // Forward key browser shortcuts to the chrome renderer even when a page is focused.
  contents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const mod = input.control || input.meta;
    const key = (input.key || '').toLowerCase();
    let action = null;

    if (mod && input.shift && key === 'n') action = 'new-incognito';
    else if (mod && key === 't') action = 'new-tab';
    else if (mod && key === 'w') action = 'close-tab';
    else if (mod && key === 'l') action = 'focus-omnibox';
    else if (mod && key === 'r') action = 'reload';
    else if (mod && key === 'd') action = 'bookmark';
    else if (mod && key === 'h') action = 'toggle-history';
    else if (mod && key === 'tab') action = input.shift ? 'prev-tab' : 'next-tab';
    else if (mod && /^[1-9]$/.test(key)) action = 'switch-' + key;
    else if (key === 'f5') action = 'reload';
    else if (mod && (key === '=' || key === '+' || key === 'add')) action = 'zoom-in';
    else if (mod && (key === '-' || key === 'subtract')) action = 'zoom-out';
    else if (mod && key === '0') action = 'zoom-reset';
    else if (input.alt && key === 'arrowleft') action = 'back';
    else if (input.alt && key === 'arrowright') action = 'forward';

    if (action) {
      e.preventDefault();
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (win) win.webContents.send('shortcut', action);
    }
  });
});

// One-time: carry data over from a previous app name (Cream → Solace → Drift) so
// renaming doesn't orphan the user's settings, password vault, bookmarks, cookies, etc.
function migrateUserDataFrom(prevName) {
  try {
    const cur = app.getPath('userData');
    const prev = path.join(path.dirname(cur), prevName);
    const flag = path.join(cur, '.migratedFrom' + prevName);
    if (prev === cur || fs.existsSync(flag)) return;
    if (fs.existsSync(prev)) {
      fs.mkdirSync(cur, { recursive: true });
      const SKIP = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'ShaderCache', 'GrShaderCache', 'logs', 'Crashpad', 'blob_storage']);
      for (const name of fs.readdirSync(prev)) {
        if (SKIP.has(name)) continue;
        const to = path.join(cur, name);
        if (fs.existsSync(to)) continue; // never overwrite anything already in the new profile
        try { fs.cpSync(path.join(prev, name), to, { recursive: true }); } catch (_) {}
      }
    }
    fs.mkdirSync(cur, { recursive: true });
    fs.writeFileSync(flag, new Date().toISOString());
  } catch (_) {}
}
// Most recent legacy name first, so its data wins when a file exists under both.
function migrateLegacyUserData() { migrateUserDataFrom('Solace'); migrateUserDataFrom('Cream'); }

app.whenReady().then(() => {
  migrateLegacyUserData();
  settings = loadSettings();
  // One-time: turn on the bundled uBlock Origin by default for everyone.
  if (!settings.uboDefaultApplied) { settings.adblockEngine = 'ublock'; settings.uboDefaultApplied = true; saveSettings(); }
  adblockEnabled = (settings.adblockEngine !== 'ublock') && (settings.adblock !== false);
  dntEnabled = settings.dnt !== false;
  (settings.adblockAllow || []).forEach((h) => allowSet.add(h));
  createWindow();
  attachDownloads();
  applyWebRequest();
  loadExtensionsFromSettings();
  syncAdblockEngine();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Automatic data clearing on exit — wipe cache / cookies+logins / history per settings.
let clearingOnExit = false;
app.on('before-quit', (e) => {
  const ce = settings.clearExit || {};
  if (clearingOnExit || (!ce.history && !ce.cookies && !ce.cache)) return;
  e.preventDefault();
  clearingOnExit = true;
  (async () => {
    try {
      if (ce.history) {
        for (const w of chromeWindows) {
          if (w && !w.isDestroyed()) { try { await w.webContents.executeJavaScript("try{localStorage.removeItem('cream.history')}catch(e){}"); } catch (_) {} }
        }
      }
      const ses = creamSession();
      if (ce.cookies) { try { await ses.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'serviceworkers'] }); } catch (_) {} }
      if (ce.cache) { try { await ses.clearCache(); await ses.clearStorageData({ storages: ['cachestorage', 'shadercache'] }); } catch (_) {} }
    } catch (_) {}
    app.quit();
  })();
});
