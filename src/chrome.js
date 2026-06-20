'use strict';

/* ============================================================
   Drift — browser chrome logic
   ============================================================ */

const NEWTAB_URL = new URL('newtab.html', location.href).href;
const NEWTAB_PRELOAD = new URL('newtab-preload.js', location.href).href;

// Base themes (color schemes). c1/c2 = preview gradient stops for the picker.
const THEMES = [
  { id: 'light',    name: 'Light',    dark: false, c1: '#f8f2e4', c2: '#efe4cf' },
  { id: 'sepia',    name: 'Sepia',    dark: false, c1: '#efe2c6', c2: '#e3d2ac' },
  { id: 'arctic',   name: 'Arctic',   dark: false, c1: '#eef3f8', c2: '#dde7f0' },
  { id: 'dark',     name: 'Dark',     dark: true,  c1: '#2b2620', c2: '#201c17' },
  { id: 'midnight', name: 'Midnight', dark: true,  c1: '#161d33', c2: '#0f1424' },
  { id: 'slate',    name: 'Slate',    dark: true,  c1: '#222730', c2: '#191d24' },
  { id: 'noir',     name: 'Noir',     dark: true,  c1: '#161616', c2: '#000000' },
];
const THEME_IDS = THEMES.map((t) => t.id);
function isDarkTheme(t) { const e = THEMES.find((x) => x.id === t); return e ? e.dark : false; }

let theme = THEME_IDS.includes(document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : 'light';
let currentPreset = (function () { try { return localStorage.getItem('cream.preset') || 'terracotta'; } catch (_) { return 'terracotta'; } })();
const INCOGNITO = (function () { try { return new URLSearchParams(location.search).get('incognito') === '1'; } catch (_) { return false; } })();

const SEARCH_ENGINES = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  brave: { name: 'Brave', url: 'https://search.brave.com/search?q=' },
  startpage: { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=' },
  ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' },
};
function currentEngine() { try { const e = localStorage.getItem('cream.search'); return SEARCH_ENGINES[e] ? e : 'google'; } catch (_) { return 'google'; } }
function searchURL(q) { return (SEARCH_ENGINES[currentEngine()] || SEARCH_ENGINES.google).url + encodeURIComponent(q); }
function liteMode() { try { return localStorage.getItem('cream.lite') === '1'; } catch (_) { return false; } }
function animOff() { try { return localStorage.getItem('cream.anim') === '0' || liteMode(); } catch (_) { return false; } }

function newTabTarget(extra) { return NEWTAB_URL + '?theme=' + theme + '&preset=' + currentPreset + newTabExtras() + (extra || ''); }
function aiEnabled() { try { return localStorage.getItem('cream.aiEnabled') !== '0'; } catch (_) { return true; } }
function widgetPrefs() { try { const w = JSON.parse(localStorage.getItem('cream.widgets') || '{}'); return { weather: !!(w && w.weather), reminders: !!(w && w.reminders), loc: (w && w.loc) || '' }; } catch (_) { return { weather: false, reminders: false, loc: '' }; } }
function newTabExtras() {
  let s = '&se=' + currentEngine();
  if (animOff()) s += '&anim=0';
  if (liteMode()) s += '&lite=1';
  if (minimalMode()) s += '&minimal=1';
  if (acrylicOn()) s += '&glass=1&glasslvl=' + glassLevel();
  try { if (localStorage.getItem('cream.accentMode') === 'custom' && /^#?[0-9a-fA-F]{6}$/.test(localStorage.getItem('cream.accent') || '')) s += '&accent=' + encodeURIComponent(localStorage.getItem('cream.accent')); } catch (_) {}
  if (INCOGNITO) return s + '&incognito=1&ai=0'; // private new-tab stays minimal — no AI, widgets, or weather calls
  if (!aiEnabled()) s += '&ai=0';
  const w = widgetPrefs();
  if (w.weather) s += '&weather=1';
  if (w.reminders) s += '&reminders=1';
  if (w.weather && w.loc) s += '&wloc=' + encodeURIComponent(w.loc);
  return s;
}

const GLOBE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a89d85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>'
);

const IC = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
};

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);
const viewsEl = $('views');
const tabstripEl = $('tabstrip');
const addressEl = $('address');
const omniIconEl = $('omniIcon');
const omniboxEl = $('omnibox');
const starBtn = $('starBtn');
const bookmarksBarEl = $('bookmarksBar');
const historyPanel = $('historyPanel');
const historyListEl = $('historyList');
const historySearchEl = $('historySearch');
const scrim = $('scrim');
const menuDropdown = $('menuDropdown');

// ---- State ----
let tabs = [];
let activeId = null;
let tabSeq = 0;
let historyPanelOpen = false;
let menuOpen = false;
const seenTabIds = new Set(); // tabs already rendered once (so only new tabs animate in)

let bookmarks = load('cream.bookmarks', []);
let history = load('cream.history', []);

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : fallback; }
  catch { return fallback; }
}
function saveBookmarks() { localStorage.setItem('cream.bookmarks', JSON.stringify(bookmarks)); }
function saveHistory() { localStorage.setItem('cream.history', JSON.stringify(history.slice(0, 800))); }

// ---- Helpers ----
const activeTab = () => tabs.find((t) => t.id === activeId);
const isActive = (tab) => tab.id === activeId;
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } }
function isNewTab(url) { return !url || url === NEWTAB_URL || /\/newtab\.html(\?.*)?$/.test(url); }
function isInternal(url) { return !url || isNewTab(url) || url.startsWith('data:') || url.startsWith('view-source:'); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/** Smart omnibox: decide between navigating to a URL or searching the web. */
function toURL(input) {
  let q = (input || '').trim();
  if (!q) return null;
  if (/^(https?|file|data|about|view-source):/i.test(q)) return q;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(q)) return 'http://' + q;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(q)) return 'http://' + q;
  // A single token containing a dot and a plausible TLD => treat as a URL.
  if (!/\s/.test(q) && /^[^\s]+\.[a-z]{2,}([:/?#].*)?$/i.test(q)) return 'https://' + q;
  return searchURL(q);
}

function faviconNode(favicon, label, extraClass) {
  const cls = extraClass || '';
  if (favicon) {
    const img = document.createElement('img');
    img.src = favicon;
    if (cls) img.className = cls;
    img.addEventListener('error', () => img.replaceWith(fallbackNode(label, cls)), { once: true });
    return img;
  }
  return fallbackNode(label, cls);
}
function fallbackNode(label, cls) {
  const d = document.createElement('div');
  d.className = 'bm-fallback' + (cls ? ' ' + cls : '');
  d.textContent = (label || '?').trim().charAt(0).toUpperCase() || '?';
  return d;
}

// ============================================================
//  Tabs
// ============================================================
function createTab(url = newTabTarget(), { activate = true } = {}) {
  const id = ++tabSeq;
  const wv = document.createElement('webview');
  wv.setAttribute('partition', INCOGNITO ? 'incognito' : 'persist:cream');
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('preload', NEWTAB_PRELOAD); // AI bridge — only exposed on the new-tab page
  wv.setAttribute('webpreferences', 'contextIsolation=yes');
  wv.setAttribute('src', url);
  wv.dataset.id = String(id);
  viewsEl.appendChild(wv);

  const tab = { id, wv, url, title: 'New Tab', favicon: '', loading: false, _hist: null, lastActive: Date.now(), discarded: false };
  tabs.push(tab);
  wireWebview(tab);
  if (activate) setActiveTab(id);
  else renderTabs();
  return tab;
}

// ---- Sleeping tabs: free a background tab's memory after it's been idle, and
// recreate it on demand. The webview's renderer process is destroyed on discard. ----
function sleepMins() { try { const n = parseInt(localStorage.getItem('cream.sleepMins') || '0', 10); return Number.isFinite(n) ? n : 0; } catch (_) { return 0; } }
function wakeTab(tab) {
  if (!tab.discarded) return;
  const wv = document.createElement('webview');
  wv.setAttribute('partition', INCOGNITO ? 'incognito' : 'persist:cream');
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('preload', NEWTAB_PRELOAD);
  wv.setAttribute('webpreferences', 'contextIsolation=yes');
  wv.setAttribute('src', tab.url || newTabTarget());
  wv.dataset.id = String(tab.id);
  viewsEl.appendChild(wv);
  tab.wv = wv; tab.discarded = false; tab.loading = true;
  wireWebview(tab);
}
function discardTab(tab) {
  if (!tab.wv || tab.discarded || tab.id === activeId) return;
  try { const u = tab.wv.getURL(); if (u) tab.url = u; } catch (_) {}
  try { tab.wv.remove(); } catch (_) {}
  tab.wv = null; tab.discarded = true; tab.loading = false;
  renderTabs();
}
function sweepIdleTabs() {
  const mins = sleepMins(); if (!mins) return;
  const cutoff = Date.now() - mins * 60000;
  for (const t of tabs) {
    if (t.id === activeId || t.discarded || !t.wv || isNewTab(t.url)) continue;
    if ((t.lastActive || 0) < cutoff) discardTab(t);
  }
}
setInterval(sweepIdleTabs, 30000); // check every 30s

function setActiveTab(id) {
  activeId = id;
  const cur = tabs.find((t) => t.id === id);
  if (cur && cur.discarded) wakeTab(cur);        // bring a sleeping tab back
  if (cur) cur.lastActive = Date.now();
  for (const t of tabs) { if (t.wv) t.wv.classList.toggle('active', t.id === id); }
  renderTabs();
  syncChrome();
}

function closeTab(id) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const [tab] = tabs.splice(idx, 1);
  if (tab.wv) tab.wv.remove();
  if (tabs.length === 0) { createTab(); return; }
  if (activeId === id) setActiveTab(tabs[Math.min(idx, tabs.length - 1)].id);
  else renderTabs();
}

function cycleTab(dir) {
  if (tabs.length < 2) return;
  const i = tabs.findIndex((t) => t.id === activeId);
  const next = (i + dir + tabs.length) % tabs.length;
  setActiveTab(tabs[next].id);
}

function renderTabs() {
  tabstripEl.innerHTML = '';
  for (const tab of tabs) {
    const el = document.createElement('div');
    const fresh = !seenTabIds.has(tab.id);
    if (fresh) seenTabIds.add(tab.id);
    el.className = 'tab' + (tab.id === activeId ? ' active' : '') + (fresh ? ' tab-enter' : '') + (tab.discarded ? ' discarded' : '');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', tab.id === activeId ? 'true' : 'false');
    const label = tab.title || 'New Tab';
    el.title = label;

    let fav;
    if (tab.loading) {
      fav = document.createElement('div');
      fav.className = 'tab-favicon is-loading';
    } else {
      fav = document.createElement('img');
      fav.className = 'tab-favicon';
      fav.src = tab.favicon || GLOBE;
      fav.addEventListener('error', () => { fav.src = GLOBE; }, { once: true });
    }

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = label;

    const close = document.createElement('button');
    close.className = 'tab-close';
    close.title = 'Close tab';
    close.setAttribute('aria-label', 'Close tab');
    close.innerHTML = IC.x;
    close.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab.id); });

    el.append(fav, title, close);
    el.addEventListener('click', () => setActiveTab(tab.id));
    el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id); } });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showTabMenu(e.clientX, e.clientY, tab); });
    tabstripEl.appendChild(el);
  }
}

function wireWebview(tab) {
  const wv = tab.wv;

  wv.addEventListener('did-start-loading', () => {
    tab.loading = true;
    if (isActive(tab)) syncNav();
    renderTabs();
  });
  wv.addEventListener('did-stop-loading', () => {
    tab.loading = false;
    if (isActive(tab)) syncNav();
    renderTabs();
  });
  wv.addEventListener('context-menu', (e) => { try { e.preventDefault(); } catch (_) {} showPageMenu(tab, e.params); });
  wv.addEventListener('did-navigate', (e) => {
    tab.url = e.url;
    addHistory(tab);
    if (isActive(tab)) syncChrome();
  });
  wv.addEventListener('did-navigate-in-page', (e) => {
    if (e.isMainFrame) {
      tab.url = e.url;
      addHistory(tab);
      if (isActive(tab)) { syncOmnibox(); syncNav(); }
    }
  });
  wv.addEventListener('page-title-updated', (e) => {
    tab.title = e.title || tab.title;
    updateHistoryMeta(tab);
    renderTabs();
  });
  wv.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length) { tab.favicon = e.favicons[0]; updateHistoryMeta(tab); renderTabs(); }
  });
  wv.addEventListener('dom-ready', () => { if (isActive(tab)) syncNav(); applyForceDark(tab); applyZoom(tab); });
  wv.addEventListener('did-fail-load', (e) => {
    if (e.isMainFrame && e.errorCode !== -3 && e.validatedURL && !e.validatedURL.startsWith('data:')) {
      tab.loading = false;
      wv.loadURL(errorPage(e.validatedURL, e.errorDescription || ('Error ' + e.errorCode)));
    }
  });
}

// ============================================================
//  Chrome sync (omnibox, nav)
// ============================================================
function syncChrome() { syncOmnibox(); syncNav(); updateZoomUI(); refreshAdblockRail(); if (adblockPopOpen) refreshAdblockPop(); }

function setOmniIcon(kind) {
  omniIconEl.className = 'omni-icon' + (kind === 'secure' ? ' secure' : kind === 'search' ? ' search' : '');
  omniIconEl.innerHTML = kind === 'secure' ? IC.lock : kind === 'search' ? IC.search : IC.globe;
}

function syncOmnibox() {
  const tab = activeTab();
  if (!tab) return;
  const url = tab.url || '';
  if (isInternal(url)) {
    if (document.activeElement !== addressEl) addressEl.value = '';
    setOmniIcon('search');
  } else {
    if (document.activeElement !== addressEl) addressEl.value = url;
    setOmniIcon(url.startsWith('https://') ? 'secure' : 'insecure');
  }
  syncStar();
}

function syncNav() {
  const wv = activeTab() && activeTab().wv;
  let back = false, fwd = false;
  try { back = wv && wv.canGoBack(); fwd = wv && wv.canGoForward(); } catch (_) {}
  $('backBtn').disabled = !back;
  $('forwardBtn').disabled = !fwd;
  document.body.classList.toggle('is-loading', !!(activeTab() && activeTab().loading));
}

// ============================================================
//  Bookmarks
// ============================================================
const isBookmarked = (url) => bookmarks.some((b) => b.url === url);

function toggleBookmark() {
  const tab = activeTab();
  if (!tab) return;
  const url = tab.url;
  if (isInternal(url)) return;
  const i = bookmarks.findIndex((b) => b.url === url);
  if (i >= 0) bookmarks.splice(i, 1);
  else bookmarks.unshift({ url, title: tab.title || hostOf(url), favicon: tab.favicon || '' });
  saveBookmarks();
  renderBookmarks();
  syncStar();
}

function syncStar() {
  const tab = activeTab();
  starBtn.classList.toggle('active', !!(tab && isBookmarked(tab.url)));
}

function renderBookmarks() {
  bookmarksBarEl.innerHTML = '';
  if (!bookmarks.length) {
    bookmarksBarEl.classList.add('empty');
    const hint = document.createElement('span');
    hint.className = 'bm-empty-hint';
    hint.textContent = 'Tip — click the star in the address bar to bookmark a page.';
    bookmarksBarEl.appendChild(hint);
    return;
  }
  bookmarksBarEl.classList.remove('empty');
  for (const bm of bookmarks) {
    const chip = document.createElement('button');
    chip.className = 'bm-chip';
    chip.title = (bm.title || hostOf(bm.url)) + '\n' + bm.url;
    const label = document.createElement('span');
    label.className = 'bm-label';
    label.textContent = bm.title || hostOf(bm.url);
    chip.append(faviconNode(bm.favicon, bm.title || bm.url), label);
    chip.addEventListener('click', () => navigate(bm.url));
    chip.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showBookmarkMenu(e.clientX, e.clientY, bm); });
    bookmarksBarEl.appendChild(chip);
  }
}
function showBookmarkMenu(x, y, bm) {
  showCtxMenu(x, y, [
    { head: bm.title || hostOf(bm.url) },
    { label: 'Open', fn: () => navigate(bm.url) },
    { label: 'Open in new tab', fn: () => createTab(bm.url, { activate: false }) },
    { label: 'Rename…', fn: () => startBookmarkRename(bm) },
    { label: 'Copy address', fn: () => clipText(bm.url) },
    { sep: true },
    { label: 'Remove', fn: () => { bookmarks = bookmarks.filter((b) => b.url !== bm.url); saveBookmarks(); renderBookmarks(); syncStar(); } },
  ]);
}
function startBookmarkRename(bm) {
  renderBookmarks();
  const idx = bookmarks.indexOf(bm);
  const chip = bookmarksBarEl.querySelectorAll('.bm-chip')[idx];
  if (!chip) return;
  const input = document.createElement('input');
  input.className = 'bm-rename'; input.value = bm.title || hostOf(bm.url);
  chip.replaceWith(input); input.focus(); input.select();
  let done = false;
  const commit = (save) => {
    if (done) return; done = true;
    if (save) { const v = input.value.trim(); if (v) { bm.title = v; saveBookmarks(); } }
    renderBookmarks();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(true); else if (e.key === 'Escape') commit(false); });
  input.addEventListener('blur', () => commit(true));
}

// ============================================================
//  History
// ============================================================
function addHistory(tab) {
  const url = tab.url;
  if (INCOGNITO) { tab._hist = null; return; } // private mode never records history
  if (isInternal(url)) { tab._hist = null; return; }
  if (history[0] && history[0].url === url) { tab._hist = history[0]; history[0].ts = Date.now(); return; }
  const entry = { url, title: tab.title || hostOf(url), favicon: tab.favicon || '', ts: Date.now() };
  history.unshift(entry);
  if (history.length > 800) history.length = 800;
  tab._hist = entry;
  saveHistory();
  if (historyPanelOpen) renderHistory();
}
function updateHistoryMeta(tab) {
  if (tab._hist && tab._hist.url === tab.url) {
    if (tab.title) tab._hist.title = tab.title;
    if (tab.favicon) tab._hist.favicon = tab.favicon;
    saveHistory();
    if (historyPanelOpen) renderHistory();
  }
}

function dayBucket(ts) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startToday) return 'Today';
  if (ts >= startToday - 86400000) return 'Yesterday';
  return 'Earlier';
}
function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function renderHistory() {
  const q = historySearchEl.value.trim().toLowerCase();
  const items = q ? history.filter((h) => (h.title + ' ' + h.url).toLowerCase().includes(q)) : history;
  historyListEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = IC.clock + '<p>' + (q ? 'No matching history.' : 'No history yet. Pages you visit will show up here.') + '</p>';
    historyListEl.appendChild(empty);
    return;
  }

  let lastBucket = null;
  for (const h of items) {
    const bucket = dayBucket(h.ts);
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      const lbl = document.createElement('div');
      lbl.className = 'hist-group-label';
      lbl.textContent = bucket;
      historyListEl.appendChild(lbl);
    }
    const row = document.createElement('div');
    row.className = 'hist-item';
    row.title = h.url;

    const text = document.createElement('div');
    text.className = 'hist-text';
    const t = document.createElement('div'); t.className = 'hist-title'; t.textContent = h.title || hostOf(h.url);
    const u = document.createElement('div'); u.className = 'hist-url'; u.textContent = hostOf(h.url);
    text.append(t, u);

    const time = document.createElement('span');
    time.className = 'hist-time';
    time.textContent = fmtTime(h.ts);

    const del = document.createElement('button');
    del.className = 'hist-del';
    del.title = 'Remove';
    del.setAttribute('aria-label', 'Remove from history');
    del.innerHTML = IC.trash;
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      history = history.filter((x) => x !== h);
      saveHistory(); renderHistory();
    });

    row.append(faviconNode(h.favicon, h.title || h.url), text, time, del);
    row.addEventListener('click', () => { navigate(h.url); closeHistory(); });
    historyListEl.appendChild(row);
  }
}

// ============================================================
//  Navigation entry point
// ============================================================
function navigate(input) {
  const url = toURL(input);
  if (!url) return;
  const tab = activeTab() || createTab(url, { activate: true });
  tab.wv.loadURL(url);
}
function focusOmnibox() { addressEl.focus(); addressEl.select(); }

// ============================================================
//  Overlays: history panel + menu
// ============================================================
function openHistory() {
  closeDownloads();
  historyPanelOpen = true; renderHistory();
  historyPanel.classList.add('open'); historyPanel.setAttribute('aria-hidden', 'false');
  scrim.classList.add('show');
  updateRailActive();
}
function closeHistory() {
  historyPanelOpen = false;
  historyPanel.classList.remove('open'); historyPanel.setAttribute('aria-hidden', 'true');
  if (!menuOpen) scrim.classList.remove('show');
  updateRailActive();
}
function toggleHistory() { closeMenu(); historyPanelOpen ? closeHistory() : openHistory(); }

function buildMenu() {
  const gear = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4 7.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 5.1V5a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 17 4.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>';
  const incog = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18"/><path d="M6 11l1.4-4.3A2 2 0 0 1 9.3 5.3h5.4a2 2 0 0 1 1.9 1.4L18 11"/><circle cx="7.5" cy="15" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/><path d="M10 15h4"/></svg>';
  const S = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const dl = S('<path d="M12 3v11M7.5 10l4.5 4 4.5-4"/><path d="M5 20h14"/>');
  const ext = S('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>');
  const bm = S('<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>');
  const sun = S('<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.6M12 19.4V22M4.2 4.2 6 6M18 18l1.8 1.8M2 12h2.6M19.4 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>');
  const items = [
    { icon: IC.plus, label: 'New tab', sc: 'Ctrl T', fn: () => { createTab(); focusOmnibox(); } },
    { icon: incog, label: 'New incognito window', sc: 'Ctrl ⇧ N', fn: () => { try { window.browserAPI.newIncognito(); } catch (_) {} } },
    { sep: true },
    { zoom: true },
    { sep: true },
    { icon: dl, label: 'Downloads', sc: 'Ctrl J', fn: () => toggleDownloads() },
    { icon: IC.clock, label: 'History', sc: 'Ctrl H', fn: () => toggleHistory() },
    { icon: bm, label: 'Toggle bookmarks bar', fn: () => { setBookmarksBarHidden(!document.body.classList.contains('bookmarks-hidden')); updateRailActive(); } },
    { icon: ext, label: 'Extensions', fn: () => openSettings('extensions') },
    { icon: sun, label: 'Toggle light / dark', fn: () => toggleTheme() },
    { sep: true },
    { icon: gear, label: 'Settings', fn: () => openSettings() },
    { icon: IC.info, label: 'About Drift', fn: () => openSettings('about') },
  ];
  menuDropdown.innerHTML = '';
  for (const it of items) {
    if (it.sep) { const s = document.createElement('div'); s.className = 'menu-sep'; menuDropdown.appendChild(s); continue; }
    if (it.zoom) {
      const pct = () => { try { const t = activeTab(); return Math.round((t && t.wv && !t.discarded ? t.wv.getZoomFactor() : 1) * 100) + '%'; } catch (_) { return '100%'; } };
      const row = document.createElement('div'); row.className = 'menu-zoom';
      row.innerHTML = '<span class="menu-zoom-label">Zoom</span><span class="menu-zoom-ctrl">' +
        '<button type="button" id="mzOut" aria-label="Zoom out">−</button>' +
        '<button type="button" id="mzVal" title="Reset zoom">' + pct() + '</button>' +
        '<button type="button" id="mzIn" aria-label="Zoom in">+</button></span>';
      const upd = () => { const v = row.querySelector('#mzVal'); if (v) v.textContent = pct(); };
      row.querySelector('#mzOut').addEventListener('click', (e) => { e.stopPropagation(); zoomOut(); setTimeout(upd, 40); });
      row.querySelector('#mzIn').addEventListener('click', (e) => { e.stopPropagation(); zoomIn(); setTimeout(upd, 40); });
      row.querySelector('#mzVal').addEventListener('click', (e) => { e.stopPropagation(); zoomReset(); setTimeout(upd, 40); });
      menuDropdown.appendChild(row); continue;
    }
    const b = document.createElement('button');
    b.className = 'menu-item';
    b.setAttribute('role', 'menuitem');
    b.innerHTML = it.icon + '<span>' + it.label + '</span>' + (it.sc ? '<span class="shortcut">' + it.sc + '</span>' : '');
    b.addEventListener('click', () => { closeMenu(); it.fn(); });
    menuDropdown.appendChild(b);
  }
}
function openMenu() { menuOpen = true; buildMenu(); menuDropdown.classList.add('open'); menuDropdown.setAttribute('aria-hidden', 'false'); }
function closeMenu() { menuOpen = false; menuDropdown.classList.remove('open'); menuDropdown.setAttribute('aria-hidden', 'true'); if (!historyPanelOpen) scrim.classList.remove('show'); }
function closeOverlays() { closeHistory(); closeDownloads(); closeMenu(); if (settingsOverlay && !settingsOverlay.hidden) closeSettings(); }

// ============================================================
//  Internal pages (data URLs)
// ============================================================
function pageShell(title, body) {
  const dark = isDarkTheme(theme);
  const c = dark
    ? { text: '#f2e9da', text2: '#b8ab95', text3: '#8a7d68', accent: '#e08a52', accentH: '#c2703d',
        bg: 'radial-gradient(900px 600px at 20% -10%,#37302a,transparent),linear-gradient(155deg,#2a2520,#1f1b16)',
        card: 'rgba(58,50,40,0.6)', border: 'rgba(255,235,200,0.14)', shadow: '0 24px 60px rgba(0,0,0,0.45)' }
    : { text: '#3a342a', text2: '#7c7361', text3: '#a89d85', accent: '#c2703d', accentH: '#a85a2c',
        bg: 'radial-gradient(900px 600px at 20% -10%,#fdf8ee,transparent),linear-gradient(155deg,#f8f2e4,#efe4cf)',
        card: 'rgba(255,253,247,0.7)', border: 'rgba(255,255,255,0.7)', shadow: '0 24px 60px rgba(100,78,48,0.18)' };
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{height:100vh;display:grid;place-items:center;font-family:Inter,'Segoe UI',system-ui,sans-serif;
      color:${c.text};background:${c.bg};}
    .card{max-width:520px;text-align:center;padding:46px 40px;border-radius:22px;
      background:${c.card};border:1px solid ${c.border};box-shadow:${c.shadow};backdrop-filter:blur(24px);}
    h1{font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:26px;margin-bottom:12px;letter-spacing:.2px}
    p{color:${c.text2};font-size:14.5px;line-height:1.6;margin-bottom:8px;word-break:break-word}
    .url{font-size:12.5px;color:${c.text3};margin:14px 0 22px}
    a.btn{display:inline-block;text-decoration:none;background:${c.accent};color:#fff;font-weight:600;font-size:14px;
      padding:11px 22px;border-radius:12px;box-shadow:0 6px 18px rgba(194,112,61,.3)}
    a.btn:hover{background:${c.accentH}}
    .dot{font-size:40px;color:${c.accent};margin-bottom:14px;line-height:1}
  </style></head><body><div class="card">${body}</div></body></html>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}
function errorPage(url, desc) {
  return pageShell('Can’t reach this page',
    `<div class="dot">•</div><h1>This page didn’t load</h1>
     <p>${escapeHtml(desc)}</p>
     <div class="url">${escapeHtml(url)}</div>
     <a class="btn" href="${escapeHtml(url)}">Try again</a>`);
}
function aboutPage() {
  return pageShell('About Drift',
    `<div class="dot">◐</div><h1>Drift</h1>
     <p>A light &amp; minimal liquid-glass browser, built on Electron with a real Chromium engine.</p>
     <p style="margin-top:10px">Tabs · smart omnibox · bookmarks · history · keyboard shortcuts.</p>
     <div class="url">Version 1.0.0</div>`);
}

// ============================================================
//  Theme (light / dark) with a circular-reveal transition
// ============================================================
function setThemeIcon() { document.body.classList.toggle('is-dark', isDarkTheme(theme)); }

function applyTheme(next) {
  theme = next;
  try { localStorage.setItem('cream.theme', next); } catch (_) {}
  // Remember the last light + last dark theme so the sun/moon toggle can flip between them.
  try { localStorage.setItem(isDarkTheme(next) ? 'cream.lastDark' : 'cream.lastLight', next); } catch (_) {}
  document.documentElement.dataset.theme = next;
  setThemeIcon();
  if (typeof refreshAccent === 'function') refreshAccent(); // re-derive accent for the new mode
  // Live-update any open new-tab pages (separate documents in their webviews).
  for (const t of tabs) {
    if (isNewTab(t.url)) {
      try { t.wv.executeJavaScript(`window.__creamSetTheme&&window.__creamSetTheme(${JSON.stringify(next)})`); } catch (_) {}
    }
  }
}

function toggleTheme(ev) {
  // Flip between the user's last light theme and last dark theme (preserves Arctic, Sepia, etc.).
  let next;
  if (isDarkTheme(theme)) { try { next = localStorage.getItem('cream.lastLight'); } catch (_) {} if (!next || isDarkTheme(next) || THEME_IDS.indexOf(next) < 0) next = 'light'; }
  else { try { next = localStorage.getItem('cream.lastDark'); } catch (_) {} if (!next || !isDarkTheme(next) || THEME_IDS.indexOf(next) < 0) next = 'dark'; }
  themeMode = next;
  try { localStorage.setItem('cream.themeMode', next); } catch (_) {}
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) { applyTheme(next); return; }
  const x = ev && ev.clientX ? ev.clientX : window.innerWidth - 46;
  const y = ev && ev.clientY ? ev.clientY : 40;
  const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const vt = document.startViewTransition(() => applyTheme(next));
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 480, easing: 'cubic-bezier(0.22,1,0.36,1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
}

// ============================================================
//  Keyboard shortcuts
// ============================================================
function handleShortcut(action) {
  const wv = activeTab() && activeTab().wv;
  switch (action) {
    case 'new-tab': createTab(); focusOmnibox(); break;
    case 'new-incognito': try { window.browserAPI.newIncognito(); } catch (_) {} break;
    case 'close-tab': closeTab(activeId); break;
    case 'focus-omnibox': focusOmnibox(); break;
    case 'reload': if (wv) wv.reload(); break;
    case 'bookmark': toggleBookmark(); break;
    case 'toggle-history': toggleHistory(); break;
    case 'next-tab': cycleTab(1); break;
    case 'prev-tab': cycleTab(-1); break;
    case 'back': try { if (wv && wv.canGoBack()) wv.goBack(); } catch (_) {} break;
    case 'forward': try { if (wv && wv.canGoForward()) wv.goForward(); } catch (_) {} break;
    case 'zoom-in': zoomIn(); break;
    case 'zoom-out': zoomOut(); break;
    case 'zoom-reset': zoomReset(); break;
    case 'downloads': toggleDownloads(); break;
    default:
      if (action.startsWith('switch-')) { const n = +action.split('-')[1]; if (tabs[n - 1]) setActiveTab(tabs[n - 1].id); }
  }
}

function localKeydown(e) {
  const mod = e.ctrlKey || e.metaKey;
  const k = (e.key || '').toLowerCase();
  let action = null;
  if (mod && e.shiftKey && k === 'n') action = 'new-incognito';
  else if (mod && k === 't') action = 'new-tab';
  else if (mod && k === 'w') action = 'close-tab';
  else if (mod && k === 'l') action = 'focus-omnibox';
  else if (mod && k === 'r') action = 'reload';
  else if (mod && k === 'd') action = 'bookmark';
  else if (mod && k === 'h') action = 'toggle-history';
  else if (mod && k === 'j') action = 'downloads';
  else if (mod && (k === '=' || k === '+')) action = 'zoom-in';
  else if (mod && k === '-') action = 'zoom-out';
  else if (mod && k === '0') action = 'zoom-reset';
  else if (mod && k === 'tab') action = e.shiftKey ? 'prev-tab' : 'next-tab';
  else if (mod && /^[1-9]$/.test(k)) action = 'switch-' + k;
  else if (k === 'f5') action = 'reload';
  else if (e.altKey && k === 'arrowleft') action = 'back';
  else if (e.altKey && k === 'arrowright') action = 'forward';
  else if (k === 'escape') { if (ctxMenuEl) { closeCtxMenu(); return; } if (snipping) { endSnip(); return; } if (zoomPopOpen) { closeZoom(); return; } if (musicPopOpen) { closeMusic(); return; } if (addSitePopOpen) { closeAddSite(); return; } if (adblockPopOpen) { closeAdblock(); return; } closeOverlays(); return; }
  if (action) { e.preventDefault(); handleShortcut(action); }
}

// ============================================================
//  Theme presets (accent gallery) + theme mode
// ============================================================
const PRESETS = [
  { id: 'terracotta', name: 'Terracotta', light: '#c2703d', dark: '#e2914f' },
  { id: 'sage', name: 'Sage', light: '#7c8b5b', dark: '#9caf74' },
  { id: 'ocean', name: 'Ocean', light: '#2f7e9e', dark: '#56b0cf' },
  { id: 'plum', name: 'Plum', light: '#8a5a8f', dark: '#b585ba' },
  { id: 'rose', name: 'Rose', light: '#c25b72', dark: '#e58198' },
  { id: 'amber', name: 'Amber', light: '#bf8f2e', dark: '#e3b34f' },
  { id: 'forest', name: 'Forest', light: '#3f7d52', dark: '#5fa877' },
  { id: 'indigo', name: 'Indigo', light: '#5b63c2', dark: '#868ee6' },
  { id: 'crimson', name: 'Crimson', light: '#b8493f', dark: '#e0695c' },
  { id: 'teal', name: 'Teal', light: '#2f9e8f', dark: '#52c6b6' },
  { id: 'cocoa', name: 'Cocoa', light: '#8a5a3c', dark: '#c2895a' },
  { id: 'graphite', name: 'Graphite', light: '#6b6257', dark: '#b8ab95' },
  { id: 'sky', name: 'Sky', light: '#3e8ed0', dark: '#6cb6ec' },
  { id: 'fuchsia', name: 'Fuchsia', light: '#b34bb0', dark: '#d97ad6' },
];
function presetAccent(p) { return isDarkTheme(theme) ? p.dark : p.light; }
function hexToRgb(hex) { const h = hex.replace('#', ''); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }; }
function rgba(hex, a) { const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }
function darken(hex, amt) { const c = hexToRgb(hex); const f = (x) => Math.max(0, Math.round(x * (1 - amt))); return '#' + [f(c.r), f(c.g), f(c.b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }

function applyPreset(id, persist) {
  const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
  currentPreset = p.id;
  if (persist !== false) { try { localStorage.setItem('cream.preset', p.id); } catch (_) {} }
  const accent = presetAccent(p);
  const st = document.documentElement.style;
  st.setProperty('--accent', accent);
  st.setProperty('--accent-deep', darken(accent, isDarkTheme(theme) ? 0.12 : 0.16));
  st.setProperty('--accent-soft', rgba(accent, isDarkTheme(theme) ? 0.16 : 0.12));
  st.setProperty('--accent-ring', rgba(accent, isDarkTheme(theme) ? 0.45 : 0.38));
  for (const t of tabs) {
    if (isNewTab(t.url)) { try { t.wv.executeJavaScript(`window.__creamSetPreset&&window.__creamSetPreset(${JSON.stringify(p.id)})`); } catch (_) {} }
  }
  if (INCOGNITO) { // private windows always wear the hacker (neon-green) accent
    st.setProperty('--accent', '#2effa0');
    st.setProperty('--accent-deep', '#17c97c');
    st.setProperty('--accent-soft', 'rgba(46,255,160,0.14)');
    st.setProperty('--accent-ring', 'rgba(46,255,160,0.4)');
  }
}

// Custom accent (color-wheel picker) — any hex, derives the same vars applyPreset does.
function accentMode() { try { return localStorage.getItem('cream.accentMode') === 'custom' ? 'custom' : 'preset'; } catch (_) { return 'preset'; } }
function customAccent() { try { return localStorage.getItem('cream.accent') || ''; } catch (_) { return ''; } }
function applyCustomAccent(hex, persist) {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) return;
  hex = hex[0] === '#' ? hex : '#' + hex;
  if (persist !== false) { try { localStorage.setItem('cream.accent', hex); localStorage.setItem('cream.accentMode', 'custom'); } catch (_) {} }
  if (!INCOGNITO) {
    const st = document.documentElement.style;
    st.setProperty('--accent', hex);
    st.setProperty('--accent-deep', darken(hex, isDarkTheme(theme) ? 0.12 : 0.16));
    st.setProperty('--accent-soft', rgba(hex, isDarkTheme(theme) ? 0.16 : 0.12));
    st.setProperty('--accent-ring', rgba(hex, isDarkTheme(theme) ? 0.45 : 0.38));
  }
  for (const t of tabs) { if (isNewTab(t.url)) { try { t.wv.executeJavaScript(`window.__creamSetAccent&&window.__creamSetAccent(${JSON.stringify(hex)})`); } catch (_) {} } }
}
// Re-apply whichever accent source is active (used on load + theme change).
function refreshAccent() { if (accentMode() === 'custom' && customAccent()) applyCustomAccent(customAccent(), false); else applyPreset(currentPreset, false); }

let themeMode = (function () { try { return localStorage.getItem('cream.themeMode') || theme; } catch (_) { return theme; } })();
const mql = matchMedia('(prefers-color-scheme: dark)');
function resolveTheme(mode) { return mode === 'system' ? (mql.matches ? 'dark' : 'light') : mode; }
mql.addEventListener('change', () => { if (themeMode === 'system') applyTheme(resolveTheme('system')); });
function setThemeMode(mode) {
  themeMode = mode;
  try { localStorage.setItem('cream.themeMode', mode); } catch (_) {}
  applyTheme(resolveTheme(mode));
}

// ============================================================
//  Sidebar + bookmarks-bar visibility
// ============================================================
function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  try { localStorage.setItem('cream.sidebar', collapsed ? 'collapsed' : 'expanded'); } catch (_) {}
}
function toggleSidebar() { setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed')); }
function setBookmarksBarHidden(hidden) {
  document.body.classList.toggle('bookmarks-hidden', hidden);
  try { localStorage.setItem('cream.bookmarksBar', hidden ? 'hidden' : 'shown'); } catch (_) {}
}
function updateRailActive() {
  const rh = document.getElementById('railHistory'); if (rh) rh.classList.toggle('active', historyPanelOpen);
  const rb = document.getElementById('railBookmarks'); if (rb) rb.classList.toggle('active', !document.body.classList.contains('bookmarks-hidden'));
  const rd = document.getElementById('dlBtn'); if (rd) rd.classList.toggle('active', downloadsOpen);
}
function openAITab() { createTab(newTabTarget('&ai=1')); }

// ============================================================
//  Force dark mode for websites
// ============================================================
let forceDark = (function () { try { return localStorage.getItem('cream.forceDark') === '1'; } catch (_) { return false; } })();
// Smart force-dark: only invert pages that are actually light (leaving already-dark
// pages alone — the #1 cause of "messed up" sites), and re-invert media so images and
// video render normally. Injected per-page so it can read the page's real background.
const FORCE_DARK_JS =
  '(function(){try{var ID="__cream_force_dark__";var ex=document.getElementById(ID);' +
  'function lum(c){var m=c&&c.match(/[\\d.]+/g);if(!m||m.length<3)return 1;return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255;}' +
  'var bg=getComputedStyle(document.body||document.documentElement).backgroundColor;' +
  'if(!bg||/transparent|rgba\\(0, 0, 0, 0\\)/.test(bg))bg=getComputedStyle(document.documentElement).backgroundColor;' +
  'if(!bg||/transparent|rgba\\(0, 0, 0, 0\\)/.test(bg))bg="rgb(255,255,255)";' +
  'if(lum(bg)<0.5){if(ex)ex.remove();return;}' +
  'if(ex)return;' +
  'var s=document.createElement("style");s.id=ID;' +
  's.textContent="html{background:#0d0d0f !important;}html{filter:invert(1) hue-rotate(180deg) !important;}img,picture,video,canvas,svg,image,iframe,embed,object,[style*=background-image]{filter:invert(1) hue-rotate(180deg) !important;}";' +
  '(document.head||document.documentElement).appendChild(s);}catch(e){}})();';
const FORCE_DARK_REMOVE_JS = '(function(){var s=document.getElementById("__cream_force_dark__");if(s)s.remove();})();';

function applyForceDark(tab) {
  if (!/^https?:/i.test(tab.url || '')) return;
  try { tab.wv.executeJavaScript(forceDark ? FORCE_DARK_JS : FORCE_DARK_REMOVE_JS); } catch (_) {}
}
function removeForceDark(tab) {
  try { tab.wv.executeJavaScript(FORCE_DARK_REMOVE_JS); } catch (_) {}
}
function setForceDark(on) {
  forceDark = on;
  try { localStorage.setItem('cream.forceDark', on ? '1' : '0'); } catch (_) {}
  for (const t of tabs) { if (on) applyForceDark(t); else removeForceDark(t); }
}

// ============================================================
//  Settings page
// ============================================================
const settingsOverlay = $('settingsOverlay');
function openSettings(section) {
  buildSettings();
  showSettingsSection(section || 'appearance');
  settingsOverlay.hidden = false;
  settingsOverlay.setAttribute('aria-hidden', 'false');
  closeMenu();
}
function closeSettings() {
  settingsOverlay.hidden = true;
  settingsOverlay.setAttribute('aria-hidden', 'true');
}
function showSettingsSection(sec) {
  settingsOverlay.querySelectorAll('.snav').forEach((b) => b.classList.toggle('active', b.dataset.sec === sec));
  settingsOverlay.querySelectorAll('.ssec').forEach((s) => { s.hidden = s.dataset.sec !== sec; });
}
function buildSettings() { buildAppearance(); buildLayout(); buildAI(); buildBrowsing(); buildPrivacy(); buildPasswords(); buildExtensions(); buildAbout(); }

// Photoshop-style HSV color wheel for the accent (hue = angle, saturation = radius, value = slider).
function setupColorWheel(el) {
  const wheel = el.querySelector('#cWheel'); if (!wheel) return;
  const thumb = el.querySelector('#cThumb'), valEl = el.querySelector('#cVal'), hexEl = el.querySelector('#cHex'), prev = el.querySelector('#cPrev');
  const SIZE = 168, R = SIZE / 2;
  let h = 0, s = 0, v = 1;
  function hsvToRgb(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hh = 0;
    if (d) { if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
    return { h: hh, s: mx ? d / mx : 0, v: mx };
  }
  function toHex(c) { return '#' + [c.r, c.g, c.b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join(''); }
  function parseHex(x) { x = String(x || '').trim(); if (!/^#?[0-9a-f]{6}$/i.test(x)) return null; x = x[0] === '#' ? x : '#' + x; return { r: parseInt(x.slice(1, 3), 16), g: parseInt(x.slice(3, 5), 16), b: parseInt(x.slice(5, 7), 16) }; }
  function curHex() { return toHex(hsvToRgb(h, s, v)); }
  function render() {
    const hr = h * Math.PI / 180, dist = s * R;
    thumb.style.left = (R + Math.sin(hr) * dist) + 'px';
    thumb.style.top = (R - Math.cos(hr) * dist) + 'px';
    const hx = curHex();
    prev.style.background = hx; thumb.style.background = hx;
    if (document.activeElement !== hexEl) hexEl.value = hx.toUpperCase();
    valEl.style.setProperty('--vtrack', toHex(hsvToRgb(h, s, 1)));
  }
  function setFromHex(x) { const c = parseHex(x); if (!c) return; const k = rgbToHsv(c.r, c.g, c.b); h = k.h; s = k.s; v = k.v; valEl.value = Math.round(v * 100); render(); }
  el.__syncWheel = function () { setFromHex((getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#c2703d').trim()); };
  el.__syncWheel();
  function pick(e) {
    const r = wheel.getBoundingClientRect(), rad = r.width / 2;
    const dx = e.clientX - r.left - rad, dy = e.clientY - r.top - rad;
    h = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    s = Math.min(Math.sqrt(dx * dx + dy * dy) / rad, 1);
    render(); applyCustomAccent(curHex());
  }
  let drag = false;
  wheel.addEventListener('pointerdown', (e) => { drag = true; try { wheel.setPointerCapture(e.pointerId); } catch (_) {} pick(e); });
  wheel.addEventListener('pointermove', (e) => { if (drag) pick(e); });
  wheel.addEventListener('pointerup', () => { drag = false; });
  wheel.addEventListener('pointercancel', () => { drag = false; });
  valEl.addEventListener('input', () => { v = Number(valEl.value) / 100; render(); applyCustomAccent(curHex()); });
  hexEl.addEventListener('change', () => { const c = parseHex(hexEl.value); if (c) { setFromHex(toHex(c)); applyCustomAccent(curHex()); } });
}

function buildAppearance() {
  const el = $('secAppearance');
  const swatches = PRESETS.map((p) =>
    `<button class="swatch${p.id === currentPreset ? ' active' : ''}" data-preset="${p.id}" style="--sw-accent:${presetAccent(p)}" title="${p.name}"><span class="dot"></span><span class="nm">${p.name}</span></button>`
  ).join('');
  const blur = (document.documentElement.style.getPropertyValue('--blur') || '20').replace('px', '').trim() || '20';
  const acryOn = acrylicOn();
  const glassLvl = glassLevel();
  const tbh = (document.documentElement.style.getPropertyValue('--titlebar-h') || '34').replace('px', '').trim() || '34';
  const noSidebar = document.body.classList.contains('no-sidebar');
  const wx = widgetPrefs();
  const themeCards = THEMES.map((t) =>
    `<button class="tcard${themeMode === t.id ? ' active' : ''}" data-mode="${t.id}" title="${t.name}">` +
    `<span class="tcard-prev" style="background:linear-gradient(135deg,${t.c1},${t.c2})">` +
    `<span class="tcard-bar" style="background:${t.dark ? 'rgba(255,255,255,.20)' : 'rgba(60,45,25,.14)'}"></span>` +
    '<span class="tcard-dot"></span></span>' +
    `<span class="tcard-name">${t.name}</span></button>`,
  ).join('') +
    `<button class="tcard${themeMode === 'system' ? ' active' : ''}" data-mode="system" title="Follow your system">` +
    '<span class="tcard-prev tcard-sys"><span class="tcard-bar" style="background:rgba(140,140,140,.32)"></span><span class="tcard-dot"></span></span>' +
    '<span class="tcard-name">System</span></button>';
  el.innerHTML =
    '<h2>Appearance</h2><p class="sub">Make Drift yours — theme, accent colour, background, and layout.</p>' +
    '<div class="set-group"><div class="set-label">Theme</div>' +
    '<div class="theme-grid" id="modeSeg">' + themeCards + '</div></div>' +
    '<div class="set-group"><div class="set-label">Accent colour</div>' +
    '<div class="cwrap">' +
    '<div class="cwheel" id="cWheel"><div class="cwheel-thumb" id="cThumb"></div></div>' +
    '<div class="cside">' +
    '<div class="cprev" id="cPrev"></div>' +
    '<input class="cval" id="cVal" type="range" min="2" max="100" value="100" aria-label="Brightness">' +
    '<input class="chex" id="cHex" type="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex colour">' +
    '</div></div>' +
    '<div class="swatches" id="swatchGrid">' + swatches + '</div></div>' +
    '<div class="set-group"><div class="set-label">New-tab background</div>' +
    '<div class="bg-presets" id="bgPresets"></div>' +
    '<div class="bg-preview" id="bgPreview">No custom background</div>' +
    '<div class="set-row" style="border-top:none;padding-top:0"><div class="rl"><div class="nm">Custom image</div><div class="ds">Use your own photo behind the new-tab page.</div></div>' +
    '<div class="set-right"><div class="field"><button class="btn" id="bgChooseBtn">Choose image…</button><button class="btn ghost" id="bgClearBtn">Clear</button></div></div></div></div>' +
    '<div class="set-group"><div class="set-label">Layout</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Show sidebar</div><div class="ds">The left rail with quick actions.</div></div>' +
    `<div class="set-right"><div class="switch${noSidebar ? '' : ' on'}" id="sidebarSwitch" role="switch" aria-checked="${!noSidebar}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Top bar height</div><div class="ds">Make the tab bar taller or shorter.</div></div>' +
    `<div class="set-right"><input class="slider" type="range" id="tbhSlider" min="28" max="52" value="${tbh}"></div></div></div>` +
    '<div class="set-group"><div class="set-label">Glass</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Glass theme</div><div class="ds">Make the whole browser translucent over the blurred desktop. Windows 11 only; best on a dark theme. Re-open the window after toggling.</div></div>' +
    `<div class="set-right"><div class="switch${acryOn ? ' on' : ''}" id="acrylicSwitch" role="switch" aria-checked="${acryOn}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Glass translucency</div><div class="ds">How much the desktop shows through. Drag higher for more glass.</div></div>' +
    `<div class="set-right glass-slider"><input type="range" id="glassSlider" min="20" max="95" step="1" value="${glassLvl}" aria-label="Glass translucency" /><span id="glassVal">${glassLvl}%</span></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Frost intensity</div><div class="ds">Blur behind translucent surfaces.</div></div>' +
    `<div class="set-right"><input class="slider" type="range" id="blurSlider" min="0" max="40" value="${blur}"></div></div></div>` +
    '<div class="set-group"><div class="set-label">Startup</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Welcome tour</div><div class="ds">Replay the first-run setup screen.</div></div>' +
    '<div class="set-right"><button class="btn" id="replayOnbBtn">Replay</button></div></div></div>' +
    '<div class="set-group"><div class="set-label">New-tab widgets</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Weather</div><div class="ds">Show current conditions on the new-tab page.</div></div>' +
    `<div class="set-right"><div class="switch${wx.weather ? ' on' : ''}" id="wxSwitch" role="switch" aria-checked="${wx.weather}" tabindex="0"></div></div></div>` +
    `<div class="set-row" id="wxLocRow"${wx.weather ? '' : ' style="display:none"'}><div class="rl"><div class="nm">Weather location</div><div class="ds">City name used for the forecast.</div></div>` +
    `<div class="set-right"><div class="field"><input id="wxLocInput" type="text" placeholder="e.g. London" value="${escapeHtml(wx.loc)}"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Reminders</div><div class="ds">A quick to-do list on the new-tab page.</div></div>' +
    `<div class="set-right"><div class="switch${wx.reminders ? ' on' : ''}" id="remSwitch" role="switch" aria-checked="${wx.reminders}" tabindex="0"></div></div></div></div>`;

  el.querySelector('#modeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]'); if (!b) return;
    setThemeMode(b.dataset.mode);
    el.querySelectorAll('#modeSeg .tcard').forEach((x) => x.classList.toggle('active', x === b));
    el.querySelectorAll('.swatch').forEach((sw) => { const p = PRESETS.find((pp) => pp.id === sw.dataset.preset); sw.style.setProperty('--sw-accent', presetAccent(p)); });
    if (el.__syncWheel) setTimeout(el.__syncWheel, 0);
  });
  el.querySelector('#swatchGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.swatch'); if (!b) return;
    try { localStorage.setItem('cream.accentMode', 'preset'); } catch (_) {}
    applyPreset(b.dataset.preset);
    el.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === b));
    if (el.__syncWheel) el.__syncWheel();
  });
  setupColorWheel(el);
  el.querySelector('#blurSlider').addEventListener('input', (e) => {
    const v = Number(e.target.value) || 0;
    document.documentElement.style.setProperty('--blur', v + 'px');
    document.documentElement.style.setProperty('--glass', String(Math.min(0.92, v / 40 * 0.9)));
    try { localStorage.setItem('cream.blur', e.target.value); } catch (_) {}
  });
  el.querySelector('#acrylicSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    setAcrylicMode(on);
  });
  const glassSlider = el.querySelector('#glassSlider'); const glassValEl = el.querySelector('#glassVal');
  glassSlider.addEventListener('input', (e) => { const v = Number(e.target.value); glassValEl.textContent = v + '%'; setGlassLevel(v); pushGlassToNewTabs(v); });
  el.querySelector('#replayOnbBtn').addEventListener('click', () => {
    try { localStorage.removeItem('cream.onboarded'); } catch (_) {}
    closeSettings();
    setTimeout(() => initOnboarding(true), 220);
  });
  const setWx = (partial) => { const next = Object.assign(widgetPrefs(), partial); saveWidgetPrefs(next); renavNewTabViews(); };
  el.querySelector('#wxSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    el.querySelector('#wxLocRow').style.display = on ? '' : 'none';
    setWx({ weather: on });
  });
  el.querySelector('#remSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    setWx({ reminders: on });
  });
  el.querySelector('#wxLocInput').addEventListener('change', (e) => setWx({ loc: e.target.value.trim() }));

  // Custom background + one-click preset gallery
  const pv = el.querySelector('#bgPreview');
  const presetWrap = el.querySelector('#bgPresets');
  const BG_PRESETS = [
    { id: 'cream.svg', name: 'Drift' },
    { id: 'terracotta.svg', name: 'Terracotta' },
    { id: 'sage.svg', name: 'Sage' },
    { id: 'ocean.svg', name: 'Ocean' },
    { id: 'plum.svg', name: 'Plum' },
    { id: 'dusk.svg', name: 'Dusk' },
  ];
  const presetUrl = (id) => new URL('backgrounds/' + id, location.href).href;
  const baseName = (u) => { try { return decodeURIComponent(String(u).split(/[\\/]/).pop().split('?')[0]); } catch (_) { return ''; } };
  function markActiveBg(curUrl) {
    const cur = baseName(curUrl);
    presetWrap.querySelectorAll('.bg-thumb').forEach((t) => {
      const isNone = t.classList.contains('none');
      t.classList.toggle('active', isNone ? !cur : (t.dataset.id || '') === cur);
    });
  }
  const noneEl = document.createElement('button');
  noneEl.className = 'bg-thumb none'; noneEl.type = 'button'; noneEl.title = 'No background'; noneEl.textContent = 'None';
  noneEl.addEventListener('click', async () => {
    await window.browserAPI.bgClear();
    pv.style.backgroundImage = ''; pv.textContent = 'No custom background';
    markActiveBg(''); reloadNewTabViews();
  });
  presetWrap.appendChild(noneEl);
  BG_PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'bg-thumb'; b.type = 'button'; b.title = p.name; b.dataset.id = p.id;
    b.style.backgroundImage = "url('" + presetUrl(p.id) + "')";
    b.addEventListener('click', async () => {
      const r = await window.browserAPI.bgSetPreset(p.id);
      if (r && r.ok) {
        pv.style.backgroundImage = "url('" + String(r.url).replace(/'/g, '%27') + "')"; pv.textContent = '';
        markActiveBg(p.id); reloadNewTabViews();
      } else { toast('Could not set background'); }
    });
    presetWrap.appendChild(b);
  });
  (async () => {
    try {
      const url = await window.browserAPI.bgGet();
      if (url) { pv.style.backgroundImage = "url('" + String(url).replace(/'/g, '%27') + "')"; pv.textContent = ''; }
      markActiveBg(url || '');
    } catch (_) {}
  })();
  el.querySelector('#bgChooseBtn').addEventListener('click', async () => {
    const r = await window.browserAPI.bgChoose();
    if (r && r.ok) { pv.style.backgroundImage = "url('" + String(r.url).replace(/'/g, '%27') + "')"; pv.textContent = ''; markActiveBg(baseName(r.url)); reloadNewTabViews(); }
    else if (r && r.error) toast('Could not set background');
  });
  el.querySelector('#bgClearBtn').addEventListener('click', async () => {
    await window.browserAPI.bgClear(); pv.style.backgroundImage = ''; pv.textContent = 'No custom background'; markActiveBg(''); reloadNewTabViews();
  });

  // Layout: sidebar + top-bar height
  el.querySelector('#sidebarSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    setSidebarRemoved(!on);
  });
  el.querySelector('#tbhSlider').addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--titlebar-h', e.target.value + 'px');
    try { localStorage.setItem('cream.titlebarH', e.target.value); } catch (_) {}
  });
}

async function buildAI() {
  const el = $('secAI');
  let c = { hasKey: false, model: 'claude-haiku-4-5', models: [] };
  try { c = await window.browserAPI.getAIConfig(); } catch (_) {}
  const models = (c.models && c.models.length) ? c.models : [{ id: c.model, label: c.model }];
  const opts = models.map((m) => `<option value="${m.id}"${m.id === c.model ? ' selected' : ''}>${escapeHtml(m.label)}</option>`).join('');
  const aiOn = aiEnabled();
  el.innerHTML =
    '<h2>Drift AI</h2><p class="sub">A built-in Claude assistant on every new-tab page.</p>' +
    '<div class="set-group">' +
    '<div class="set-row"><div class="rl"><div class="nm">Enable Drift AI</div><div class="ds">Show the assistant on new-tab pages and the sidebar.</div></div>' +
    `<div class="set-right"><div class="switch${aiOn ? ' on' : ''}" id="aiEnableSwitch" role="switch" aria-checked="${aiOn}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Connection</div><div class="ds">Your Anthropic API key is stored locally and used only for your chats.</div></div>' +
    `<div class="set-right">${c.hasKey ? '<span class="pill ok">Connected</span>' : '<span class="pill off">Not connected</span>'}</div></div>` +
    '<div class="field" style="margin-top:12px">' +
    `<input id="aiKeyInput" type="password" placeholder="${c.hasKey ? '••••••••••  (enter a new key to replace)' : 'sk-ant-...'}" autocomplete="off" spellcheck="false">` +
    `<button class="btn" id="aiSaveBtn">${c.hasKey ? 'Update' : 'Save key'}</button>` +
    (c.hasKey ? '<button class="btn danger" id="aiRemoveBtn">Remove</button>' : '') +
    '</div>' +
    '<div class="set-note">Don’t have one? <a class="set-link" id="getKeyLink" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Get an API key →</a></div>' +
    '</div>' +
    '<div class="set-group"><div class="set-label">Model</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Default model</div><div class="ds">Opus is most capable; Haiku is fastest.</div></div>' +
    `<div class="set-right"><div class="field"><select id="aiModelSel">${opts}</select></div></div></div></div>`;

  el.querySelector('#aiSaveBtn').addEventListener('click', async () => {
    const inp = el.querySelector('#aiKeyInput'); const k = inp.value.trim(); if (!k) { inp.focus(); return; }
    await window.browserAPI.setAIKey(k); buildAI();
  });
  const rm = el.querySelector('#aiRemoveBtn');
  if (rm) rm.addEventListener('click', async () => { await window.browserAPI.clearAIKey(); buildAI(); });
  el.querySelector('#aiModelSel').addEventListener('change', (e) => window.browserAPI.setAIModel(e.target.value));
  el.querySelector('#aiEnableSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    try { localStorage.setItem('cream.aiEnabled', on ? '1' : '0'); } catch (_) {}
    applyAIEnabled(); renavNewTabViews();
  });
}

function buildBrowsing() {
  const el = $('secBrowsing');
  const bmHidden = document.body.classList.contains('bookmarks-hidden');
  const seCur = currentEngine();
  const seOpts = Object.keys(SEARCH_ENGINES).map((k) => `<option value="${k}"${k === seCur ? ' selected' : ''}>${SEARCH_ENGINES[k].name}</option>`).join('');
  const sleepCur = sleepMins();
  const sleepOpts = [[0, 'Off'], [5, 'After 5 minutes'], [15, 'After 15 minutes'], [30, 'After 30 minutes'], [60, 'After 1 hour']]
    .map(([v, l]) => `<option value="${v}"${v === sleepCur ? ' selected' : ''}>${l}</option>`).join('');
  let animOn = true; try { animOn = localStorage.getItem('cream.anim') !== '0'; } catch (_) {}
  el.innerHTML =
    '<h2>Browsing</h2><p class="sub">Search, rendering, performance, and your data.</p>' +
    '<div class="set-group"><div class="set-label">Search</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Search engine</div><div class="ds">Used by the address bar and the new-tab search.</div></div>' +
    `<div class="set-right"><div class="field"><select id="searchSel">${seOpts}</select></div></div></div></div>` +
    '<div class="set-group">' +
    '<div class="set-row"><div class="rl"><div class="nm">Force dark mode on sites</div><div class="ds">Render websites with a dark filter, even when they don’t offer one.</div></div>' +
    `<div class="set-right"><div class="switch${forceDark ? ' on' : ''}" id="forceDarkSwitch" role="switch" aria-checked="${forceDark}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Show bookmarks bar</div><div class="ds">Toggle the bookmarks strip under the toolbar.</div></div>' +
    `<div class="set-right"><div class="switch${bmHidden ? '' : ' on'}" id="bmSwitch" role="switch" aria-checked="${!bmHidden}" tabindex="0"></div></div></div>` +
    '</div>' +
    '<div class="set-group"><div class="set-label">Performance</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Animations</div><div class="ds">Smooth motion and transitions. Turn off to reduce CPU use.</div></div>' +
    `<div class="set-right"><div class="switch${animOn ? ' on' : ''}" id="animSwitch" role="switch" aria-checked="${animOn}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Sleep inactive tabs</div><div class="ds">Free a background tab’s memory after it’s been idle. It reloads when you click it again.</div></div>' +
    `<div class="set-right"><div class="field"><select id="sleepSel">${sleepOpts}</select></div></div></div></div>` +
    '<div class="set-group"><div class="set-label">Data</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Import bookmarks</div><div class="ds">Bring bookmarks in from another browser on this PC.</div></div>' +
    '<div class="set-right"><button class="btn" id="importBtn">Choose browser…</button></div></div>' +
    '<div class="set-row" id="importRow" style="display:none;border-top:none;padding-top:0"><div class="rl" style="width:100%"><div class="onb-import" id="importList"></div></div></div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Browsing history</div><div class="ds">Clear all pages saved in Drift’s history.</div></div>' +
    '<div class="set-right"><button class="btn danger" id="clearHistBtn">Clear history</button></div></div></div>';

  el.querySelector('#searchSel').addEventListener('change', (e) => {
    try { localStorage.setItem('cream.search', e.target.value); } catch (_) {}
    renavNewTabViews();
  });
  el.querySelector('#forceDarkSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    setForceDark(on);
  });
  el.querySelector('#bmSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    setBookmarksBarHidden(!on); updateRailActive();
  });
  el.querySelector('#animSwitch').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
    try { localStorage.setItem('cream.anim', on ? '1' : '0'); } catch (_) {}
    applyChromeModes(); renavNewTabViews();
  });
  el.querySelector('#sleepSel').addEventListener('change', (e) => { try { localStorage.setItem('cream.sleepMins', e.target.value); } catch (_) {} });
  el.querySelector('#importBtn').addEventListener('click', async (ev) => {
    const row = el.querySelector('#importRow'); const box = el.querySelector('#importList');
    ev.target.disabled = true; ev.target.textContent = 'Scanning…';
    let list = []; try { list = await window.browserAPI.importList(); } catch (_) {}
    ev.target.disabled = false; ev.target.textContent = 'Choose browser…';
    if (!list || !list.length) { toast('No other browsers detected'); return; }
    box.innerHTML = '';
    list.forEach((b) => {
      const r = document.createElement('div'); r.className = 'onb-imp';
      r.innerHTML = '<div class="onb-imp-name">' + escapeHtml(b.name) + ' <span class="onb-muted">' + b.count + ' bookmarks</span></div>';
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'onb-imp-btn'; btn.textContent = 'Import';
      btn.addEventListener('click', async () => { btn.disabled = true; btn.textContent = 'Importing…'; const n = await importFromBrowser(b.id); btn.textContent = '✓ ' + n + ' added'; toast('Imported ' + n + ' bookmarks from ' + b.name); });
      r.appendChild(btn); box.appendChild(r);
    });
    row.style.display = '';
  });
  el.querySelector('#clearHistBtn').addEventListener('click', () => { history = []; saveHistory(); if (historyPanelOpen) renderHistory(); });
}

function buildLayout() {
  const el = $('secLayout');
  const vtOn = verticalTabsOn();
  const cpOn = compactOn();
  const ctrOn = centerUrlOn();
  const mode = browserMode();
  const modeBtn = (id, label, desc) => `<button type="button" class="mode-opt${mode === id ? ' on' : ''}" data-mode="${id}"><span class="mode-opt-t">${label}</span><span class="mode-opt-d">${desc}</span></button>`;
  el.innerHTML =
    '<h2>Layout</h2><p class="sub">Tabs, density, and how the chrome is arranged.</p>' +
    '<div class="set-group"><div class="set-label">Mode</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Browser mode</div><div class="ds">Choose the overall feel of the browser.</div></div></div>' +
    '<div class="mode-seg" id="modeSegLayout" role="radiogroup" aria-label="Browser mode">' +
      modeBtn('normal', 'Normal', 'Full liquid-glass UI') +
      modeBtn('lite', 'Lightweight', 'Low-memory, plain &amp; fast') +
      modeBtn('minimal', 'Minimal', 'Thin, sleek, decluttered') +
    '</div></div>' +
    '<div class="set-group"><div class="set-label">Tabs &amp; chrome</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Vertical tabs</div><div class="ds">Move your tabs and address bar into a solid sidebar down the left edge.</div></div>' +
    `<div class="set-right"><div class="switch${vtOn ? ' on' : ''}" id="vtabSwitch" role="switch" aria-checked="${vtOn}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Compact mode</div><div class="ds">Auto-hide the toolbar (or the tab sidebar, in vertical mode) — it slides back when you reach for it.</div></div>' +
    `<div class="set-right"><div class="switch${cpOn ? ' on' : ''}" id="compactSwitch" role="switch" aria-checked="${cpOn}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Center the address bar</div><div class="ds">Center the text in the address bar for a cleaner look.</div></div>' +
    `<div class="set-right"><div class="switch${ctrOn ? ' on' : ''}" id="centerUrlSwitch" role="switch" aria-checked="${ctrOn}" tabindex="0"></div></div></div></div>`;
  el.querySelectorAll('#modeSegLayout .mode-opt').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('#modeSegLayout .mode-opt').forEach((x) => x.classList.toggle('on', x === b));
    setBrowserMode(b.dataset.mode);
  }));
  const sw = (sel, fn) => { const e = el.querySelector(sel); e.addEventListener('click', () => { const on = !e.classList.contains('on'); e.classList.toggle('on', on); e.setAttribute('aria-checked', on); fn(on); }); };
  sw('#vtabSwitch', setVerticalTabs);
  sw('#compactSwitch', setCompact);
  sw('#centerUrlSwitch', setCenterUrl);
}

function buildAbout() {
  const el = $('secAbout');
  el.innerHTML =
    '<h2>About</h2><p class="sub">The calm, customizable browser.</p>' +
    '<div class="about-logo"><svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.3" opacity="0.5"/><path d="M5.5 15.5C9 17.5 12.5 14 16.5 7.5"/><path d="M12.7 7.6 17 7l-.6 4.2"/><circle cx="8" cy="13.4" r="1.7" fill="currentColor" stroke="none"/></svg></div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Drift</div><div class="ds">Version 1.0.0 · Electron + Chromium</div></div></div>' +
    '<p class="set-note">A light &amp; minimal liquid-glass browser with a built-in Claude assistant, animated dark mode, and a customizable theme gallery. Tabs · smart omnibox · bookmarks · history · downloads · zoom · snip · extensions.</p>';
}

function buildExtensions() {
  const el = $('secExtensions');
  const puzzle = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>';
  const helpIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2-2.4 3.6"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/></svg>';
  el.innerHTML =
    '<h2>Extensions</h2><p class="sub">Load unpacked Chromium extensions. Content scripts and background pages work; some Chrome Web Store APIs are unsupported.</p>' +
    '<div class="help-bar"><div class="help-ic">' + helpIcon + '</div><div class="help-body">' +
    '<div class="help-title">How to add an extension</div>' +
    '<ol class="help-steps">' +
    '<li>Get the extension as a <b>folder</b> — download the source, or unzip a <code>.zip</code>/<code>.crx</code> into its own folder.</li>' +
    '<li>Click <b>Load unpacked…</b> below.</li>' +
    '<li>Select the folder that contains the extension’s <code>manifest.json</code>.</li>' +
    '</ol>' +
    '<div class="help-tip">uBlock Origin is already built in (see Privacy → ad-blocker engine). For other extensions, download the source, unzip it, and pick that folder.</div>' +
    '</div></div>' +
    '<div class="set-group"><div class="set-row"><div class="rl"><div class="nm">Installed extensions</div><div class="ds" id="extCount">Loading…</div></div>' +
    '<div class="set-right"><button class="btn" id="extAddBtn">Load unpacked…</button></div></div>' +
    '<div id="extList"></div></div>';
  el.querySelector('#extAddBtn').addEventListener('click', async () => {
    const r = await window.browserAPI.extAdd();
    if (r && r.ok) buildExtensions();
    else if (r && r.error) toast('Could not load: ' + r.error);
  });
  (async () => {
    let list = [];
    try { list = await window.browserAPI.extList(); } catch (_) {}
    el.querySelector('#extCount').textContent = list.length ? (list.length + ' loaded') : 'No extensions loaded yet';
    const listEl = el.querySelector('#extList');
    list.forEach((x) => {
      const item = document.createElement('div'); item.className = 'ext-item';
      const ic = document.createElement('div'); ic.className = 'ext-ic'; ic.innerHTML = puzzle;
      const meta = document.createElement('div'); meta.className = 'ext-meta';
      meta.innerHTML = '<div class="ext-name">' + escapeHtml(x.name || 'Extension') + (x.version ? ' <span class="ext-ver">v' + escapeHtml(x.version) + '</span>' : '') + '</div><div class="ext-path">' + escapeHtml(x.path || '') + '</div>';
      const rm = document.createElement('button'); rm.className = 'btn danger'; rm.textContent = 'Remove';
      rm.addEventListener('click', async () => { await window.browserAPI.extRemove(x.id); buildExtensions(); });
      item.append(ic, meta, rm); listEl.appendChild(item);
    });
  })();
}

// ============================================================
//  Password manager (encrypted local vault)
// ============================================================
const ICO_PW = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};
let pwEntries = [];
function pwUrlObj(url) { try { return new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url); } catch (_) { return null; } }
function pwFavicon(url) { const u = pwUrlObj(url); return u ? u.origin + '/favicon.ico' : ''; }
function pwSiteName(url) { const u = pwUrlObj(url); return u ? u.hostname.replace(/^www\./, '') : (url || 'Login'); }
async function buildPasswords() {
  const el = $('secPasswords');
  let enc = false;
  try { pwEntries = await window.browserAPI.pwList(); } catch (_) { pwEntries = []; }
  try { enc = await window.browserAPI.pwAvailable(); } catch (_) {}
  el.innerHTML =
    '<h2>Passwords</h2><p class="sub">Save logins in an encrypted vault on this device. Drift never uploads or syncs them.</p>' +
    '<div class="help-bar"><div class="help-ic">' + ICO_PW.lock + '</div><div class="help-body">' +
    '<div class="help-title">' + (enc ? 'Encrypted with your system keychain' : 'Stored locally on this device') + '</div>' +
    '<div class="help-tip">' + (enc
      ? 'Saved passwords are encrypted with your operating system’s secure storage (DPAPI on Windows). Only your account on this PC can unlock them.'
      : 'Your OS secure storage isn’t available, so passwords are kept in a local file. Avoid saving sensitive logins on a shared computer.') + '</div>' +
    '</div></div>' +
    '<div class="pw-tools"><input id="pwSearch" type="text" placeholder="Search saved logins" autocomplete="off" spellcheck="false">' +
    '<button class="btn ghost" id="pwImportBtn">Import CSV…</button>' +
    '<button class="btn" id="pwAddBtn">Add password</button></div>' +
    '<div id="pwList"></div>';
  el.querySelector('#pwAddBtn').addEventListener('click', () => openPwEditor(null));
  el.querySelector('#pwImportBtn').addEventListener('click', async () => {
    let r = null; try { r = await window.browserAPI.pwImportCsv(); } catch (_) {}
    if (r && r.ok) { toast('Imported ' + r.added + ' of ' + r.total + ' login' + (r.total === 1 ? '' : 's')); buildPasswords(); }
    else if (r && r.error) toast(r.error);
  });
  el.querySelector('#pwSearch').addEventListener('input', (e) => renderPwList(e.target.value));
  renderPwList('');
}
function renderPwList(q) {
  const wrap = $('pwList'); if (!wrap) return;
  wrap.innerHTML = '';
  const term = String(q || '').trim().toLowerCase();
  const items = pwEntries.filter((e) => !term || ((e.url || '') + ' ' + (e.username || '')).toLowerCase().includes(term));
  if (!items.length) {
    const e = document.createElement('div'); e.className = 'empty-state';
    e.innerHTML = ICO_PW.lock + '<p>' + (pwEntries.length ? 'No matching logins.' : 'No saved passwords yet. Add one, or import from another browser.') + '</p>';
    wrap.appendChild(e); return;
  }
  items.forEach((entry) => wrap.appendChild(pwRow(entry)));
}
function pwRow(entry) {
  const row = document.createElement('div'); row.className = 'pw-item';
  const ic = document.createElement('div'); ic.className = 'pw-ic';
  const img = document.createElement('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = pwFavicon(entry.url);
  const fb = document.createElement('span'); fb.className = 'pw-fb'; fb.textContent = (pwSiteName(entry.url)[0] || '?').toUpperCase(); fb.style.display = 'none';
  img.addEventListener('error', () => { img.style.display = 'none'; fb.style.display = 'grid'; });
  ic.append(img, fb);
  const meta = document.createElement('div'); meta.className = 'pw-meta';
  const site = document.createElement('div'); site.className = 'pw-site'; site.textContent = pwSiteName(entry.url);
  const user = document.createElement('div'); user.className = 'pw-user'; user.textContent = entry.username || '—';
  const pass = document.createElement('div'); pass.className = 'pw-pass';
  const dots = '••••••••••';
  pass.textContent = dots;
  let shown = false;
  meta.append(site, user, pass);
  const actions = document.createElement('div'); actions.className = 'pw-actions';
  const reveal = dlBtn(ICO_PW.eye, 'Show / hide password', '', () => { shown = !shown; pass.textContent = shown ? (entry.password || '') : dots; reveal.classList.toggle('on', shown); });
  const copyU = dlBtn(ICO_PW.user, 'Copy username', '', () => { clipText(entry.username); toast('Username copied'); });
  const copyP = dlBtn(ICO_PW.copy, 'Copy password', '', () => { clipText(entry.password); toast('Password copied'); });
  const edit = dlBtn(ICO_PW.edit, 'Edit', '', () => openPwEditor(entry));
  const del = dlBtn(ICO_DL.trash, 'Delete', 'danger', async () => {
    try { await window.browserAPI.pwRemove(entry.id); } catch (_) {}
    pwEntries = pwEntries.filter((x) => x.id !== entry.id);
    const s = $('pwSearch'); renderPwList(s ? s.value : '');
  });
  actions.append(reveal, copyU, copyP, edit, del);
  row.append(ic, meta, actions);
  return row;
}
function openPwEditor(entry) {
  const isEdit = !!entry;
  const ov = document.createElement('div'); ov.className = 'pw-modal';
  ov.innerHTML =
    '<div class="pw-card"><div class="pw-card-title">' + (isEdit ? 'Edit login' : 'Add a login') + '</div>' +
    '<label class="pw-field"><span>Website</span><input id="pwfUrl" type="text" placeholder="example.com" autocomplete="off" spellcheck="false"></label>' +
    '<label class="pw-field"><span>Username or email</span><input id="pwfUser" type="text" autocomplete="off" spellcheck="false"></label>' +
    '<label class="pw-field"><span>Password</span><span class="pw-input-wrap"><input id="pwfPass" type="password" autocomplete="off" spellcheck="false"><button type="button" class="pw-eye" id="pwfEye" aria-label="Show password">' + ICO_PW.eye + '</button></span></label>' +
    '<label class="pw-field"><span>Note (optional)</span><input id="pwfNote" type="text" autocomplete="off" spellcheck="false"></label>' +
    '<div class="pw-card-row"><button class="btn ghost" data-act="cancel">Cancel</button><button class="btn" data-act="save">' + (isEdit ? 'Save' : 'Add') + '</button></div></div>';
  document.body.appendChild(ov);
  const urlI = ov.querySelector('#pwfUrl'), userI = ov.querySelector('#pwfUser'), passI = ov.querySelector('#pwfPass'), noteI = ov.querySelector('#pwfNote');
  if (isEdit) { urlI.value = entry.url || ''; userI.value = entry.username || ''; passI.value = entry.password || ''; noteI.value = entry.note || ''; }
  ov.querySelector('#pwfEye').addEventListener('click', () => { passI.type = passI.type === 'password' ? 'text' : 'password'; });
  setTimeout(() => { try { urlI.focus(); } catch (_) {} }, 20);
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  ov.querySelector('[data-act="cancel"]').addEventListener('click', close);
  ov.querySelector('[data-act="save"]').addEventListener('click', async () => {
    const payload = { url: urlI.value.trim(), username: userI.value, password: passI.value, note: noteI.value };
    if (!payload.url && !payload.username && !payload.password) { close(); return; }
    try { if (isEdit) await window.browserAPI.pwUpdate(entry.id, payload); else await window.browserAPI.pwAdd(payload); } catch (_) {}
    close(); buildPasswords();
  });
}
// Chrome-side "Save password?" bubble, triggered by autofill on form submit.
let pwPromptEl = null;
function showPwSavePrompt(data) {
  if (!data || !data.password) return;
  if (pwPromptEl) { pwPromptEl.remove(); pwPromptEl = null; }
  const update = !!data.existingId;
  const el = document.createElement('div'); el.className = 'pw-prompt'; pwPromptEl = el;
  el.innerHTML =
    '<div class="pw-prompt-ic">' + ICO_PW.lock + '</div>' +
    '<div class="pw-prompt-body">' +
    '<div class="pw-prompt-title">' + (update ? 'Update password?' : 'Save password?') + '</div>' +
    '<div class="pw-prompt-sub">' + escapeHtml(data.username || data.host) + ' · ' + escapeHtml(data.host) + '</div>' +
    '<div class="pw-prompt-row"><button class="btn ghost" data-act="no">Not now</button><button class="btn" data-act="yes">' + (update ? 'Update' : 'Save') + '</button></div>' +
    '</div><button class="pw-prompt-x" aria-label="Dismiss">&times;</button>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 260); if (pwPromptEl === el) pwPromptEl = null; };
  el.querySelector('.pw-prompt-x').addEventListener('click', close);
  el.querySelector('[data-act="no"]').addEventListener('click', close);
  el.querySelector('[data-act="yes"]').addEventListener('click', async () => {
    try {
      if (update) await window.browserAPI.pwUpdate(data.existingId, { password: data.password });
      else await window.browserAPI.pwAdd({ url: data.url || ('https://' + data.host), username: data.username, password: data.password });
      toast(update ? 'Password updated' : 'Password saved');
    } catch (_) {}
    close();
  });
  setTimeout(() => { if (pwPromptEl === el) close(); }, 20000);
}

// "Make Drift your default browser?" nudge — on first run and periodically if not default.
async function maybeShowDefaultPrompt() {
  if (typeof INCOGNITO !== 'undefined' && INCOGNITO) return;
  let st = null;
  try { st = await window.browserAPI.defaultStatus(); } catch (_) { return; }
  if (!st || st.isDefault) return;
  const DAY = 86400000;
  if (st.askedAt && (Date.now() - st.askedAt) < 4 * DAY) return; // asked recently — don't nag
  showDefaultPrompt();
}
function showDefaultPrompt() {
  const el = document.createElement('div'); el.className = 'pw-prompt';
  el.innerHTML =
    '<div class="pw-prompt-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg></div>' +
    '<div class="pw-prompt-body">' +
    '<div class="pw-prompt-title">Make Drift your default browser?</div>' +
    '<div class="pw-prompt-sub">Open links from other apps in Drift.</div>' +
    '<div class="pw-prompt-row"><button class="btn ghost" data-act="no">Not now</button><button class="btn" data-act="yes">Make default</button></div>' +
    '</div><button class="pw-prompt-x" aria-label="Dismiss">&times;</button>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 260); };
  const snooze = () => { try { window.browserAPI.defaultSnooze(); } catch (_) {} close(); };
  el.querySelector('.pw-prompt-x').addEventListener('click', snooze);
  el.querySelector('[data-act="no"]').addEventListener('click', snooze);
  el.querySelector('[data-act="yes"]').addEventListener('click', () => {
    try { window.browserAPI.defaultMake(); } catch (_) {}
    toast('Pick Drift in Windows settings to finish');
    close();
  });
  setTimeout(() => { if (el.isConnected) snooze(); }, 20000);
}

async function buildPrivacy() {
  const el = $('secPrivacy');
  let p = { adblock: true, dnt: true, blocked: 0 };
  try { p = await window.browserAPI.privacyGet(); } catch (_) {}
  const ce = p.clearExit || { history: false, cookies: false, cache: false };
  const eng = p.adblockEngine === 'ublock' ? 'ublock' : 'cream';
  const ubo = eng === 'ublock';
  el.innerHTML =
    '<h2>Privacy &amp; security</h2><p class="sub">Block trackers and ads, and clear what Drift has stored.</p>' +
    '<div class="set-group"><div class="set-label">Protection</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Ad-blocker engine</div><div class="ds">uBlock Origin (built in) or Drift’s lightweight blocker.</div></div>' +
    `<div class="set-right"><div class="field"><select id="adEngineSel"><option value="ublock"${ubo ? ' selected' : ''}>uBlock Origin</option><option value="cream"${ubo ? '' : ' selected'}>Drift built-in</option></select></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Ad &amp; tracker blocker</div><div class="ds">Blocks known ad and tracking domains' + (p.blocked ? ' · <b>' + p.blocked + '</b> blocked this session' : '') + '.</div></div>' +
    `<div class="set-right"><div class="switch${p.adblock ? ' on' : ''}${ubo ? ' is-off' : ''}" id="adblockSwitch" role="switch" aria-checked="${p.adblock}" tabindex="0"${ubo ? ' style="opacity:.45;pointer-events:none"' : ''}></div></div></div>` +
    (ubo ? '<div class="set-row"><div class="rl"><div class="ds">uBlock Origin is built in and active — it handles ad &amp; tracker blocking, so Drift’s built-in blocker is paused.</div></div></div>' : '') +
    '<div class="set-row"><div class="rl"><div class="nm">Send “Do Not Track”</div><div class="ds">Ask sites not to track you (also sets Global Privacy Control).</div></div>' +
    `<div class="set-right"><div class="switch${p.dnt ? ' on' : ''}" id="dntSwitch" role="switch" aria-checked="${p.dnt}" tabindex="0"></div></div></div></div>` +
    '<div class="set-group"><div class="set-label">Clear on exit</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Browsing history</div><div class="ds">Wipe Drift’s history every time you quit.</div></div>' +
    `<div class="set-right"><div class="switch${ce.history ? ' on' : ''}" id="ceHistory" role="switch" aria-checked="${ce.history}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Cookies &amp; logins</div><div class="ds">Sign out of every site and clear their storage on quit.</div></div>' +
    `<div class="set-right"><div class="switch${ce.cookies ? ' on' : ''}" id="ceCookies" role="switch" aria-checked="${ce.cookies}" tabindex="0"></div></div></div>` +
    '<div class="set-row"><div class="rl"><div class="nm">Cached files</div><div class="ds">Empty the cache on quit so nothing is left on disk.</div></div>' +
    `<div class="set-right"><div class="switch${ce.cache ? ' on' : ''}" id="ceCache" role="switch" aria-checked="${ce.cache}" tabindex="0"></div></div></div></div>` +
    '<div class="set-group"><div class="set-label">Clear data</div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Cookies &amp; site data</div><div class="ds">Signs you out of sites and removes their storage.</div></div>' +
    '<div class="set-right"><button class="btn ghost" id="clrCookies">Clear</button></div></div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Cached files</div><div class="ds">Frees space; pages reload fresh next time.</div></div>' +
    '<div class="set-right"><button class="btn ghost" id="clrCache">Clear</button></div></div>' +
    '<div class="set-row"><div class="rl"><div class="nm">Everything</div><div class="ds">Cookies, site storage, and cache.</div></div>' +
    '<div class="set-right"><button class="btn danger" id="clrAll">Clear all</button></div></div></div>';
  el.querySelector('#adEngineSel').addEventListener('change', async (e) => { await window.browserAPI.privacySet({ adblockEngine: e.target.value }); buildPrivacy(); });
  el.querySelector('#adblockSwitch').addEventListener('click', async (e) => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on); await window.browserAPI.privacySet({ adblock: on }); });
  el.querySelector('#dntSwitch').addEventListener('click', async (e) => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on); await window.browserAPI.privacySet({ dnt: on }); });
  const saveClearExit = () => {
    const get = (id) => el.querySelector(id).classList.contains('on');
    try { window.browserAPI.privacySetClearExit({ history: get('#ceHistory'), cookies: get('#ceCookies'), cache: get('#ceCache') }); } catch (_) {}
  };
  ['#ceHistory', '#ceCookies', '#ceCache'].forEach((id) => {
    el.querySelector(id).addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('on');
      e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on);
      saveClearExit();
    });
  });
  const clr = (id, what, label, done) => el.querySelector(id).addEventListener('click', async (ev) => { ev.target.textContent = 'Clearing…'; await window.browserAPI.privacyClear(what); ev.target.textContent = 'Cleared'; toast(done); setTimeout(() => { ev.target.textContent = label; }, 1600); });
  clr('#clrCookies', 'cookies', 'Clear', 'Cookies & site data cleared');
  clr('#clrCache', 'cache', 'Clear', 'Cache cleared');
  clr('#clrAll', 'all', 'Clear all', 'Browsing data cleared');
}

// ============================================================
//  Downloads
// ============================================================
const downloadsPanel = $('downloadsPanel');
let dlActive = new Map();
let dlHistory = [];
let downloadsOpen = false;

function fmtBytes(n) {
  n = Number(n) || 0; if (n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i === 0 ? n : n.toFixed(1)) + ' ' + u[i];
}
const ICO_DL = {
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 5v14M16 5v14"/></svg>',
  resume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l13 8-13 8z"/></svg>',
  cancel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
};
function dlBtn(html, title, cls, fn) {
  const b = document.createElement('button'); b.className = 'dl-btn' + (cls ? ' ' + cls : ''); b.title = title; b.setAttribute('aria-label', title); b.innerHTML = html;
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}
function dlRow(d, isActive) {
  const row = document.createElement('div'); row.className = 'dl-item';
  const ic = document.createElement('div'); ic.className = 'dl-ic'; ic.innerHTML = ICO_DL.file;
  const main = document.createElement('div'); main.className = 'dl-main';
  const name = document.createElement('div'); name.className = 'dl-name'; name.textContent = d.filename || d.url || 'Download'; name.title = d.savePath || d.url || '';
  const sub = document.createElement('div'); sub.className = 'dl-sub';
  main.append(name, sub);
  const actions = document.createElement('div'); actions.className = 'dl-actions';
  if (isActive && d.state === 'progressing') {
    const pct = d.total > 0 ? Math.round((d.received / d.total) * 100) : null;
    sub.textContent = (d.paused ? 'Paused · ' : '') + fmtBytes(d.received) + (d.total > 0 ? ' / ' + fmtBytes(d.total) + (pct != null ? '  (' + pct + '%)' : '') : '');
    const bar = document.createElement('div'); bar.className = 'dl-bar';
    const span = document.createElement('span'); span.style.width = (pct != null ? pct : 35) + '%'; bar.appendChild(span); main.appendChild(bar);
    if (d.paused) actions.appendChild(dlBtn(ICO_DL.resume, 'Resume', '', () => window.browserAPI.dlResume(d.id)));
    else actions.appendChild(dlBtn(ICO_DL.pause, 'Pause', '', () => window.browserAPI.dlPause(d.id)));
    actions.appendChild(dlBtn(ICO_DL.cancel, 'Cancel', 'danger', () => window.browserAPI.dlCancel(d.id)));
  } else {
    const ok = d.state === 'completed';
    sub.textContent = (ok ? fmtBytes(d.total || d.received) : (d.state === 'cancelled' ? 'Cancelled' : 'Failed')) + ' · ' + hostOf(d.url || '');
    if (ok) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => window.browserAPI.dlOpen(d.savePath));
      actions.appendChild(dlBtn(ICO_DL.folder, 'Show in folder', '', () => window.browserAPI.dlShow(d.savePath)));
    } else if (d.url && d.url.indexOf('snip:') !== 0) {
      actions.appendChild(dlBtn(ICO_DL.retry, 'Retry', '', () => { const t = activeTab(); if (t) { try { t.wv.downloadURL(d.url); } catch (_) {} } }));
    }
    actions.appendChild(dlBtn(ICO_DL.trash, 'Remove', 'danger', async () => { await window.browserAPI.dlRemove(d.id); dlHistory = dlHistory.filter((x) => x.id !== d.id); renderDownloads(); }));
  }
  row.append(ic, main, actions);
  row.addEventListener('contextmenu', (e) => { e.preventDefault(); showCtxMenu(e.clientX, e.clientY, dlMenuItems(d)); });
  return row;
}
// Shared right-click menu for a download (list rows and toasts).
function dlMenuItems(d) {
  const done = d.state === 'completed';
  const active = dlActive.has(d.id);
  return [
    { label: 'Open', disabled: !done || !d.savePath, fn: () => window.browserAPI.dlOpen(d.savePath) },
    { label: 'Show in folder', disabled: !d.savePath, fn: () => window.browserAPI.dlShow(d.savePath) },
    { sep: true },
    { label: 'Copy download address', disabled: !d.url, fn: () => clipText(d.url) },
    { label: 'Copy file location', disabled: !d.savePath, fn: () => clipText(d.savePath) },
    { sep: true },
    { label: active ? 'Cancel' : 'Remove', fn: async () => {
      if (active) { try { window.browserAPI.dlCancel(d.id); } catch (_) {} }
      else { try { await window.browserAPI.dlRemove(d.id); } catch (_) {} dlHistory = dlHistory.filter((x) => x.id !== d.id); }
      removeDlToast(d.id, 0);
      if (downloadsOpen) renderDownloads();
    } },
  ];
}
function renderDownloads() {
  const list = $('downloadsList'); list.innerHTML = '';
  const actives = [...dlActive.values()];
  if (!actives.length && !dlHistory.length) {
    const e = document.createElement('div'); e.className = 'empty-state'; e.innerHTML = ICO_DL.file + '<p>No downloads yet. Files you download will appear here.</p>'; list.appendChild(e); return;
  }
  if (actives.length) { const l = document.createElement('div'); l.className = 'hist-group-label'; l.textContent = 'Active'; list.appendChild(l); actives.forEach((d) => list.appendChild(dlRow(d, true))); }
  if (dlHistory.length) { const l = document.createElement('div'); l.className = 'hist-group-label'; l.textContent = 'Recent'; list.appendChild(l); dlHistory.forEach((d) => list.appendChild(dlRow(d, false))); }
}
async function refreshDownloads() {
  try { const r = await window.browserAPI.dlList(); dlActive = new Map((r.active || []).map((d) => [d.id, d])); dlHistory = r.history || []; } catch (_) {}
  renderDownloads();
}
function openDownloads() { closeHistory(); closeMenu(); downloadsOpen = true; refreshDownloads(); downloadsPanel.classList.add('open'); downloadsPanel.setAttribute('aria-hidden', 'false'); scrim.classList.add('show'); updateRailActive(); }
function closeDownloads() { downloadsOpen = false; downloadsPanel.classList.remove('open'); downloadsPanel.setAttribute('aria-hidden', 'true'); if (!menuOpen && !historyPanelOpen) scrim.classList.remove('show'); updateRailActive(); }
function toggleDownloads() { downloadsOpen ? closeDownloads() : openDownloads(); }
// ----- Download toasts (transient progress notifications) -----
const dlToastEls = new Map(); // id -> toast element
const dlRaw = new Map();      // id -> { bytes, t } for speed sampling
const dlRates = new Map();    // id -> smoothed bytes/sec
function renderDlToast(d) {
  const host = $('dlToasts'); if (!host) return;
  let el = dlToastEls.get(d.id);
  if (!el) {
    el = document.createElement('div'); el.className = 'dl-toast';
    el.innerHTML = '<div class="dl-toast-ic"></div><div class="dl-toast-main"><div class="dl-toast-name"></div><div class="dl-toast-bar"><span></span></div><div class="dl-toast-sub"></div></div><button class="dl-toast-x" aria-label="Dismiss">&times;</button>';
    el.querySelector('.dl-toast-x').addEventListener('click', (e) => { e.stopPropagation(); removeDlToast(d.id, 0); });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); const dd = dlActive.get(d.id) || dlHistory.find((x) => x.id === d.id) || d; showCtxMenu(e.clientX, e.clientY, dlMenuItems(dd)); });
    el.addEventListener('click', () => { const dd = dlHistory.find((x) => x.id === d.id); if (dd && dd.state === 'completed') window.browserAPI.dlOpen(dd.savePath); });
    dlToastEls.set(d.id, el); host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
  }
  const done = d.state === 'completed';
  const failed = d.state === 'interrupted' || d.state === 'cancelled' || d.state === 'failed';
  const pct = d.total > 0 ? Math.round((d.received / d.total) * 100) : null;
  el.classList.toggle('done', done); el.classList.toggle('failed', failed);
  el.querySelector('.dl-toast-ic').innerHTML = done ? ICO_DL.check : (failed ? ICO_DL.cancel : ICO_DL.file);
  el.querySelector('.dl-toast-name').textContent = d.filename || 'Download';
  el.querySelector('.dl-toast-bar span').style.width = (done ? 100 : (pct != null ? pct : (failed ? 0 : 30))) + '%';
  let sub;
  if (done) sub = 'Completed · ' + fmtBytes(d.total || d.received);
  else if (failed) sub = d.state === 'cancelled' ? 'Cancelled' : 'Failed';
  else { const r = dlRates.get(d.id); sub = fmtBytes(d.received) + (d.total > 0 ? ' / ' + fmtBytes(d.total) : '') + (r ? ' · ' + fmtBytes(r) + '/s' : ''); }
  el.querySelector('.dl-toast-sub').textContent = sub;
  if (done || failed) removeDlToast(d.id, 6000);
}
function removeDlToast(id, delay) {
  dlRaw.delete(id); dlRates.delete(id);
  const el = dlToastEls.get(id); if (!el) return;
  dlToastEls.delete(id);
  const go = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 320); };
  if (delay) setTimeout(go, delay); else go();
}
function onDownloadEvent(evt) {
  if (!evt || !evt.item) return;
  const d = evt.item;
  if (evt.type === 'updated') {
    const now = performance.now();
    const prev = dlRaw.get(d.id);
    if (prev) {
      const dt = (now - prev.t) / 1000;
      if (dt >= 0.2) {
        const r = (d.received - prev.bytes) / dt;
        if (r >= 0) dlRates.set(d.id, dlRates.has(d.id) ? dlRates.get(d.id) * 0.6 + r * 0.4 : r);
        dlRaw.set(d.id, { bytes: d.received, t: now });
      }
    } else dlRaw.set(d.id, { bytes: d.received, t: now });
  }
  if (evt.type === 'done') { dlActive.delete(d.id); if (d.state === 'completed') { dlHistory = dlHistory.filter((x) => x.id !== d.id); dlHistory.unshift(d); } }
  else { dlActive.set(d.id, d); }
  renderDlToast(d);
  if (downloadsOpen) renderDownloads();
}

// ============================================================
//  Zoom
// ============================================================
const zoomPop = $('zoomPop');
let zoomPopOpen = false;
function clampZoom(z) { return Math.max(0.3, Math.min(3, z)); }
function applyZoom(tab) { try { tab.wv.setZoomFactor(tab.zoom || 1); } catch (_) {} }
function updateZoomUI() { const t = activeTab(); const z = t ? (t.zoom || 1) : 1; const v = $('zoomVal'); if (v) v.textContent = Math.round(z * 100) + '%'; }
function setZoom(f) { const t = activeTab(); if (!t) return; t.zoom = clampZoom(f); applyZoom(t); updateZoomUI(); }
function zoomIn() { const t = activeTab(); if (t) setZoom((t.zoom || 1) + 0.1); }
function zoomOut() { const t = activeTab(); if (t) setZoom((t.zoom || 1) - 0.1); }
function zoomReset() { setZoom(1); }
function openZoom() { zoomPopOpen = true; const r = $('zoomBtn').getBoundingClientRect(); zoomPop.style.top = (r.bottom + 6) + 'px'; zoomPop.style.right = (window.innerWidth - r.right) + 'px'; zoomPop.classList.add('open'); zoomPop.setAttribute('aria-hidden', 'false'); updateZoomUI(); }
function closeZoom() { zoomPopOpen = false; zoomPop.classList.remove('open'); zoomPop.setAttribute('aria-hidden', 'true'); }
function toggleZoom() { zoomPopOpen ? closeZoom() : openZoom(); }

// ============================================================
//  Snip (region capture)
// ============================================================
const snipOverlay = $('snipOverlay');
const snipBox = $('snipBox');
let snipping = false, snipStart = null;
function startSnip() { if (!activeTab()) return; snipping = true; snipStart = null; snipBox.classList.remove('show'); snipOverlay.classList.add('active'); snipOverlay.setAttribute('aria-hidden', 'false'); }
function endSnip() { snipping = false; snipStart = null; snipBox.classList.remove('show'); snipOverlay.classList.remove('active'); snipOverlay.setAttribute('aria-hidden', 'true'); }
function snipDown(e) { if (!snipping) return; snipStart = { x: e.clientX, y: e.clientY }; Object.assign(snipBox.style, { left: e.clientX + 'px', top: e.clientY + 'px', width: '0px', height: '0px' }); snipBox.classList.add('show'); }
function snipMove(e) { if (!snipping || !snipStart) return; const x = Math.min(e.clientX, snipStart.x), y = Math.min(e.clientY, snipStart.y), w = Math.abs(e.clientX - snipStart.x), h = Math.abs(e.clientY - snipStart.y); Object.assign(snipBox.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); }
async function snipUp(e) {
  if (!snipping || !snipStart) { endSnip(); return; }
  const sx = snipStart.x, sy = snipStart.y;
  const x = Math.min(e.clientX, sx), y = Math.min(e.clientY, sy), w = Math.abs(e.clientX - sx), h = Math.abs(e.clientY - sy);
  const t = activeTab();
  endSnip();
  if (w < 5 || h < 5 || !t) return;
  const vr = t.wv.getBoundingClientRect();
  let rx = Math.round(x - vr.left), ry = Math.round(y - vr.top), rw = Math.round(w), rh = Math.round(h);
  if (rx < 0) { rw += rx; rx = 0; }
  if (ry < 0) { rh += ry; ry = 0; }
  rw = Math.min(rw, Math.floor(vr.width) - rx);
  rh = Math.min(rh, Math.floor(vr.height) - ry);
  if (rw < 5 || rh < 5) { toast('Selection outside the page'); return; }
  try {
    const img = await t.wv.capturePage({ x: rx, y: ry, width: rw, height: rh });
    const r = await window.browserAPI.snipSave(img.toDataURL());
    toast(r && r.ok ? 'Snip saved to Downloads & copied' : 'Snip failed');
  } catch (_) { toast('Snip failed'); }
}

// ============================================================
//  Background music
// ============================================================
const bgAudio = $('bgAudio');
const musicPop = $('musicPop');
let musicPopOpen = false;
let musicLoaded = false;
const ICO_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 4l13 8-13 8z"/></svg>';
const ICO_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
function musicUpdateUI() {
  const playing = !bgAudio.paused && !!bgAudio.src;
  $('musicPlay').innerHTML = playing ? ICO_PAUSE : ICO_PLAY;
  $('railMusic').classList.toggle('playing', playing);
  $('musicLoop').classList.toggle('on', bgAudio.loop);
}
function musicLoad(url, name, autoplay) {
  bgAudio.src = url; musicLoaded = true;
  $('musicName').textContent = name || 'Audio';
  try { localStorage.setItem('cream.music', JSON.stringify({ url, name })); } catch (_) {}
  if (autoplay) bgAudio.play().catch(() => {});
  musicUpdateUI();
}
async function chooseMusic() {
  const r = await window.browserAPI.musicChoose();
  if (r && r.ok) musicLoad(r.url, r.name, true);
  else if (r && r.error) toast('Could not load audio');
}
function musicToggle() {
  if (!musicLoaded) { chooseMusic(); return; }
  if (bgAudio.paused) bgAudio.play().catch(() => {}); else bgAudio.pause();
  musicUpdateUI();
}
function openMusic() { musicPopOpen = true; const r = $('railMusic').getBoundingClientRect(); musicPop.style.left = (r.right + 8) + 'px'; musicPop.style.right = 'auto'; musicPop.style.top = Math.max(8, Math.min(r.top, window.innerHeight - 240)) + 'px'; musicPop.classList.add('open'); musicPop.setAttribute('aria-hidden', 'false'); }
function closeMusic() { musicPopOpen = false; musicPop.classList.remove('open'); musicPop.setAttribute('aria-hidden', 'true'); }
function toggleMusicPop() { musicPopOpen ? closeMusic() : openMusic(); }
function restoreMusic() {
  try {
    const vol = localStorage.getItem('cream.musicVol');
    const loop = localStorage.getItem('cream.musicLoop');
    bgAudio.loop = loop !== '0';
    bgAudio.volume = vol != null ? Number(vol) / 100 : 0.7;
    const vEl = $('musicVol'); if (vEl) vEl.value = Math.round(bgAudio.volume * 100);
    const raw = localStorage.getItem('cream.music');
    if (raw) { const m = JSON.parse(raw); if (m && m.url) musicLoad(m.url, m.name, false); }
  } catch (_) {}
  musicUpdateUI();
}

// ============================================================
//  Sidebar quick-access sites
// ============================================================
const railSites = $('railSites');
const addSitePop = $('addSitePop');
let addSitePopOpen = false;
function loadSidebarSites() {
  try { const v = JSON.parse(localStorage.getItem('cream.sidebarSites') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
}
function saveSidebarSites(list) { try { localStorage.setItem('cream.sidebarSites', JSON.stringify(list)); } catch (_) {} }
function normalizeSiteUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
  try { const u = new URL(s); if (!u.hostname.includes('.')) return null; return u.href; } catch (_) { return null; }
}
function siteFavicon(url) { try { const u = new URL(url); return u.origin + '/favicon.ico'; } catch (_) { return ''; } }
function siteInitial(url) { try { return ((new URL(url).hostname.replace(/^www\./, '')[0]) || '?').toUpperCase(); } catch (_) { return '?'; } }
function renderSidebarSites() {
  const list = loadSidebarSites();
  railSites.innerHTML = '';
  list.forEach((site, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'rail-site';
    const btn = document.createElement('button');
    btn.className = 'rail-btn'; btn.title = site.url;
    const img = document.createElement('img');
    img.className = 'rs-fav'; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = siteFavicon(site.url);
    const fb = document.createElement('span');
    fb.className = 'rs-fallback'; fb.textContent = siteInitial(site.url); fb.style.display = 'none';
    img.addEventListener('error', () => { img.style.display = 'none'; fb.style.display = 'grid'; });
    btn.appendChild(img); btn.appendChild(fb);
    btn.addEventListener('click', () => { navigate(site.url); });
    const x = document.createElement('button');
    x.className = 'rs-x'; x.title = 'Remove'; x.setAttribute('aria-label', 'Remove shortcut');
    x.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', (e) => { e.stopPropagation(); const l = loadSidebarSites(); l.splice(i, 1); saveSidebarSites(l); renderSidebarSites(); });
    wrap.appendChild(btn); wrap.appendChild(x);
    railSites.appendChild(wrap);
  });
}
function addSidebarSite() {
  const inp = $('addSiteInput');
  const url = normalizeSiteUrl(inp.value);
  if (!url) { toast('Enter a valid web address'); return; }
  const list = loadSidebarSites();
  if (list.some((s) => s.url === url)) { toast('Already added'); closeAddSite(); return; }
  list.push({ url }); saveSidebarSites(list); renderSidebarSites();
  inp.value = ''; closeAddSite();
}
function openAddSite() {
  addSitePopOpen = true;
  const r = $('railAddSite').getBoundingClientRect();
  addSitePop.style.left = (r.right + 8) + 'px'; addSitePop.style.right = 'auto';
  addSitePop.style.top = Math.max(8, Math.min(r.top, window.innerHeight - 170)) + 'px';
  addSitePop.classList.add('open'); addSitePop.setAttribute('aria-hidden', 'false');
  setTimeout(() => { try { $('addSiteInput').focus(); } catch (_) {} }, 30);
}
function closeAddSite() { addSitePopOpen = false; addSitePop.classList.remove('open'); addSitePop.setAttribute('aria-hidden', 'true'); }
function toggleAddSite() { addSitePopOpen ? closeAddSite() : openAddSite(); }

// ============================================================
//  Sidebar ad-blocker popover (per-site allow)
// ============================================================
const adblockPop = $('adblockPop');
let adblockPopOpen = false;
function adHostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; } }
function updateAdblockRail(allowedOnThisSite) {
  const rs = $('adblockBtn'); if (rs) rs.classList.toggle('off', !!allowedOnThisSite);
}
async function refreshAdblockRail() {
  const t = activeTab(); const host = t ? adHostOf(t.url) : '';
  try { const info = await window.browserAPI.privacyGet(); updateAdblockRail(host && Array.isArray(info.allow) && info.allow.includes(host)); }
  catch (_) { updateAdblockRail(false); }
}
async function refreshAdblockPop() {
  const t = activeTab(); const host = t ? adHostOf(t.url) : '';
  $('abSite').textContent = host || 'This page';
  let info = { blocked: 0, allow: [] };
  try { info = await window.browserAPI.privacyGet(); } catch (_) {}
  const allowed = !!(host && Array.isArray(info.allow) && info.allow.includes(host));
  $('abStat').textContent = Number(info.blocked || 0).toLocaleString() + ' requests blocked this session';
  const sw = $('abSiteSwitch'); const blockOn = !allowed;
  sw.classList.toggle('on', blockOn); sw.setAttribute('aria-checked', String(blockOn));
  updateAdblockRail(allowed);
}
async function openAdblock() {
  adblockPopOpen = true;
  const r = $('adblockBtn').getBoundingClientRect();
  adblockPop.style.left = 'auto'; adblockPop.style.right = (window.innerWidth - r.right) + 'px';
  adblockPop.style.top = (r.bottom + 6) + 'px';
  adblockPop.classList.add('open'); adblockPop.setAttribute('aria-hidden', 'false');
  await refreshAdblockPop();
}
function closeAdblock() { adblockPopOpen = false; adblockPop.classList.remove('open'); adblockPop.setAttribute('aria-hidden', 'true'); }
function toggleAdblock() { adblockPopOpen ? closeAdblock() : openAdblock(); }
async function toggleAdblockSite() {
  const t = activeTab(); const host = adHostOf(t ? t.url : '');
  if (!host) { toast('No site to adjust'); return; }
  const sw = $('abSiteSwitch');
  const blockOn = !sw.classList.contains('on'); // desired new state
  try { await window.browserAPI.privacyAllowSite(host, !blockOn); } catch (_) {}
  sw.classList.toggle('on', blockOn); sw.setAttribute('aria-checked', String(blockOn));
  updateAdblockRail(!blockOn);
  if (t) { try { t.wv.reload(); } catch (_) {} }
}

// ============================================================
//  Toolbar customization (right-click to remove / restore tools)
// ============================================================
const TOOLBAR_TOOLS = [
  { tool: 'adblock', label: 'Ad blocker' },
  { tool: 'downloads', label: 'Downloads' },
  { tool: 'extensions', label: 'Extensions' },
  { tool: 'zoom', label: 'Zoom' },
  { tool: 'snip', label: 'Snip' },
  { tool: 'theme', label: 'Light / dark' },
  { tool: 'history', label: 'History' },
];
function loadHiddenTools() { try { const v = JSON.parse(localStorage.getItem('cream.hiddenTools') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
function saveHiddenTools(arr) { try { localStorage.setItem('cream.hiddenTools', JSON.stringify(arr)); } catch (_) {} }
function applyHiddenTools() {
  const hidden = new Set(loadHiddenTools());
  document.querySelectorAll('#actionGroup .tool-btn').forEach((b) => { b.style.display = hidden.has(b.dataset.tool) ? 'none' : ''; });
}
function toggleTool(tool) {
  const arr = loadHiddenTools(); const i = arr.indexOf(tool);
  if (i === -1) arr.push(tool); else arr.splice(i, 1);
  saveHiddenTools(arr); applyHiddenTools();
}

// Right-click-to-hide for the sidebar/foot rail buttons (works in both the icon
// rail and the vertical-tab foot, since they're the same elements).
const RAIL_HIDEABLE = { railBookmarks: 'bookmarks button', railHistory: 'history button', railAI: 'Drift AI button', railMusic: 'music button' };
function loadHiddenRail() { try { const a = JSON.parse(localStorage.getItem('cream.hiddenRail') || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; } }
function saveHiddenRail(a) { try { localStorage.setItem('cream.hiddenRail', JSON.stringify(a)); } catch (_) {} }
function applyHiddenRail() { const h = new Set(loadHiddenRail()); Object.keys(RAIL_HIDEABLE).forEach((id) => { const b = $(id); if (b) b.style.display = h.has(id) ? 'none' : ''; }); }
function toggleRailHidden(id) { const a = loadHiddenRail(); const i = a.indexOf(id); if (i === -1) a.push(id); else a.splice(i, 1); saveHiddenRail(a); applyHiddenRail(); }
function showRailMenu(x, y, id) {
  showCtxMenu(x, y, [
    { label: 'Remove ' + (RAIL_HIDEABLE[id] || 'button'), fn: () => toggleRailHidden(id) },
    loadHiddenRail().length ? { label: 'Restore all hidden icons', fn: () => { saveHiddenRail([]); applyHiddenRail(); } } : null,
  ]);
}
// Shared floating context menu (toolbar customise + web-page right-click)
let ctxMenuEl = null, ctxBackdrop = null;
function closeCtxMenu() {
  document.body.classList.remove('ctx-open');
  if (ctxBackdrop) { ctxBackdrop.remove(); ctxBackdrop = null; }
  if (!ctxMenuEl) return;
  ctxMenuEl.remove(); ctxMenuEl = null;
  document.removeEventListener('mousedown', closeCtxMenu);
  window.removeEventListener('blur', closeCtxMenu);
  window.removeEventListener('resize', closeCtxMenu);
  document.removeEventListener('scroll', closeCtxMenu, true);
}
function showCtxMenu(x, y, items) {
  closeCtxMenu();
  // Invisible full-window backdrop ABOVE the page so a click anywhere — including
  // over a <webview> — dismisses the menu (webview clicks don't reach the document).
  const bd = document.createElement('div'); bd.className = 'ctx-backdrop'; ctxBackdrop = bd;
  bd.addEventListener('mousedown', (e) => { e.preventDefault(); closeCtxMenu(); });
  bd.addEventListener('contextmenu', (e) => { e.preventDefault(); closeCtxMenu(); });
  document.body.appendChild(bd);
  document.body.classList.add('ctx-open');   // makes webviews ignore clicks so the backdrop can catch them
  const m = document.createElement('div'); m.className = 'ctx-menu'; ctxMenuEl = m;
  // Clicks inside the menu box must NOT dismiss it (only item actions act).
  m.addEventListener('mousedown', (e) => e.stopPropagation());
  items.forEach((it) => {
    if (!it) return;
    if (it.sep) { const s = document.createElement('div'); s.className = 'ctx-sep'; m.appendChild(s); return; }
    if (it.head) { const h = document.createElement('div'); h.className = 'ctx-head'; h.textContent = it.head; m.appendChild(h); return; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ctx-item' + (it.disabled ? ' disabled' : '');
    const check = it.check !== undefined ? '<span class="ctx-check">' + (it.check ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>' : '') + '</span>' : '';
    b.innerHTML = check + '<span class="ctx-label">' + it.label + '</span>' + (it.sc ? '<span class="ctx-sc">' + it.sc + '</span>' : '');
    if (it.disabled) b.disabled = true;
    else b.addEventListener('click', (e) => { e.stopPropagation(); closeCtxMenu(); try { it.fn && it.fn(); } catch (_) {} });
    m.appendChild(b);
  });
  document.body.appendChild(m);
  const w = m.offsetWidth || 220, h = m.offsetHeight || 220;
  m.style.left = Math.max(6, Math.min(x, window.innerWidth - w - 8)) + 'px';
  m.style.top = Math.max(6, Math.min(y, window.innerHeight - h - 8)) + 'px';
  setTimeout(() => {
    document.addEventListener('mousedown', closeCtxMenu);
    window.addEventListener('blur', closeCtxMenu);        // clicking into the web page (webview) blurs the chrome
    window.addEventListener('resize', closeCtxMenu);
    document.addEventListener('scroll', closeCtxMenu, true);
  }, 0);
}
function openToolMenu(x, y) {
  const hidden = new Set(loadHiddenTools());
  showCtxMenu(x, y, [{ head: 'Customise toolbar' }].concat(
    TOOLBAR_TOOLS.map((t) => ({ label: t.label, check: !hidden.has(t.tool), fn: () => toggleTool(t.tool) }))
  ));
}

// Web-page (web content) right-click menu, built from the webview's context-menu params.
function clipText(t) { try { navigator.clipboard.writeText(String(t || '')); } catch (_) {} }
function showPageMenu(tab, p) {
  const wv = tab.wv; p = p || {};
  let canBack = false, canFwd = false;
  try { canBack = wv.canGoBack(); } catch (_) {}
  try { canFwd = wv.canGoForward(); } catch (_) {}
  const items = [];
  if (p.linkURL) {
    items.push({ label: 'Open link in new tab', fn: () => createTab(p.linkURL, { activate: false }) });
    items.push({ label: 'Copy link address', fn: () => clipText(p.linkURL) });
    items.push({ sep: true });
  }
  if (p.mediaType === 'image' && p.srcURL) {
    items.push({ label: 'Open image in new tab', fn: () => createTab(p.srcURL, { activate: false }) });
    items.push({ label: 'Save image…', fn: () => { try { wv.downloadURL(p.srcURL); } catch (_) {} } });
    items.push({ label: 'Copy image address', fn: () => clipText(p.srcURL) });
    items.push({ sep: true });
  }
  if (p.selectionText && p.selectionText.trim()) {
    items.push({ label: 'Copy', sc: 'Ctrl C', fn: () => { try { wv.copy(); } catch (_) {} } });
    const q = p.selectionText.trim();
    const short = q.length > 24 ? q.slice(0, 24) + '…' : q;
    const eng = (SEARCH_ENGINES[currentEngine()] || SEARCH_ENGINES.google).name;
    items.push({ label: 'Search ' + eng + ' for “' + escapeHtml(short) + '”', fn: () => createTab(searchURL(q)) });
    items.push({ sep: true });
  }
  if (p.isEditable) {
    const ef = p.editFlags || {};
    items.push({ label: 'Cut', fn: () => { try { wv.cut(); } catch (_) {} }, disabled: ef.canCut === false });
    items.push({ label: 'Copy', fn: () => { try { wv.copy(); } catch (_) {} }, disabled: ef.canCopy === false });
    items.push({ label: 'Paste', fn: () => { try { wv.paste(); } catch (_) {} }, disabled: ef.canPaste === false });
    items.push({ label: 'Select all', fn: () => { try { wv.selectAll(); } catch (_) {} } });
    items.push({ sep: true });
  }
  items.push({ label: 'Back', fn: () => { try { wv.goBack(); } catch (_) {} }, disabled: !canBack });
  items.push({ label: 'Forward', fn: () => { try { wv.goForward(); } catch (_) {} }, disabled: !canFwd });
  items.push({ label: 'Reload', sc: 'Ctrl R', fn: () => { try { wv.reload(); } catch (_) {} } });
  items.push({ sep: true });
  items.push({ label: 'Copy page address', fn: () => clipText(tab.url) });
  items.push({ label: 'Duplicate tab', fn: () => createTab(tab.url) });
  items.push({ label: 'New tab', sc: 'Ctrl T', fn: () => { createTab(); focusOmnibox(); } });
  items.push({ sep: true });
  items.push({ label: 'Inspect', fn: () => { try { wv.openDevTools(); } catch (_) {} } });
  let rx = 0, ry = 0; try { const r = wv.getBoundingClientRect(); rx = r.left; ry = r.top; } catch (_) {}
  showCtxMenu(rx + (p.x || 0), ry + (p.y || 0), items);
}

// Tab strip right-click menu
function closeOtherTabs(keepId) { tabs.slice().forEach((t) => { if (t.id !== keepId) closeTab(t.id); }); }
function closeTabsToRight(idx) { tabs.slice(idx + 1).forEach((t) => closeTab(t.id)); }
function showTabMenu(x, y, tab) {
  const idx = tabs.indexOf(tab);
  showCtxMenu(x, y, [
    { label: 'New tab', sc: 'Ctrl T', fn: () => { createTab(); focusOmnibox(); } },
    { sep: true },
    { label: 'Reload', sc: 'Ctrl R', fn: () => { try { tab.wv.reload(); } catch (_) {} } },
    { label: 'Duplicate tab', fn: () => createTab(tab.url) },
    { label: 'Copy address', fn: () => clipText(tab.url), disabled: isInternal(tab.url) },
    { sep: true },
    { label: 'Close tab', sc: 'Ctrl W', fn: () => closeTab(tab.id) },
    { label: 'Close other tabs', fn: () => closeOtherTabs(tab.id), disabled: tabs.length < 2 },
    { label: 'Close tabs to the right', fn: () => closeTabsToRight(idx), disabled: idx >= tabs.length - 1 },
  ]);
}

// ============================================================
//  Misc helpers
// ============================================================
function reloadNewTabViews() { for (const t of tabs) { if (isNewTab(t.url)) { try { t.wv.reload(); } catch (_) {} } } }
function renavNewTabViews() { for (const t of tabs) { if (isNewTab(t.url)) { try { t.wv.setAttribute('src', newTabTarget()); } catch (_) {} } } }
function saveWidgetPrefs(w) { try { localStorage.setItem('cream.widgets', JSON.stringify(w)); } catch (_) {} }
function applyAIEnabled() { const r = $('railAI'); if (r) r.style.display = aiEnabled() ? '' : 'none'; }
function minimalMode() { try { return localStorage.getItem('cream.minimal') === '1'; } catch (_) { return false; } }
// The browser's overall look: 'normal' | 'lite' (lightweight) | 'minimal'. Mutually exclusive.
function browserMode() { return minimalMode() ? 'minimal' : (liteMode() ? 'lite' : 'normal'); }
function setBrowserMode(mode) {
  try {
    localStorage.setItem('cream.lite', mode === 'lite' ? '1' : '0');
    localStorage.setItem('cream.minimal', mode === 'minimal' ? '1' : '0');
  } catch (_) {}
  try { window.browserAPI.setLiteMode && window.browserAPI.setLiteMode(mode === 'lite'); } catch (_) {}  // perf flags apply next launch
  applyChromeModes(); renavNewTabViews();
}
function centerUrlOn() { try { return localStorage.getItem('cream.centerUrl') === '1'; } catch (_) { return false; } }
function setCenterUrl(on) { document.body.classList.toggle('center-url', on); try { localStorage.setItem('cream.centerUrl', on ? '1' : '0'); } catch (_) {} }
function acrylicOn() { try { return localStorage.getItem('cream.acrylic') === '1'; } catch (_) { return false; } }
function glassLevel() { try { const n = parseInt(localStorage.getItem('cream.glassLevel') || '55', 10); return Number.isFinite(n) ? Math.min(95, Math.max(0, n)) : 55; } catch (_) { return 55; } }
function applyGlassLevel() {
  const tint = Math.min(92, Math.max(8, 100 - glassLevel()));   // higher level = more see-through
  const s = document.documentElement.style;
  s.setProperty('--glass-tint', tint + '%');
  s.setProperty('--glass-tint-strong', Math.min(96, tint + 24) + '%');
}
function setGlassLevel(v) { try { localStorage.setItem('cream.glassLevel', String(v)); } catch (_) {} applyGlassLevel(); }
function pushGlassToNewTabs(lvl) {
  for (const t of tabs) {
    if (t.wv && !t.discarded && isNewTab(t.url)) {
      try { t.wv.executeJavaScript('window.__driftSetGlass && window.__driftSetGlass(' + Number(lvl) + ')'); } catch (_) {}
    }
  }
}
function setAcrylicMode(on) {
  document.documentElement.classList.toggle('acrylic', on);
  applyGlassLevel();
  try { window.browserAPI.setAcrylic && window.browserAPI.setAcrylic(on); } catch (_) {}
  try { localStorage.setItem('cream.acrylic', on ? '1' : '0'); } catch (_) {}
}
function applyChromeModes() {
  const d = document.documentElement;
  const lite = liteMode();
  const minimal = minimalMode();
  d.classList.toggle('lite', lite);
  d.classList.toggle('minimal', minimal);
  let animO = false; try { animO = localStorage.getItem('cream.anim') === '0'; } catch (_) {}
  d.classList.toggle('no-anim', lite || animO);
}
function setSidebarRemoved(removed) { document.body.classList.toggle('no-sidebar', removed); try { localStorage.setItem('cream.noSidebar', removed ? '1' : '0'); } catch (_) {} }

// ---- Vertical tabs: relocate the real chrome nodes into a solid left rail ----
function verticalTabsOn() { try { return localStorage.getItem('cream.vtabs') === '1'; } catch (_) { return false; } }
// Which real chrome nodes get relocated into the rail, and into which slot.
const VTAB_RELOC = [
  ['.nav-group', 'vbarNav'],
  ['#omnibox', 'vbarOmni'],
  ['#railApps', 'vbarPins'], ['#railAddApp', 'vbarPins'],
  ['#railSites', 'vbarPins'], ['#railAddSite', 'vbarPins'],
  ['#tabstrip', 'vbarTabs'],
  ['#railAI', 'vbarFoot'], ['#actionGroup', 'vbarFoot'], ['#railMusic', 'vbarFoot'], ['#railSettings', 'vbarFoot'],
];
let vtabMoves = null;
function setVerticalTabs(on) {
  if (!$('vbar')) return;
  if (on) {
    if (!vtabMoves) {
      vtabMoves = [];
      for (const [sel, slot] of VTAB_RELOC) {
        const node = document.querySelector(sel), dst = $(slot);
        if (!node || !dst) continue;
        vtabMoves.push({ node, parent: node.parentNode, next: node.nextSibling }); // remember home
        dst.appendChild(node);
      }
    } else {
      for (const [sel, slot] of VTAB_RELOC) { const node = document.querySelector(sel), dst = $(slot); if (node && dst) dst.appendChild(node); }
    }
    document.body.classList.add('vtabs');
  } else {
    if (vtabMoves) for (let i = vtabMoves.length - 1; i >= 0; i--) {   // restore in reverse so siblings land correctly
      const m = vtabMoves[i];
      if (m.next && m.next.parentNode === m.parent) m.parent.insertBefore(m.node, m.next);
      else m.parent.appendChild(m.node);
    }
    document.body.classList.remove('vtabs');
  }
  try { localStorage.setItem('cream.vtabs', on ? '1' : '0'); } catch (_) {}
}
function compactOn() { try { return localStorage.getItem('cream.compact') === '1' || localStorage.getItem('cream.vbarAutohide') === '1'; } catch (_) { return false; } }
function setCompact(on) {
  document.body.classList.toggle('compact', on);
  if (!on) document.body.classList.remove('top-reveal');
  try { localStorage.setItem('cream.compact', on ? '1' : '0'); } catch (_) {}
}
// Compact mode (horizontal): reveal the hidden toolbar when the cursor reaches the top edge.
window.addEventListener('mousemove', (e) => {
  const b = document.body;
  if (!b.classList.contains('compact') || b.classList.contains('vtabs')) return;
  if (e.clientY <= 4) b.classList.add('top-reveal');
  else if (e.clientY > 66 && document.activeElement !== addressEl) b.classList.remove('top-reveal');
});
// Keep the toolbar revealed while the address bar is focused (e.g. via Ctrl+L) in compact mode.
addressEl.addEventListener('focus', () => { const b = document.body; if (b.classList.contains('compact') && !b.classList.contains('vtabs')) b.classList.add('top-reveal'); });

// ============================================================
//  Web apps — pinned apps that open in a solid slide-out panel
// ============================================================
const DEFAULT_WEBAPPS = [
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/' },
  { id: 'whatsapp', name: 'WhatsApp', url: 'https://web.whatsapp.com/' },
  { id: 'discord', name: 'Discord', url: 'https://discord.com/app' },
  { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/' },
];
function loadWebApps() {
  try { const r = JSON.parse(localStorage.getItem('cream.webapps') || 'null'); if (Array.isArray(r)) return r; } catch (_) {}
  return DEFAULT_WEBAPPS.slice();
}
function saveWebApps() { try { localStorage.setItem('cream.webapps', JSON.stringify(webApps)); } catch (_) {} }
let webApps = loadWebApps();
let appPanelOpen = false, appCurrentId = null;
const appWvs = Object.create(null);

function appColor(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return 'hsl(' + h + ' 52% 52%)'; }
function appInitial(name) { return ((name || '?').trim().charAt(0) || '?').toUpperCase(); }

function renderWebApps() {
  const wrap = $('railApps'); if (!wrap) return;
  wrap.innerHTML = '';
  webApps.forEach((a) => {
    const b = document.createElement('button');
    b.className = 'rail-btn rail-app' + (appPanelOpen && appCurrentId === a.id ? ' active' : '');
    b.title = a.name; b.dataset.app = a.id;
    b.innerHTML = '<span class="rail-app-ic" style="background:' + appColor(a.id) + '">' + escapeHtml(appInitial(a.name)) + '</span>';
    b.addEventListener('click', () => toggleWebApp(a.id));
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showAppMenu(e.clientX, e.clientY, a); });
    wrap.appendChild(b);
  });
}

const APP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
function getAppWv(app) {
  if (appWvs[app.id]) return appWvs[app.id];
  const wv = document.createElement('webview');
  wv.setAttribute('partition', 'persist:app-' + app.id);   // isolated, persistent login per app
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('webpreferences', 'contextIsolation=yes');
  wv.setAttribute('useragent', APP_UA);                     // present as plain Chrome so apps (WhatsApp etc.) accept us
  wv.setAttribute('src', toURL(app.url) || app.url);
  wv.style.display = 'none';
  $('appPanelBody').appendChild(wv);
  appWvs[app.id] = wv;
  return wv;
}
function toggleWebApp(id) { if (appPanelOpen && appCurrentId === id) closeAppPanel(); else openWebApp(id); }
function openWebApp(id) {
  const app = webApps.find((a) => a.id === id); if (!app) return;
  Object.keys(appWvs).forEach((k) => { appWvs[k].style.display = 'none'; });
  getAppWv(app).style.display = '';
  appCurrentId = id; appPanelOpen = true;
  $('appPanelTitle').textContent = app.name;
  const ico = $('appPanelIco'); ico.textContent = appInitial(app.name); ico.style.background = appColor(id);
  document.body.classList.add('apppanel-open');
  $('appPanel').setAttribute('aria-hidden', 'false');
  renderWebApps();
}
function closeAppPanel() {
  appPanelOpen = false; appCurrentId = null;
  document.body.classList.remove('apppanel-open');
  $('appPanel').setAttribute('aria-hidden', 'true');
  renderWebApps();
}
function appPanelActiveWv() { return appCurrentId ? appWvs[appCurrentId] : null; }
function addWebApp(name, url) {
  const u = toURL(url); if (!u || !/^https?:/i.test(u)) { toast('Enter a valid web address'); return false; }
  name = (name || hostOf(u) || 'App').trim();
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'app';
  let id = base, n = 2; while (webApps.some((a) => a.id === id)) id = base + '-' + (n++);
  webApps.push({ id, name, url: u });
  saveWebApps(); renderWebApps(); return true;
}
function removeWebApp(id) {
  const i = webApps.findIndex((a) => a.id === id); if (i === -1) return;
  webApps.splice(i, 1); saveWebApps();
  if (appWvs[id]) { try { appWvs[id].remove(); } catch (_) {} delete appWvs[id]; }
  if (appCurrentId === id) closeAppPanel(); else renderWebApps();
}
function showAppMenu(x, y, app) {
  showCtxMenu(x, y, [
    { head: app.name },
    { label: 'Open in a full tab', fn: () => { createTab(app.url); closeAppPanel(); } },
    { label: 'Reload', fn: () => { const w = appWvs[app.id]; if (w) try { w.reload(); } catch (_) {} } },
    { sep: true },
    { label: 'Remove app', fn: () => removeWebApp(app.id) },
  ]);
}
let addAppPopOpen = false;
function openAddApp() {
  const pop = $('addAppPop'); const r = $('railAddApp').getBoundingClientRect();
  pop.style.left = (r.right + 8) + 'px'; pop.style.right = 'auto';
  pop.style.top = Math.max(8, Math.min(r.top, window.innerHeight - 200)) + 'px';
  pop.classList.add('open'); pop.setAttribute('aria-hidden', 'false');
  addAppPopOpen = true; setTimeout(() => $('addAppName').focus(), 0);
}
function closeAddApp() { const pop = $('addAppPop'); pop.classList.remove('open'); pop.setAttribute('aria-hidden', 'true'); addAppPopOpen = false; }
function toggleAddApp() { addAppPopOpen ? closeAddApp() : openAddApp(); }
function submitAddApp() {
  if (addWebApp($('addAppName').value, $('addAppUrl').value)) { $('addAppName').value = ''; $('addAppUrl').value = ''; closeAddApp(); }
}
let toastTimer = null;
function toast(msg) {
  let el = document.getElementById('creamToast');
  if (!el) {
    el = document.createElement('div'); el.id = 'creamToast'; document.body.appendChild(el);
    Object.assign(el.style, { position: 'fixed', bottom: '22px', left: '50%', transform: 'translateX(-50%) translateY(8px)', background: 'var(--surface-strong)', color: 'var(--text-1)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(20px)', zIndex: '200', opacity: '0', transition: 'opacity .2s, transform .2s', pointerEvents: 'none' });
  }
  el.textContent = msg;
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(8px)'; }, 2600);
}

// ============================================================
//  Init / wiring
// ============================================================
// ============================================================
//  Import bookmarks from another browser
// ============================================================
async function importFromBrowser(id) {
  let r = null; try { r = await window.browserAPI.importBookmarks(id); } catch (_) {}
  if (!r || !r.ok || !Array.isArray(r.items)) return 0;
  const have = new Set(bookmarks.map((b) => b.url));
  let added = 0;
  for (const it of r.items) {
    if (it && it.url && !have.has(it.url)) { bookmarks.push({ url: it.url, title: it.title || hostOf(it.url), favicon: '' }); have.add(it.url); added++; }
  }
  if (added) { saveBookmarks(); renderBookmarks(); }
  return added;
}

// ============================================================
//  First-run onboarding (shown once)
// ============================================================
const ONB_LOGO = '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.3" opacity="0.5"/><path d="M5.5 15.5C9 17.5 12.5 14 16.5 7.5"/><path d="M12.7 7.6 17 7l-.6 4.2"/><circle cx="8" cy="13.4" r="1.7" fill="currentColor" stroke="none"/></svg>';
function initOnboarding(immediate) {
  if (INCOGNITO) return;
  let done = false; try { done = localStorage.getItem('cream.onboarded') === '1'; } catch (_) {}
  if (done && !immediate) return;
  const root = document.getElementById('onboarding'); if (!root) return;
  let step = 0;

  function welcomeStep(el) {
    el.innerHTML = '<div class="onb-hero"><div class="onb-logo">' + ONB_LOGO + '</div><h1 class="onb-h">Welcome to Drift</h1><p class="onb-p">A calm, private, beautiful browser. Let’s set it up — it takes about 20 seconds.</p></div>';
  }
  function appearanceStep(el) {
    const m0 = browserMode();
    const mBtn = (id, label, desc) => `<button type="button" class="mode-opt${m0 === id ? ' on' : ''}" data-mode="${id}"><span class="mode-opt-t">${label}</span><span class="mode-opt-d">${desc}</span></button>`;
    el.innerHTML = '<h2 class="onb-h">Make it yours</h2><p class="onb-p">Choose how Drift looks and feels.</p>' +
      '<div class="onb-sub">Mode</div>' +
      '<div class="mode-seg" id="onbModeSeg" role="radiogroup" aria-label="Browser mode">' +
        mBtn('normal', 'Normal', 'Full glass UI') + mBtn('lite', 'Lightweight', 'Fast &amp; plain') + mBtn('minimal', 'Minimal', 'Thin &amp; sleek') +
      '</div>' +
      '<div class="onb-sub">Theme</div>' +
      '<div class="onb-modes" id="onbModes"></div><div class="onb-swatches" id="onbSwatches" hidden></div>';
    el.querySelectorAll('#onbModeSeg .mode-opt').forEach((b) => b.addEventListener('click', () => {
      el.querySelectorAll('#onbModeSeg .mode-opt').forEach((x) => x.classList.toggle('on', x === b));
      setBrowserMode(b.dataset.mode);
    }));
    const mEl = el.querySelector('#onbModes');
    const sw = el.querySelector('#onbSwatches');
    THEMES.forEach((t) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'onb-mode' + (theme === t.id ? ' sel' : ''); b.textContent = t.name;
      b.addEventListener('click', () => { setThemeMode(t.id); mEl.querySelectorAll('.onb-mode').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); });
      mEl.appendChild(b);
    });
    function paintSw() {
      sw.innerHTML = '';
      PRESETS.forEach((p) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'onb-sw' + (currentPreset === p.id ? ' sel' : ''); b.title = p.name;
        b.style.setProperty('--sw', presetAccent(p));
        b.addEventListener('click', () => { applyPreset(p.id); sw.querySelectorAll('.onb-sw').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); });
        sw.appendChild(b);
      });
    }
    let painted = false;
    const more = document.createElement('button'); more.type = 'button'; more.className = 'onb-mode onb-more'; more.textContent = 'More';
    more.addEventListener('click', () => {
      const opening = sw.hasAttribute('hidden');
      if (opening) { if (!painted) { paintSw(); painted = true; } sw.removeAttribute('hidden'); more.classList.add('open'); more.textContent = 'Less'; }
      else { sw.setAttribute('hidden', ''); more.classList.remove('open'); more.textContent = 'More'; }
    });
    mEl.appendChild(more);
  }
  function searchStep(el) {
    el.innerHTML = '<h2 class="onb-h">Search &amp; blocking</h2><p class="onb-p">Choose your search engine and ad blocker.</p>' +
      '<label class="onb-field"><span>Search engine</span><select id="onbSearch"></select></label>' +
      '<label class="onb-field"><span>Ad blocker</span><select id="onbAdblock"><option value="ublock">uBlock Origin (built in)</option><option value="cream">Drift built-in</option></select></label>';
    const ss = el.querySelector('#onbSearch');
    ss.innerHTML = Object.keys(SEARCH_ENGINES).map((k) => '<option value="' + k + '">' + SEARCH_ENGINES[k].name + '</option>').join('');
    ss.value = currentEngine();
    ss.addEventListener('change', (e) => { try { localStorage.setItem('cream.search', e.target.value); } catch (_) {} });
    const ab = el.querySelector('#onbAdblock');
    (async () => { try { const p = await window.browserAPI.privacyGet(); ab.value = p.adblockEngine || 'cream'; } catch (_) {} })();
    ab.addEventListener('change', (e) => { try { window.browserAPI.privacySet({ adblockEngine: e.target.value }); } catch (_) {} });
  }
  function privacyStep(el) {
    el.innerHTML = '<h2 class="onb-h">Privacy</h2><p class="onb-p">Drift blocks trackers and never tracks you. Optionally wipe data each time you quit.</p><div class="onb-toggles" id="onbPriv"></div>';
    const pe = el.querySelector('#onbPriv');
    const ce = { history: false, cookies: false, cache: false };
    [['history', 'Clear history on exit'], ['cookies', 'Clear cookies & logins on exit'], ['cache', 'Clear cache on exit']].forEach(([k, label]) => {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'onb-toggle';
      row.innerHTML = '<span>' + label + '</span><span class="onb-tg"></span>';
      row.addEventListener('click', () => { ce[k] = !ce[k]; row.classList.toggle('on', ce[k]); try { window.browserAPI.privacySetClearExit(ce); } catch (_) {} });
      pe.appendChild(row);
    });
  }
  function importStep(el) {
    el.innerHTML = '<h2 class="onb-h">Bring your stuff</h2><p class="onb-p">Import bookmarks and passwords from a browser you already use.</p>' +
      '<div class="onb-import" id="onbImport"><div class="onb-muted">Looking for installed browsers…</div></div>' +
      '<div class="onb-imp pw"><div class="onb-imp-name">Passwords <span class="onb-muted">from a CSV export</span></div>' +
      '<button type="button" class="onb-imp-btn" id="onbPwImport">Import CSV…</button></div>' +
      '<div class="onb-muted" style="margin-top:8px;font-size:11.5px">Tip: in your old browser, export passwords to a CSV file, then pick it here. They’re saved to Drift’s encrypted vault.</div>';
    const box = el.querySelector('#onbImport');
    el.querySelector('#onbPwImport').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Choosing…';
      let r = null; try { r = await window.browserAPI.pwImportCsv(); } catch (_) {}
      if (r && r.ok) { btn.textContent = '✓ ' + r.added + ' added'; toast('Imported ' + r.added + ' of ' + r.total + ' logins'); }
      else { btn.disabled = false; btn.textContent = 'Import CSV…'; if (r && r.error) toast(r.error); }
    });
    (async () => {
      let list = []; try { list = await window.browserAPI.importList(); } catch (_) {}
      if (!list || !list.length) { box.innerHTML = '<div class="onb-muted">No other browsers detected for bookmarks. You can import later from Settings.</div>'; return; }
      box.innerHTML = '';
      list.forEach((b) => {
        const row = document.createElement('div'); row.className = 'onb-imp';
        row.innerHTML = '<div class="onb-imp-name">' + escapeHtml(b.name) + ' <span class="onb-muted">' + b.count + ' bookmarks</span></div>';
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'onb-imp-btn'; btn.textContent = 'Import';
        btn.addEventListener('click', async () => { btn.disabled = true; btn.textContent = 'Importing…'; const n = await importFromBrowser(b.id); btn.textContent = '✓ ' + n + ' added'; });
        row.appendChild(btn); box.appendChild(row);
      });
    })();
  }
  function doneStep(el) {
    el.innerHTML = '<div class="onb-hero"><div class="onb-check">✓</div><h1 class="onb-h">You’re all set</h1><p class="onb-p">Enjoy Drift. You can change anything later in Settings.</p></div>';
  }
  const STEPS = [welcomeStep, appearanceStep, searchStep, privacyStep, importStep, doneStep];

  root.innerHTML =
    '<div class="onb-card">' +
    '<div class="onb-dots">' + STEPS.map(() => '<span class="onb-dot"></span>').join('') + '</div>' +
    '<div class="onb-body"></div>' +
    '<div class="onb-nav"><button class="onb-skip" type="button">Skip</button><div class="onb-navr"><button class="onb-back" type="button">Back</button><button class="onb-next" type="button">Next</button></div></div>' +
    '</div>';
  const body = root.querySelector('.onb-body');
  const dots = root.querySelectorAll('.onb-dot');
  const backBtn = root.querySelector('.onb-back');
  const nextBtn = root.querySelector('.onb-next');
  const skipBtn = root.querySelector('.onb-skip');

  function animateHeading(stepEl) {
    const h = stepEl.querySelector('.onb-h'); if (!h) return;
    const words = (h.textContent || '').split(/\s+/).filter(Boolean);
    h.innerHTML = words.map((w, i) => '<span class="onb-word" style="animation-delay:' + (0.08 + i * 0.07).toFixed(2) + 's">' + escapeHtml(w) + '</span>').join(' ');
  }
  function render() {
    body.innerHTML = '';
    const el = document.createElement('div'); el.className = 'onb-step active';
    STEPS[step](el);
    body.appendChild(el);
    animateHeading(el);
    dots.forEach((d, i) => d.classList.toggle('on', i <= step));
    backBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = step === STEPS.length - 1 ? 'Start browsing' : 'Next';
    skipBtn.style.visibility = step === STEPS.length - 1 ? 'hidden' : 'visible';
  }
  function finish() { try { localStorage.setItem('cream.onboarded', '1'); } catch (_) {} root.classList.remove('show'); document.body.classList.remove('onb-open'); setTimeout(() => { root.innerHTML = ''; }, 450); setTimeout(maybeShowDefaultPrompt, 900); }
  backBtn.addEventListener('click', () => { if (step > 0) { step--; render(); } });
  nextBtn.addEventListener('click', () => { if (step < STEPS.length - 1) { step++; render(); } else finish(); });
  skipBtn.addEventListener('click', finish);
  render();
  const delay = immediate ? 40 : 350;
  setTimeout(() => { root.classList.add('show'); document.body.classList.add('onb-open'); }, delay);
}

function init() {
  // Nav buttons
  $('backBtn').addEventListener('click', () => handleShortcut('back'));
  $('forwardBtn').addEventListener('click', () => handleShortcut('forward'));
  $('reloadBtn').addEventListener('click', () => { const t = activeTab(); if (!t) return; if (t.loading) t.wv.stop(); else t.wv.reload(); });
  $('homeBtn').addEventListener('click', () => { const t = activeTab(); if (t) t.wv.loadURL(newTabTarget()); });
  // Brand logo → go to the start page (gives the top-left mark a purpose).
  const goHome = () => { const t = activeTab(); if (t) t.wv.loadURL(newTabTarget()); else createTab(); };
  const brandHome = $('brandHome');
  if (brandHome) { brandHome.addEventListener('click', goHome); brandHome.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); } }); }
  $('newTabBtn').addEventListener('click', () => { createTab(); focusOmnibox(); });
  starBtn.addEventListener('click', toggleBookmark);

  // Omnibox
  addressEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const url = toURL(addressEl.value); if (url && activeTab()) { activeTab().wv.loadURL(url); addressEl.blur(); } }
    else if (e.key === 'Escape') { syncOmnibox(); addressEl.blur(); }
  });
  addressEl.addEventListener('focus', () => setTimeout(() => addressEl.select(), 0));

  // History panel
  $('historyBtn').addEventListener('click', toggleHistory);
  $('closeHistoryBtn').addEventListener('click', closeHistory);
  $('clearHistoryBtn').addEventListener('click', () => { history = []; saveHistory(); renderHistory(); });
  historySearchEl.addEventListener('input', renderHistory);

  // Menu
  $('menuBtn').addEventListener('click', (e) => { e.stopPropagation(); menuOpen ? closeMenu() : openMenu(); });
  document.addEventListener('click', (e) => {
    if (menuOpen && !menuDropdown.contains(e.target) && e.target.closest('#menuBtn') === null) closeMenu();
  });
  scrim.addEventListener('click', closeOverlays);

  // Window controls
  $('winMin').addEventListener('click', () => window.browserAPI.minimize());
  $('winMax').addEventListener('click', () => window.browserAPI.toggleMaximize());
  $('winClose').addEventListener('click', () => window.browserAPI.close());
  window.browserAPI.onMaximizeChange((v) => document.body.classList.toggle('is-maximized', v));
  window.browserAPI.isMaximized().then((v) => document.body.classList.toggle('is-maximized', v));

  // From main process
  window.browserAPI.onOpenTab((url) => createTab(url));
  window.browserAPI.onShortcut(handleShortcut);

  // Global keys
  window.addEventListener('keydown', localKeydown);

  // Theme
  $('themeBtn').addEventListener('click', (e) => toggleTheme(e));

  // Sidebar rail
  $('sidebarToggle').addEventListener('click', toggleSidebar);
  $('railNewTab').addEventListener('click', () => { createTab(); focusOmnibox(); });
  $('vbarNewTab').addEventListener('click', () => { createTab(); focusOmnibox(); });
  $('railBookmarks').addEventListener('click', () => { setBookmarksBarHidden(!document.body.classList.contains('bookmarks-hidden')); updateRailActive(); });
  $('railHistory').addEventListener('click', toggleHistory);
  $('railAI').addEventListener('click', openAITab);
  $('railSettings').addEventListener('click', () => openSettings());
  Object.keys(RAIL_HIDEABLE).forEach((id) => { const b = $(id); if (b) b.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showRailMenu(e.clientX, e.clientY, id); }); });
  applyHiddenRail();

  // Sidebar quick-access sites + per-site ad blocker
  $('railAddSite').addEventListener('click', toggleAddSite);
  $('addSiteBtn').addEventListener('click', addSidebarSite);
  $('addSiteInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addSidebarSite(); });
  $('adblockBtn').addEventListener('click', toggleAdblock);
  $('abSiteSwitch').addEventListener('click', toggleAdblockSite);
  $('abSiteSwitch').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAdblockSite(); } });
  $('abSettings').addEventListener('click', () => { closeAdblock(); openSettings('privacy'); });
  document.addEventListener('click', (e) => {
    if (addSitePopOpen && !addSitePop.contains(e.target) && e.target.closest('#railAddSite') === null) closeAddSite();
    if (adblockPopOpen && !adblockPop.contains(e.target) && e.target.closest('#adblockBtn') === null) closeAdblock();
    if (addAppPopOpen && !$('addAppPop').contains(e.target) && e.target.closest('#railAddApp') === null) closeAddApp();
  });
  renderSidebarSites();

  // Web apps (pinned apps + slide-out panel)
  $('railAddApp').addEventListener('click', (e) => { e.stopPropagation(); toggleAddApp(); });
  $('addAppBtn').addEventListener('click', submitAddApp);
  $('addAppName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('addAppUrl').focus(); });
  $('addAppUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAddApp(); });
  $('appPanelClose').addEventListener('click', closeAppPanel);
  $('appPanelReload').addEventListener('click', () => { const w = appPanelActiveWv(); if (w) try { w.reload(); } catch (_) {} });
  $('appPanelTab').addEventListener('click', () => { const a = webApps.find((x) => x.id === appCurrentId); if (a) { createTab(a.url); closeAppPanel(); } });
  renderWebApps();

  // Settings page
  $('settingsClose').addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettings(); });
  settingsOverlay.querySelectorAll('.snav').forEach((b) => b.addEventListener('click', () => showSettingsSection(b.dataset.sec)));

  // Sidebar extras + toolbar tools + downloads + zoom + snip
  $('dlBtn').addEventListener('click', toggleDownloads);
  $('extBtn').addEventListener('click', () => openSettings('extensions'));
  $('zoomBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleZoom(); });
  $('snipBtn').addEventListener('click', startSnip);
  $('zoomIn').addEventListener('click', zoomIn);
  $('zoomOut').addEventListener('click', zoomOut);
  $('zoomVal').addEventListener('click', zoomReset);
  $('closeDownloadsBtn').addEventListener('click', closeDownloads);
  $('clearDownloadsBtn').addEventListener('click', async () => { await window.browserAPI.dlClear(); dlHistory = []; renderDownloads(); });
  window.browserAPI.onDownloadEvent(onDownloadEvent);
  if (window.browserAPI.onAutofillSavePrompt) window.browserAPI.onAutofillSavePrompt(showPwSavePrompt);
  snipOverlay.addEventListener('mousedown', snipDown);
  window.addEventListener('mousemove', snipMove);
  window.addEventListener('mouseup', (e) => { if (snipping) snipUp(e); });
  document.addEventListener('click', (e) => { if (zoomPopOpen && !zoomPop.contains(e.target) && e.target.closest('#zoomBtn') === null) closeZoom(); });

  // Toolbar customization: right-click a tool to remove / restore it
  $('actionGroup').addEventListener('contextmenu', (e) => { e.preventDefault(); openToolMenu(e.clientX, e.clientY); });
  applyHiddenTools();

  // Background music
  $('railMusic').addEventListener('click', (e) => { e.stopPropagation(); toggleMusicPop(); });
  $('musicPlay').addEventListener('click', musicToggle);
  $('musicChoose').addEventListener('click', chooseMusic);
  $('musicLoop').addEventListener('click', () => { bgAudio.loop = !bgAudio.loop; try { localStorage.setItem('cream.musicLoop', bgAudio.loop ? '1' : '0'); } catch (_) {} musicUpdateUI(); });
  $('musicVol').addEventListener('input', (e) => { bgAudio.volume = Number(e.target.value) / 100; try { localStorage.setItem('cream.musicVol', e.target.value); } catch (_) {} });
  bgAudio.addEventListener('play', musicUpdateUI);
  bgAudio.addEventListener('pause', musicUpdateUI);
  bgAudio.addEventListener('ended', musicUpdateUI);
  document.addEventListener('click', (e) => { if (musicPopOpen && !musicPop.contains(e.target) && e.target.closest('#railMusic') === null) closeMusic(); });
  restoreMusic();

  // Restore saved preferences (before the first tab so it inherits theme + accent)
  try {
    if (localStorage.getItem('cream.sidebar') === 'collapsed') document.body.classList.add('sidebar-collapsed');
    if (localStorage.getItem('cream.bookmarksBar') === 'hidden') document.body.classList.add('bookmarks-hidden');
    const savedBlur = localStorage.getItem('cream.blur');
    if (savedBlur) {
      document.documentElement.style.setProperty('--blur', savedBlur + 'px');
      document.documentElement.style.setProperty('--glass', String(Math.min(0.92, (Number(savedBlur) || 0) / 40 * 0.9)));
    }
    if (localStorage.getItem('cream.noSidebar') === '1') document.body.classList.add('no-sidebar');
    if (verticalTabsOn()) setVerticalTabs(true);
    if (compactOn()) setCompact(true);
    if (centerUrlOn()) setCenterUrl(true);
    applyGlassLevel();
    if (acrylicOn()) setAcrylicMode(true);
    const tbh = localStorage.getItem('cream.titlebarH');
    if (tbh) document.documentElement.style.setProperty('--titlebar-h', tbh + 'px');
  } catch (_) {}
  if (themeMode === 'system') applyTheme(resolveTheme('system'));
  refreshAccent();
  setThemeIcon();
  updateRailActive();
  applyAIEnabled();
  applyChromeModes();

  // First paint
  renderBookmarks();
  createTab();
  setTimeout(focusOmnibox, 120);
  initOnboarding();
  // Default-browser nudge — only once first-run onboarding is already done.
  let onbDone = false; try { onbDone = localStorage.getItem('cream.onboarded') === '1'; } catch (_) {}
  if (onbDone) setTimeout(maybeShowDefaultPrompt, 1600);
}

init();
