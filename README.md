# Solace 🌙 — a calm, private, beautiful web browser

Solace is a polished, liquid-glass desktop web browser built on **Electron** with a real **Chromium** engine. It pairs a warm, distraction-free design with genuinely useful privacy tools: built-in ad blocking, an encrypted password vault with autofill, and a private AI assistant that uses your own key.

![stack](https://img.shields.io/badge/Electron-Chromium-c2703d) ![style](https://img.shields.io/badge/design-liquid--glass-efe4cf) ![platform](https://img.shields.io/badge/platform-Windows-555) ![license](https://img.shields.io/badge/license-MIT-2faa5a)

---

## Highlights

- **🛡️ Ad & tracker blocking, built in** — uBlock Origin ships with Solace and is on by default. No setup.
- **🔑 Encrypted password vault + autofill** — logins are encrypted by your OS keychain (Windows DPAPI), filled in automatically, and never synced anywhere. Import from any browser via CSV.
- **✨ A private AI assistant** — ask Solace AI from the new-tab page. It uses *your* Anthropic API key, stored only on your device; web pages can never reach it.
- **🎨 Seven themes + accent picker** — Light, Sepia, Arctic, Dark, Midnight, Slate, Noir, plus a Photoshop-style HSV accent wheel and a frost-intensity slider.
- **🕶️ Genuine incognito** — a real ephemeral session (no history, no disk traces) with its own look.
- **🌫️ Liquid-glass design** — frosted surfaces, fluid animations, and a calm new-tab page with a live clock and quick links.
- **🔒 Private by default** — Do-Not-Track / GPC, optional clear-on-exit, and a hardened main process.

Plus: smart omnibox, bookmarks, history, a full **downloads manager** with progress toasts, per-tab **zoom**, a region **snip** tool, unpacked **extensions**, a removable sidebar, a lightweight mode, and bookmark import from other browsers.

---

## Run it from source

> Requires [Node.js](https://nodejs.org) (LTS) on **Windows**.

```powershell
git clone https://github.com/ArthurMoorgan/solace.git
cd solace
npm install      # installs Electron + deps, and fetches uBlock Origin
npm start
```

A frameless window opens with its own animated new-tab page. On first run you'll see a short setup tour.

> **Note on uBlock Origin:** it's GPL-licensed and is *not* stored in this repo. `npm install` downloads it automatically (see [`scripts/fetch-ublock.js`](scripts/fetch-ublock.js)). To fetch it manually at any time: `npm run fetch-ublock`.

---

## Build the Windows app

Packaging uses **electron-builder** (NSIS installer + single-file portable).

```powershell
npm run pack    # quick unpacked build  → dist/win-unpacked/
npm run dist    # installer + portable  → dist/
```

`npm run dist` auto-increments the patch version and ensures uBlock Origin is present, then produces:

- `Solace Setup <version>.exe` — the installer (upgrades in place, keeps user data)
- `Solace-<version>-portable.exe` — a single-file portable build

To rebrand the app icon, replace [`build/icon.svg`](build/icon.svg) and run `npm run make-icon`.

---

## Cream AI / Solace AI — bring your own key

The new-tab page has a built-in **Claude** assistant. Click **Ask Solace AI**, paste your Anthropic API key once, and chat — replies stream in token-by-token.

- **Your key stays private.** It's stored only in the app's user-data folder (`%APPDATA%/Solace`), and every API call runs in Electron's **main process**. The key is never exposed to any web page or renderer; the new-tab AI bridge is URL-locked and the main process re-validates the sender on every call.
- **Default model:** `claude-opus-4-8` (switchable to Sonnet / Haiku in Settings).
- **Get a key:** [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

---

## Keyboard shortcuts

Work even when a web page has focus (forwarded from the main process):

| Shortcut | Action | | Shortcut | Action |
|---|---|---|---|---|
| `Ctrl+T` | New tab | | `Ctrl+D` | Bookmark page |
| `Ctrl+W` | Close tab | | `Ctrl+H` | Toggle history |
| `Ctrl+L` | Focus address bar | | `Ctrl+1…9` | Jump to tab N |
| `Ctrl+R` / `F5` | Reload | | `Ctrl+Tab` | Next tab |
| `Alt+←` / `Alt+→` | Back / Forward | | `Ctrl+J` | Downloads |
| `Ctrl +` / `-` / `0` | Zoom in / out / reset | | | |

---

## How it works

- Each tab is an Electron `<webview>` with a real Chromium renderer; only the active one is shown.
- The chrome (tabs, toolbar, panels, settings) is plain **HTML/CSS/JS** styled as frosted glass — no framework.
- **Security model:** the Anthropic key and all AI calls live in the main process; the password vault is encrypted via `safeStorage`; sessions and windows are hardened (denied permission prompts, no shell navigation, popups routed to tabs); a CSP is applied to the chrome pages.
- Most UI state persists in `localStorage` (`cream.*` keys); the AI key, downloads, and passwords persist in the user-data folder; site logins persist via a named session partition.

## Project layout

```
solace/
├─ main.js              # main process: windows, AI, downloads, vault, autofill, ad-block
├─ preload.js           # secure bridge for the chrome window
├─ build/               # app icon (icon.svg → icon.png)
├─ scripts/             # icon render, version bump, uBlock fetch
└─ src/
   ├─ index.html        # browser chrome structure
   ├─ chrome.css        # the liquid-glass design system + all themes
   ├─ chrome.js         # tabs, omnibox, bookmarks, history, settings, passwords…
   ├─ newtab.html       # animated start page + Solace AI assistant
   ├─ newtab-preload.js # URL-guarded AI bridge + password autofill (isolated world)
   └─ backgrounds/      # flat-design SVG new-tab backgrounds
```

---

## License

[MIT](LICENSE) © decodingit. Bundled uBlock Origin is © Raymond Hill and licensed separately under the GPLv3.

Built with the help of [Claude Code](https://claude.com/claude-code).
