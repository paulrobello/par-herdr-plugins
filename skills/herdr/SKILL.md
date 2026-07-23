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

## CLI newer than the server — `snapshot` / pane commands fail

The CLI and the background server speak a versioned protocol. After a CLI
upgrade they can drift (e.g. CLI `0.7.5` / protocol 17 against a still-running
server `0.7.3` / protocol 16). When the CLI is newer, `herdr api snapshot` and
every pane-driving command fail with a `protocol_mismatch` error ("client
protocol N is newer than server protocol M"). Detect it before you rely on the
CLI:

```sh
herdr status --json   # look for server.compatible == false, server.restart_needed == true
```

The only fix is to restart the server — and **`herdr server stop` (then relaunch
Herdr) closes every existing pane and session system-wide**, not just this
task's, so confirm nothing else is running in Herdr first. If you can't restart
because other work is live, skip pane-driving and do the work directly in the
current session instead: the mismatch only blocks CLI-to-server calls, not your
own session.

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
| Agents — start/prompt/send-keys/wait/attach/explain | `herdr agent …` → **agent.md** |
| Block until pane shows text | `herdr pane wait-output <pane> (--match "<text>" \| --regex PAT) [--timeout MS]` |
| Block until agent reaches a status | `herdr agent wait <target> [--until idle\|working\|blocked\|done\|unknown]... [--timeout MS]` |
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

| Command | Sends | Submits? |
| --- | --- | --- |
| `pane run <id> "<cmd>"` | command text | **yes** (text + Enter) |
| `pane send-text <id> "<text>"` | literal text | no |
| `pane send-keys <id> <key> [key…]` | named keys (`Enter`, `C-c`, `Up`) | only if you send `Enter` |
| `agent prompt <target> "<text>"` | a prompt to an agent | **yes** (submits it) |
| `agent send-keys <target> <key>…` | named keys to an agent | only if you send `Enter` |

There is no "literal text, no submit" **agent** command — for that, send
`pane send-text <id> "<text>"` to the agent's own pane.

Run a shell command in a pane: `herdr pane run w4:pD "make test"`.
Interrupt it: `herdr pane send-keys w4:pD C-c`.

## Operating loop

1. **Orient** — `herdr api snapshot` (or `herdr pane current` for just the focused pane).
2. **Capture ids** — pull the exact `workspace_id` / `tab_id` / `pane_id` you need.
3. **Act** — create / focus / split / send / move using those ids.
4. **Confirm** — `pane read` / `pane wait-output` / `agent wait` to verify the effect.

## Essentials

- **Focus on create** — `workspace/tab create` and `pane split` take `--focus`
  (default) or `--no-focus`.
- **`pane current`** returns the focused pane when run with no caller terminal
  (plugin/hook context); inside an interactive pane it returns *that* pane. Force
  one with `--current` or `--pane <id>`.
- **Agent targets** (`agent get/prompt/send-keys/focus/wait/attach/read`) accept a
  terminal id, unique agent name, detected/reported agent label, or legacy pane id.
- **`agent_status`** values: `idle`, `working`, `blocked`, `unknown`, `done`.
  `agent wait` and `agent prompt --until` accept any of them; without `--until`,
  `agent wait` matches `idle|done|blocked`.
- **Direct attach** (`terminal attach`) is tmux-style: detach with `Ctrl-b q`;
  send a literal `Ctrl-b` with `Ctrl-b Ctrl-b`.
- **Env on create** — `workspace/tab create` and `pane split` accept repeated
  `--env KEY=VALUE`.

## Reference files

- **workspace.md** — full workspace command reference and patterns.
- **tab.md** — full tab command reference and patterns.
- **pane.md** — full pane reference (split, move, swap, resize, zoom, read,
  send-text/send-keys/run, agent reporting).
- **agent.md** — agent lifecycle (start, prompt, send-keys, wait, attach, explain)
  and how agents relate to panes.

## Requirements

Herdr `0.7.0+` on macOS or Linux. Confirm with `herdr status`. The socket API
and event-hook names are introspectable via `herdr api schema`.
