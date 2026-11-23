import type { BrowserWindowConstructorOptions } from 'electron';

/**
 * Options for the main app window. The isolation settings match the ones the Electron CDP
 * spike proved: the renderer gets no Node globals and talks to the main process only through
 * the preload bridge.
 */
export function createMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'AI Context Bridge',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  };
}
