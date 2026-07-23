# Panes

A **pane** is a single terminal inside a tab; it may host a detected **agent**
(claude, codex, …). Panes are where work actually happens, so this is the
richest command group. Each pane has a stable `pane_id` (e.g. `w4:pD`).

## Targeting

Most pane commands accept an explicit `<pane_id>` positional, or a
`--pane <id>` / `--current` selector. `--current` resolves the **focused pane**.
When in doubt: `herdr pane current`, or `api snapshot` → `focused_pane_id`.

```sh
herdr pane list [--workspace <id>]            # all panes (JSON)
herdr pane current [--pane <id> | --current]
herdr pane get <pane_id>
```

Other introspection: `pane layout`, `pane process-info`,
`pane neighbor --direction left|right|up|down`, `pane edges`.

## Reading a pane

```sh
herdr pane read <pane_id> [--source V] [--lines N] [--format F] [--ansi]
# --source:  visible | recent | recent-unwrapped   (default visible)
# --lines N: cap rows returned
# --format:  text | ansi
```

Use `--source recent` to pull scrolled-off output; `--lines` to bound it. For
agent reasoning prefer `recent` + `--lines` over the full buffer. (`--ansi` is a
shorthand for keeping color escapes.)

## Putting text into a pane — read this first

| Command | Sends | Enter? |
| --- | --- | --- |
| `pane run <id> "<cmd>"` | command text | **yes** |
| `pane send-text <id> "<text>"` | literal text | no |
| `pane send-keys <id> <key> [key…]` | named keys (`Enter`, `C-c`, `Up`) | only if you pass `Enter` |

```sh
herdr pane run       w4:pD "make test"   # run a shell command (+ Enter)
herdr pane send-keys w4:pD C-c           # interrupt the running process
herdr pane send-keys w4:pD Enter         # submit an already-typed prompt
herdr pane send-text w4:pD "ls -la"      # type text without submitting
```

## Layout: split, swap, move, resize, zoom

```sh
# split = create a pane
herdr pane split [<id>|--current] --direction right|down [--ratio F] [--cwd PATH] [--env K=V] [--focus|--no-focus]

herdr pane swap   --direction left|right|up|down [--pane <id>|--current]
herdr pane swap   --source-pane <id> --target-pane <id>

herdr pane move   <pane_id> --tab <tab_id> --split right|down [--target-pane <id>] [--ratio F] [--focus|--no-focus]
herdr pane move   <pane_id> --new-tab [--workspace <id>] [--label TEXT] [--focus|--no-focus]
herdr pane move   <pane_id> --new-workspace [--label TEXT] [--tab-label TEXT] [--focus|--no-focus]

herdr pane resize --direction left|right|up|down [--amount F] [--pane <id>|--current]
herdr pane zoom   [<pane_id>|--pane <id>|--current] [--toggle|--on|--off]
herdr pane focus  --direction left|right|up|down [--pane <id>|--current]
```

- `split` is how you create a pane. `--ratio` is the new pane's share (0–1).
- `move --new-tab` / `--new-workspace` relocates a pane (with its running
  process) into a brand-new container — promote a side task to its own tab.
- `swap` exchanges two panes' positions; `zoom` toggles a pane to fill the tab.

## Lifecycle + labels

```sh
herdr pane rename <pane_id> <label>   # or:  herdr pane rename <pane_id> --clear
herdr pane close  <pane_id>
```

## Agent status reporting (substrate behind `agent_status`)

These let an external process (an integration or plugin) report what an agent in
a pane is doing. Most agents won't call these directly — built-in integrations do
— but they're how `agent_status` gets populated:

```sh
herdr pane report-agent <id> --source <src> --agent <label> --state idle|working|blocked|unknown \
    [--message T] [--custom-status T] [--seq N] [--agent-session-id ID] [--agent-session-path PATH]
herdr pane report-agent-session <id> --source <src> --agent <label> [--seq N] [--agent-session-id ID] [--agent-session-path PATH]
herdr pane release-agent        <id> --source <src> --agent <label> [--seq N]
herdr pane report-metadata <id> --source <src> [--agent <label>] \
    [--title T|--clear-title] [--display-agent T|--clear-display-agent] \
    [--custom-status T|--clear-custom-status] [--state-label S=T] [--clear-state-labels] [--seq N] [--ttl-ms N]
```

## Pane fields

`pane_id`, `tab_id`, `workspace_id`, `cwd`, `foreground_cwd`, `agent`,
`agent_status`, `agent_session`, `terminal_id`, `focused`, `scroll`, `revision`.

- `cwd` is the pane's working dir; `foreground_cwd` is what the foreground
  process reports (can differ, e.g. inside a subshell).
- `scroll` has `viewport_rows`, `offset_from_bottom`, `max_offset_from_bottom` —
  use these to pick `--lines` for `pane read`.

## Patterns

Split the focused pane and run a watcher in the new pane (its id comes back in
`result.pane.pane_id`):
```sh
herdr pane split --current --direction down --ratio 0.4 --no-focus
# then drive the returned pane id:
herdr pane run <new-pane-id> "bun run test --watch"
```

Promote a build pane to its own tab:
```sh
herdr pane move w4:pD --new-tab --label build
```

Wait for a command to finish, then read the tail:
```sh
herdr pane wait-output w4:pD --match "BUILD SUCCESSFUL" --timeout 60000 \
  && herdr pane read w4:pD --source recent --lines 50
```

## Notes

- `pane split` is the only way to create a pane directly; `tab create` and
  `workspace create` seed their first pane for you.
- `pane current` is context-sensitive (see SKILL.md "Essentials"). In a plugin or
  hook with no caller terminal it resolves the focused pane — the desired
  behavior for focus-driven automation.
