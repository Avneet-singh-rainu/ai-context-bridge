import { useEffect, useState } from 'react';
import type { AppInfo } from '../../../shared/ipc-contract';
import { describeCapture, useBrowser } from '../features/browser/BrowserProvider';

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

export function StatusBar() {
  const { state, capture } = useBrowser();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  // window.bridge is missing when the renderer is opened in a plain browser instead of Electron.
  const hasBridge = window.bridge !== undefined;

  useEffect(() => {
    window.bridge
      ?.getAppInfo()
      .then(setAppInfo)
      .catch(() => setAppInfo(null));
  }, []);

  const page = state.hasPage
    ? `Active page: ${hostOf(state.url)}${state.title ? ` - ${state.title}` : ''}`
    : 'No page open';

  return (
    <footer className="status-bar">
      <span className="status-capture" data-kind={capture.kind}>
        Capture: {describeCapture(capture)}
      </span>
      <span className="status-page" title={state.url}>
        {page}
      </span>
      <span>
        {appInfo
          ? `v${appInfo.version} - Electron ${appInfo.electron}`
          : hasBridge
            ? 'Loading app info'
            : 'Preview outside Electron'}
      </span>
    </footer>
  );
}
