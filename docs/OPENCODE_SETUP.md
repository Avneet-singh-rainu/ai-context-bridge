# OpenCode setup

This repository keeps a **project-local** copy of the personal setup kit from Google Drive. Nothing was written to `~/.config/opencode`, `~/.claude`, or any other global location.

## What was kept

| Source in the kit | Local OpenCode file |
|---|---|
| `global/CLAUDE.md` | `AGENTS.md` at the repository root |
| `global/output-styles/simple-english.md` | `.opencode/instructions/simple-english.md`, loaded by `opencode.jsonc` |
| `forge/.claude/agents/*.md` | `.opencode/agents/*.md` (5 agents) |
| `memory/*.md` | `.opencode/memory/*.md` (30 notes), exposed as the `setup-kit-memory` reference |

## What was removed

Only the verbatim archive `.opencode/kit/` was removed. That archive contained the single-file bundle, the Forge rules, runbooks, templates, and the two PowerShell scripts. The active OpenCode files listed above were kept.

The 2 kit skills (`forge/.claude/skills/*/SKILL.md`) are not in this repository. An earlier version of this page listed them under `.opencode/skills/`, but that folder was never committed. Copy the skills from the kit again if they are needed.

## Adaptations

- Agent frontmatter keeps `description` and adds `mode: subagent`. The Claude-only `tools` field was removed.
- The Simple English output style was converted to a plain instruction file; OpenCode does not use output-style frontmatter.
- Old home and Forge paths were rewritten to this project in the active copies.
- Three extra rules were added to `AGENTS.md`: use question popups for decisions, confirm git network operations, and list changed files at the end.

## Not replicated

These Claude Code settings have no project-local OpenCode equivalent, so they were skipped:

- `model: opus[1m]` and `effortLevel: xhigh` - choose a model in the OpenCode TUI.
- `theme: light`, `editorMode: vim`, and notification flags - CLI preferences are global only.
- Toast hooks, Claude plugins, MCP servers, and the toast PNG.
