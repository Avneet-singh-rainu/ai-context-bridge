import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDot,
  CircleExclamationPoint,
  CircleStop,
  Compass,
  House,
  Info,
  LoaderCircle,
  Lock,
  RotateCw,
  ScanText,
  Search,
  TriangleExclamationPoint,
  X,
} from 'lucide-react';
import {
  type FormEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { PageSecurity } from '../../../../shared/address';
import { useNetwork } from '../capture/NetworkProvider';
import { type CaptureStatus, describeCapture, useBrowser } from './BrowserProvider';

const SECURITY: Record<PageSecurity, { label: string; Icon: typeof Lock }> = {
  secure: { label: 'Secure', Icon: Lock },
  local: { label: 'Local', Icon: House },
  'not-secure': { label: 'Not secure', Icon: TriangleExclamationPoint },
};

const SUGGESTIONS = ['example.com', 'wikipedia.org', 'developer.mozilla.org'];

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Keeps the CDP page viewport sized to the browser box while this workspace is shown. */
function useBrowserViewBounds(viewport: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const element = viewport.current;
    const api = window.bridge;
    if (!element || !api) return;
    const send = () => {
      const box = element.getBoundingClientRect();
      api.browserSetBounds({
        x: box.left,
        y: box.top,
        width: box.width,
        height: box.height,
        visible: true,
      });
    };
    send();
    const observer = new ResizeObserver(send);
    observer.observe(element);
    window.addEventListener('resize', send);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', send);
      // Other workspaces draw in this area, so the page view must not cover them.
      api.browserSetBounds({ x: 0, y: 0, width: 0, height: 0, visible: false });
    };
  }, [viewport]);
}

function CaptureIcon({ capture }: { capture: CaptureStatus }) {
  if (capture.kind === 'capturing' || capture.kind === 'extracting') {
    return <LoaderCircle size={13} className="spin" aria-hidden="true" />;
  }
  if (capture.kind === 'captured' || capture.kind === 'extracted') {
    return <CircleCheck size={13} aria-hidden="true" />;
  }
  if (capture.kind === 'failed') return <CircleExclamationPoint size={13} aria-hidden="true" />;
  return null;
}

export function BrowserWorkspace() {
  const {
    available,
    state,
    frame,
    capture,
    navigate,
    command,
    sendInput,
    captureScreenshot,
    extractPage,
  } = useBrowser();
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(state.url);
  const [editing, setEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const recorder = useNetwork();
  const { network } = recorder;
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordBusy, setRecordBusy] = useState(false);
  /** The network notice the user closed; a new notice (new text or new session) shows again. */
  const [closedNotice, setClosedNotice] = useState<string | null>(null);
  useBrowserViewBounds(viewportRef);

  // Show the page's real URL in the address bar, except while the user is typing.
  useEffect(() => {
    if (!editing) setDraft(state.url);
  }, [state.url, editing]);

  const go = async (address: string) => {
    setAddressError(null);
    const error = await navigate(address);
    if (error) {
      setAddressError(error);
      return;
    }
    setEditing(false);
    inputRef.current?.blur();
  };

  const toggleRecording = async () => {
    setRecordError(null);
    if (network.recording) {
      recorder.stop();
      return;
    }
    setRecordBusy(true);
    const error = await recorder.start();
    setRecordBusy(false);
    if (error) setRecordError(error);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void go(draft);
  };

  const busy = capture.kind === 'capturing' || capture.kind === 'extracting';
  const canCapture = state.hasPage && !state.isLoading && !busy;
  // Safari-style: while idle, show only the host in the middle; while editing, the full URL.
  const idle = state.hasPage && !focused && !editing;
  const security = SECURITY[state.security];
  const notice = addressError
    ? { kind: 'error' as const, text: addressError }
    : recordError
      ? { kind: 'error' as const, text: recordError }
      : (state.notice ?? null);
  const networkNoticeKey = network.notice
    ? `${network.startedAt ?? ''}|${network.notice.text}`
    : null;
  const networkNotice = network.notice && networkNoticeKey !== closedNotice ? network.notice : null;
  const endpoints = network.entries.length;
  const endpointWord = endpoints === 1 ? 'endpoint' : 'endpoints';

  /** Maps a renderer event to page coordinates, scaling for app zoom. */
  const pointOf = (element: HTMLElement, clientX: number, clientY: number) => {
    const box = element.getBoundingClientRect();
    const scaleX = frame && box.width > 0 ? frame.width / box.width : 1;
    const scaleY = frame && box.height > 0 ? frame.height / box.height : 1;
    return {
      x: (clientX - box.left) * scaleX,
      y: (clientY - box.top) * scaleY,
    };
  };

  const modifiersOf = (event: ReactMouseEvent | ReactWheelEvent | ReactKeyboardEvent) => ({
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  });

  const pointerName = (button: number): 'left' | 'middle' | 'right' =>
    button === 2 ? 'right' : button === 1 ? 'middle' : 'left';

  const onPointerMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const point = pointOf(event.currentTarget, event.clientX, event.clientY);
    sendInput({ type: 'mouseMove', ...point, buttons: event.buttons, ...modifiersOf(event) });
  };

  const onPointerDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.currentTarget.focus();
    const point = pointOf(event.currentTarget, event.clientX, event.clientY);
    sendInput({
      type: 'mouseDown',
      ...point,
      button: pointerName(event.button),
      clickCount: event.detail,
      ...modifiersOf(event),
    });
  };

  const onPointerUp = (event: ReactMouseEvent<HTMLDivElement>) => {
    const point = pointOf(event.currentTarget, event.clientX, event.clientY);
    sendInput({
      type: 'mouseUp',
      ...point,
      button: pointerName(event.button),
      clickCount: event.detail,
      ...modifiersOf(event),
    });
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const point = pointOf(event.currentTarget, event.clientX, event.clientY);
    sendInput({
      type: 'wheel',
      ...point,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      ...modifiersOf(event),
    });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    sendInput({
      type: 'keyDown',
      key: event.key,
      code: event.code,
      text: printable ? event.key : undefined,
      ...modifiersOf(event),
    });
  };

  const onKeyUp = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    sendInput({ type: 'keyUp', key: event.key, code: event.code, ...modifiersOf(event) });
  };

  const onPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text');
    if (text) sendInput({ type: 'text', text });
  };

  return (
    <section className="view browser-workspace" aria-label="Browser">
      <header className="toolbar browser-toolbar">
        <div className="nav-group">
          <button
            type="button"
            className="icon-btn"
            aria-label="Back"
            title="Back"
            disabled={!state.canGoBack}
            onClick={() => command('back')}
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Forward"
            title="Forward"
            disabled={!state.canGoForward}
            onClick={() => command('forward')}
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={state.isLoading ? 'Stop' : 'Reload'}
            title={state.isLoading ? 'Stop' : 'Reload'}
            disabled={!state.hasPage}
            onClick={() => command(state.isLoading ? 'stop' : 'reload')}
          >
            {state.isLoading ? <X size={17} /> : <RotateCw size={16} />}
          </button>
        </div>

        <form className="address-form" onSubmit={submit}>
          <input
            ref={inputRef}
            className={idle ? 'address-input is-masked' : 'address-input'}
            aria-label="Address"
            placeholder="Search DuckDuckGo or enter a web address"
            value={draft}
            disabled={!available}
            spellCheck={false}
            onChange={(event) => {
              setEditing(true);
              setDraft(event.target.value);
            }}
            onFocus={(event) => {
              setFocused(true);
              const input = event.currentTarget;
              requestAnimationFrame(() => input.select());
            }}
            onBlur={() => {
              setFocused(false);
              setEditing(false);
            }}
          />
          {idle ? (
            <span className="address-display" aria-hidden="true">
              <security.Icon size={13} strokeWidth={2} data-security={state.security} />
              <span>{hostOf(state.url)}</span>
            </span>
          ) : (
            <Search size={14} className="address-icon" aria-hidden="true" />
          )}
        </form>

        <div className="toolbar-actions">
          <button
            type="button"
            className={
              network.recording
                ? 'btn btn-secondary record-btn is-recording'
                : 'btn btn-secondary record-btn'
            }
            aria-pressed={network.recording}
            disabled={!available || recordBusy || (!network.recording && !state.hasPage)}
            title={
              network.recording
                ? "Stop recording the page's API calls"
                : "Record the page's API calls (fetch and XHR) so their responses can go into Context"
            }
            onClick={() => void toggleRecording()}
          >
            {network.recording ? (
              <CircleStop size={15} strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <CircleDot size={15} strokeWidth={1.9} aria-hidden="true" />
            )}
            <span className="btn-label">
              {network.recording ? `Stop (${endpoints})` : 'Record network'}
            </span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canCapture}
            title="Read the page's text, headings, tables, and selected text into Context"
            onClick={() => void extractPage()}
          >
            <ScanText size={15} strokeWidth={1.9} aria-hidden="true" />
            <span className="btn-label">Extract page text</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canCapture}
            title="Add the visible page to Screenshots"
            onClick={() => void captureScreenshot()}
          >
            <Camera size={15} strokeWidth={1.9} aria-hidden="true" />
            <span className="btn-label">Capture screenshot</span>
          </button>
        </div>
        {state.isLoading && <span className="toolbar-progress" aria-hidden="true" />}
      </header>

      {/* Page identity and capture state; hidden on the start screen, where the sidebar shows both. */}
      {state.hasPage && (
        <div className="page-strip">
          <span className="security-badge" data-security={state.security}>
            <security.Icon size={11} strokeWidth={2.25} aria-hidden="true" />
            {security.label}
          </span>
          <strong className="page-title" title={state.title}>
            {state.title || hostOf(state.url)}
          </strong>
          <span className="page-url" title={state.url}>
            {state.url}
          </span>
          {(network.recording || endpoints > 0) && (
            <span
              className="recording-state"
              data-recording={network.recording}
              role="status"
              aria-live="polite"
            >
              {network.recording && <span className="rec-dot" aria-hidden="true" />}
              {network.recording
                ? `Recording · ${endpoints} ${endpointWord}`
                : `${endpoints} API ${endpointWord} recorded, review in Context`}
            </span>
          )}
          <span className="capture-state" data-kind={capture.kind} role="status" aria-live="polite">
            <CaptureIcon capture={capture} />
            Capture: {describeCapture(capture)}
          </span>
        </div>
      )}

      {notice && (
        <div
          className="banner browser-notice"
          data-tone={notice.kind === 'error' ? 'error' : 'warning'}
          role="alert"
        >
          {notice.kind === 'error' ? (
            <CircleExclamationPoint size={16} aria-hidden="true" />
          ) : (
            <Info size={16} aria-hidden="true" />
          )}
          <div className="banner-body">{notice.text}</div>
        </div>
      )}

      {networkNotice && (
        <div
          className="banner browser-notice"
          data-tone={networkNotice.kind === 'error' ? 'error' : 'info'}
          role="status"
        >
          {networkNotice.kind === 'error' ? (
            <CircleExclamationPoint size={16} aria-hidden="true" />
          ) : (
            <Info size={16} aria-hidden="true" />
          )}
          <div className="banner-body">{networkNotice.text}</div>
          {network.recording && state.hasPage && (
            <button type="button" className="btn btn-secondary" onClick={() => command('reload')}>
              <RotateCw size={13} aria-hidden="true" />
              Reload
            </button>
          )}
          <button
            type="button"
            className="icon-btn banner-close"
            aria-label="Close this message"
            title="Close"
            onClick={() => setClosedNotice(networkNoticeKey)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div
        ref={viewportRef}
        className="browser-viewport"
        role="application"
        aria-label="Browser page"
        tabIndex={state.hasPage ? 0 : -1}
        onMouseMove={onPointerMove}
        onMouseDown={onPointerDown}
        onMouseUp={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPaste={onPaste}
      >
        {state.hasPage && frame && (
          <img
            className="browser-frame"
            src={`data:image/jpeg;base64,${frame.data}`}
            alt={state.title || 'Browser page'}
            draggable={false}
          />
        )}
        {!state.hasPage && (
          <div className="browser-start">
            <span className="icon-tile">
              <Compass size={30} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h2>{available ? 'Browse the web' : 'The browser needs the desktop app'}</h2>
            <p>
              Type an address or search with DuckDuckGo. Pages open in their own session, separate
              from the app. Capture a screenshot or extract the page text to add it to your context.
            </p>
            {available && (
              <div className="suggestions">
                {SUGGESTIONS.map((host) => (
                  <button
                    key={host}
                    type="button"
                    className="suggestion"
                    onClick={() => void go(host)}
                  >
                    <Compass size={13} aria-hidden="true" />
                    {host}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
