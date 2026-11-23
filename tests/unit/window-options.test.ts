import { describe, expect, it } from 'vitest';
import { createMainWindowOptions, supportsMica } from '../../src/main/window-options';

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

  it('hides the title bar but keeps the Windows caption buttons as an overlay', () => {
    expect(options.titleBarStyle).toBe('hidden');
    expect(options.titleBarOverlay).toEqual({
      color: '#00000000',
      symbolColor: '#1d1d1f',
      height: 52,
    });
    const dark = createMainWindowOptions('x', { dark: true, mica: false });
    expect(dark.titleBarOverlay).toMatchObject({ symbolColor: '#f5f5f7' });
  });

  it('uses Mica only where Windows supports it, with an opaque colour otherwise', () => {
    expect(createMainWindowOptions('x', { dark: false, mica: true })).toMatchObject({
      backgroundMaterial: 'mica',
      backgroundColor: '#00000000',
    });
    expect(options.backgroundMaterial).toBeUndefined();
    expect(options.backgroundColor).toBe('#f5f5f7');
  });
});

describe('supportsMica', () => {
  it('needs Windows 11 22H2 (build 22621) or later', () => {
    expect(supportsMica('win32', '10.0.26100')).toBe(true);
    expect(supportsMica('win32', '10.0.22621')).toBe(true);
    expect(supportsMica('win32', '10.0.22000')).toBe(false);
    expect(supportsMica('win32', '10.0.19045')).toBe(false);
    expect(supportsMica('darwin', '24.0.0')).toBe(false);
  });
});
