import type { WebContents } from 'electron';

/**
 * Runtime access points shared by browser view code and network capture. Keeping these in one
 * small module avoids an import cycle between `browser-view` and `network-capture`.
 */
type PageProvider = () => WebContents | null;
type Sender = (channel: string, payload: unknown) => void;

let pageProvider: PageProvider = () => null;
let sender: Sender = () => undefined;

export function bindBrowserRuntime(nextPageProvider: PageProvider, nextSender: Sender): void {
  pageProvider = nextPageProvider;
  sender = nextSender;
}

export function getActivePage(): WebContents | null {
  return pageProvider();
}

export function sendToApp(channel: string, payload: unknown): void {
  sender(channel, payload);
}
