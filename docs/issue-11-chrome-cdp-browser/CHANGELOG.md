# Changelog - issue-11

## 2026-11-23

- `docs/decisions/0002-chrome-cdp-browser.md` - replaced the Electron browser-host choice with an
  installed Chrome page engine driven by CDP.
- `docs/issue-11-chrome-cdp-browser/` - added the Tier 3 design, test cases and known issues.
- `src/main/browser/chrome-launcher.ts` - added Chrome discovery, headless launch arguments,
  debugging endpoint parsing and process ownership.
- `tests/unit/chrome-launcher.test.ts` - covered Chrome discovery, launch arguments and endpoint
  parsing.
