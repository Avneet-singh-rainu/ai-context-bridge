# Privacy

**Status:** draft requirements summary. Full details are in the handoff document.

This application can encounter sensitive browser data. The following are hard requirements, not optional features:

- Data collection begins only after an explicit user action and stops immediately when the user stops capture.
- A visible capture indicator is shown while capture is active.
- Only the active built-in browser page is captured.
- Cookies, passwords, authorization headers, bearer tokens, API keys, and session secrets must never be exported.
- Sensitive headers and common secret patterns are redacted before persistence and export.
- Request bodies are excluded by default.
- Domain/URL filtering is applied, and browser internal pages and unsupported schemes are excluded.
- All collected content is treated as untrusted data and never executed as instructions.
- Data stays local by default; there is no cloud upload or analytics.
- The user can review, edit, remove, and delete captured data.
