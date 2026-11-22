# Product Brief

**Status:** summary of the confirmed product brief. The authoritative source is [AI_Context_Bridge_Codex_Handoff.md](../AI_Context_Bridge_Codex_Handoff.md).

AI Context Bridge is a local-first Windows desktop application that turns fragmented visual and browser information into one structured, traceable context package for pasting into an AI chat.

Key confirmed decisions:

- Generic context collector, not trading-specific.
- Built-in browser; no browser extension in the initial release.
- Only the currently active built-in browser page is captured.
- Capture is session-based and explicitly started and stopped by the user.
- Local processing, no cloud backend, no AI API dependency, no telemetry.
- MVP: startup mode is copy/paste into the user's AI client, not autonomous AI analysis.
