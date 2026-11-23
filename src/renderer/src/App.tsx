import { useState } from 'react';
import { DEFAULT_VIEW, NAV_ITEMS, type ViewId } from './components/navigation';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { BrowserWorkspace } from './features/browser/BrowserWorkspace';
import { ContextWorkspace } from './features/context/ContextWorkspace';
import { ScreenshotsProvider } from './features/screenshots/ScreenshotsProvider';
import { ScreenshotsWorkspace } from './features/screenshots/ScreenshotsWorkspace';

const WORKSPACES: Record<ViewId, () => React.JSX.Element> = {
  browser: BrowserWorkspace,
  screenshots: ScreenshotsWorkspace,
  context: ContextWorkspace,
};

export function App() {
  const [activeView, setActiveView] = useState<ViewId>(DEFAULT_VIEW);
  const ActiveWorkspace = WORKSPACES[activeView];

  return (
    <ScreenshotsProvider>
      <div className="app-shell">
        <Sidebar items={NAV_ITEMS} activeView={activeView} onSelect={setActiveView} />
        <main className="app-main">
          <ActiveWorkspace />
        </main>
        <StatusBar />
      </div>
    </ScreenshotsProvider>
  );
}
