import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as pty from '@lydell/node-pty';
import { getMotd } from './motd';
import { COMMIT_URL, CREDITS_URL, RELEASES_URL } from './links';
import { detectShells, resolveShell } from './shells';
import { checkForUpdates, getUpdateState, initUpdater, installUpdate } from './updater';
import {
  getSettings,
  loadWindowState,
  saveWindowState,
  updateSettings,
  type WindowState,
} from './settings-store';

// Must run before the app is ready to affect the About panel, notifications,
// and userData folder naming. Doesn't rename the dev-mode process itself -
// npm start runs the stock Electron binary, so Activity Monitor/Cmd+Tab
// still show "Electron" there; only a packaged build fixes that fully.
app.setName('termEd');

// Demo mode: scripted showcase session, no real shell. The env var makes the
// flag visible to the preload/renderer, which run the actual script.
if (process.argv.includes('--demo')) process.env.TERMED_DEMO = '1';
const isDemo = process.env.TERMED_DEMO === '1';

// Height of the tab strip, which doubles as the title bar; the OS window
// buttons are sized to match. Keep in sync with #ed-tabbar in styles.css.
const TITLEBAR_HEIGHT = 40;

function restoredWindowState(): WindowState | null {
  if (!getSettings().rememberWindowBounds) return null;
  const state = loadWindowState();
  if (!state) return null;
  // Bounds saved on a monitor that's since been unplugged would open the
  // window offscreen - fall back to the default centered size instead.
  const onScreen = screen
    .getAllDisplays()
    .some(
      ({ workArea: area }) =>
        state.x < area.x + area.width &&
        state.x + state.width > area.x &&
        state.y < area.y + area.height &&
        state.y + state.height > area.y
    );
  return onScreen ? state : null;
}

function createWindow(): void {
  const restored = restoredWindowState();
  const win = new BrowserWindow({
    width: restored?.width ?? 1100,
    height: restored?.height ?? 720,
    x: restored?.x,
    y: restored?.y,
    minWidth: 480,
    minHeight: 320,
    title: 'termEd',
    backgroundColor: '#0a0a0f',
    // No native title bar: the tab strip takes its place, Windows 11 style.
    // Windows and Linux still draw min/max/close over the strip's right end
    // (transparent, so the strip shows through); macOS keeps its traffic
    // lights on the left. The renderer lays out around env(titlebar-area-*).
    titleBarStyle: 'hidden',
    titleBarOverlay:
      process.platform === 'darwin'
        ? true
        : { color: 'rgba(0, 0, 0, 0)', symbolColor: '#cfd6ea', height: TITLEBAR_HEIGHT },
    trafficLightPosition: { x: 12, y: 13 },
    icon: path.join(
      __dirname,
      '..',
      'assets',
      process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Tracked as it changes instead of read at close: a renderer-initiated
  // window.close() (the last tab's shell exiting) skips the 'close' event, and
  // by 'closed' the window can't report its bounds anymore. Always saved, so
  // turning "remember window size" on later picks up the latest bounds.
  const captureState = (): WindowState => ({
    ...win.getNormalBounds(),
    maximized: win.isMaximized(),
  });
  let windowState = captureState();
  const trackState = () => {
    windowState = captureState();
  };
  win.on('resize', trackState);
  win.on('move', trackState);
  win.on('maximize', trackState);
  win.on('unmaximize', trackState);
  win.on('closed', () => saveWindowState(windowState));

  if (restored?.maximized) win.maximize();

  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (!isDemo) attachTabs(win);

  // Dev helper: TERMED_SHOT=<file.png> captures a screenshot after load and
  // exits (delay via TERMED_SHOT_DELAY, default 5000ms). TERMED_TYPE=<text>
  // types the text (plus Enter) first, through the real input path.
  if (process.env.TERMED_SHOT) {
    win.webContents.once('did-finish-load', async () => {
      if (process.env.TERMED_TYPE) {
        await new Promise((r) => setTimeout(r, 6000));
        win.focus();
        for (const ch of process.env.TERMED_TYPE) {
          win.webContents.sendInputEvent({ type: 'char', keyCode: ch });
        }
        win.webContents.sendInputEvent({ type: 'char', keyCode: '\r' });
        await new Promise((r) => setTimeout(r, 6500));
      } else {
        const delay = Number(process.env.TERMED_SHOT_DELAY) || 5000;
        await new Promise((r) => setTimeout(r, delay));
      }
      try {
        fs.writeFileSync(
          process.env.TERMED_SHOT as string,
          (await win.webContents.capturePage()).toPNG()
        );
      } catch (e) {
        console.error('TERMED_SHOT failed:', e);
      }
      app.exit(0);
    });
  }
}

// Accepts absolute paths and ~ (home-relative). Anything else, including a
// folder that no longer exists, opens in the home folder.
function resolveStartingDirectory(dir: string): string {
  const home = os.homedir();
  const expanded = /^~([\\/]|$)/.test(dir) ? path.join(home, dir.slice(1)) : dir;
  if (!expanded || !path.isAbsolute(expanded)) return home;
  try {
    return fs.statSync(expanded).isDirectory() ? expanded : home;
  } catch {
    return home;
  }
}

function spawnPanePty(win: BrowserWindow, paneId: string): pty.IPty {
  const settings = getSettings();
  const shellPath = resolveShell(settings.shell);
  // The MOTD prints via the shell itself - ConPTY repaints the whole viewport
  // at startup, so anything written straight to xterm gets wiped.
  const psQuote = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const motdCommand = [
    "Write-Host ''",
    ...getMotd(__DISPLAY_VERSION__).map(
      (line) => `Write-Host ${psQuote('  ' + line.text)} -ForegroundColor ${line.color}`
    ),
    "Write-Host ''",
  ].join('; ');
  const shellArgs = /powershell|pwsh/i.test(shellPath) ? ['-NoExit', '-Command', motdCommand] : [];
  const ptyProc = pty.spawn(shellPath, shellArgs, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: resolveStartingDirectory(settings.startingDirectory),
    env: { ...process.env, TERMED: '1' } as Record<string, string>,
  });

  // Batch pty output into one IPC message per ~4ms window - ConPTY emits many
  // tiny chunks and heavy output (build logs, type bigfile) would otherwise
  // flood the renderer with thousands of messages. 4ms is under a 60Hz frame,
  // so typing echo latency is unaffected.
  let ptyBuffer = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  ptyProc.onData((data) => {
    ptyBuffer += data;
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        const chunk = ptyBuffer;
        ptyBuffer = '';
        if (!win.isDestroyed()) win.webContents.send('pty:data', paneId, chunk);
      }, 4);
    }
  });

  ptyProc.onExit(() => {
    if (!win.isDestroyed()) win.webContents.send('pty:exit', paneId);
  });

  return ptyProc;
}

// One pty per pane, keyed by an id the renderer mints per xterm instance. A
// tab may own several of these at once (split panes).
function attachTabs(win: BrowserWindow): void {
  const ptys = new Map<string, pty.IPty>();
  let nextId = 1;

  const onCreate = (event: Electron.IpcMainInvokeEvent): string | null => {
    if (event.sender !== win.webContents) return null;
    const paneId = String(nextId++);
    ptys.set(paneId, spawnPanePty(win, paneId));
    return paneId;
  };

  const onClose = (event: Electron.IpcMainEvent, paneId: string): void => {
    if (event.sender !== win.webContents) return;
    ptys.get(paneId)?.kill();
    ptys.delete(paneId);
  };

  const onInput = (event: Electron.IpcMainEvent, paneId: string, data: string): void => {
    if (event.sender === win.webContents) ptys.get(paneId)?.write(data);
  };

  const onResize = (
    event: Electron.IpcMainEvent,
    paneId: string,
    cols: number,
    rows: number
  ): void => {
    if (event.sender === win.webContents && cols > 0 && rows > 0) {
      ptys.get(paneId)?.resize(cols, rows);
    }
  };

  ipcMain.handle('pty:create', onCreate);
  ipcMain.on('pty:close', onClose);
  ipcMain.on('pty:input', onInput);
  ipcMain.on('pty:resize', onResize);

  win.on('closed', () => {
    for (const ptyProc of ptys.values()) {
      try {
        ptyProc.kill();
      } catch {}
    }
    ptys.clear();
    ipcMain.removeHandler('pty:create');
    ipcMain.off('pty:close', onClose);
    ipcMain.off('pty:input', onInput);
    ipcMain.off('pty:resize', onResize);
  });
}

app.setAppUserModelId('dev.nateshoffner.termed');

// Fixed allowlist, not arbitrary renderer-controlled navigation - this is
// only ever called with the About screen's credits, commit, and release links.
const ALLOWED_EXTERNAL_URLS = new Set([CREDITS_URL, COMMIT_URL, RELEASES_URL]);

ipcMain.on('app:open-external', (_event, url: string) => {
  if (ALLOWED_EXTERNAL_URLS.has(url)) shell.openExternal(url);
});

// The renderer applies changes locally as it sends them; main just persists
// (sanitized) and reads shell/cwd/window settings back when it needs them.
ipcMain.handle('settings:get', () => getSettings());
ipcMain.on('settings:set', (_event, patch: unknown) => {
  updateSettings(patch);
});
ipcMain.handle('settings:detect-shells', () => detectShells());

// Main owns update state (see updater.ts); the renderer fetches it once, then
// follows 'updates:state' pushes.
ipcMain.handle('updates:get-state', () => getUpdateState());
ipcMain.on('updates:check', () => checkForUpdates());
ipcMain.on('updates:install', () => installUpdate());

app.whenReady().then(() => {
  // macOS ignores the BrowserWindow icon option; packaged builds use the
  // bundle's icns, but dev (npm start) needs the dock icon set directly.
  if (process.platform === 'darwin') {
    app.dock?.setIcon(path.join(__dirname, '..', 'assets', 'icon.png'));
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  initUpdater(() => getSettings().autoCheckUpdates);
});

app.on('window-all-closed', () => {
  app.quit();
});
