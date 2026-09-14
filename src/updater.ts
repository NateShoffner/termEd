import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateState } from './updates';

// Terminals stay open for days, so a startup check alone would go stale.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Checking works in any packaged build, but installing doesn't everywhere:
// Squirrel.Mac refuses unsigned apps (this repo has no signing identity), and
// a portable Windows build would run the NSIS installer and end up installed
// twice. Those builds link to the release page instead.
const canInstall =
  app.isPackaged && process.platform !== 'darwin' && !process.env.PORTABLE_EXECUTABLE_DIR;

// Update metadata only exists for installed builds (electron-builder emits it
// alongside the artifacts the release workflow publishes), so an unpacked dev
// run has nothing to check against.
let state: UpdateState = app.isPackaged
  ? { status: 'idle', canInstall }
  : { status: 'unsupported', canInstall: false };

function setState(next: UpdateState): void {
  state = next;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('updates:state', state);
  }
}

export function getUpdateState(): UpdateState {
  return state;
}

export function checkForUpdates(): void {
  if (!app.isPackaged) return;
  // Nothing to add while a check or download is in flight, or once an update
  // is ready to install.
  if (state.status === 'checking' || state.status === 'downloading' || state.status === 'ready') {
    return;
  }
  // Failures also arrive through the 'error' event, which is where they're handled.
  autoUpdater.checkForUpdates().catch(() => {});
}

export function installUpdate(): void {
  if (state.status === 'ready') autoUpdater.quitAndInstall();
}

export function initUpdater(autoCheckEnabled: () => boolean): void {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = canInstall;

  autoUpdater.on('checking-for-update', () => setState({ status: 'checking', canInstall }));
  autoUpdater.on('update-not-available', () => setState({ status: 'up-to-date', canInstall }));
  autoUpdater.on('update-available', (info) =>
    setState({
      status: canInstall ? 'downloading' : 'available',
      canInstall,
      version: info.version,
      percent: 0,
    })
  );
  autoUpdater.on('download-progress', (progress) =>
    setState({ ...state, status: 'downloading', percent: Math.floor(progress.percent) })
  );
  autoUpdater.on('update-downloaded', (event) =>
    setState({ status: 'ready', canInstall, version: event.version })
  );
  autoUpdater.on('error', (err) => {
    console.error('autoUpdater error:', err);
    // electron-updater's messages can include whole HTTP responses.
    setState({ status: 'error', canInstall, error: err.message.split('\n')[0].slice(0, 200) });
  });

  const autoCheck = () => {
    if (autoCheckEnabled()) checkForUpdates();
  };
  autoCheck();
  setInterval(autoCheck, CHECK_INTERVAL_MS);
}
