import { FileText, Globe, Images, Layers, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppInfo } from '../../../shared/ipc-contract';
import { describeCapture, useBrowser } from '../features/browser/BrowserProvider';
import type { NavItem, ViewId } from './navigation';

const ICONS: Record<ViewId, LucideIcon> = {
  browser: Globe,
  screenshots: Images,
  context: FileText,
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** Active page and capture state on every view, as the issue asks; plus the app version. */
function SidebarFooter() {
  const { state, capture } = useBrowser();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    window.bridge
      ?.getAppInfo()
      .then(setAppInfo)
      .catch(() => setAppInfo(null));
  }, []);

  const page = state.hasPage
    ? `${hostOf(state.url)}${state.title ? ` - ${state.title}` : ''}`
    : 'No page open';

  return (
    <div className="sidebar-footer">
      <div className="footer-row status-page" title={state.url || undefined}>
        <Globe size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>{page}</span>
      </div>
      <div className="footer-row status-capture" data-kind={capture.kind} role="status">
        <span className="status-dot" aria-hidden="true" />
        <span>Capture: {describeCapture(capture)}</span>
      </div>
      <div
        className="footer-version"
        title={appInfo ? `Electron ${appInfo.electron}, Chromium ${appInfo.chrome}` : undefined}
      >
        {appInfo ? `Version ${appInfo.version}` : window.bridge ? '' : 'Preview outside Electron'}
      </div>
    </div>
  );
}

interface SidebarProps {
  items: readonly NavItem[];
  activeView: ViewId;
  counts: Partial<Record<ViewId, number>>;
  onSelect: (view: ViewId) => void;
}

export function Sidebar({ items, activeView, counts, onSelect }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="sidebar-top">
        <span className="app-mark" aria-hidden="true">
          <Layers size={15} strokeWidth={2.25} />
        </span>
        <span className="app-name">AI Context Bridge</span>
      </div>
      <ul className="sidebar-list">
        {items.map((item) => {
          const Icon = ICONS[item.id];
          const count = counts[item.id] ?? 0;
          return (
            <li key={item.id}>
              <button
                type="button"
                className="nav-button"
                aria-current={item.id === activeView ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
                {count > 0 && <span className="nav-count">{count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <SidebarFooter />
    </nav>
  );
}
