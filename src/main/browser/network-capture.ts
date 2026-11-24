import type { WebContents } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-contract';
import {
  isApiResource,
  NETWORK_LIMITS,
  type NetworkState,
  NO_NETWORK,
  responseKind,
} from '../../shared/network';
import { getActivePage, sendToApp } from './browser-runtime';
import { addResponse } from './network-store';

/**
 * Records the active page's API responses through the Chrome DevTools Protocol, the path the
 * spike proved (docs/_systems/browser-capture.md). Recording runs only between Start and Stop,
 * and stops by itself when the page moves to another site or the debugger is detached.
 */

interface RequestInfo {
  method: string;
  url: string;
  type?: string;
}

interface ResponseInfo {
  url: string;
  status: number;
  mimeType: string;
  type?: string;
}

let state: NetworkState = NO_NETWORK;
let contents: WebContents | null = null;
let session = 0;
let idCounter = 0;
let pushTimer: NodeJS.Timeout | null = null;
const requests = new Map<string, RequestInfo>();
const responses = new Map<string, ResponseInfo>();

const nextId = () => `net-${++idCounter}`;

function push(now = false): void {
  if (pushTimer) clearTimeout(pushTimer);
  const send = () => {
    pushTimer = null;
    sendToApp(IPC_CHANNELS.networkState, state);
  };
  if (now) send();
  else pushTimer = setTimeout(send, 300);
}

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

async function readBody(
  target: WebContents,
  requestId: string,
): Promise<{ body?: string; bytes: number; note?: string }> {
  try {
    const result = (await target.debugger.sendCommand('Network.getResponseBody', {
      requestId,
    })) as {
      body: string;
      base64Encoded: boolean;
    };
    const body = result.base64Encoded
      ? Buffer.from(result.body, 'base64').toString('utf8')
      : result.body;
    const bytes = Buffer.byteLength(body);
    if (bytes > NETWORK_LIMITS.maxBodyBytes) {
      return { bytes, note: 'The body is larger than 1 MB, so only its details were kept.' };
    }
    return { body, bytes };
  } catch {
    return { bytes: 0, note: 'The body was not available (streamed, cached, or too large).' };
  }
}

async function finish(target: WebContents, requestId: string, encodedBytes: number, run: number) {
  const request = requests.get(requestId);
  const response = responses.get(requestId);
  requests.delete(requestId);
  responses.delete(requestId);
  if (!response) return;
  const type = response.type ?? request?.type;
  if (!isApiResource(type) || !responseKind(response.mimeType) || !originOf(response.url)) {
    state = { ...state, ignored: state.ignored + 1 };
    push();
    return;
  }

  const read =
    encodedBytes > NETWORK_LIMITS.maxBodyBytes
      ? {
          bytes: encodedBytes,
          note: 'The body is larger than 1 MB, so only its details were kept.',
        }
      : await readBody(target, requestId);
  // Stop or a new session may have happened while the body was read.
  if (run !== session || !state.recording) return;

  state = addResponse(
    state,
    {
      method: request?.method ?? 'GET',
      url: response.url,
      status: response.status,
      mimeType: response.mimeType,
      body: read.body,
      bodyBytes: read.bytes,
      note: read.note,
      pageUrl: target.getURL(),
      at: new Date().toISOString(),
    },
    nextId,
  );
  push();
}

function onMessage(_event: Electron.Event, method: string, params: Record<string, unknown>) {
  const target = contents;
  if (!target || !state.recording) return;
  const requestId = String(params.requestId ?? '');
  if (method === 'Network.requestWillBeSent') {
    const request = params.request as { method: string; url: string };
    requests.set(requestId, {
      method: request.method,
      url: request.url,
      type: params.type as string | undefined,
    });
  } else if (method === 'Network.responseReceived') {
    const response = params.response as { url: string; status: number; mimeType: string };
    responses.set(requestId, {
      url: response.url,
      status: response.status,
      mimeType: response.mimeType,
      type: params.type as string | undefined,
    });
  } else if (method === 'Network.loadingFinished') {
    void finish(target, requestId, Number(params.encodedDataLength ?? 0), session);
  } else if (method === 'Network.loadingFailed') {
    requests.delete(requestId);
    responses.delete(requestId);
    if (isApiResource(params.type as string | undefined)) {
      state = { ...state, failed: state.failed + 1 };
      push();
    }
  }
}

function onDetach(_event: Electron.Event, reason: string) {
  if (!state.recording) return;
  endSession({ kind: 'error', text: `Recording stopped: the debugger was detached (${reason}).` });
}

/** A new site is a new active page, so recording stops there. */
function onNavigate(_event: Electron.Event, url: string) {
  if (state.recording && originOf(url) !== state.origin) {
    endSession({ kind: 'info', text: 'Recording stopped: the page moved to another site.' });
  }
}

function endSession(notice?: NetworkState['notice']): void {
  session += 1;
  const target = contents;
  contents = null;
  requests.clear();
  responses.clear();
  if (target && !target.isDestroyed()) {
    target.debugger.off('message', onMessage);
    target.debugger.off('detach', onDetach);
    target.off('did-navigate', onNavigate);
    if (target.debugger.isAttached()) {
      try {
        target.debugger.detach();
      } catch {
        // Already detached.
      }
    }
  }
  state = { ...state, recording: false, ...(notice ? { notice } : { notice: undefined }) };
  push(true);
}

export async function startRecording(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (state.recording) return { ok: true };
  const target = getActivePage();
  if (!target) return { ok: false, error: 'Open a page first.' };
  const origin = originOf(target.getURL());
  if (!origin) return { ok: false, error: 'Only http and https pages can be recorded.' };

  try {
    target.debugger.attach('1.3');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Recording could not start: ${message}` };
  }
  session += 1;
  contents = target;
  target.debugger.on('message', onMessage);
  target.debugger.on('detach', onDetach);
  target.on('did-navigate', onNavigate);
  // Network.enable may not resolve until the page does something; wait at most one second.
  // The buffer limits keep Chromium from holding huge bodies for us.
  await Promise.race([
    target.debugger
      .sendCommand('Network.enable', {
        maxResourceBufferSize: NETWORK_LIMITS.maxBodyBytes + 65_536,
        maxTotalBufferSize: 32 * 1024 * 1024,
      })
      .catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
  state = {
    ...state,
    recording: true,
    startedAt: new Date().toISOString(),
    origin,
    notice: {
      kind: 'info',
      text: 'Recording network. Reload the page to include requests made while it loads.',
    },
  };
  push(true);
  return { ok: true };
}

export function stopRecording(notice?: NetworkState['notice']): void {
  if (state.recording) endSession(notice);
}

/** Removes every kept response and resets the counters; recording, if on, continues. */
export function clearNetwork(): void {
  state = {
    ...NO_NETWORK,
    recording: state.recording,
    startedAt: state.startedAt,
    origin: state.origin,
  };
  push(true);
}

export function removeNetworkEntry(id: unknown): void {
  if (typeof id !== 'string') return;
  state = { ...state, entries: state.entries.filter((entry) => entry.id !== id) };
  push(true);
}

export function getNetworkState(): NetworkState {
  return state;
}
