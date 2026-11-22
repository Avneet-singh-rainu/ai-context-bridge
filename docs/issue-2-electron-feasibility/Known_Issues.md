# Known Issues - issue-2 
 
## 1. Opening Chromium DevTools detaches CDP capture 
 
**Status:** Accepted by design 
 
Electron detaches webContents.debugger when DevTools opens. VS Code debugs the main process instead. 
