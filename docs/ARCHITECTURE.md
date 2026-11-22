# Architecture

**Status:** undecided pending Milestone 0.

The handoff proposes Tauri 2 with React + TypeScript and a separate WebView2 browser control on Windows, but explicitly flags this as an unproven assumption. The alternative is Electron + React + TypeScript.

Before feature work begins, a feasibility spike must verify:

1. Whether a separate WebView2 control can be hosted cleanly inside the desktop app window with correct resize, focus, keyboard input, and lifecycle behavior.
2. Whether the required DevTools Protocol network events and response bodies are accessible reliably.
3. Whether browser content and desktop UI remain isolated.
4. Packaging and WebView2 runtime distribution requirements.

A decision record will be added under `docs/decisions/` once evidence is available. Do not treat Tauri as the confirmed stack until then.
