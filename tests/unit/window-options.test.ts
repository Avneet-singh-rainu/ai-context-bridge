import { describe, expect, it } from 'vitest';
import { createMainWindowOptions } from '../../src/main/window-options';

describe('createMainWindowOptions', () => {
  const options = createMainWindowOptions('C:/app/out/preload/index.js');

  it('keeps the renderer isolated from Node', () => {
    expect(options.webPreferences).toMatchObject({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
    });
  });

  it('loads the given preload script', () => {
    expect(options.webPreferences?.preload).toBe('C:/app/out/preload/index.js');
  });

  it('waits for ready-to-show before showing the window', () => {
    expect(options.show).toBe(false);
  });
});
