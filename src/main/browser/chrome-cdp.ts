// Minimal Chrome DevTools Protocol client. Node 22 has a global WebSocket, so no extra
// dependency is needed. The socket type is abstract so tests can drive it without Chrome.

type Params = Record<string, unknown>;

type SocketState = 0 | 1 | 2 | 3;

/** The small part of WebSocket that the CDP client uses. */
export interface CdpSocket {
  readonly readyState: SocketState;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((error: unknown) => void) | null;
}

type SocketFactory = (url: string) => CdpSocket;

interface CdpResponse {
  id?: number;
  method?: string;
  params?: Params;
  result?: Params;
  error?: { message: string; code?: number };
  sessionId?: string;
}

type EventHandler = (params: Params, sessionId?: string) => void;

const CONNECT_TIMEOUT_MS = 10_000;

function defaultSocketFactory(url: string): CdpSocket {
  // The global WebSocket from Node 22 satisfies CdpSocket at runtime.
  return new WebSocket(url) as unknown as CdpSocket;
}

/** Owns the browser WebSocket, matches command replies and fans out CDP events. */
export class CdpClient {
  private readonly socket: CdpSocket;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: Params) => void;
      reject: (error: Error) => void;
      timer?: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly listeners = new Map<string, Set<EventHandler>>();
  private nextId = 0;
  private closed = false;

  constructor(url: string, socketFactory: SocketFactory = defaultSocketFactory) {
    this.socket = socketFactory(url);
    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    this.socket.onclose = () => {
      this.rejectPending('The Chrome debugging connection closed.');
    };
    this.socket.onerror = () => {
      this.rejectPending('The Chrome debugging connection failed.');
    };
  }

  /** Waits until the WebSocket is open. CDP commands sent before open are not allowed. */
  connect(): Promise<void> {
    if (this.socket.readyState === 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Chrome did not accept the debugging connection in time.'));
      }, CONNECT_TIMEOUT_MS);
      const done = (error?: Error) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      this.socket.onopen = () => done();
      this.socket.onerror = () => done(new Error('The Chrome debugging connection failed.'));
    });
  }

  /** Sends one CDP command and resolves with the command result. */
  send<T extends Params = Params>(
    method: string,
    params: Params = {},
    sessionId?: string,
    timeoutMs?: number,
  ): Promise<T> {
    if (this.closed) return Promise.reject(new Error('The Chrome debugging connection is closed.'));
    const id = ++this.nextId;
    const message: Params = { id, method, params };
    if (sessionId) message.sessionId = sessionId;

    return new Promise<T>((resolve, reject) => {
      const timer =
        timeoutMs && timeoutMs > 0
          ? setTimeout(() => {
              this.pending.delete(id);
              reject(new Error(`${method} did not reply in time.`));
            }, timeoutMs)
          : undefined;
      this.pending.set(id, {
        resolve: (value) => {
          if (timer) clearTimeout(timer);
          resolve(value as T);
        },
        reject: (error) => {
          if (timer) clearTimeout(timer);
          reject(error);
        },
        timer,
      });
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /** Subscribes to a CDP event. Returns a function that removes the handler. */
  on(method: string, handler: EventHandler): () => void {
    const set = this.listeners.get(method) ?? new Set<EventHandler>();
    set.add(handler);
    this.listeners.set(method, set);
    return () => {
      set.delete(handler);
      if (set.size === 0) this.listeners.delete(method);
    };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.rejectPending('The Chrome debugging connection is closed.');
    this.listeners.clear();
    this.socket.close();
  }

  private rejectPending(message: string): void {
    for (const entry of this.pending.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error(message));
    }
    this.pending.clear();
  }

  private handleMessage(data: string): void {
    let message: CdpResponse;
    try {
      message = JSON.parse(data) as CdpResponse;
    } catch {
      return;
    }
    if (typeof message.id === 'number') {
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result ?? {});
      return;
    }
    if (message.method) {
      const set = this.listeners.get(message.method);
      if (!set) return;
      for (const handler of [...set]) handler(message.params ?? {}, message.sessionId);
    }
  }
}

/** The attached page target. All page commands and events carry the flattened session id. */
export class CdpPage {
  private readonly cleanups: Array<() => void> = [];

  constructor(
    private readonly client: CdpClient,
    readonly sessionId: string,
    readonly targetId: string,
  ) {}

  send<T extends Params = Params>(method: string, params: Params = {}): Promise<T> {
    return this.client.send<T>(method, params, this.sessionId);
  }

  /** Subscribes to a page event and ties the handler to this page. Returns an unsubscribe. */
  on(method: string, handler: (params: Params) => void): () => void {
    const off = this.client.on(method, (params, sessionId) => {
      if (sessionId === this.sessionId) handler(params);
    });
    this.cleanups.push(off);
    return () => {
      off();
      const index = this.cleanups.indexOf(off);
      if (index >= 0) this.cleanups.splice(index, 1);
    };
  }

  /** Enables the domains used for navigation, extraction, frames and network capture. */
  async enableDomains(): Promise<void> {
    await Promise.all([
      this.send('Page.enable'),
      this.send('Runtime.enable'),
      this.send('Network.enable', {
        maxResourceBufferSize: 1_100_000,
        maxTotalBufferSize: 32 * 1024 * 1024,
      }),
    ]);
  }

  navigate(url: string): Promise<Params> {
    return this.send('Page.navigate', { url });
  }

  reload(ignoreCache = false): Promise<Params> {
    return this.send('Page.reload', { ignoreCache });
  }

  stopLoading(): Promise<Params> {
    return this.send('Page.stopLoading');
  }

  async history(): Promise<{
    currentIndex: number;
    entries: Array<{ id: number; url: string; title?: string }>;
  }> {
    const result = await this.send<{
      currentIndex: number;
      entries: Array<{ id: number; url: string; title?: string }>;
    }>('Page.getNavigationHistory');
    return result;
  }

  async goBack(): Promise<boolean> {
    const { currentIndex, entries } = await this.history();
    if (currentIndex <= 0) return false;
    await this.send('Page.navigateToHistoryEntry', { entryId: entries[currentIndex - 1].id });
    return true;
  }

  async goForward(): Promise<boolean> {
    const { currentIndex, entries } = await this.history();
    if (currentIndex >= entries.length - 1) return false;
    await this.send('Page.navigateToHistoryEntry', { entryId: entries[currentIndex + 1].id });
    return true;
  }

  setViewport(width: number, height: number, deviceScaleFactor = 1): Promise<Params> {
    return this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: false,
    });
  }

  async screenshot(
    format: 'jpeg' | 'png' = 'jpeg',
    quality = 72,
    timeoutMs?: number,
  ): Promise<string> {
    const result = await this.client.send<{ data: string }>(
      'Page.captureScreenshot',
      {
        format,
        quality: format === 'jpeg' ? quality : undefined,
        captureBeyondViewport: false,
        fromSurface: true,
      },
      this.sessionId,
      timeoutMs,
    );
    return result.data;
  }

  /** Runs the extraction script in an isolated world, keeping page scripts out of the result. */
  async evaluateIsolated(worldId: number, expression: string): Promise<unknown> {
    const { executionContextId } = await this.send<{ executionContextId: number }>(
      'Page.createIsolatedWorld',
      {
        frameId: await this.mainFrameId(),
        worldName: `context-bridge-${worldId}`,
        grantUniversalAccess: false,
      },
    );
    const result = await this.send<{
      result: { value?: unknown };
      exceptionDetails?: { text: string };
    }>('Runtime.evaluate', {
      expression,
      contextId: executionContextId,
      returnByValue: true,
      awaitPromise: true,
      userGesture: false,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  private async mainFrameId(): Promise<string> {
    const { frameTree } = await this.send<{ frameTree: { frame: { id: string } } }>(
      'DOM.getFrameTree',
    );
    return frameTree.frame.id;
  }

  detach(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.length = 0;
  }

  close(): Promise<Params> {
    this.detach();
    return this.client.send('Target.closeTarget', { targetId: this.targetId });
  }
}

/** Attaches to Chrome's startup blank page, or creates one, and returns a flattened-session wrapper. */
export async function createCdpPage(client: CdpClient): Promise<CdpPage> {
  const { targetInfos } = await client.send<{
    targetInfos: Array<{ targetId: string; type: string; url: string }>;
  }>('Target.getTargets');
  const startupPage = targetInfos.find(
    (target) => target.type === 'page' && target.url === 'about:blank',
  );
  const targetId =
    startupPage?.targetId ??
    (
      await client.send<{ targetId: string }>('Target.createTarget', {
        url: 'about:blank',
      })
    ).targetId;
  const { sessionId } = await client.send<{ sessionId: string }>('Target.attachToTarget', {
    targetId,
    flatten: true,
  });

  // Headless Chrome reports "HeadlessChrome" in its user agent. Sites use that token to flag
  // automation, so report the same Chrome without the token before the first navigation.
  const { result } = await client.send<{ result: { value?: string } }>(
    'Runtime.evaluate',
    { expression: 'navigator.userAgent', returnByValue: true },
    sessionId,
  );
  const userAgent = result.value ?? '';
  if (userAgent.includes('Headless')) {
    await client.send(
      'Network.setUserAgentOverride',
      { userAgent: userAgent.replace('Headless', '') },
      sessionId,
    );
  }

  return new CdpPage(client, sessionId, targetId);
}
