# termEd

**The terminal that believes in you.**

A fully functional terminal emulator built entirely around Ed - your personal hype man and the ultimate pair programmer.

![termEd demo](assets/demo.gif)

## Features

- **A real terminal.** Wraps your actual shell (PowerShell/pwsh on Windows, `$SHELL` elsewhere) via a pseudo-terminal.
- **Tabs.** Open as many sessions as you want (Ctrl/Cmd+T, Ctrl/Cmd+W, Ctrl/Cmd+Tab to cycle). Tab titles follow the shell's own OSC title escapes.
- **Ed is always there - per tab.** Each tab gets its own Ed: his own wallpaper pose, popups, and cooldowns, fully independent of your other sessions.
- **Dynamic MOTD** - every session opens with a fresh bit of Ed wisdom.
- **Command reactions** - wins get celebrated, errors get encouragement.
- **Ambient hype** - unprompted words of motivation every few minutes.
- **Idle check-ins** - gone quiet? Ed checks on you.
- **About screen** - click the `i` button in the tab bar for version, commit hash, and credits.
- **Self-updating.** Packaged builds check GitHub Releases on launch and update in the background.

Ed speaks through an overlay bubble, never into the shell stream.

## Installation

Grab an installer from [Releases](https://github.com/NateShoffner/termEd/releases), or run from source:

```
npm install
npm start
```

Set `TERMED_SHELL` to use a specific shell. `npm run demo` plays a scripted session with no real shell.

## Development

Electron + [xterm.js](https://xtermjs.org/) + [@lydell/node-pty](https://github.com/lydell/node-pty), written in TypeScript and bundled with esbuild. Main process owns the ptys (one per tab) and the auto-updater; the renderer owns xterm, the tab bar, and Ed.

```
src/main.ts                    pty spawn/tabs, window, auto-updater, IPC
src/preload.ts                 contextBridge (tabs, version/commit, external links)
src/renderer/renderer.ts       boot: wires tabs (or demo) + the about overlay
src/renderer/tab-manager.ts    one xterm + pty + EdEngine per open tab
src/renderer/ed-engine.ts      when Ed speaks, scoped to a single tab's DOM
src/renderer/ed-quotes.ts      what Ed says
```

- `npm run check` typechecks, `npm run build` bundles to `out/`.
- `npm start` builds and runs the dev binary; `npm run start:packaged` builds a real signed-name `termEd.app` first (slower, but the Dock/menu bar show "termEd" instead of "Electron" - a quirk of running the unpackaged Electron binary directly).
- App version and commit hash are baked in at build time from `git describe`/`git rev-parse` (see `scripts/build.mjs`) - no `.git` is needed at runtime.
- `npm run pack` / `npm run dist` build installers via electron-builder. Pushing a `vX.Y.Z` tag triggers `.github/workflows/build.yml`, which builds all platforms and publishes a GitHub Release; packaged builds pick up new releases automatically via `electron-updater`. Note: mac auto-update requires a signed, notarized build - unsigned dev builds skip it.
