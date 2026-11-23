# ISSUE-NNNN - Low-Level Design

<!-- ==========================================================================================
     The ONLY file in this ticket containing implementable detail.
     If it is copy-pasteable into a source file, it belongs here - not in HLD.md.
     Cross-reference HLD.md by heading NAME, never by step number. Numbers get renumbered and
     the references go stale silently.
     ========================================================================================== -->

**High-level design:** [HLD.md](HLD.md)

## Files Touched

| File | Change |
|------|--------|
| `src/renderer/src/...` | |
| `src/main/...` | |

## Process Boundaries & IPC

<!-- Which code runs in the main process, the preload script and the renderer. List every new or
     changed IPC channel and add an IPC_Contracts.md entry for each one.
     Keep nodeIntegration: false, contextIsolation: true and sandbox: true on every window that
     shows web content. -->

## Data Model & Validation

<!-- New or changed types, and the Zod schema that validates each one. Validate all untrusted
     input: page DOM, network responses, screenshot files and OCR output. -->

## Logic

<!-- Name the steps, do not number them. "Redact headers", not "step 4".
     Numbering is what breaks cross-references between this file and HLD.md/Test_Cases.md. -->

## Privacy & Redaction

<!-- What sensitive data this code can see, and how that data is kept out of storage, logs and
     the exported context package: cookies, authorization headers, tokens, keys, request bodies.
     Name the size and count limits that apply. -->

## Edge Cases & Error Handling

<!-- Never surface internal exception messages or stack traces in the UI - show a generic message
     for anything unexpected. Hand-written validation messages meant for display pass through
     as-is. Report data that could not be captured instead of inventing it. -->

## Verification / Rollout

<!-- How to prove it works and how to back it out.
     Reference Test_Cases.md rather than repeating cases here. -->
