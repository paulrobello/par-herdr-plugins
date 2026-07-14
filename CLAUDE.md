# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo of custom [Herdr](https://herdr.dev) terminal-workspace-manager plugins, plus a Claude Code skill documenting the Herdr CLI and a curated Herdr config. Three distinct concerns live here:

- **`plugins/`** — Herdr plugins written in TypeScript, run directly by Bun. No runtime build step, no runtime dependencies (only `node:` built-ins).
- **`skills/herdr/`** — a Claude Code skill (reference markdown) for operating Herdr from a script or agent. Consult it before driving Herdr.
- **`config/herdr/config.toml`** — a curated Herdr app config, symlinked into `~/.config/herdr/config.toml` by `make install`.

## Commands

The Makefile is the source of truth. Run from the repo root:

| Command | What it does |
| --- | --- |
| `make checkall` | Full gate: typecheck + lint + test. Run before claiming work is done. |
| `make typecheck` | `bunx tsc --noEmit` (root tsconfig `include`s `plugins/**/*.ts`). |
| `make lint` / `make fmt` | `biome lint .` / `biome format --write .` (Biome owns formatting). |
| `make test` | `bun test` — all tests. |
| `make build` | Smoke-bundle the plugin entrypoint to a throwaway dir (proves it transpiles). |
| `make install` | Link local plugins, install recommended third-party plugins, back up + symlink the Herdr config, reload. Idempotent. |
| `make pre-commit` / `make pre-commit-update` | `pre-commit run --all-files` / `pre-commit autoupdate`. |

Run a single test: `bun test plugins/terminal-title-sync/sync-title.test.ts --test-name-pattern "pickTitle"` (scope to a file with a path, filter by test name with `-t` / `--test-name-pattern`).

`make fmt` rewrites the whole repo, so format only the files you touched before committing to avoid dragging unrelated files into the diff.

## Architecture

### Plugins run from TypeScript source — there is no runtime build

Herdr invokes a plugin by spawning the `command` declared in its `herdr-plugin.toml` (e.g. `["bun", "sync-title.ts"]`); the TypeScript is executed directly by Bun at event/action time. The root TypeScript + Biome toolchain is **dev-only** (typecheck/lint/test) and never produces a shipped artifact. Consequences:

- A plugin's only dependencies are `node:` built-ins — do not add runtime deps.
- Each plugin has its own `tsconfig.json` extending the root; the root `tsconfig.json` `include`s `plugins/**/*.ts`, so typecheck covers every plugin automatically.
- `package.json` `workspaces` is `plugins/*`; devDeps (biome, typescript, @types/bun) are root-only. Plugin `package.json`s are `private: true` with no dependencies.

### Herdr ↔ plugin contract

A plugin is driven by Herdr events/actions and calls back into Herdr through the CLI (see `plugins/terminal-title-sync/sync-title.ts`):

- **Manifest** (`herdr-plugin.toml`): `[[events]] on = "<event>"` and `[[actions]]`, each with a `command` argv that Herdr spawns when the event fires / action is invoked.
- **Injected env**: Herdr sets `HERDR_BIN_PATH` (portable CLI wrapper) and `HERDR_PLUGIN_STATE_DIR` (per-plugin scratch dir). Read with portable fallbacks: `process.env.HERDR_BIN_PATH || "herdr"` and `process.env.HERDR_PLUGIN_STATE_DIR || join(tmpdir(), "<plugin-name>")`.
- **JSON envelope**: query commands (`pane get`, `tab get`, …) return `{"id":"cli:…","result":{…}}`; the payload lives under `result.<key>` (e.g. `result.pane`). Parse and pull `result[key]`.
- **State**: persist scratch state (caches, etc.) under `HERDR_PLUGIN_STATE_DIR`, never in the repo tree.

### terminal-title-sync

Sets the outer terminal title from the focused pane, resolving in strict priority: **`agent_title` > `tab_title` > `space_title` > bare agent name > `"herdr"`**. The bare agent name is deliberately last (a set tab/space label beats a near-constant name like "claude"). Title text is sanitized (control chars stripped, whitespace collapsed, capped at 200 chars) before `herdr terminal title set`. The last title is cached under `HERDR_PLUGIN_STATE_DIR/last-title` to avoid re-writing unchanged titles.

### Herdr model (see `skills/herdr/`)

`skills/herdr/SKILL.md` plus `workspace.md` / `tab.md` / `pane.md` / `agent.md` are the reference for the Herdr CLI. Facts that catch agents out:

- Hierarchy: `session → workspace → tab → pane → terminal/agent`. IDs are stable and hierarchical (`w4`, `w4:tA`, `w4:pD`). **Always target the typed id, never a positional index** — indices shift when panes split or move.
- `herdr api snapshot` returns full live state in one JSON call; orient with it before acting.
- Four ways to put text in a pane, only one presses Enter: `pane run` (command + Enter), `pane send-text` (literal, no Enter), `pane send-keys` (named keys), `agent send` (literal, no Enter — "use `pane run` when you want Enter"). Picking the wrong one is the most common agent mistake.

## Pre-commit

`.pre-commit-config.yaml` runs two pinned secret scanners (`gitleaks`, `detect-private-key` — required) plus `repo: local` hooks that delegate to `make fmt|lint|typecheck|test` with `types: [ts]` (fire only when TS changes). Biome owns formatting, so there are deliberately no pre-commit-hooks whitespace/EOF fixers that would fight it. The hook is installed at `.git/hooks/pre-commit`; `make pre-commit` runs every hook across all files.

## Install (`make install` / `scripts/install.sh`)

Idempotent and re-run-safe:

- Links every `plugins/*/herdr-plugin.toml` from local source (re-linking is a no-op).
- Installs recommended third-party plugins only when not already present (detected via `herdr plugin list --json` `plugin_id` match) — re-running never bumps pinned versions; a per-plugin install failure is reported, not fatal.
- Backs up an existing `~/.config/herdr/config.toml` to a timestamped `.bak` before symlinking the repo config; skips if already symlinked to the repo config; leaves a symlink pointing elsewhere untouched.
- `herdr server reload-config` is non-fatal.

## Conventions

- Plugin ids use the `par.` namespace (e.g. `par.terminal-title-sync`).
- Plugins target Herdr `0.7.0+` on `macos`/`linux` and require Bun on `PATH`.
- `.claude/settings.local.json` is gitignored local harness config — do not commit it.
