import { contextBridge, ipcRenderer } from 'electron';

const termedApi = {
  platform: process.platform,
  demo: process.env.TERMED_DEMO === '1',
  onData: (callback: (data: string) => void): void => {
    ipcRenderer.on('pty:data', (_event, data: string) => callback(data));
  },
  input: (data: string): void => {
    ipcRenderer.send('pty:input', data);
  },
  resize: (cols: number, rows: number): void => {
    ipcRenderer.send('pty:resize', { cols, rows });
  },
};

export type TermedApi = typeof termedApi;

contextBridge.exposeInMainWorld('termed', termedApi);
