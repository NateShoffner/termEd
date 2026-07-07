import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execFileSync } from 'child_process';
import * as pty from '@lydell/node-pty';

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

  const shell = resolveShell();
  // On PowerShell, print the banner via the shell itself - ConPTY repaints the
  // whole viewport at startup, so anything written straight to xterm gets wiped.
  const shellArgs = /powershell|pwsh/i.test(shell)
    ? [
        '-NoExit',
        '-Command',
        "Write-Host ''; Write-Host '  * termEd v1.0 - the terminal that believes in you' -ForegroundColor Cyan; Write-Host '  \"Your session is compiled and ready. Just like a clean RPG IV build.\" - Ed' -ForegroundColor DarkGray; Write-Host ''",
      ]
    : [];
  const ptyProc = pty.spawn(shell, shellArgs, {
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
        if (!win.isDestroyed()) win.webContents.send('pty:data', chunk);
      }, 4);
    }
  });

  ptyProc.onExit(() => {
    if (!win.isDestroyed()) win.close();
  });

  ipcMain.on('pty:input', (event, data: string) => {
    if (event.sender === win.webContents) ptyProc.write(data);
  });

  ipcMain.on('pty:resize', (event, { cols, rows }: { cols: number; rows: number }) => {
    if (event.sender === win.webContents && cols > 0 && rows > 0) {
      ptyProc.resize(cols, rows);
    }
  });

  win.on('closed', () => {
    try {
      ptyProc.kill();
    } catch {}
  });

  // Dev helper: TERMED_SHOT=<file.png> captures a screenshot ~5s after load
  // and exits. Used to eyeball styling changes without a manual launch.
  if (process.env.TERMED_SHOT) {
    win.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, 5000));
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

app.setAppUserModelId('dev.nateshoffner.termed');

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
