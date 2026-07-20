import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execFileSync } from 'child_process';
import * as pty from '@lydell/node-pty';
import { getMotd } from './motd';

// Demo mode: scripted showcase session, no real shell. The env var makes the
// flag visible to the preload/renderer, which run the actual script.
if (process.argv.includes('--demo')) process.env.TERMED_DEMO = '1';
const isDemo = process.env.TERMED_DEMO === '1';

function resolveShell(): string {
  if (process.env.TERMED_SHELL) return process.env.TERMED_SHELL;
  if (process.platform === 'win32') {
    try {
      execFileSync('where.exe', ['pwsh.exe'], { stdio: 'ignore' });
      return 'pwsh.exe';
    } catch {
      return 'powershell.exe';
    }
  }
  return process.env.SHELL || '/bin/bash';
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 480,
    minHeight: 320,
    title: 'termEd',
    backgroundColor: '#0a0a0f',
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

function spawnTabPty(win: BrowserWindow, tabId: string): pty.IPty {
  const shellPath = resolveShell();
  // The MOTD prints via the shell itself - ConPTY repaints the whole viewport
  // at startup, so anything written straight to xterm gets wiped.
  const psQuote = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const motdCommand = [
    "Write-Host ''",
    ...getMotd(__APP_VERSION__).map(
      (line) => `Write-Host ${psQuote('  ' + line.text)} -ForegroundColor ${line.color}`
    ),
    "Write-Host ''",
  ].join('; ');
  const shellArgs = /powershell|pwsh/i.test(shellPath) ? ['-NoExit', '-Command', motdCommand] : [];
  const ptyProc = pty.spawn(shellPath, shellArgs, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: os.homedir(),
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
        if (!win.isDestroyed()) win.webContents.send('pty:data', tabId, chunk);
      }, 4);
    }
  });

  ptyProc.onExit(() => {
    if (!win.isDestroyed()) win.webContents.send('pty:exit', tabId);
  });

  return ptyProc;
}

// One pty per tab, keyed by an id the renderer mints per xterm instance.
function attachTabs(win: BrowserWindow): void {
  const ptys = new Map<string, pty.IPty>();
  let nextId = 1;

  const onCreate = (event: Electron.IpcMainInvokeEvent): string | null => {
    if (event.sender !== win.webContents) return null;
    const tabId = String(nextId++);
    ptys.set(tabId, spawnTabPty(win, tabId));
    return tabId;
  };

  const onClose = (event: Electron.IpcMainEvent, tabId: string): void => {
    if (event.sender !== win.webContents) return;
    ptys.get(tabId)?.kill();
    ptys.delete(tabId);
  };

  const onInput = (event: Electron.IpcMainEvent, tabId: string, data: string): void => {
    if (event.sender === win.webContents) ptys.get(tabId)?.write(data);
  };

  const onResize = (
    event: Electron.IpcMainEvent,
    tabId: string,
    cols: number,
    rows: number
  ): void => {
    if (event.sender === win.webContents && cols > 0 && rows > 0) {
      ptys.get(tabId)?.resize(cols, rows);
    }
  };

  ipcMain.handle('tab:create', onCreate);
  ipcMain.on('tab:close', onClose);
  ipcMain.on('pty:input', onInput);
  ipcMain.on('pty:resize', onResize);

  win.on('closed', () => {
    for (const ptyProc of ptys.values()) {
      try {
        ptyProc.kill();
      } catch {}
    }
    ptys.clear();
    ipcMain.removeHandler('tab:create');
    ipcMain.off('tab:close', onClose);
    ipcMain.off('pty:input', onInput);
    ipcMain.off('pty:resize', onResize);
  });
}

app.setAppUserModelId('dev.nateshoffner.termed');

// Fixed allowlist, not arbitrary renderer-controlled navigation - this is
// only ever called with the credits-panel link.
const ALLOWED_EXTERNAL_URLS = new Set(['https://nateshoffner.com']);

ipcMain.on('app:open-external', (_event, url: string) => {
  if (ALLOWED_EXTERNAL_URLS.has(url)) shell.openExternal(url);
});

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

  // Update metadata only exists on installed builds (electron-builder emits
  // it alongside the artifacts our GitHub Actions release step publishes) -
  // an unpacked dev run has nothing to check against.
  if (app.isPackaged) {
    autoUpdater.on('error', (err) => console.error('autoUpdater error:', err));
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
