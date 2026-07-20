# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` - build + launch the dev binary (`electron .`). Runs the stock unpackaged Electron binary, so the Dock/menu bar will show "Electron" instead of "termEd" - a cosmetic OS-level quirk, not a bug (see `scripts/rename-electron-dev.mjs`).
- `npm run start:packaged` - build a real `termEd.app` via electron-builder and open it. Slower per iteration, but correctly branded everywhere; use this when working on anything Dock/menu-bar/About-panel related.
- `npm run build` - bundle main/preload/renderer via esbuild to `out/` (no typecheck).
- `npm run check` - `tsc --noEmit`. There is no separate lint step and no test suite.
- `npm run demo` - scripted showcase session (`--demo` flag) with no real shell; see "Demo mode" below.
- `npm run pack` - unpacked electron-builder output to `dist/` (`--dir`, fast, no installer).
- `npm run dist` - full installers via electron-builder (`--publish=never`).
- `TERMED_SHELL=<shell> npm start` - force a specific shell instead of the platform default.
- `TERMED_SHOT=<file.png> [TERMED_SHOT_DELAY=ms] [TERMED_TYPE=<text>] npm start` - dev-only screenshot helper baked into `main.ts`. Captures the window to a PNG after load (optionally typing text first through the real input path) and exits. This is the primary way to visually verify renderer changes without a human in the loop.

There's no single-test-run command since there's no test suite - verification is `npm run check` + `npm run build` + a `TERMED_SHOT`/`TERMED_TYPE` smoke test, or launching with `--remote-debugging-port=<port>` and driving the page over CDP for anything that needs real focus/click behavior (screenshot-only checks miss focus bugs - see "Gotchas" below).

## Architecture

Electron app: main process owns pty processes and native OS integration; renderer owns xterm.js and all UI. `src/preload.ts` is the only bridge between them (`contextIsolation: true`, `nodeIntegration: false`) - it exposes a single `window.termed` object.

### Tabs: one pty + one xterm + one EdEngine per tab

Each open tab is a fully independent unit, not a shared UI wrapped around shared state:

- **Main** (`src/main.ts`, `attachTabs`): a `Map<tabId, pty.IPty>` per window. `tab:create` (invoke) spawns a pty and returns an id; `pty:input`/`pty:resize`/`tab:close` are keyed by that id. pty output is batched into ~4ms windows before sending over IPC (`pty:data`) so heavy output doesn't flood the renderer with thousands of tiny messages.
- **Renderer** (`src/renderer/tab-manager.ts`, `TabManager`): for each tab, creates a `.tab-session` DOM subtree (`createSession()`: backdrop + terminal mount + bubble), a `Terminal` instance, and its own `EdEngine`. Nothing is shared across tabs except the tab bar chrome and the About overlay.
- **`EdEngine`** (`src/renderer/ed-engine.ts`) takes a `container` element in its constructor and queries `.ed-bubble`/`.ed-backdrop`/`.ed-avatar` *within that subtree* - it has no global DOM lookups. This is what makes Ed's wallpaper pose, popup cooldowns, and idle timers independent per tab. `container.classList` (not `document.body`) gets `ed-speaking` toggled. Closing a tab calls `ed.destroy()` to clear all pending timers (idle/hide/interval/greeting) - EdEngine has no other lifecycle hook, so a missed `destroy()` leaks a recurring `setTimeout` chain forever.
- Only the active tab's `.tab-session` is `display: block`; others keep running (pty output still arrives, Ed's timers still fire) while hidden, same as real browser tabs.
- Ctrl/Cmd+T/W/Tab are intercepted via `term.attachCustomKeyEventHandler` (per tab, at creation) rather than a window-level `keydown` listener - a window-level listener fires *after* xterm's own handler has already forwarded the keystroke to the pty, so shortcuts would leak a stray character into the shell.

### Version/commit are build-time constants, not runtime lookups

`scripts/build.mjs` runs `git describe --tags --always --dirty` and `git rev-parse --short HEAD` and injects them via esbuild `define` as `__APP_VERSION__`/`__COMMIT_HASH__` (ambient-declared in `src/build-env.d.ts`). Packaged apps ship without `.git`, so this can't be resolved at runtime - it must be baked in at build time. Both main (MOTD) and renderer (About screen, via `preload.ts`) reference these globals directly; nothing calls `app.getVersion()` for display purposes.

### Demo mode

`--demo` (or `TERMED_DEMO=1`) bypasses the tab system and real ptys entirely: `src/renderer/demo.ts` scripts a fake prompt/output sequence through the *same* `EdEngine.onKeystroke`/`onOutput` hooks a real tab uses, so Ed's reactions are genuine even though nothing is actually executing. `renderer.ts` branches early on `window.termed.demo` and builds a single non-closable session by hand (via the same `createSession()` helper `TabManager` uses) rather than going through `TabManager` at all.

### Styling gotchas worth knowing before touching `styles.css`

- **`position: fixed` always creates a new CSS stacking context**, regardless of `z-index` (including `z-index: auto`). `.tab-session` is `position: fixed`; this bit us once already - wrapping the backdrop/terminal in it silently isolated their z-index values from `#ed-scrim`'s, so the scrim ended up painting *above* the whole session and ate every click (focus never reached xterm's textarea, so typing appeared totally broken). Purely decorative full-viewport layers (`#ed-scrim`, `.ed-backdrop`) need explicit `pointer-events: none` - don't rely on z-index alone to keep them out of the hit-testing path.
- **`backdrop-filter` on a bounded panel creates a visible seam** wherever the blurred region meets the unblurred backdrop, no matter how small the radius - there's no way to feather that edge away. The terminal panel's legibility fix instead blurs `.ed-backdrop` itself (`filter: blur(...)`, uniformly, full-bleed, with `transform: scale(1.05)` so the blur kernel doesn't sample transparent void at the viewport edge) and uses a flat `rgba` tint on `.terminal-pane` - no local `backdrop-filter`.
- A synthetic click via `Runtime.evaluate(...).click())` or Electron's `sendInputEvent` is **not sufficient to catch focus bugs** - both bypass normal DOM hit-testing/focus routing. Verifying real click-to-focus behavior requires CDP `Input.dispatchMouseEvent` + `Input.dispatchKeyEvent`, which respect the actual hit-testing path.

### Auto-update / release flow

Pushing a `vX.Y.Z` tag triggers `.github/workflows/build.yml`: builds installers on all three platforms, then (tag-triggered `release` job) publishes a GitHub Release with the installers plus `latest*.yml`/`*.blockmap` (electron-updater's feed metadata - `package.json`'s `build.publish` config is what makes electron-builder emit these even with `--publish=never`). Packaged builds call `autoUpdater.checkForUpdatesAndNotify()` on startup, gated on `app.isPackaged` (dev runs have no update metadata to check against). **macOS auto-update requires a signed, notarized build** - Squirrel.Mac refuses to apply updates to an unsigned app, and this repo has no signing identity configured, so mac auto-update is currently a no-op in practice even though the wiring is correct.

### IPC surface (`src/preload.ts`)

`window.termed` is the entire main↔renderer contract: `platform`, `demo`, `version`, `commit`, `createTab()`/`closeTab()`/`onData()`/`onExit()`/`input()`/`resize()` (all tab-id-scoped), and `openExternal(url)`. `main.ts` allowlists `openExternal` to one exact URL (the About screen's credits link) - it is not general-purpose arbitrary navigation, by design.
