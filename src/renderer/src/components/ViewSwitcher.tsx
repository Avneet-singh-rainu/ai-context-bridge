import { FileText, Globe, Images, Layers, type LucideIcon } from 'lucide-react';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useNetwork } from '../features/capture/NetworkProvider';
import { useContextReview } from '../features/context/ContextReviewProvider';
import { usePageContent } from '../features/context/PageContentProvider';
import { useScreenshots } from '../features/screenshots/ScreenshotsProvider';
import { DEFAULT_VIEW, NAV_ITEMS, type ViewId } from './navigation';

const ICONS: Record<ViewId, LucideIcon> = {
  browser: Globe,
  screenshots: Images,
  context: FileText,
};

interface ViewNavigationValue {
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;
}

const ViewNavigationContext = createContext<ViewNavigationValue | null>(null);

export function ViewNavigationProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewId>(DEFAULT_VIEW);
  const value = useMemo(() => ({ activeView, setActiveView }), [activeView]);
  return <ViewNavigationContext.Provider value={value}>{children}</ViewNavigationContext.Provider>;
}

export function useViewNavigation(): ViewNavigationValue {
  const value = useContext(ViewNavigationContext);
  if (!value) throw new Error('useViewNavigation needs ViewNavigationProvider');
  return value;
}

/** View icons live in every toolbar, so the app never needs a side column. */
export function ViewSwitcher() {
  const { activeView, setActiveView } = useViewNavigation();
  const { screenshots } = useScreenshots();
  const { pages } = usePageContent();
  const { review } = useContextReview();
  const { network } = useNetwork();

  const counts = useMemo(() => {
    const contextIds = [
      ...review.notes.filter((note) => note.text.trim() !== '').map((note) => `note:${note.id}`),
      ...screenshots.map((shot) => `screenshot:${shot.id}`),
      ...pages.map((page) => `page:${page.id}`),
    ];
    const included =
      contextIds.filter((id) => review.excluded[id] !== true).length +
      network.entries.filter((entry) => review.optedIn[`network:${entry.id}`] === true).length;
    return { screenshots: screenshots.length, context: included } as Partial<
      Record<ViewId, number>
    >;
  }, [review.notes, review.excluded, review.optedIn, screenshots, pages, network.entries]);

  return (
    <nav className="view-switcher" aria-label="Views">
      <span className="app-mark" title="AI Context Bridge" aria-hidden="true">
        <Layers size={15} strokeWidth={2.25} />
      </span>
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.id];
        const count = counts[item.id] ?? 0;
        return (
          <button
            key={item.id}
            type="button"
            className="view-switch"
            aria-label={item.label}
            aria-current={item.id === activeView ? 'page' : undefined}
            title={item.label}
            onClick={() => setActiveView(item.id)}
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            {count > 0 && <span className="view-count">{count}</span>}
          </button>
        );
      })}
    </nav>
  );
}
