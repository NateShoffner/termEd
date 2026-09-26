<p align="center">
  <img src="assets/icon.png" alt="termEd" width="128" height="128" />
</p>

<h1 align="center">termEd</h1>

**The terminal that believes in you.**

A real terminal emulator built entirely around Ed - your personal hype man and the ultimate pair programmer.

![termEd demo](assets/demo.gif)

## Features

- **A real terminal.** Your actual shell (PowerShell/pwsh on Windows, `$SHELL` elsewhere) over a pseudo-terminal, with tabs in the title bar and split panes. Every pane is an independent shell.
- **Ed, per tab.** Each tab gets its own Ed, with his own wallpaper pose and cooldowns. He opens with a fresh MOTD, celebrates wins, encourages failures, drops unprompted hype, and checks in when you go quiet - always through an overlay bubble, never into the shell stream.
- **Right-click menus.** Copy, paste, select all, split, clear and close on a pane; new tab and close tab / others / everything to the right on a tab.
- **Settings** (⚙ or Ctrl/Cmd+,). Default shell, starting directory, window size memory, update checks, font picker, cursor, backdrop dim, and how much Ed shows up: his backdrop, popups, popup style and chattiness.
- **Self-updating.** Installed builds check GitHub Releases, download in the background, and offer "Restart to update" from the `⌄` menu. About (ⓘ) shows version, commit and update status. macOS and portable builds link to the release page instead.

## Shortcuts

| | |
| --- | --- |
| `Ctrl/Cmd+T` | New tab |
| `Ctrl/Cmd+W` | Close tab |
| `Ctrl/Cmd+Tab` / `+Shift` | Next / previous tab |
| `Alt+Shift++` | Split right |
| `Alt+Shift+-` | Split down |
| `Alt+Shift+D` | Split along the pane's longer axis |
| `Alt+←/→/↑/↓` | Move focus between panes |
| `Ctrl+Shift+W` | Close pane (closes the tab when it's the last one) |
| `Ctrl/Cmd+,` | Settings |
| `Ctrl/Cmd+=` / `-` / `0` | Bigger / smaller / reset font size |

## Installation

Grab an installer from [Releases](https://github.com/NateShoffner/termEd/releases), or run from source:

```
npm install
npm start
```

`TERMED_SHELL` overrides the shell setting. `npm run demo` plays a scripted session on fake shells: tabs, a split, a watch build beside its tests.

## Development

Electron + [xterm.js](https://xtermjs.org/) + [@lydell/node-pty](https://github.com/lydell/node-pty), in TypeScript, bundled with esbuild. Main owns the ptys (one per pane) and the updater; the renderer owns xterm, the tab bar, the split tree and Ed. `CLAUDE.md` covers the architecture in depth.

```
src/main.ts                     window, pty spawn, IPC
src/settings.ts, settings-store.ts   settings schema and persistence
src/shells.ts, updater.ts       shell detection; update checks and install
src/renderer/renderer.ts        boot: tabs (or demo), settings, menus, About
src/renderer/tab-manager.ts, panes.ts   tabs, and the split tree (one xterm + pty per pane)
src/renderer/ed-engine.ts, ed-quotes.ts when Ed speaks, and what he says
src/renderer/settings-panel.ts, fonts.ts, context-menu.ts, update-ui.ts   the rest of the UI
```

- `npm run check` typechecks, `npm run build` bundles to `out/`, `npm start` runs the dev binary. On macOS that binary identifies itself as "Electron"; `npm run start:packaged` builds a properly branded app.
- `npm run demo:record` re-records the preview at the top of this README. Needs [ffmpeg](https://ffmpeg.org/download.html) on your PATH.
- `npm run dist` builds installers. Pushing a `vX.Y.Z` tag runs `.github/workflows/build.yml`, which builds all three platforms and publishes a GitHub Release; installed builds pick it up automatically. Version and commit are baked in at build time, so no `.git` is needed at runtime. Mac auto-update needs a signed, notarized build.
