import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleExclamationPoint,
  CircleStop,
  Compass,
  Ellipsis,
  House,
  Info,
  LoaderCircle,
  Lock,
  Plus,
  RotateCw,
  ScanText,
  Search,
  TriangleExclamationPoint,
  X,
} from 'lucide-react';
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageSecurity } from '../../../../shared/address';
import { useNetwork } from '../capture/NetworkProvider';
import { BrowserLoginPrompt } from './BrowserLoginPrompt';
import { useBrowser } from './BrowserProvider';

const SECURITY: Record<PageSecurity, { label: string; Icon: typeof Lock }> = {
  secure: { label: 'Secure', Icon: Lock },
  local: { label: 'Local', Icon: House },
  'not-secure': { label: 'Not secure', Icon: TriangleExclamationPoint },
};

const SUGGESTIONS = ['example.com', 'wikipedia.org', 'developer.mozilla.org'];
const VISIBLE_TABS = 3;

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
    let frame = 0;
    const sendNow = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      api.browserSetBounds({
        x: box.left,
        y: box.top,
        width: box.width,
        height: box.height,
        visible: true,
      });
    };
    // One resize frame can produce several layout events; main only needs the last box.
    const send = () => {
      if (frame === 0) frame = requestAnimationFrame(sendNow);
    };
    sendNow();
    const observer = new ResizeObserver(send);
    observer.observe(element);
    window.addEventListener('resize', send);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', send);
      if (frame !== 0) cancelAnimationFrame(frame);
      // Other workspaces draw in this area, so the page view must not cover them.
      api.browserSetBounds({ x: 0, y: 0, width: 0, height: 0, visible: false });
    };
  }, [viewport]);
}

/** Browser view with one 36 px bar holding tabs, navigation, address, and page actions. */
export function BrowserWorkspace() {
  const {
    available,
    state,
    navigate,
    command,
    newTab,
    closeTab,
    selectTab,
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
  const [closedNotice, setClosedNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useBrowserViewBounds(viewportRef);

  useEffect(() => {
    if (!editing) setDraft(state.url);
  }, [state.url, editing]);

  // Keep the active tab visible; push earlier tabs into the overflow menu when needed.
  const activeIndex = state.tabs.findIndex((tab) => tab.id === state.activeTabId);
  const shown = state.tabs.slice(0, VISIBLE_TABS);
  const hidden = state.tabs.slice(VISIBLE_TABS);
  if (activeIndex >= VISIBLE_TABS) {
    shown.splice(2, 1, state.tabs[activeIndex]);
    hidden.splice(
      hidden.findIndex((tab) => tab.id === state.activeTabId),
      1,
    );
  }

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

  const endpoints = network.entries.length;
  const canCapture = state.hasPage && !state.isLoading;
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

  return (
    <section className="view browser-workspace" aria-label="Browser">
      <header className="toolbar browser-toolbar">
        <div className="browser-tabs">
          {shown.map((tab) => {
            const active = tab.id === state.activeTabId;
            return (
              <div className={active ? 'browser-tab is-active' : 'browser-tab'} key={tab.id}>
                <button
                  type="button"
                  className="tab-select"
                  role="tab"
                  aria-selected={active}
                  title={tab.url || tab.title}
                  onClick={() => selectTab(tab.id)}
                >
                  {tab.isLoading ? (
                    <LoaderCircle size={12} className="spin" aria-hidden="true" />
                  ) : null}
                  <span className="tab-title">{tab.title || 'New tab'}</span>
                </button>
                <button
                  type="button"
                  className="tab-close"
                  aria-label={`Close ${tab.title || 'New tab'}`}
                  title="Close tab"
                  onClick={() => closeTab(tab.id)}
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="tab-new"
            aria-label="New tab"
            title="New tab"
            onClick={newTab}
          >
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
          </button>
          {hidden.length > 0 && (
            <div className="tab-menu-wrap">
              <button
                type="button"
                className="tab-overflow"
                aria-label={`${hidden.length} more tabs`}
                aria-expanded={menuOpen}
                title="More tabs"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <Ellipsis size={14} aria-hidden="true" />
                {hidden.length}
              </button>
              {menuOpen && (
                <div className="tab-menu" role="menu">
                  {hidden.map((tab) => (
                    <div className="tab-menu-row" key={tab.id}>
                      <button
                        type="button"
                        role="menuitem"
                        title={tab.url || tab.title}
                        onClick={() => {
                          selectTab(tab.id);
                          setMenuOpen(false);
                        }}
                      >
                        <span>{tab.title || 'New tab'}</span>
                      </button>
                      <button
                        type="button"
                        className="tab-menu-close"
                        aria-label={`Close ${tab.title || 'New tab'}`}
                        title="Close tab"
                        onClick={() => closeTab(tab.id)}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="nav-group search-nav">
          <button
            type="button"
            className="icon-btn"
            aria-label="Back"
            title="Back"
            disabled={!state.canGoBack}
            onClick={() => command('back')}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Forward"
            title="Forward"
            disabled={!state.canGoForward}
            onClick={() => command('forward')}
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={state.isLoading ? 'Stop' : 'Reload'}
            title={state.isLoading ? 'Stop' : 'Reload'}
            disabled={!state.hasPage}
            onClick={() => command(state.isLoading ? 'stop' : 'reload')}
          >
            {state.isLoading ? <X size={16} /> : <RotateCw size={15} />}
          </button>
        </div>

        <form className="address-form search-address" onSubmit={submit}>
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

        <div className="toolbar-actions search-actions">
          <button
            type="button"
            className={
              network.recording ? 'icon-btn record-btn is-recording' : 'icon-btn record-btn'
            }
            aria-pressed={network.recording}
            aria-label={network.recording ? `Stop recording (${endpoints})` : 'Record network'}
            title={
              network.recording
                ? "Stop recording the page's API calls"
                : "Record the page's API calls (fetch and XHR) so their responses can go into Context"
            }
            disabled={!available || recordBusy || (!network.recording && !state.hasPage)}
            onClick={() => void toggleRecording()}
          >
            {network.recording ? (
              <CircleStop size={16} strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <CircleDot size={16} strokeWidth={1.9} aria-hidden="true" />
            )}
            {network.recording && endpoints > 0 && (
              <span className="action-badge">{endpoints}</span>
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Extract page text"
            title="Read the page's text, headings, tables, and selected text into Context"
            disabled={!canCapture}
            onClick={() => void extractPage()}
          >
            <ScanText size={16} strokeWidth={1.9} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn action-primary"
            aria-label="Capture screenshot"
            title="Add the visible page to Screenshots"
            disabled={!canCapture}
            onClick={() => void captureScreenshot()}
          >
            <Camera size={16} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
        {state.isLoading && <span className="toolbar-progress" aria-hidden="true" />}
      </header>

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
          <button
            type="button"
            className="icon-btn banner-close"
            aria-label="Close this message"
            title="Close"
            onClick={() => setClosedNotice(networkNoticeKey)}
          >
            <X size={13} />
          </button>
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
              Type an address or search with DuckDuckGo. Pages open as tabs in their own session,
              separate from the app. Capture a screenshot or extract the page text to add it to your
              context.
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
        <BrowserLoginPrompt />
      </div>
    </section>
  );
}
