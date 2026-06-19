'use strict';

/*
 * Preload for the Solace new-tab page ONLY.
 *
 * This preload is attached to every browsing <webview>, but it exposes the AI
 * bridge exclusively when the loaded document is the trusted local new-tab page
 * (file:// .../src/newtab.html). On any real website it exposes nothing, so a
 * page can never reach the user's API key or spend their credits. The main
 * process additionally validates the sender frame URL on every AI call.
 */

const { contextBridge, ipcRenderer } = require('electron');

function onTrustedNewTab() {
  try {
    const p = (location.pathname || '').replace(/\\/g, '/');
    return location.protocol === 'file:' && /\/newtab\.html$/i.test(p);
  } catch (_) {
    return false;
  }
}

if (onTrustedNewTab()) {
  let seq = 0;

  contextBridge.exposeInMainWorld('creamAI', {
    available: true,

    getConfig: () => ipcRenderer.invoke('ai:get-config'),
    setKey: (key) => ipcRenderer.invoke('ai:set-key', key),
    clearKey: () => ipcRenderer.invoke('ai:clear-key'),
    setModel: (model) => ipcRenderer.invoke('ai:set-model', model),

    // Streams a reply. Returns a cancel() function.
    chat: (messages, onText, onDone, onError) => {
      const id = ++seq;
      const textCh = `ai:text:${id}`;
      const doneCh = `ai:done:${id}`;
      const errCh = `ai:error:${id}`;

      const tH = (_e, t) => { try { onText && onText(t); } catch (_) {} };
      const dH = (_e, info) => { cleanup(); try { onDone && onDone(info); } catch (_) {} };
      const eH = (_e, msg) => { cleanup(); try { onError && onError(msg); } catch (_) {} };

      function cleanup() {
        ipcRenderer.removeListener(textCh, tH);
        ipcRenderer.removeListener(doneCh, dH);
        ipcRenderer.removeListener(errCh, eH);
      }

      ipcRenderer.on(textCh, tH);
      ipcRenderer.once(doneCh, dH);
      ipcRenderer.once(errCh, eH);
      ipcRenderer.send('ai:chat', { id, messages });

      return () => { try { ipcRenderer.send('ai:cancel', { id }); } catch (_) {} cleanup(); };
    },
  });

  // Read-only preferences the new-tab page needs (e.g. custom background).
  contextBridge.exposeInMainWorld('creamPrefs', {
    getBackground: () => ipcRenderer.invoke('bg:get'),
  });
} else if (location.protocol === 'http:' || location.protocol === 'https:') {
  // ===================== Password autofill =====================
  // Runs in the preload's ISOLATED world: it can read/write the page DOM, but the
  // page's own JavaScript cannot see `ipcRenderer`, so a site can never call these
  // channels itself. The main process derives the origin from the sender frame, so
  // a page can only ever receive or save logins for its OWN host.
  function af_visible(el) {
    if (!el) return false;
    try {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    } catch (_) { return false; }
  }
  function af_passwords() {
    return Array.prototype.filter.call(document.querySelectorAll('input[type="password"]'), af_visible);
  }
  function af_userFor(pw) {
    const scope = pw.form || document;
    const cands = Array.prototype.filter.call(scope.querySelectorAll('input'), (i) =>
      i.type !== 'password' && af_visible(i) && /^(text|email|tel|search|)$/i.test(i.type || ''));
    let best = null;
    for (const c of cands) { if (c.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING) best = c; }
    return best || cands[0] || null;
  }
  function af_setVal(el, val) {
    if (!el) return;
    try {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
    } catch (_) { el.value = val; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  let af_creds = null, af_filled = false;
  function af_fill(cred) {
    const pws = af_passwords(); if (!pws.length) return;
    const pw = pws[0]; if (pw.value) return; // don't clobber what the user typed
    const user = af_userFor(pw);
    if (user && cred.username && !user.value) af_setVal(user, cred.username);
    if (cred.password) af_setVal(pw, cred.password);
    af_filled = true;
  }
  async function af_try() {
    if (af_filled || !af_passwords().length) return;
    if (af_creds === null) { try { af_creds = await ipcRenderer.invoke('autofill:lookup'); } catch (_) { af_creds = []; } }
    if (af_creds && af_creds.length) af_fill(af_creds[0]);
  }
  function af_current() {
    const pws = af_passwords(); if (!pws.length) return null;
    const pw = pws[0]; if (!pw.value) return null;
    const user = af_userFor(pw);
    return { username: user ? user.value : '', password: pw.value };
  }
  let af_last = null;
  function af_remember() { const e = af_current(); if (e && e.password) af_last = e; }
  function af_offerSave() { const e = af_current() || af_last; if (e && e.password) { try { ipcRenderer.send('autofill:offer-save', e); } catch (_) {} } }
  document.addEventListener('submit', () => { af_remember(); af_offerSave(); }, true);
  document.addEventListener('input', (ev) => { if (ev.target && ev.target.type === 'password') af_remember(); }, true);
  window.addEventListener('pagehide', af_offerSave);
  function af_init() {
    af_try();
    let mo = null;
    try {
      mo = new MutationObserver(() => af_try());
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
    setTimeout(() => { try { mo && mo.disconnect(); } catch (_) {} }, 10000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', af_init); else af_init();
}
