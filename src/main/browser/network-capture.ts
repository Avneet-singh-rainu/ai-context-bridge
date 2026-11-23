import { IPC_CHANNELS } from '../../shared/ipc-contract';
import {
  isApiResource,
  NETWORK_LIMITS,
  type NetworkState,
  NO_NETWORK,
  responseKind,
} from '../../shared/network';
import { getCdpPage, getPageUrl, sendToApp } from './browser-view';
import type { CdpPage } from './chrome-cdp';
import { addResponse } from './network-store';

/**
 * Records the active Chrome page's API responses through CDP. The Network domain is enabled when
 * the page attaches; recording runs only between Start and Stop, and stops when the page moves to
 * another site. Bodies are read after Network.loadingFinished, the path the spike proved.
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
let activePage: CdpPage | null = null;
let session = 0;
let idCounter = 0;
let pushTimer: NodeJS.Timeout | null = null;
let unsubscribes: Array<() => void> = [];
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
  target: CdpPage,
  requestId: string,
): Promise<{
  body?: string;
  bytes: number;
  note?: string;
}> {
  try {
    const result = await target.send<{ body: string; base64Encoded: boolean }>(
      'Network.getResponseBody',
      { requestId },
    );
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

async function finish(target: CdpPage, requestId: string, encodedBytes: number, run: number) {
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
  if (run !== session || !state.recording || activePage !== target) return;

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
      pageUrl: getPageUrl(),
      at: new Date().toISOString(),
    },
    nextId,
  );
  push();
}

function onMessage(method: string, params: Record<string, unknown>): void {
  const target = activePage;
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
  } else if (method === 'Page.frameNavigated') {
    const frame = params.frame as { url?: string; parentId?: string } | undefined;
    if (frame && !frame.parentId && originOf(frame.url ?? '') !== state.origin) {
      endSession({ kind: 'info', text: 'Recording stopped: the page moved to another site.' });
    }
  }
}

function endSession(notice?: NetworkState['notice']): void {
  session += 1;
  for (const off of unsubscribes) off();
  unsubscribes = [];
  activePage = null;
  requests.clear();
  responses.clear();
  state = { ...state, recording: false, ...(notice ? { notice } : { notice: undefined }) };
  push(true);
}

export async function startRecording(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (state.recording) return { ok: true };
  const target = getCdpPage();
  if (!target) return { ok: false, error: 'Open a page first.' };
  const origin = originOf(getPageUrl());
  if (!origin) return { ok: false, error: 'Only http and https pages can be recorded.' };

  session += 1;
  activePage = target;
  for (const method of [
    'Network.requestWillBeSent',
    'Network.responseReceived',
    'Network.loadingFinished',
    'Network.loadingFailed',
    'Page.frameNavigated',
  ]) {
    unsubscribes.push(target.on(method, (params) => onMessage(method, params)));
  }
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

export function stopRecording(): void {
  if (state.recording) endSession();
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
