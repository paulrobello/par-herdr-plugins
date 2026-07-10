# Terminal Title Sync — Design

**Date:** 2026-07-10
**Plugin id:** `par.terminal-title-sync`
**Status:** Approved-for-build (autonomous session)

## Goal

A Herdr plugin that automatically sets the **outer terminal window title** to the
most meaningful label of the focused pane, resolved in strict priority order:

1. **agent_title** — the focused pane's agent task title (highest priority)
2. **tab_title** — the focused tab's label
3. **space_title** — the focused workspace's label (lowest priority)

The first non-empty value wins; lower-priority sources are **not** appended. This
makes Herdr sessions show a useful title in outer terminals/clients that track the
terminal title (e.g. Moshi, iTerm, terminal tab bars) — the role tmux's
`set-titles` plays for tmux.

This is the first plugin in a **monorepo of custom Herdr plugins**, where each
plugin lives in its own subfolder under `plugins/`.

## Herdr integration surface (researched)

Confirmed against a running Herdr 0.7.3 server and the socket-API docs
(<https://herdr.dev/docs/socket-api/>).

- **Setting the title** is a CLI wrapper around `client.window_title.set`:
  - `herdr terminal title set <title>`
  - `herdr terminal title clear`
  - It writes the OSC title sequence to the foreground client's outer terminal.

- **Query commands emit JSON by default** (no `--json` flag). Responses are an
  envelope `{"id":..., "result":{ "<key>": {...}, "type": ... }}`.
  - `herdr pane current` → `result.pane` — fields: `title`, `display_agent`,
    `agent`, `agent_status`, `agent_session`, `tab_id`, `workspace_id`.
    *When invoked from a plugin process (no caller terminal), this returns the
    active focused pane.*
  - `herdr tab get <tab_id>` → `result.tab` — fields: `label`, `number`.
  - `herdr workspace get <workspace_id>` → `result.workspace` — fields: `label`,
    `number`.

- **Plugin model:** a `herdr-plugin.toml` manifest declares `[[actions]]` and
  `[[events]]` hooks. Herdr injects `HERDR_BIN_PATH` (portable CLI wrapper) and
  `HERDR_PLUGIN_STATE_DIR` (per-plugin scratch dir). The docs recommend plugins
  use the CLI wrappers rather than the raw socket for portable behavior, so this
  plugin shells out to `herdr` via `HERDR_BIN_PATH` (same approach as the
  reference plugin).

- **Valid event-hook names** verified against `herdr api schema`: the set used
  here (`workspace.focused/renamed/updated`, `tab.focused/renamed`,
  `pane.focused/agent_detected/agent_status_changed/moved/created/closed`) all
  exist, so the manifest links with no "unknown event" warnings.

## Title resolution

Pure, side-effect-free function under test:

```
pickTitle(pane, tab, workspace):
  agent_title   = pane.title, else (pane.display_agent || pane.agent) if an agent is detected
  tab_title     = tab.label
  space_title   = workspace.label
  return first non-empty of [agent_title, tab_title, space_title], else "herdr"
```

**`agent_title` semantics (decided default, easy to change):** the reported task
title (`pane.title`, e.g. "Refactor auth middleware") when an integration reports
one; otherwise the detected agent's display name (`display_agent`, falling back to
`agent`, e.g. "claude"). Rationale: an active agent should produce a title so the
highest-priority tier is meaningful, matching the reference plugin's intent. To
restrict `agent_title` to *only* reported task titles, drop the agent-name
fallback in `agentTitle()` — a one-line change.

Title text is **sanitized** before use because it is emitted via OSC: strip C0
control chars and DEL, collapse whitespace, trim, cap length. A **dedup state
file** (`HERDR_PLUGIN_STATE_DIR/last-title`) records the last title set so we
skip redundant `terminal title set` writes when the resolved title is unchanged.

## Architecture

```
par-herdr-plugins/                       # monorepo root + shared tooling
├── README.md
├── LICENSE                              # MIT
├── Makefile                             # build, test, lint, fmt, typecheck, checkall
├── package.json                         # root dev tooling (typescript, @types/bun, biome)
├── tsconfig.json                        # strict, noEmit, covers plugins/**
├── biome.json                           # lint + format config
├── docs/superpowers/specs/              # this design + future specs
└── plugins/
    └── terminal-title-sync/             # independently linkable/installable plugin
        ├── herdr-plugin.toml            # manifest: refresh action + event hooks
        ├── sync-title.ts                # entrypoint (run by `bun`)
        ├── sync-title.test.ts           # bun:test unit tests for the pure logic
        ├── package.json
        ├── tsconfig.json
        └── README.md
```

**Runtime:** TypeScript executed directly by **Bun** (`bun sync-title.ts`) — no
build step, no runtime dependencies (only `node:` built-ins). Matches the
official Herdr plugin example (`bun run bootstrap.ts`). The TypeScript toolchain
(`typescript`, `@types/bun`, `biome`) is **root-only dev tooling**; plugins ship
dependency-free and run anywhere Bun is on `PATH`.

**Entrypoint shape:** `sync-title.ts` exports the pure helpers (`clean`,
`agentTitle`, `pickTitle`) for testing and guards the CLI side effects behind
`if (import.meta.main) main()`, so importing the module (in tests) does not set
the title.

## Triggering

The `refresh` action (`herdr plugin action invoke par.terminal-title-sync.refresh`)
and the same script wired to event hooks. Events cover the state changes that can
change the resolved title: focus moves, renames/updates, agent detection and
status changes, pane lifecycle. Each invocation resolves fresh from Herdr (no
in-process state), so it self-heals after any event.

## Verification

- `make checkall` → `tsc --noEmit` (strict) + `biome lint` + `bun test`.
- Unit tests cover `clean()` and the full `pickTitle` priority chain.
- Smoke test: run `bun plugins/terminal-title-sync/sync-title.ts` against the live
  server and confirm it prints a resolved title and sets it via
  `herdr terminal title set`.
- Link test: `herdr plugin link plugins/terminal-title-sync` and confirm
  `plugin.list` shows no warnings.

## Known considerations

- **`pane current` target:** when run from a plugin process (no caller terminal)
  it returns the active focused pane — the desired behavior. Run interactively
  inside a pane it returns that pane instead. If focus-based resolution ever
  proves wrong in the hook context, switch to resolving from the focused
  workspace → active tab → focused pane.
- **Platforms:** `macos`, `linux` (matches the reference; Windows socket/pipe
  handling is unverified).
- **`min_herdr_version`:** `0.7.0` (matches reference + docs example).
