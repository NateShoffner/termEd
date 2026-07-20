import { contextBridge, ipcRenderer } from 'electron';

const termedApi = {
  platform: process.platform,
  demo: process.env.TERMED_DEMO === '1',
  version: __APP_VERSION__,
  commit: __COMMIT_HASH__,
  createTab: (): Promise<string> => ipcRenderer.invoke('tab:create'),
  closeTab: (tabId: string): void => {
    ipcRenderer.send('tab:close', tabId);
  },
  onData: (callback: (tabId: string, data: string) => void): void => {
    ipcRenderer.on('pty:data', (_event, tabId: string, data: string) => callback(tabId, data));
  },
  onExit: (callback: (tabId: string) => void): void => {
    ipcRenderer.on('pty:exit', (_event, tabId: string) => callback(tabId));
  },
  input: (tabId: string, data: string): void => {
    ipcRenderer.send('pty:input', tabId, data);
  },
  resize: (tabId: string, cols: number, rows: number): void => {
    ipcRenderer.send('pty:resize', tabId, cols, rows);
  },
  openExternal: (url: string): void => {
    ipcRenderer.send('app:open-external', url);
  },
};

export type TermedApi = typeof termedApi;

contextBridge.exposeInMainWorld('termed', termedApi);
