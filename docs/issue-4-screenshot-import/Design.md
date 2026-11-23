# issue-4 - Import and manage screenshots

**Systems:** [screenshots](../_systems/screenshots.md), [app-shell](../_systems/app-shell.md)
**Related:** [issue-3](../issue-3-electron-shell/Design.md) (app shell this builds on)

## Context / Problem

Milestone 2 needs the first real feature: the user brings in several screenshots and reviews
them before OCR and export arrive in Milestone 3. The handoff asks for a multi-file picker,
drag-and-drop if practical, thumbnails with filenames, reorder and remove, and basic image
validation with size limits. Acceptance: the user can import and review 5 to 10 screenshots.

## Design

How import works, every check and limit, the data kept per screenshot, and where state lives are
in [Screenshots](../_systems/screenshots.md). This ticket adds:

- **Import in the renderer only.** A file input and a drop zone hand `File` objects to
  `importScreenshots`. No new IPC channel, so the main process never reads a path that the
  renderer names.
- **Checks before decoding.** Count, size, and duplicate checks need no bytes. Format comes from
  the file signature, and width and height come from the file header, so an oversized image is
  refused before any decoding starts. A decode step then catches broken files.
- **Thumbnails as small data URLs.** Each image is decoded once and drawn at up to 480 x 360. The
  CSP stays unchanged and the list never holds 20 full-size decoded images.
- **List state above the workspaces.** `ScreenshotsProvider` wraps the app, because `App.tsx`
  unmounts the inactive workspace and Milestone 3 needs the same list.
- **Reorder and remove.** Each card has **<**, **>**, and **Remove** buttons with labels that
  name the file, so the list works from the keyboard.
- **Stray drops are refused.** `main.tsx` cancels file drops outside a drop zone, so a file
  dropped on the sidebar never replaces the app page. In Electron, the `will-navigate` block from
  issue-3 is the second guard.

The decisions behind these choices are in [AI_Decisions.md](AI_Decisions.md).

## Verification / Rollout

[Test_Cases.md](Test_Cases.md) lists the checks. Nothing reads the screenshot list yet, so
backing out means restoring the placeholder `ScreenshotsWorkspace.tsx` and removing the provider
from `App.tsx`.
