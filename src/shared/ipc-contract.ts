// IPC contract shared by the main process, the preload script and the renderer.
// The renderer imports types only; it never gets Electron or Node objects.

export const IPC_CHANNELS = {
  getAppInfo: 'app:get-info',
} as const;

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
}

/** The API the preload script exposes to the renderer as `window.bridge`. */
export interface BridgeApi {
  getAppInfo(): Promise<AppInfo>;
}
