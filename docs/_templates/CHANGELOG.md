# Changelog - ISSUE-NNNN

<!-- Answers WHAT and WHEN. WHY lives in adr/.
     If an entry has a date and a file list, it is a changelog entry - not a decision.
     Newest entry at the top.
     Do not log documentation-only edits here. A changelog of changelog edits is noise. -->

## YYYY-MM-DD

- `src/main/<file>.ts` - one line covering what changed and why.
  Name the actual mechanism, not just the symptom.

<!-- ------------------------------------------------------------------------------------------
     TIER 1 TICKETS: this file is the only doc. The entry must also carry the root cause and a
     Verify line, because there is no Design.md to hold them. Shape:

     ## 2026-11-22

     - `spikes/electron-cdp/main.js` - fixed the spike stalling before navigation. Root cause:
       `await debugger.sendCommand('Network.enable')` may not resolve until the target
       navigates, so `loadURL()` never ran. The spike now waits at most one second.
       Verify: `npm start` in spikes/electron-cdp writes results.json with reason "load".

     That entry is self-sufficient - a stranger can understand the bug, the fix, and how to check
     it, without any other file. That is the bar for Tier 1.
     ------------------------------------------------------------------------------------------ -->
