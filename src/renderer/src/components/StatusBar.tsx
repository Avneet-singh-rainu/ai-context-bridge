import { useEffect, useState } from 'react';
import type { AppInfo } from '../../../shared/ipc-contract';

export function StatusBar() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  // window.bridge is missing when the renderer is opened in a plain browser instead of Electron.
  const hasBridge = window.bridge !== undefined;

  useEffect(() => {
    window.bridge
      ?.getAppInfo()
      .then(setAppInfo)
      .catch(() => setAppInfo(null));
  }, []);

  return (
    <footer className="status-bar">
      <span>Capture: idle</span>
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
