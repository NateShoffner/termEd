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

### Tabs and panes: one pty + one xterm per *pane*, one EdEngine per *tab*

A tab is a `PaneGroup` (a binary split tree of terminals) plus a single Ed. The pty is per pane, so `tabId` and `paneId` are different things - IPC ids are always pane ids.

- **Main** (`src/main.ts`, `attachTabs`): a `Map<paneId, pty.IPty>` per window. `pty:create` (invoke) spawns a pty and returns an id; `pty:input`/`pty:resize`/`pty:close` are keyed by that id. pty output is batched into ~4ms windows before sending over IPC (`pty:data`) so heavy output doesn't flood the renderer with thousands of tiny messages. Main knows nothing about tabs or splits.
- **`TabManager`** (`src/renderer/tab-manager.ts`): for each tab, creates a `.tab-session` DOM subtree (`createSession()`: backdrop + `.pane-root` + bubble), an `EdEngine`, and a `PaneGroup`. It keeps a `paneId -> tabId` map so incoming `pty:data` can be routed to the right group. Nothing is shared across tabs except the tab bar chrome, the dropdown menu, and the About overlay.
- **`PaneGroup`** (`src/renderer/panes.ts`) owns the split tree for one tab. Leaves are `.terminal-pane` elements (one `Terminal` each); splits are flex containers holding exactly two children plus a draggable `.pane-divider`. Splitting replaces a leaf's element in the DOM with a split element that re-adopts it, so the tree and the DOM always mirror each other. **When a leaf is swapped out for a split, the new split element must inherit the leaf's inline `flex`** - otherwise it falls back to min-content and collapses to a ~30px sliver inside its parent split. Closing a pane promotes the surviving sibling into the parent's slot and drops the split node entirely.
- Panes re-fit via a **`ResizeObserver` per leaf**, not a window `resize` listener - window resizes, divider drags, a sibling closing, and a tab becoming visible again all have to trigger the same `fit()` + `pty:resize`, and only the observer catches all four. `fitLeaf` bails when the element measures under 2px: a hidden tab measures zero and fitting then would clamp the pty to 1x1 and reflow the shell's scrollback for nothing.
- **`EdEngine`** (`src/renderer/ed-engine.ts`) takes a `container` element in its constructor and queries `.ed-bubble`/`.ed-backdrop`/`.ed-avatar` *within that subtree* - it has no global DOM lookups. This is what makes Ed's wallpaper pose, popup cooldowns, and idle timers independent per tab. `container.classList` (not `document.body`) gets `ed-speaking` toggled. Only the **active pane's** keystrokes and output are fed to Ed, so background panes in the same tab don't scramble his command tracking. Closing a tab calls `ed.destroy()` to clear all pending timers (idle/hide/interval/greeting) - EdEngine has no other lifecycle hook, so a missed `destroy()` leaks a recurring `setTimeout` chain forever.
- Only the active tab's `.tab-session` is `display: block`; others keep running (pty output still arrives, Ed's timers still fire) while hidden, same as real browser tabs.
- All shortcuts are intercepted via `term.attachCustomKeyEventHandler` (per pane, at creation) rather than a window-level `keydown` listener - a window-level listener fires *after* xterm's own handler has already forwarded the keystroke to the pty, so shortcuts would leak a stray character into the shell. `PaneGroup` handles the pane bindings and delegates the rest to `TabManager.handleKey` via the `onKeyDown` option (returning `true` means "consumed"). Bindings: Ctrl/Cmd+T/W/Tab for tabs, Alt+Shift+`+`/`-`/`D` to split (right / down / auto by aspect ratio), Alt+arrows to move focus geometrically, Ctrl+Shift+W to close a pane.
- Pane focus tracking needs an explicit capture-phase `mousedown` listener on the leaf element - xterm swallows the event before it would bubble anywhere useful.

### Version/commit are build-time constants, not runtime lookups

`scripts/build.mjs` runs `git describe --tags --always --dirty` and `git rev-parse --short HEAD` and injects them via esbuild `define` as `__APP_VERSION__`/`__COMMIT_HASH__`, plus `package.json`'s `version` as `__DISPLAY_VERSION__` (all ambient-declared in `src/build-env.d.ts`). Packaged apps ship without `.git`, so this can't be resolved at runtime - it must be baked in at build time. The window title and MOTD show the plain `__DISPLAY_VERSION__` (e.g. `v1.1.0`); the About screen shows the full `git describe` string and links the commit to GitHub. Both main (MOTD) and renderer (title, About screen, via `preload.ts`) reference these globals directly; nothing calls `app.getVersion()` for display purposes.

### Demo mode

`--demo` (or `TERMED_DEMO=1`) bypasses the tab system and real ptys entirely: `src/renderer/demo.ts` scripts a fake prompt/output sequence through the *same* `EdEngine.onKeystroke`/`onOutput` hooks a real tab uses, so Ed's reactions are genuine even though nothing is actually executing. `renderer.ts` branches early on `window.termed.demo` and builds a single non-closable session by hand (via the same `createSession()`/`createPaneEl()` helpers `TabManager` and `PaneGroup` use) rather than going through `TabManager` at all. There's no `TabManager` in demo mode, so the dropdown menu hides everything except About.

### Styling gotchas worth knowing before touching `styles.css`

- **`position: fixed` always creates a new CSS stacking context**, regardless of `z-index` (including `z-index: auto`). `.tab-session` is `position: fixed`; this bit us once already - wrapping the backdrop/terminal in it silently isolated their z-index values from `#ed-scrim`'s, so the scrim ended up painting *above* the whole session and ate every click (focus never reached xterm's textarea, so typing appeared totally broken). Purely decorative full-viewport layers (`#ed-scrim`, `.ed-backdrop`) need explicit `pointer-events: none` - don't rely on z-index alone to keep them out of the hit-testing path.
- **`backdrop-filter` on a bounded panel creates a visible seam** wherever the blurred region meets the unblurred backdrop, no matter how small the radius - there's no way to feather that edge away. The terminal panel's legibility fix instead blurs `.ed-backdrop` itself (`filter: blur(...)`, uniformly, full-bleed, with `transform: scale(1.05)` so the blur kernel doesn't sample transparent void at the viewport edge) and uses a flat `rgba` tint on `.terminal-pane` - no local `backdrop-filter`.
- A synthetic click via `Runtime.evaluate(...).click())` or Electron's `sendInputEvent` is **not sufficient to catch focus bugs** - both bypass normal DOM hit-testing/focus routing. Verifying real click-to-focus behavior requires CDP `Input.dispatchMouseEvent` + `Input.dispatchKeyEvent`, which respect the actual hit-testing path.

### Auto-update / release flow

Pushing a `vX.Y.Z` tag triggers `.github/workflows/build.yml`: builds installers on all three platforms, then (tag-triggered `release` job) publishes a GitHub Release with the installers plus `latest*.yml`/`*.blockmap` (electron-updater's feed metadata - `package.json`'s `build.publish` config is what makes electron-builder emit these even with `--publish=never`). Packaged builds call `autoUpdater.checkForUpdatesAndNotify()` on startup, gated on `app.isPackaged` (dev runs have no update metadata to check against). **macOS auto-update requires a signed, notarized build** - Squirrel.Mac refuses to apply updates to an unsigned app, and this repo has no signing identity configured, so mac auto-update is currently a no-op in practice even though the wiring is correct.

### IPC surface (`src/preload.ts`)

`window.termed` is the entire main↔renderer contract: `platform`, `demo`, `version`, `displayVersion`, `commit`, `createPty()`/`closePty()`/`onData()`/`onExit()`/`input()`/`resize()` (all **pane**-id-scoped - main has no concept of tabs), and `openExternal(url)`. `main.ts` allowlists `openExternal` to the exact URLs in `src/links.ts` (the About screen's credits link and the build's GitHub commit page, whose hash is baked in at build time) - it is not general-purpose arbitrary navigation, by design.
