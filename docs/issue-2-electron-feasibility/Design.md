# issue-2 - Electron feasibility 
 
## Context 
The MVP needs active-page DOM text and network response capture inside a built-in browser. 
 
## Design 
A local test server serves HTML and JSON. Electron attaches webContents.debugger, enables the Network domain, reads response bodies, and extracts DOM text. 
 
Send Network.enable before navigation but do not await the promise before loadURL. Awaiting before navigation hangs. 
