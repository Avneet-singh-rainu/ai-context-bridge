import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { attachBrowser } from './browser/browser-view';
import { registerIpcHandlers } from './ipc';
import { stopTesseract } from './ocr/tesseract-ocr';
import { createMainWindowOptions } from './window-options';

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow(
    createMainWindowOptions(join(__dirname, '../preload/index.js')),
  );

  mainWindow.once('ready-to-show', () => mainWindow.show());

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
