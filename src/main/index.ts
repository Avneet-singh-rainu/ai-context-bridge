import { release } from 'node:os';
import { join } from 'node:path';
import { app, BrowserWindow, nativeTheme } from 'electron';
import { attachBrowser } from './browser/browser-view';
import { registerIpcHandlers } from './ipc';
import { stopTesseract } from './ocr/tesseract-ocr';
import { createMainWindowOptions, supportsMica, titleBarOverlay } from './window-options';

/** Mica shows through the sidebar only on Windows 11 22H2 or later. */
const micaSupported = supportsMica(process.platform, release());

// Same id as `appId` in electron-builder.yml, so the taskbar groups the running app with its
// pinned and Start menu shortcuts.
if (process.platform === 'win32') app.setAppUserModelId('com.aicontextbridge.app');

function createMainWindow(): BrowserWindow {
  // The packaged exe carries the icon itself; in development, Electron's exe would show its own.
  const devIcon = app.isPackaged ? {} : { icon: join(app.getAppPath(), 'resources', 'icon.ico') };
  const mainWindow = new BrowserWindow({
    ...createMainWindowOptions(join(__dirname, '../preload/index.js'), {
      dark: nativeTheme.shouldUseDarkColors,
      mica: micaSupported,
    }),
    ...devIcon,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // The caption buttons are drawn by Windows; keep their colour in step with light and dark mode.
  const followTheme = () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.setTitleBarOverlay(titleBarOverlay(nativeTheme.shouldUseDarkColors));
    }
  };
  nativeTheme.on('updated', followTheme);
  mainWindow.on('closed', () => nativeTheme.off('updated', followTheme));

  // The app UI never opens extra windows and never leaves its own page.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => {
    if (event.url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  // Web pages live in a separate view on top of the app page; see browser/browser-view.ts.
  attachBrowser(mainWindow);

  // electron-vite sets ELECTRON_RENDERER_URL while `npm run dev` runs its dev server.
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

void app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  void stopTesseract();
});
