import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron';
import {
  type BridgeApi,
  type BrowserFrame,
  type BrowserState,
  IPC_CHANNELS,
} from '../shared/ipc-contract';
import type { NetworkState } from '../shared/network';

// The only bridge between the renderer and the main process. Keep the API small and typed.
const bridge: BridgeApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.getAppInfo),
  recognizeText: (request) => ipcRenderer.invoke(IPC_CHANNELS.recognizeText, request),
  saveContextPackage: (request) => ipcRenderer.invoke(IPC_CHANNELS.saveContextPackage, request),
  browserNavigate: (input) => ipcRenderer.invoke(IPC_CHANNELS.browserNavigate, input),
  browserCommand: (command) => ipcRenderer.invoke(IPC_CHANNELS.browserCommand, command),
  browserSetBounds: (bounds) => ipcRenderer.send(IPC_CHANNELS.browserSetBounds, bounds),
  browserGetState: () => ipcRenderer.invoke(IPC_CHANNELS.browserGetState),
  browserCapture: () => ipcRenderer.invoke(IPC_CHANNELS.browserCapture),
  browserExtract: () => ipcRenderer.invoke(IPC_CHANNELS.browserExtract),
  browserSendInput: (input) => ipcRenderer.send(IPC_CHANNELS.browserInput, input),
  onBrowserState: (listener) => {
    // Pass only the state on: the renderer never sees the IPC event object.
    const handler = (_event: IpcRendererEvent, state: BrowserState) => listener(state);
    ipcRenderer.on(IPC_CHANNELS.browserState, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.browserState, handler);
  },
  onBrowserFrame: (listener) => {
    const handler = (_event: IpcRendererEvent, frame: BrowserFrame) => listener(frame);
    ipcRenderer.on(IPC_CHANNELS.browserFrame, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.browserFrame, handler);
  },
  networkStart: () => ipcRenderer.invoke(IPC_CHANNELS.networkStart),
  networkStop: () => ipcRenderer.invoke(IPC_CHANNELS.networkStop),
  networkClear: () => ipcRenderer.invoke(IPC_CHANNELS.networkClear),
  networkRemove: (id) => ipcRenderer.invoke(IPC_CHANNELS.networkRemove, id),
  networkGetState: () => ipcRenderer.invoke(IPC_CHANNELS.networkGetState),
  onNetworkState: (listener) => {
    const handler = (_event: IpcRendererEvent, state: NetworkState) => listener(state);
    ipcRenderer.on(IPC_CHANNELS.networkState, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.networkState, handler);
  },
};

contextBridge.exposeInMainWorld('bridge', bridge);
