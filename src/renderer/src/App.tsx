import type { ViewId } from './components/navigation';
import { useViewNavigation, ViewNavigationProvider } from './components/ViewSwitcher';
import { BrowserProvider } from './features/browser/BrowserProvider';
import { BrowserWorkspace } from './features/browser/BrowserWorkspace';
import { NetworkProvider } from './features/capture/NetworkProvider';
import { ContextReviewProvider } from './features/context/ContextReviewProvider';
import { ContextWorkspace } from './features/context/ContextWorkspace';
import { PageContentProvider } from './features/context/PageContentProvider';
import { ScreenshotsProvider } from './features/screenshots/ScreenshotsProvider';
import { ScreenshotsWorkspace } from './features/screenshots/ScreenshotsWorkspace';

const WORKSPACES: Record<ViewId, () => React.JSX.Element> = {
  browser: BrowserWorkspace,
  screenshots: ScreenshotsWorkspace,
  context: ContextWorkspace,
};

function Shell() {
  const { activeView } = useViewNavigation();
  const ActiveWorkspace = WORKSPACES[activeView];
  return (
    <main className="app-main">
      <ActiveWorkspace />
    </main>
  );
}

export function App() {
  return (
    <ScreenshotsProvider>
      <PageContentProvider>
        <ContextReviewProvider>
          <NetworkProvider>
            <BrowserProvider>
              <ViewNavigationProvider>
                <Shell />
              </ViewNavigationProvider>
            </BrowserProvider>
          </NetworkProvider>
        </ContextReviewProvider>
      </PageContentProvider>
    </ScreenshotsProvider>
  );
}
