---
name: herdr
description: Use when operating Herdr (herdr.dev), the terminal workspace manager, from a script or agent — creating, focusing, renaming, or closing workspaces, tabs, and panes; splitting, swapping, resizing, zooming, or moving panes; running commands or sending keys/text to panes; reading pane output; launching, attaching to, or waiting on AI coding agents; managing named sessions, git worktrees, agent integrations, plugins, notifications, and the terminal title; or querying live runtime state through the herdr CLI. Covers Herdr 0.7.x on macOS/Linux.
---

# Herdr

## What it is

Herdr is a terminal workspace manager built for AI coding agents (like tmux or
Zellij, but with first-class agent awareness). A persistent **server** holds all
state; the **`herdr` CLI** is a thin client over its Unix socket
(`~/.config/herdr/herdr.sock`). Everything an agent does — inspect state, drive
panes, launch agents — goes through that CLI. This skill documents the CLI; for
the raw socket protocol run `herdr api schema`.

## The hierarchy

```
session  →  workspace  →  tab  →  pane  →  terminal / agent
```

- **Session** — a named, persistent Herdr instance (`default`, or `--session <name>`).
- **Workspace** ("space") — top-level container of tabs. ID like `w4`.
- **Tab** — a layout of panes within a workspace. ID like `w4:tA`.
- **Pane** — one terminal inside a tab; may host a detected **agent**. ID like `w4:pD`.
- **IDs are stable, hierarchical, and human-guessable.** Terminal ids look like
  `term_6563…`. Always target the typed id (`pane_id`/`tab_id`/`workspace_id`),
  never a positional index — indices shift when panes split or move.

## Read everything in one call

```sh
herdr api snapshot        # full live state, one JSON document
```

`result.snapshot` holds `workspaces`, `tabs`, `panes`, `agents`, `layouts`, and
`focused_workspace_id` / `focused_tab_id` / `focused_pane_id`. This is the single
best command to orient before acting. For a lighter health/version check use
`herdr status`.

## Output is JSON by default

Query/management commands (`workspace/tab/pane list`, `get`, …) print a JSON
**envelope** with no flag:

```json
{"id":"cli:workspace:list","result":{"type":"workspace_list","workspaces":[ … ]}}
```

The payload lives under `result.<key>` (e.g. `result.pane`, `result.workspaces`).
A few human-readable commands opt into JSON with `--json`: `status`,
`session list`, `plugin list`.

## Command map

| Goal | Command (details in resource file) |
| --- | --- |
| See all state | `herdr api snapshot` |
| Health / versions | `herdr status [--json]` |
| Workspaces — create/focus/rename/close | `herdr workspace …` → **workspace.md** |
| Tabs — create/focus/rename/close | `herdr tab …` → **tab.md** |
| Panes — split/move/swap/resize/zoom/read/send | `herdr pane …` → **pane.md** |
| Agents — start/send/wait/attach/explain | `herdr agent …` → **agent.md** |
| Block until pane shows text | `herdr wait output <pane> --match "<text>" [--regex] [--timeout MS]` |
| Block until agent reaches a status | `herdr wait agent-status <pane> --status idle\|working\|blocked\|done\|unknown [--timeout MS]` |
| Named sessions | `herdr session list\|attach\|stop\|delete <name>` |
| Git worktrees (per workspace) | `herdr worktree list\|create\|open\|remove` |
| Agent integrations | `herdr integration install <name>` · `integration uninstall <name>` · `integration status [--outdated-only]` |
| Terminal title / direct attach | `herdr terminal title set\|clear` · `herdr terminal attach <terminal_id> [--takeover]` |
| OS notification | `herdr notification show "<title>" [--body T] [--position …] [--sound …]` |
| Plugins | `herdr plugin install\|link\|list\|enable\|disable\|unlink\|uninstall\|action invoke` |
| Socket-API metadata | `herdr api schema [--json \| --output PATH]` |
| Reset custom keybindings | `herdr config reset-keys` |

Integration names: `pi`, `omp`, `claude`, `codex`, `copilot`, `devin`, `droid`,
`kimi`, `opencode`, `kilo`, `hermes`, `qodercli`, `cursor`, `mastracode`.

## THE gotcha — how to put text into a pane

Four commands, four behaviors. Picking the wrong one is the most common agent
mistake:

| Command | Sends | Presses Enter? |
| --- | --- | --- |
| `pane run <id> "<cmd>"` | command text | **yes** |
| `pane send-text <id> "<text>"` | literal text | no |
| `pane send-keys <id> <key> [key…]` | named keys (`Enter`, `C-c`, `Up`) | only if you send `Enter` |
| `agent send <target> "<text>"` | literal text | no — *"use `pane run` when you want Enter"* |

Run a shell command in a pane: `herdr pane run w4:pD "make test"`.
Interrupt it: `herdr pane send-keys w4:pD C-c`.

## Operating loop

1. **Orient** — `herdr api snapshot` (or `herdr pane current` for just the focused pane).
2. **Capture ids** — pull the exact `workspace_id` / `tab_id` / `pane_id` you need.
3. **Act** — create / focus / split / send / move using those ids.
4. **Confirm** — `pane read` / `wait output` / `agent wait` to verify the effect.

## Essentials

- **Focus on create** — `workspace/tab create` and `pane split` take `--focus`
  (default) or `--no-focus`.
- **`pane current`** returns the focused pane when run with no caller terminal
  (plugin/hook context); inside an interactive pane it returns *that* pane. Force
  one with `--current` or `--pane <id>`.
- **Agent targets** (`agent get/send/focus/wait/attach/read`) accept a terminal
  id, unique agent name, detected/reported agent label, or legacy pane id.
- **`agent_status`** values: `idle`, `working`, `blocked`, `unknown` (`wait
  agent-status` also accepts `done`).
- **Direct attach** (`terminal attach`) is tmux-style: detach with `Ctrl-b q`;
  send a literal `Ctrl-b` with `Ctrl-b Ctrl-b`.
- **Env on create** — `workspace/tab create` and `pane split` accept repeated
  `--env KEY=VALUE`.

## Reference files

- **workspace.md** — full workspace command reference and patterns.
- **tab.md** — full tab command reference and patterns.
- **pane.md** — full pane reference (split, move, swap, resize, zoom, read,
  send-text/send-keys/run, agent reporting).
- **agent.md** — agent lifecycle (start, send, wait, attach, explain) and how
  agents relate to panes.

## Requirements

Herdr `0.7.0+` on macOS or Linux. Confirm with `herdr status`. The socket API
and event-hook names are introspectable via `herdr api schema`.
