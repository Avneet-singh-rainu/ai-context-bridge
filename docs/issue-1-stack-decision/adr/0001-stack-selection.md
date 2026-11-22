# ADR 0001: MVP stack selection

**Status:** accepted
**Date:** 2026-11-22
**Decision:** Use Electron + React + TypeScript for the Windows MVP.

## Context

The handoff proposed Tauri 2 with React + TypeScript and a separate WebView2 browser control. The same handoff marked that approach as a critical feasibility risk and required a decision record before feature work.

The MVP needs a built-in browser, active-page DOM extraction, and network request and response capture from that browser.

## Evidence

- Tauri 2 does not provide a macOS-style child webview on Windows. Tauri maintainer amrbashir closed [issue #10079](https://github.com/tauri-apps/tauri/issues/10079) stating that the nearest Windows equivalent is an owned window and that manual position sync is needed. A built-in browser inside the app content area would require native window plumbing.
- WebView2 supports CDP through `CallDevToolsProtocolAsync` and event receivers ([Microsoft docs](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/chromium-devtools-protocol)). The CDP `Network` domain includes `responseReceived` and `getResponseBody`. WebView2 capture is possible, but a separate native layer is still needed to drive the browser control.
- Electron exposes `webContents.debugger` directly ([Electron docs](https://www.electronjs.org/docs/latest/api/debugger)). `Network.enable`, `Network.requestWillBeSent`, and `Network.getResponseBody` work on a normal `BrowserWindow`. Electron `session.webRequest` adds status codes and response headers. The browser is a first-class part of the shell.

## Decision

Use Electron as the desktop shell and browser host. Use React + TypeScript for the renderer. Keep the provider interfaces from the handoff so screenshot OCR, browser capture, and export remain replaceable.

## Consequences

- Electron bundles Chromium, so the installer is larger than a Tauri installer.
- Electron removes the WebView2 child-window risk and the WebView2 runtime bootstrap requirement for the MVP.
- Network capture can be prototyped with `webContents.debugger` and the CDP `Network` domain.
- Tauri 2 remains an option for a later size-focused rewrite. No Tauri code is written in this milestone.

## Tooling

- Vite with `electron-vite` for main, preload, and renderer builds.
- `electron-builder` with NSIS for the Windows installer.
- Zod for validation of untrusted page, screenshot, and network data.
- Vitest for unit tests.
- SQLite is deferred until persistence is introduced.

## Skipped for now

- Windows OCR integration and the Tesseract fallback. Both stay behind an OCR provider interface and will be compared in the screenshot milestone.
- Toast notifications, Claude plugins, and MCP servers from the personal setup kit. These do not affect the desktop stack.
