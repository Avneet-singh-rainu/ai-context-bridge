# issue-11 - Chrome CDP browser

**Systems:** [browser](../_systems/browser.md), [browser-capture](../_systems/browser-capture.md)
**Related:** [issue-6](../issue-6-in-app-browser/Design.md), [issue-8](../issue-8-network-capture/Design.md)
**Low-level design:** [LLD.md](LLD.md)

## Context / Problem

Google sign-in rejects the Electron `WebContentsView` browser as unsafe or unsupported. Hiding
Electron tokens in the user agent does not fix the problem, because Google checks browser identity
signals beyond the user agent string. The product needs logged-in Google pages inside the app.

## Goals / Non-goals

### Goals

- Show authenticated pages inside the app window.
- Keep Google cookies across app restarts with a Chrome profile owned by the app.
- Keep DOM extraction, page screenshots and network capture working on the new page engine.
- Keep the app UI isolated from web content and from the CDP connection.

### Non-goals

- Bundling Google Chrome with the installer. The app uses an installed Chrome.
- Tab support, extensions or full browser chrome. One page at a time remains the rule.
- Making Electron's embedded browser pass Google's checks. That path is abandoned.
- Capturing responses that CDP cannot provide, such as streams or unavailable bodies.
- Removing the Electron shell. Electron still hosts the UI.

## Current State

The browser, its isolation rules and its capture path are described in
[Browser](../_systems/browser.md) and [Browser capture](../_systems/browser-capture.md). The app
uses one `WebContentsView` and Electron's debugger for network capture.

## Proposed Approach

A Chrome process manager starts installed Chrome in headless mode with a dedicated profile and a
remote debugging port. A CDP session owner connects to Chrome, creates the page target and enables
the domains needed for capture. A frame scheduler sends one JPEG frame after input stops. An input
bridge turns renderer events into CDP input commands. Capture adapters use the same CDP session for
DOM text, page screenshots and network responses.

The main process owns Chrome, the profile, the CDP socket and redaction. The renderer receives
images and structured state. The CDP socket is never exposed to web content.

## Component / Data Flow

| From | To | Carries |
|---|---|---|
| Renderer | Main | Address text, viewport size, mouse and keyboard events |
| Main | Chrome process manager | Launch and stop commands |
| Chrome process manager | CDP session owner | Debugging endpoint and process lifetime |
| CDP session owner | Chrome | Page, Runtime and Network commands |
| Chrome | CDP session owner | Frames, load events, DOM and network events |
| CDP session owner | Main state owner | Browser state and redacted capture results |
| Main state owner | Renderer | Browser state, one JPEG frame after input pauses, and notices |

## Impact & Blast Radius

- Browser navigation, history, page identity and notices all change source.
- Screenshot capture moves from Electron `capturePage` to CDP screenshots.
- DOM extraction moves from Electron `executeJavaScript` to CDP evaluation.
- Network capture moves from `webContents.debugger` to CDP on the Chrome target.
- The context package format stays the same. Source references still name URL, title and time.
- Privacy rules stay in main. No headers, cookies or request bodies go to the renderer before
  redaction and pruning.
- ADR 0001's browser-host decision is superseded by ADR 0002. ADR 0004 replaces the fixed frame
  timer with one frame after input pauses. Electron remains the shell.
- If Chrome is missing or headless sign-in is rejected, the browser must degrade clearly instead of
  failing silently.
