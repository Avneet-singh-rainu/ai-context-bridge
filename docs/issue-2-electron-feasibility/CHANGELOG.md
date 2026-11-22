# Changelog - issue-2 
 
## 2026-11-22 
 
- spikes/electron-cdp proved CDP network events, response body capture, webRequest metadata, and DOM extraction. 
- spikes/electron-cdp proved page-world isolation. Capture now waits at most one second for Network.enable and reads bodies on Network.loadingFinished; limits live in docs/_systems/browser-capture.md.
