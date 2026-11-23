import { contextBridge, ipcRenderer } from 'electron';
import { type BridgeApi, IPC_CHANNELS } from '../shared/ipc-contract';

// The only bridge between the renderer and the main process. Keep the API small and typed.
const bridge: BridgeApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.getAppInfo),
};

contextBridge.exposeInMainWorld('bridge', bridge);
