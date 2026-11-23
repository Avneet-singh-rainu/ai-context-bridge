import { useState } from 'react';
import { DEFAULT_VIEW, NAV_ITEMS, type ViewId } from './components/navigation';
import { Sidebar } from './components/Sidebar';
import { BrowserProvider } from './features/browser/BrowserProvider';
import { BrowserWorkspace } from './features/browser/BrowserWorkspace';
import { ContextReviewProvider, useContextReview } from './features/context/ContextReviewProvider';
import { ContextWorkspace } from './features/context/ContextWorkspace';
import { PageContentProvider, usePageContent } from './features/context/PageContentProvider';
import { ScreenshotsProvider, useScreenshots } from './features/screenshots/ScreenshotsProvider';
import { ScreenshotsWorkspace } from './features/screenshots/ScreenshotsWorkspace';

const WORKSPACES: Record<ViewId, () => React.JSX.Element> = {
  browser: BrowserWorkspace,
  screenshots: ScreenshotsWorkspace,
  context: ContextWorkspace,
};

/** The window layout. Lives inside the providers so the sidebar can show live counts. */
function Shell() {
  const [activeView, setActiveView] = useState<ViewId>(DEFAULT_VIEW);
  const { screenshots } = useScreenshots();
  const { pages } = usePageContent();
  const { review } = useContextReview();
  const ActiveWorkspace = WORKSPACES[activeView];

  const contextIds = [
    ...review.notes.filter((note) => note.text.trim() !== '').map((note) => `note:${note.id}`),
    ...screenshots.map((shot) => `screenshot:${shot.id}`),
    ...pages.map((page) => `page:${page.id}`),
  ];
  const included = contextIds.filter((id) => review.excluded[id] !== true).length;

  return (
    <div className="app-shell">
      <Sidebar
        items={NAV_ITEMS}
        activeView={activeView}
        counts={{ screenshots: screenshots.length, context: included }}
        onSelect={setActiveView}
      />
      <main className="app-main">
        <ActiveWorkspace />
      </main>
    </div>
  );
}

export function App() {
  return (
    <ScreenshotsProvider>
      <PageContentProvider>
        <ContextReviewProvider>
          <BrowserProvider>
            <Shell />
          </BrowserProvider>
        </ContextReviewProvider>
      </PageContentProvider>
    </ScreenshotsProvider>
  );
}
