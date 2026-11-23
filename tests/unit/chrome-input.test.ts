import { describe, expect, it } from 'vitest';
import { mapInput, modifierMask } from '../../src/main/browser/chrome-input';

describe('modifierMask', () => {
  it('combines the CDP modifier bits', () => {
    expect(modifierMask({ altKey: true, ctrlKey: true, metaKey: true, shiftKey: true })).toBe(15);
    expect(modifierMask({})).toBe(0);
  });
});

describe('mapInput', () => {
  it('maps a mouse move with buttons and modifiers', () => {
    expect(mapInput({ type: 'mouseMove', x: 12, y: 34, buttons: 1, shiftKey: true })).toEqual({
      method: 'Input.dispatchMouseEvent',
      params: {
        type: 'mouseMoved',
        x: 12,
        y: 34,
        buttons: 1,
        modifiers: 8,
      },
    });
  });

  it('maps a left click press and release', () => {
    expect(mapInput({ type: 'mouseDown', x: 5, y: 6 })).toMatchObject({
      method: 'Input.dispatchMouseEvent',
      params: { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1 },
    });
    expect(mapInput({ type: 'mouseUp', x: 5, y: 6, button: 'right' })).toMatchObject({
      method: 'Input.dispatchMouseEvent',
      params: { type: 'mouseReleased', button: 'right', buttons: 0 },
    });
  });

  it('maps wheel scrolling', () => {
    expect(mapInput({ type: 'wheel', x: 10, y: 20, deltaX: 0, deltaY: 120 })).toMatchObject({
      method: 'Input.dispatchMouseEvent',
      params: { type: 'mouseWheel', deltaX: 0, deltaY: 120, button: 'none' },
    });
  });

  it('maps keys with a Windows virtual key code', () => {
    expect(
      mapInput({ type: 'keyDown', key: 'a', code: 'KeyA', text: 'a', ctrlKey: true }),
    ).toMatchObject({
      method: 'Input.dispatchKeyEvent',
      params: {
        type: 'keyDown',
        key: 'a',
        code: 'KeyA',
        windowsVirtualKeyCode: 65,
        nativeVirtualKeyCode: 65,
        text: 'a',
        modifiers: 2,
      },
    });
    expect(mapInput({ type: 'keyUp', key: 'Enter', code: 'Enter' })).toMatchObject({
      method: 'Input.dispatchKeyEvent',
      params: { type: 'keyUp', windowsVirtualKeyCode: 13 },
    });
  });

  it('maps text insertion separately from key events', () => {
    expect(mapInput({ type: 'text', text: 'hello' })).toEqual({
      method: 'Input.insertText',
      params: { text: 'hello' },
    });
  });

  it('rejects malformed events', () => {
    expect(mapInput(null)).toBeNull();
    expect(mapInput({ type: 'mouseMove', x: -1, y: 2 })).toBeNull();
    expect(mapInput({ type: 'wheel', x: 1, y: 2, deltaX: Number.NaN, deltaY: 1 })).toBeNull();
    expect(mapInput({ type: 'text', text: '' })).toBeNull();
    expect(mapInput({ type: 'unknown' })).toBeNull();
  });
});
