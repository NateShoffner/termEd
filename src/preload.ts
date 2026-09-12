import { contextBridge, ipcRenderer } from 'electron';

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
};

export type TermedApi = typeof termedApi;

contextBridge.exposeInMainWorld('termed', termedApi);
