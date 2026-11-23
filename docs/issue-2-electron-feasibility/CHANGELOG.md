# Changelog - issue-2 
 
## 2026-11-23

- `spikes/electron-cdp/package.json` - pinned Electron to 45.4.1, the version that produced results.json, instead of `latest`.
- `.vscode/launch.json` - added the "Electron CDP Spike: Main" debug config that the spike README and TC2 rely on. `.gitignore` now keeps only that file from `.vscode/`.

## 2026-11-22 
 
- spikes/electron-cdp proved CDP network events, response body capture, webRequest metadata, and DOM extraction. 
- spikes/electron-cdp proved page-world isolation. Capture now waits at most one second for Network.enable and reads bodies on Network.loadingFinished; limits live in docs/_systems/browser-capture.md.
