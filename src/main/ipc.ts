import { app, ipcMain } from 'electron';
import { type AppInfo, IPC_CHANNELS } from '../shared/ipc-contract';

function getAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  };
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getAppInfo, () => getAppInfo());
}
