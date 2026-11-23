# issue-11 - Native Electron browser

**Systems:** [browser](../_systems/browser.md), [browser-capture](../_systems/browser-capture.md)
**Related:** [issue-6](../issue-6-in-app-browser/Design.md), [issue-8](../issue-8-network-capture/Design.md)
**Low-level design:** [LLD.md](LLD.md)

## Context / Problem

The Chrome CDP attempts caused lag, added a movable Chrome window, and kept a dependency on an
installed Google Chrome. The user chose to remove that dependency and use Electron's native browser
surface again. Google sign-in on `WebContentsView` failed in an earlier attempt, so sign-in needs a
fresh manual test with a real account. ADR 0005 records the decision and the accepted risk.

## Goals / Non-goals

### Goals

- Show web pages inside the app window without starting Google Chrome.
- Paint pages directly in Electron, with no screenshot stream during scrolling or typing.
- Keep navigation, page identity, capture, extraction, and network recording working.
- Keep the app UI isolated from web content.

### Non-goals

- Bundling or starting Google Chrome. Electron's embedded Chromium is the page engine.
- Rebuilding the CDP client, Chrome profile, JPEG frame pump, or renderer input forwarding.
- Tab support, extensions, or a full browser toolbar. One page at a time remains the rule.
- Adding a Chrome fallback if Google sign-in fails.

## Current State

The browser uses one Electron `WebContentsView`. The view is attached to the app window's
`contentView`, and main places the view over the renderer's `.browser-viewport` box. Electron paints
the page. Main pushes `BrowserState` to the renderer after load and navigation events. Screenshot
capture uses `webContents.capturePage()`, page text uses Electron's isolated world, and network
recording uses `webContents.debugger`. The current facts live in [Browser](../_systems/browser.md)
and [Browser capture](../_systems/browser-capture.md).

## Component / Data Flow

| From | To | Carries |
|---|---|---|
| Renderer | Main | Address text, viewport bounds, state and capture commands |
| Main | Electron `WebContentsView` | `loadURL`, history commands, visibility and bounds |
| Electron `WebContentsView` | Main | Load, navigation, title, crash, permission and download events |
| Main | Renderer | `BrowserState`, capture result, extract result, network state |

## Impact & Blast Radius

- The Chrome process, CDP socket, Chrome profile, JPEG frame pump, and input channels are gone.
- `browser:capture` returns a PNG from Electron's `capturePage()`.
- `browser:extract` reads the page in Electron's isolated world.
- `network:start` records responses through Electron's debugger on the page's web contents.
- The context package format and the shared redaction rules stay the same.
- ADR 0005 supersedes ADR 0002, ADR 0003, and ADR 0004. Those ADRs remain as history.
- Google sign-in is the open risk. TC6 in [Test_Cases.md](Test_Cases.md) records the manual check.
