'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe bridge between the chrome renderer and the main process.
contextBridge.exposeInMainWorld('browserAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  newIncognito: () => ipcRenderer.send('window:new-incognito'),

  onMaximizeChange: (cb) => ipcRenderer.on('window:maximized', (_e, val) => cb(val)),
  onOpenTab: (cb) => ipcRenderer.on('open-tab', (_e, url) => cb(url)),
  onShortcut: (cb) => ipcRenderer.on('shortcut', (_e, action) => cb(action)),

  // Solace AI config (managed from the Settings page; chat itself lives on the new-tab page)
  getAIConfig: () => ipcRenderer.invoke('ai:get-config'),
  setAIKey: (key) => ipcRenderer.invoke('ai:set-key', key),
  clearAIKey: () => ipcRenderer.invoke('ai:clear-key'),
  setAIModel: (model) => ipcRenderer.invoke('ai:set-model', model),

  // Downloads
  dlList: () => ipcRenderer.invoke('dl:list'),
  dlPause: (id) => ipcRenderer.send('dl:pause', id),
  dlResume: (id) => ipcRenderer.send('dl:resume', id),
  dlCancel: (id) => ipcRenderer.send('dl:cancel', id),
  dlOpen: (p) => ipcRenderer.send('dl:open', p),
  dlShow: (p) => ipcRenderer.send('dl:show', p),
  dlRemove: (id) => ipcRenderer.invoke('dl:remove', id),
  dlClear: () => ipcRenderer.invoke('dl:clear'),
  onDownloadEvent: (cb) => ipcRenderer.on('dl:event', (_e, evt) => cb(evt)),

  // Extensions
  extList: () => ipcRenderer.invoke('ext:list'),
  extAdd: () => ipcRenderer.invoke('ext:add'),
  extRemove: (id) => ipcRenderer.invoke('ext:remove', id),

  // Custom background
  bgGet: () => ipcRenderer.invoke('bg:get'),
  bgChoose: () => ipcRenderer.invoke('bg:choose'),
  bgClear: () => ipcRenderer.invoke('bg:clear'),
  bgSetPreset: (name) => ipcRenderer.invoke('bg:set-preset', name),

  // Snip (region screenshot)
  snipSave: (dataUrl) => ipcRenderer.invoke('snip:save', dataUrl),

  // Privacy + ad blocker
  privacyGet: () => ipcRenderer.invoke('privacy:get'),
  privacySet: (p) => ipcRenderer.invoke('privacy:set', p),
  privacyClear: (what) => ipcRenderer.invoke('privacy:clear', what),
  privacyAllowSite: (host, allowed) => ipcRenderer.invoke('privacy:allow-site', host, allowed),
  privacySetClearExit: (p) => ipcRenderer.invoke('privacy:set-clear-exit', p),

  // Import data from other browsers
  importList: () => ipcRenderer.invoke('import:list'),
  importBookmarks: (id) => ipcRenderer.invoke('import:bookmarks', id),

  // Password vault (encrypted, main-process only)
  pwAvailable: () => ipcRenderer.invoke('pw:available'),
  pwList: () => ipcRenderer.invoke('pw:list'),
  pwAdd: (entry) => ipcRenderer.invoke('pw:add', entry),
  pwUpdate: (id, patch) => ipcRenderer.invoke('pw:update', id, patch),
  pwRemove: (id) => ipcRenderer.invoke('pw:remove', id),
  pwImport: (rows) => ipcRenderer.invoke('pw:import', rows),
  pwImportCsv: () => ipcRenderer.invoke('pw:import-csv'),
  onAutofillSavePrompt: (cb) => ipcRenderer.on('autofill:save-prompt', (_e, data) => cb(data)),

  // Background music (file picker; playback runs in the renderer)
  musicChoose: () => ipcRenderer.invoke('music:choose'),

  platform: process.platform,
});
