# AI Decisions - issue-3

Claude picks first and logs the pick here before acting; the user answers in a quiz at the end of
the turn. Never change a logged pick to match the answer.

## D1 - Where main, preload and renderer code live

- Claude: keep the repo layout - main in `src/native/main/`, preload in `src/native/preload/`, React renderer in `src/app/` - and point electron-vite at those entries.
- Why: README, the handoff and the existing `src/app/features/*` folders already use this layout; electron-vite takes custom entries with a few config lines, so the framework is not fought.
- You: electron-vite defaults
- Result: Right - your pick was better. The handoff says not to force a structure that fights the framework, and DEVELOPMENT.md called the old layout framework-neutral until the stack was confirmed; the defaults drop all custom entries from electron.vite.config.ts.
- Acted on: moved main to src/main, preload to src/preload, renderer to src/renderer (code in src/renderer/src), shared IPC contract to src/shared; removed custom entries from electron.vite.config.ts.

## D2 - Lint and format tooling

- Claude: ESLint 10 flat config with typescript-eslint, react-hooks and react-refresh, plus Prettier; TypeScript pinned to 6.0.3.
- Why: typescript-eslint is the standard TypeScript linter and the React hooks rules exist only for ESLint; typescript-eslint 8.73 supports TypeScript below 6.1, so TypeScript 7 is not an option with it yet.
- You: Biome only
- Result: Right - your pick was better. The Claude reason was wrong: Biome has its own hooks rules (useExhaustiveDependencies, useHookAtTopLevel). The ESLint config also used no type-aware rules, so pinning TypeScript to 6.0 bought nothing.
- Acted on: replaced ESLint and Prettier with Biome; TypeScript moved to 7.

## D3 - How the renderer switches between Browser, Screenshots and Context

- Claude: React `useState` holding the active view id, driven by a typed list of nav items; no router package.
- Why: three fixed views in one window, no URLs to share or deep-link; a router adds a dependency and history handling the desktop app does not need yet.
- You: React Router
- Result: Wrong. Three fixed views in one desktop window have no URLs to share or deep-link; a router adds a dependency for nothing yet. Fair point: nested views later (for example a context item detail) could justify a memory router, and the swap is small.
- Acted on: none - Claude pick kept

## D4 - Documentation tier for issue-3

- Claude: Tier 2 - `ticket.yaml`, `Design.md`, `CHANGELOG.md`, `Test_Cases.md`.
- Why: a normal feature with one clear design and no competing approaches needing ADRs; Tier 3 HLD/LLD would split a short design across two files.
- You: Tier 1 - trivial
- Result: Wrong. Tier 1 is one file, no design choice, under a day; issue-3 touches 30+ files and carries four design choices.
- Acted on: none - Claude pick kept
