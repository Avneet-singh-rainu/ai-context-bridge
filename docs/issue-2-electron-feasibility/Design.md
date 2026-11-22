# issue-2 - Electron feasibility 
 
## Context 
The MVP needs active-page DOM text and network response capture inside a built-in browser. 
 
## Design 
A local test server serves HTML and JSON. Electron attaches webContents.debugger, enables the Network domain, reads response bodies, and extracts DOM text. 
 
See [Browser capture](../_systems/browser-capture.md) for the capture path, isolation rules and limits.
