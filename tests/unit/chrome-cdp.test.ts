import { describe, expect, it, vi } from 'vitest';
import { CdpClient, type CdpSocket, createCdpPage } from '../../src/main/browser/chrome-cdp';

class FakeSocket implements CdpSocket {
  readyState: 0 | 1 | 2 | 3 = 0;
  sent: Array<Record<string, unknown>> = [];
  autoReplies = new Map<string, Record<string, unknown>>();
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  send(data: string): void {
    const message = JSON.parse(data) as Record<string, unknown>;
    this.sent.push(message);
    const reply = this.autoReplies.get(String(message.method));
    if (reply) queueMicrotask(() => this.emit({ id: message.id, result: reply }));
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  emit(message: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  /** Replies to the last command sent, preserving that command's id. */
  reply(result: Record<string, unknown>): void {
    const last = this.sent[this.sent.length - 1];
    this.emit({ id: last.id, result });
  }
}

function clientWithSocket() {
  const socket = new FakeSocket();
  const client = new CdpClient('ws://127.0.0.1:1234/devtools/browser/test', () => socket);
  return { client, socket };
}

describe('CdpClient', () => {
  it('resolves connect when the socket opens', async () => {
    const { client, socket } = clientWithSocket();
    const connecting = client.connect();
    socket.open();
    await expect(connecting).resolves.toBeUndefined();
  });

  it('matches a command reply by id and carries the session id', async () => {
    const { client, socket } = clientWithSocket();
    socket.open();
    const request = client.send('Runtime.evaluate', { expression: '1+1' }, 'session-1');
    socket.reply({ result: { value: 2 } });

    await expect(request).resolves.toEqual({ result: { value: 2 } });
    expect(socket.sent[0]).toMatchObject({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: '1+1' },
      sessionId: 'session-1',
    });
  });

  it('rejects a command when CDP reports an error', async () => {
    const { client, socket } = clientWithSocket();
    socket.open();
    const request = client.send('Page.navigate', { url: 'https://example.com' });
    socket.emit({ id: 1, error: { message: 'Cannot navigate' } });

    await expect(request).rejects.toThrow('Cannot navigate');
  });

  it('rejects a command with no reply after its timeout and clears the pending entry', async () => {
    const { client, socket } = clientWithSocket();
    socket.open();

    await expect(client.send('Page.captureScreenshot', {}, undefined, 20)).rejects.toThrow(
      'did not reply in time',
    );

    socket.autoReplies.set('Runtime.evaluate', { value: 1 });
    await expect(client.send('Runtime.evaluate', { expression: '1' })).resolves.toEqual({
      value: 1,
    });
    expect(socket.sent.map((message) => message.id)).toEqual([1, 2]);
  });

  it('fans out only events with a subscribed method name', () => {
    const { client, socket } = clientWithSocket();
    const handler = vi.fn();
    const other = vi.fn();
    client.on('Page.loadEventFired', handler);
    client.on('Network.responseReceived', other);

    socket.emit({ method: 'Page.loadEventFired', params: { timestamp: 1 }, sessionId: 's1' });
    socket.emit({ method: 'Page.frameNavigated', params: {} });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ timestamp: 1 }, 's1');
    expect(other).not.toHaveBeenCalled();
  });

  it('rejects pending commands and closes the socket on close', async () => {
    const { client, socket } = clientWithSocket();
    socket.open();
    const request = client.send('Page.enable');
    client.close();

    await expect(request).rejects.toThrow('closed');
    expect(socket.readyState).toBe(3);
    await expect(client.send('Page.enable')).rejects.toThrow('closed');
  });
});

const PLAIN_UA = 'Mozilla/5.0 Chrome/157.0.0.0 Safari/537.36';

function preparePageReplies(
  socket: FakeSocket,
  targetInfos: Array<{ targetId: string; type: string; url: string }>,
  sessionId: string,
  userAgent = PLAIN_UA,
): void {
  socket.autoReplies.set('Target.getTargets', { targetInfos });
  socket.autoReplies.set('Target.createTarget', { targetId: 'created-target' });
  socket.autoReplies.set('Target.attachToTarget', { sessionId });
  socket.autoReplies.set('Runtime.evaluate', { result: { value: userAgent } });
  socket.autoReplies.set('Network.setUserAgentOverride', {});
}

describe('createCdpPage', () => {
  it('reuses Chrome startup blank page instead of creating a second target', async () => {
    const { client, socket } = clientWithSocket();
    preparePageReplies(
      socket,
      [{ targetId: 'startup-1', type: 'page', url: 'about:blank' }],
      'session-9',
    );
    socket.open();
    const page = await createCdpPage(client);

    expect(page.targetId).toBe('startup-1');
    expect(page.sessionId).toBe('session-9');
    expect(socket.sent.map((message) => message.method)).toEqual([
      'Target.getTargets',
      'Target.attachToTarget',
      'Runtime.evaluate',
    ]);
    expect(socket.sent[1]).toMatchObject({ params: { targetId: 'startup-1', flatten: true } });
  });

  it('creates a target when no blank page exists', async () => {
    const { client, socket } = clientWithSocket();
    preparePageReplies(socket, [], 'session-10');
    socket.open();
    const page = await createCdpPage(client);

    expect(page.targetId).toBe('created-target');
    expect(socket.sent.map((message) => message.method)).toEqual([
      'Target.getTargets',
      'Target.createTarget',
      'Target.attachToTarget',
      'Runtime.evaluate',
    ]);
    expect(socket.sent[2]).toMatchObject({ params: { targetId: 'created-target', flatten: true } });
  });

  it('ignores non-page and non-blank targets when looking for the startup page', async () => {
    const { client, socket } = clientWithSocket();
    preparePageReplies(
      socket,
      [
        { targetId: 'worker-1', type: 'service_worker', url: 'about:blank' },
        { targetId: 'web-1', type: 'page', url: 'https://example.com' },
      ],
      'session-11',
    );
    socket.open();
    const page = await createCdpPage(client);

    expect(page.targetId).toBe('created-target');
    expect(socket.sent.map((message) => message.method)).toEqual([
      'Target.getTargets',
      'Target.createTarget',
      'Target.attachToTarget',
      'Runtime.evaluate',
    ]);
  });

  it('overrides the user agent to remove the headless token', async () => {
    const { client, socket } = clientWithSocket();
    preparePageReplies(
      socket,
      [{ targetId: 'startup-2', type: 'page', url: 'about:blank' }],
      'session-12',
      'Mozilla/5.0 HeadlessChrome/157.0.0.0 Safari/537.36',
    );
    socket.open();
    await createCdpPage(client);

    expect(socket.sent.map((message) => message.method)).toEqual([
      'Target.getTargets',
      'Target.attachToTarget',
      'Runtime.evaluate',
      'Network.setUserAgentOverride',
    ]);
    expect(socket.sent[3]).toMatchObject({
      params: { userAgent: 'Mozilla/5.0 Chrome/157.0.0.0 Safari/537.36' },
      sessionId: 'session-12',
    });
  });

  it('uses Page.getFrameTree when it creates an isolated world', async () => {
    const { client, socket } = clientWithSocket();
    preparePageReplies(
      socket,
      [{ targetId: 'startup-3', type: 'page', url: 'about:blank' }],
      'session-13',
    );
    socket.autoReplies.set('Page.getFrameTree', {
      frameTree: { frame: { id: 'frame-13' } },
    });
    socket.autoReplies.set('Page.createIsolatedWorld', { executionContextId: 42 });
    socket.open();
    const page = await createCdpPage(client);
    socket.autoReplies.set('Runtime.evaluate', { result: { value: 'Example Domain' } });

    await expect(page.evaluateIsolated(7, 'document.title')).resolves.toBe('Example Domain');
    expect(socket.sent.map((message) => message.method)).toContain('Page.getFrameTree');
    expect(
      socket.sent.find((message) => message.method === 'Page.createIsolatedWorld'),
    ).toMatchObject({
      params: { frameId: 'frame-13', worldName: 'context-bridge-7' },
      sessionId: 'session-13',
    });
  });
});
