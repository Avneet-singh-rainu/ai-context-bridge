import type { WebContents } from 'electron';

export interface BrowserShortcutActions {
  newTab(): void;
  closeTab(): void;
  nextTab(): void;
  previousTab(): void;
  selectTab(index: number): void;
  reload(): void;
  back(): void;
  forward(): void;
  focusAddress(): void;
  inspect(): void;
}

/**
 * Handles browser keys before the app UI or the web page sees them. Main attaches the same
 * handler to the app window and to every native page view, so shortcuts work whichever one
 * has focus.
 */
export function attachBrowserShortcuts(
  contents: WebContents,
  actions: BrowserShortcutActions,
): void {
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const modifier = input.control || input.meta;
    const key = input.key.toLowerCase();
    let handled = true;

    if (modifier && key === 't' && !input.shift) actions.newTab();
    else if (modifier && key === 'w') actions.closeTab();
    else if (modifier && input.key === 'Tab') {
      if (input.shift) actions.previousTab();
      else actions.nextTab();
    } else if (modifier && !input.alt && /^[1-9]$/.test(input.key)) {
      actions.selectTab(Number(input.key) - 1);
    } else if (modifier && key === 'r') actions.reload();
    else if (input.key === 'F5') actions.reload();
    else if (input.alt && !modifier && input.key === 'ArrowLeft') actions.back();
    else if (input.alt && !modifier && input.key === 'ArrowRight') actions.forward();
    else if (modifier && key === 'l') actions.focusAddress();
    else if (input.key === 'F12' || (modifier && input.shift && key === 'i')) actions.inspect();
    else handled = false;

    if (handled) event.preventDefault();
  });
}
