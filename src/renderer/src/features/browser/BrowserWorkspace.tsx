import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageSecurity } from '../../../../shared/address';
import { describeCapture, useBrowser } from './BrowserProvider';

const SECURITY_LABELS: Record<PageSecurity, string> = {
  secure: 'Secure',
  local: 'Local',
  'not-secure': 'Not secure',
};

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

export function BrowserWorkspace() {
  const { available, state, capture, navigate, command, captureScreenshot } = useBrowser();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(state.url);
  const [editing, setEditing] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  useBrowserViewBounds(viewportRef);

  // Show the page's real URL in the address bar, except while the user is typing.
  useEffect(() => {
    if (!editing) setDraft(state.url);
  }, [state.url, editing]);

  const go = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddressError(null);
    const error = await navigate(draft);
    if (error) {
      setAddressError(error);
      return;
    }
    setEditing(false);
    const focused = document.activeElement;
    if (focused instanceof HTMLElement) focused.blur();
  };

  const canCapture = state.hasPage && !state.isLoading && capture.kind !== 'capturing';

  return (
    <section className="workspace browser-workspace" aria-label="Browser">
      <form className="browser-toolbar" onSubmit={(event) => void go(event)}>
        <button
          type="button"
          className="icon-button"
          aria-label="Back"
          title="Back"
          disabled={!state.canGoBack}
          onClick={() => command('back')}
        >
          {'←'}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Forward"
          title="Forward"
          disabled={!state.canGoForward}
          onClick={() => command('forward')}
        >
          {'→'}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={state.isLoading ? 'Stop' : 'Reload'}
          title={state.isLoading ? 'Stop' : 'Reload'}
          disabled={!state.hasPage}
          onClick={() => command(state.isLoading ? 'stop' : 'reload')}
        >
          {state.isLoading ? '✕' : '↻'}
        </button>
        <input
          className="address-input"
          aria-label="Address"
          placeholder="Type a web address, or words to search on DuckDuckGo"
          value={draft}
          disabled={!available}
          spellCheck={false}
          onChange={(event) => {
            setEditing(true);
            setDraft(event.target.value);
          }}
          onFocus={(event) => event.target.select()}
          onBlur={() => setEditing(false)}
        />
        <button type="submit" className="secondary-button" disabled={!available}>
          Go
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!canCapture}
          onClick={() => void captureScreenshot()}
        >
          Capture screenshot
        </button>
      </form>

      <div className="page-identity">
        {state.hasPage ? (
          <>
            <span className="security-badge" data-security={state.security}>
              {SECURITY_LABELS[state.security]}
            </span>
            <strong className="page-title" title={state.title}>
              {state.title || hostOf(state.url)}
            </strong>
            <span className="page-url" title={state.url}>
              {state.url}
            </span>
            {state.isLoading && <span className="page-loading">Loading...</span>}
          </>
        ) : (
          <span className="page-url">No page open</span>
        )}
        <span className="capture-state" data-kind={capture.kind} role="status" aria-live="polite">
          Capture: {describeCapture(capture)}
        </span>
      </div>

      {(addressError || state.notice) && (
        <p className="browser-notice" data-kind={addressError ? 'error' : state.notice?.kind}>
          {addressError ?? state.notice?.text}
        </p>
      )}

      <div ref={viewportRef} className="browser-viewport">
        {!state.hasPage && (
          <div className="browser-start">
            <strong>
              {available
                ? 'Browse a page inside the app'
                : 'The built-in browser needs the desktop app'}
            </strong>
            <span>
              Type a web address or search words above. Pages open here in their own session,
              separate from the app.
            </span>
            <span>
              Capture screenshot adds the visible page to Screenshots, ready for text extraction.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
