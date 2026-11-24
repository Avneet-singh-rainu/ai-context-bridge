import { writeFile } from 'node:fs/promises';
import { release } from 'node:os';
import { join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { type AppInfo, IPC_CHANNELS, type SaveContextResponse } from '../shared/ipc-contract';
import {
  capture,
  closeTab,
  extractPage,
  getState,
  navigate,
  newTab,
  respondToLogin,
  runCommand,
  selectTab,
  setBounds,
} from './browser/browser-view';
import {
  clearNetwork,
  getNetworkState,
  removeNetworkEntry,
  startRecording,
  stopRecording,
} from './browser/network-capture';
import { parseSaveRequest, sanitizeFileName } from './ipc-requests';
import { recognizeImage } from './ocr/ocr-service';
import { supportsMica } from './window-options';

function getAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    mica: supportsMica(process.platform, release()),
  };
}

/** Asks the user where to save, then writes the Markdown there. Main never picks the path alone. */
async function saveContextPackage(
  sender: Electron.WebContents,
  request: unknown,
): Promise<SaveContextResponse> {
  const parsed = parseSaveRequest(request);
  if (!parsed.ok) return { saved: false, error: parsed.error };

  const window = BrowserWindow.fromWebContents(sender);
  const options: Electron.SaveDialogOptions = {
    title: 'Save context package',
    defaultPath: join(app.getPath('documents'), sanitizeFileName(parsed.suggestedName)),
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] },
    ],
  };
  const choice = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options);
  if (choice.canceled || !choice.filePath) return { saved: false };

  try {
    await writeFile(choice.filePath, parsed.markdown, 'utf8');
    return { saved: true, filePath: choice.filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { saved: false, error: `The file could not be written: ${message}` };
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getAppInfo, () => getAppInfo());
  ipcMain.handle(IPC_CHANNELS.recognizeText, (_event, request: unknown) => recognizeImage(request));
  ipcMain.handle(IPC_CHANNELS.saveContextPackage, (event, request: unknown) =>
    saveContextPackage(event.sender, request),
  );
  ipcMain.handle(IPC_CHANNELS.browserNavigate, (_event, input: unknown) => navigate(input));
  ipcMain.handle(IPC_CHANNELS.browserCommand, (_event, command: unknown) => runCommand(command));
  ipcMain.handle(IPC_CHANNELS.browserNewTab, () => newTab());
  ipcMain.handle(IPC_CHANNELS.browserCloseTab, (_event, id: unknown) => closeTab(id));
  ipcMain.handle(IPC_CHANNELS.browserSelectTab, (_event, id: unknown) => selectTab(id));
  ipcMain.handle(IPC_CHANNELS.browserGetState, () => getState());
  ipcMain.on(IPC_CHANNELS.browserLoginResponse, (_event, response: unknown) =>
    respondToLogin(response),
  );
  ipcMain.handle(IPC_CHANNELS.browserCapture, () => capture());
  ipcMain.handle(IPC_CHANNELS.browserExtract, () => extractPage());
  ipcMain.on(IPC_CHANNELS.browserSetBounds, (_event, bounds: unknown) => setBounds(bounds));
  ipcMain.handle(IPC_CHANNELS.networkStart, () => startRecording());
  ipcMain.handle(IPC_CHANNELS.networkStop, () => stopRecording());
  ipcMain.handle(IPC_CHANNELS.networkClear, () => clearNetwork());
  ipcMain.handle(IPC_CHANNELS.networkRemove, (_event, id: unknown) => removeNetworkEntry(id));
  ipcMain.handle(IPC_CHANNELS.networkGetState, () => getNetworkState());
}
