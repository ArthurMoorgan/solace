# Cream 🍦 — a liquid-glass web browser

A polished, light & minimal desktop web browser with a warm **cream** liquid-glass aesthetic, a built-in **Claude AI assistant**, and an animated **dark mode**. Built on **Electron** with a real **Chromium** engine — not a mockup. Every tab is a genuine browser.

![stack](https://img.shields.io/badge/Electron-Chromium-c2703d) ![style](https://img.shields.io/badge/style-liquid--glass-efe4cf) ![ai](https://img.shields.io/badge/AI-Claude-c2703d)

---

## Run it

```powershell
cd cream-browser
npm install      # one time — downloads Electron + deps
npm start
```

A frameless cream window opens with its own animated new-tab page.

---

## Features

| | |
|---|---|
| **Tabs** | Rounded glass tab strip with open animations, middle-click to close, never drops to zero tabs |
| **Smart omnibox** | Type a URL → go there; type words → Google search. Knows `localhost`, IPs, and bare domains |
| **Navigation** | Back / Forward / Reload-Stop / Home, with live enabled/disabled states |
| **Bookmarks** | Click the ☆ to save; chips appear on the bookmarks bar. Right-click a chip to remove |
| **History** | Slide-in glass panel, grouped by Today / Yesterday / Earlier, with search + per-item delete |
| **Cream AI** | A built-in **Claude** assistant on the new-tab page — streaming chat, your own API key, model picker |
| **Sidebar** | Collapsible **and fully removable** left rail: new tab, bookmarks, history, downloads, Cream AI, extensions, settings |
| **Settings page** | Full settings overlay with a nav sidebar — Appearance, Cream AI, Browsing, Extensions, About |
| **Theme gallery** | 12 accent themes + Light / Dark / **System** mode, frost slider, **custom new-tab background**, and an adjustable **top-bar height** |
| **Downloads** | Full downloads manager + panel — live progress, pause / resume / cancel, open, show in folder, retry, clear (`Ctrl+J`) |
| **Extensions** | Load unpacked Chromium extensions (content scripts + background pages); manage them in Settings |
| **Zoom** | Per-tab page zoom — toolbar popover + `Ctrl +` / `Ctrl -` / `Ctrl 0` |
| **Snipping tool** | Drag to capture any region of the page → saved to Downloads and copied to the clipboard |
| **Force dark mode** | Render any website dark, even sites that don't offer it (Browsing settings) |
| **Dark mode** | Warm "dark roast" theme with a circular-reveal animated transition (View Transitions API) |
| **Animated new tab** | Living cream aurora background, live clock, time-aware greeting, glass search, quick-links with springy hover |
| **Loading bar** | Slim terracotta progress indicator under the toolbar |
| **Custom window** | Frameless with custom minimize / maximize / close controls |
| **Error pages** | Friendly themed "couldn't load" page with a Try again button |
| **Persistent session** | Stays logged into sites between launches (`persist:cream` partition) |

### Cream AI (bring-your-own-key)

The new-tab page has a built-in Claude assistant. Click **Ask Cream AI**, paste your Anthropic API key once, and chat — responses stream in token-by-token.

- **Your key stays private.** It's stored locally on your device (`%APPDATA%/Cream/cream-settings.json`) and every API call runs in Electron's **main process** — the key is *never* exposed to any web page or renderer. The new-tab AI bridge is locked to the trusted local page and the main process re-validates the sender on every call, so websites cannot reach it or spend your credits.
- **Default model:** `claude-opus-4-8` (most capable). Switch to Sonnet 4.6 (balanced) or Haiku 4.5 (fastest) via the model chip / Settings.
- **Get a key:** [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

### Keyboard shortcuts

These work **even when a web page has focus** (forwarded from the main process):

| Shortcut | Action | | Shortcut | Action |
|---|---|---|---|---|
| `Ctrl+T` | New tab | | `Ctrl+D` | Bookmark page |
| `Ctrl+W` | Close tab | | `Ctrl+H` | Toggle history |
| `Ctrl+L` | Focus address bar | | `Ctrl+1…9` | Jump to tab N |
| `Ctrl+R` / `F5` | Reload | | `Ctrl+Tab` | Next tab |
| `Alt+←` / `Alt+→` | Back / Forward | | `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+J` | Downloads | | `Ctrl +` / `-` / `0` | Zoom in / out / reset |

---

## Build a distributable (Windows)

Packaging is configured with **electron-builder** (NSIS installer + portable `.exe`).

```powershell
npm run make-icon   # regenerate build/icon.png from build/icon.svg (optional)
npm run pack        # unpacked build → dist/win-unpacked/  (quick smoke test)
npm run dist        # NSIS installer + portable .exe → dist/
```

The first `dist` run downloads NSIS tooling (cached afterward). Output lands in `dist/`:
- `Cream Setup <version>.exe` — installer (lets the user choose the install location)
- `Cream-<version>-portable.exe` — single-file portable build

Swap `build/icon.svg` for your own art and re-run `npm run make-icon` to rebrand.

---

## Project layout

```
cream-browser/
├─ package.json        # deps, scripts, electron-builder config
├─ main.js             # main process: frameless window, popup→tab routing,
│                      #   key forwarding, and the Claude AI handlers (key lives here)
├─ preload.js          # secure bridge for window controls / shortcuts
├─ build/
│  ├─ icon.svg         # source icon
│  └─ icon.png         # generated app icon (used by electron-builder)
├─ scripts/
│  └─ make-icon.js     # renders icon.svg → icon.png via Electron
└─ src/
   ├─ index.html       # browser chrome structure
   ├─ chrome.css       # the liquid-glass cream + dark-roast design system
   ├─ chrome.js        # tabs, omnibox, bookmarks, history, theme, shortcuts
   ├─ newtab.html      # animated start page + Cream AI assistant
   └─ newtab-preload.js # URL-guarded AI bridge (only the new-tab page can use it)
```

---

## Customize the look

Most customization is built in — open **Settings → Appearance** (gear in the sidebar) for the 12-theme gallery, Light / Dark / System mode, and the frost-intensity slider. To go further in code, the whole palette lives in CSS variables at the top of `src/chrome.css` (light) with a `:root[data-theme="dark"]` block for dark mode; the new-tab page mirrors them in `src/newtab.html`. Add a theme by appending to the `PRESETS` array in `src/chrome.js` (and the matching map in `src/newtab.html`).

```css
:root {
  --bg-1: #f8f2e4;        /* cream gradient top */
  --bg-2: #efe4cf;        /* cream gradient bottom */
  --accent: #c2703d;      /* terracotta accent */
  --text-1: #3a342a;      /* primary text */
  --blur: 20px;           /* frosted-glass blur radius */
  --r-lg: 18px;           /* corner roundness */
}
```

- **Want it cooler?** Swap the accent to a sage `#7c8b5b` or dusty blue `#6b8ca3`.
- **More glass?** Bump `--blur` and lower the alpha on `--surface`.
- **Change the home/start page:** edit `src/newtab.html` (quick-links live in the `SITES` array).

---

## How it works

- Each tab is an Electron `<webview>`; only the active one is shown.
- The chrome (tabs, toolbar, panels) is plain HTML/CSS/JS styled as frosted cream glass.
- Dark mode is a `data-theme` attribute swap; the toggle animates with the **View Transitions API** (a circular reveal from the click point) and falls back to an instant switch under `prefers-reduced-motion`.
- **Cream AI** calls the Anthropic Messages API from the main process via the official `@anthropic-ai/sdk`, streaming tokens back to the new-tab page over IPC.
- Pop-ups / `target="_blank"` links are intercepted in the main process and reopened as new tabs.
- Bookmarks, history, and theme persist in `localStorage`; the AI key + model persist in the app's user-data folder; site logins persist via a named session partition.

Built with the help of Claude Code.
