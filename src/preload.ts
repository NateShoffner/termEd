import { contextBridge, ipcRenderer } from 'electron';
import type { Settings } from './settings';
import type { UpdateState } from './updates';

const termedApi = {
  platform: process.platform,
  demo: process.env.TERMED_DEMO === '1',
  version: __APP_VERSION__,
  displayVersion: __DISPLAY_VERSION__,
  commit: __COMMIT_HASH__,
  // Ids are per *pane*, not per tab - a tab can hold several split panes, each
  // backed by its own pty.
  createPty: (): Promise<string> => ipcRenderer.invoke('pty:create'),
  closePty: (paneId: string): void => {
    ipcRenderer.send('pty:close', paneId);
  },
  onData: (callback: (paneId: string, data: string) => void): void => {
    ipcRenderer.on('pty:data', (_event, paneId: string, data: string) => callback(paneId, data));
  },
  onExit: (callback: (paneId: string) => void): void => {
    ipcRenderer.on('pty:exit', (_event, paneId: string) => callback(paneId));
  },
  input: (paneId: string, data: string): void => {
    ipcRenderer.send('pty:input', paneId, data);
  },
  resize: (paneId: string, cols: number, rows: number): void => {
    ipcRenderer.send('pty:resize', paneId, cols, rows);
  },
  openExternal: (url: string): void => {
    ipcRenderer.send('app:open-external', url);
  },
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Partial<Settings>): void => {
    ipcRenderer.send('settings:set', patch);
  },
  detectShells: (): Promise<string[]> => ipcRenderer.invoke('settings:detect-shells'),
  getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke('updates:get-state'),
  onUpdateState: (callback: (state: UpdateState) => void): void => {
    ipcRenderer.on('updates:state', (_event, state: UpdateState) => callback(state));
  },
  checkForUpdates: (): void => {
    ipcRenderer.send('updates:check');
  },
  installUpdate: (): void => {
    ipcRenderer.send('updates:install');
  },
};

export type TermedApi = typeof termedApi;

contextBridge.exposeInMainWorld('termed', termedApi);
