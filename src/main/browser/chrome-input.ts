// Maps renderer input events to Chrome DevTools Protocol commands. No Electron or DOM APIs here,
// so the mapping can be unit tested in Node. Coordinates are in CSS pixels of the page viewport.

import type { BrowserInput, BrowserInputModifiers } from '../../shared/ipc-contract';
import type { CdpPage } from './chrome-cdp';

type Params = Record<string, unknown>;

type ModifierFlags = BrowserInputModifiers;

export interface CdpCommand {
  method: string;
  params: Params;
}

const MAX_COORDINATE = 32_767;
const MAX_TEXT_LENGTH = 4_096;

/** CDP modifier bits: Alt 1, Control 2, Meta 4, Shift 8. */
export function modifierMask(input: ModifierFlags): number {
  return (
    (input.altKey ? 1 : 0) |
    (input.ctrlKey ? 2 : 0) |
    (input.metaKey ? 4 : 0) |
    (input.shiftKey ? 8 : 0)
  );
}

const VIRTUAL_KEYS: Record<string, number> = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  Shift: 16,
  Control: 17,
  Alt: 18,
  Pause: 19,
  CapsLock: 20,
  Escape: 27,
  Space: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Insert: 45,
  Delete: 46,
  Meta: 91,
  ContextMenu: 93,
  NumpadEnter: 13,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
};

function virtualKey(input: Extract<BrowserInput, { type: 'keyDown' | 'keyUp' }>): number {
  const named = VIRTUAL_KEYS[input.code ?? ''] ?? VIRTUAL_KEYS[input.key];
  if (named) return named;
  if (/^[a-z]$/i.test(input.key)) return input.key.toUpperCase().charCodeAt(0);
  if (/^[0-9]$/.test(input.key)) return input.key.charCodeAt(0);
  return 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validPoint(x: unknown, y: unknown): boolean {
  return finite(x) && finite(y) && x >= 0 && y >= 0 && x <= MAX_COORDINATE && y <= MAX_COORDINATE;
}

function buttonName(value: unknown): string {
  return value === 'middle' || value === 'right' ? value : 'left';
}

/** Maps one renderer event to a CDP command, or null when the event is malformed. */
export function mapInput(input: unknown): CdpCommand | null {
  if (typeof input !== 'object' || input === null) return null;
  const event = input as BrowserInput;

  if (event.type === 'mouseMove') {
    if (!validPoint(event.x, event.y)) return null;
    return {
      method: 'Input.dispatchMouseEvent',
      params: {
        type: 'mouseMoved',
        x: event.x,
        y: event.y,
        modifiers: modifierMask(event),
        buttons: finite(event.buttons) ? event.buttons : 0,
      },
    };
  }

  if (event.type === 'mouseDown' || event.type === 'mouseUp') {
    if (!validPoint(event.x, event.y)) return null;
    const clickCount = finite(event.clickCount)
      ? Math.min(3, Math.max(1, Math.round(event.clickCount)))
      : 1;
    return {
      method: 'Input.dispatchMouseEvent',
      params: {
        type: event.type === 'mouseDown' ? 'mousePressed' : 'mouseReleased',
        x: event.x,
        y: event.y,
        button: buttonName(event.button),
        buttons: event.type === 'mouseDown' ? (buttonName(event.button) === 'right' ? 2 : 1) : 0,
        clickCount,
        modifiers: modifierMask(event),
      },
    };
  }

  if (event.type === 'wheel') {
    if (!validPoint(event.x, event.y) || !finite(event.deltaX) || !finite(event.deltaY))
      return null;
    return {
      method: 'Input.dispatchMouseEvent',
      params: {
        type: 'mouseWheel',
        x: event.x,
        y: event.y,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        button: 'none',
        buttons: 0,
        modifiers: modifierMask(event),
      },
    };
  }

  if (event.type === 'keyDown' || event.type === 'keyUp') {
    if (typeof event.key !== 'string' || event.key.length > MAX_TEXT_LENGTH) return null;
    const keyCode = virtualKey(event);
    return {
      method: 'Input.dispatchKeyEvent',
      params: {
        type: event.type,
        key: event.key,
        code: typeof event.code === 'string' ? event.code : event.key,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
        modifiers: modifierMask(event),
        ...(event.type === 'keyDown' && event.text ? { text: event.text } : {}),
      },
    };
  }

  if (event.type === 'text') {
    if (
      typeof event.text !== 'string' ||
      event.text.length === 0 ||
      event.text.length > MAX_TEXT_LENGTH
    ) {
      return null;
    }
    return { method: 'Input.insertText', params: { text: event.text } };
  }

  return null;
}

/** Validates renderer input and sends the mapped CDP command to the active page. */
export async function dispatchInput(page: CdpPage, input: unknown): Promise<void> {
  const command = mapInput(input);
  if (!command) return;
  await page.send(command.method, command.params);
}
