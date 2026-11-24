import type { BrowserWindowConstructorOptions } from 'electron';

/** Height of the app's top toolbar; the Windows caption buttons are drawn at this height. */
export const TOOLBAR_HEIGHT = 36;

export interface WindowLook {
  /** Dark system theme: decides the caption button colour. */
  dark: boolean;
  /** Windows 11 22H2 or later: Mica can show through the sidebar. */
  mica: boolean;
}

/** Caption button colours for the title bar overlay, matching the app's text colour. */
export function titleBarOverlay(dark: boolean) {
  return {
    color: '#00000000',
    symbolColor: dark ? '#f5f5f7' : '#1d1d1f',
    height: TOOLBAR_HEIGHT,
  };
}

/** Windows 11 22H2 is build 22621; Mica needs it. */
export function supportsMica(platform: string, release: string): boolean {
  if (platform !== 'win32') return false;
  const build = Number(release.split('.')[2]);
  return Number.isFinite(build) && build >= 22621;
}

/**
 * Options for the main app window. The isolation settings match the ones the Electron CDP
 * spike proved: the renderer gets no Node globals and talks to the main process only through
 * the preload bridge.
 *
 * The title bar is hidden so the app's toolbar can run to the top edge; Windows still draws its
 * own minimize, maximize, and close buttons on top (titleBarOverlay), which keeps snap layouts.
 */
export function createMainWindowOptions(
  preloadPath: string,
  look: WindowLook = { dark: false, mica: false },
): BrowserWindowConstructorOptions {
  return {
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    show: false,
    title: 'AI Context Bridge',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay(look.dark),
    ...(look.mica
      ? { backgroundMaterial: 'mica' as const, backgroundColor: '#00000000' }
      : { backgroundColor: look.dark ? '#1c1c1e' : '#f5f5f7' }),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  };
}
