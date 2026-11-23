import { describe, expect, it, vi } from 'vitest';
import { CdpClient, type CdpSocket, createCdpPage } from '../../src/main/browser/chrome-cdp';

class FakeSocket implements CdpSocket {
  readyState: 0 | 1 | 2 | 3 = 0;
  sent: Array<Record<string, unknown>> = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
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

describe('createCdpPage', () => {
  it('creates a target then attaches with a flattened session', async () => {
    const { client, socket } = clientWithSocket();
    socket.open();
    const creating = createCdpPage(client);
    socket.reply({ targetId: 'target-1' });
    await Promise.resolve();
    socket.reply({ sessionId: 'session-9' });
    const page = await creating;

    expect(page.targetId).toBe('target-1');
    expect(page.sessionId).toBe('session-9');
    expect(socket.sent.map((message) => message.method)).toEqual([
      'Target.createTarget',
      'Target.attachToTarget',
    ]);
    expect(socket.sent[1]).toMatchObject({ params: { targetId: 'target-1', flatten: true } });
  });
});
