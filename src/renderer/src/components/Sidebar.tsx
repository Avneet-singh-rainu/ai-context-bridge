import {
  FileText,
  Globe,
  Images,
  Layers,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppInfo } from '../../../shared/ipc-contract';
import { describeCapture, useBrowser } from '../features/browser/BrowserProvider';
import { useNetwork } from '../features/capture/NetworkProvider';
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

/** Active page and capture state on every view, plus the app version. */
function SidebarFooter() {
  const { state, capture } = useBrowser();
  const { network } = useNetwork();
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
      {(network.recording || network.entries.length > 0) && (
        <div className="footer-row status-network" data-recording={network.recording}>
          <span className="status-dot" aria-hidden="true" />
          <span>
            Network: {network.recording ? 'recording, ' : ''}
            {network.entries.length} endpoint{network.entries.length === 1 ? '' : 's'}
          </span>
        </div>
      )}
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
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  items,
  activeView,
  counts,
  onSelect,
  collapsed,
  onToggle,
}: SidebarProps) {
  return (
    <nav className={collapsed ? 'sidebar is-collapsed' : 'sidebar'} aria-label="Main">
      <div className="sidebar-top">
        <span className="app-mark" aria-hidden="true">
          <Layers size={15} strokeWidth={2.25} />
        </span>
        <span className="app-name">AI Context Bridge</span>
        <button
          type="button"
          className="icon-btn sidebar-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggle}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
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
