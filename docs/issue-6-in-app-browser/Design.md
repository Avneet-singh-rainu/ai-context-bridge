# issue-6 - Build the in-app browser

**Systems:** [browser](../_systems/browser.md), [app-shell](../_systems/app-shell.md),
[screenshots](../_systems/screenshots.md), [context-package](../_systems/context-package.md)
**Related:** [issue-5](../issue-5-ocr-export/Design.md) (OCR and export that captures feed),
[issue-2](../issue-2-electron-feasibility/Design.md) (capture spike)

## Context / Problem

Milestone 4 lets the user browse inside the app. The issue asks for an address bar, back,
forward, and reload, the active page URL and title, basic screenshot capture, and visible capture
state and page identity. Acceptance: the user can browse inside the app.

## Design

How the page view works, its isolation, the navigation rules, and capture are in
[Browser](../_systems/browser.md). This ticket adds:

- **One `WebContentsView` in the app window**, created by main on the first navigation and
  placed over the renderer's viewport box through `browser:set-bounds`. It hides while another
  workspace is open and keeps its page.
- **Its own session** (`persist:browser`), no preload, and a plain Chrome user agent.
- **Address rules in `src/shared/address.ts`**, used by main (which enforces them) and tested in
  Vitest: URLs, bare hosts, DuckDuckGo search for words, and no other schemes.
- **Safety rules in main**: only http and https load; popups open in the same view; downloads
  are cancelled; permission requests are denied. Each blocked action shows a notice.
- **Page identity**: a security badge, title, and URL in the Browser view, and the active page in
  the status bar. Main pushes state on `browser:state`.
- **Capture into the screenshot list**: `capturePage()` makes a PNG in main; the renderer adds it
  through the same import checks, with the source page kept. The context package names the
  source page without its query string.

The decisions behind these choices are in [AI_Decisions.md](AI_Decisions.md).

## Verification / Rollout

[Test_Cases.md](Test_Cases.md) lists the checks. Backing out means removing
`src/main/browser/`, the `browser:*` channels, `BrowserProvider`, and the Browser view, and
restoring the placeholder.
