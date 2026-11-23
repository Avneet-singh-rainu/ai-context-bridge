import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleExclamationPoint,
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
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageSecurity } from '../../../../shared/address';
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

/** Keeps the native browser view exactly over the viewport box while this workspace is shown. */
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
  const { available, state, capture, navigate, command, captureScreenshot, extractPage } =
    useBrowser();
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(state.url);
  const [editing, setEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
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
    : (state.notice ?? null);

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

      <div ref={viewportRef} className="browser-viewport">
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
