# Agents

An **agent** is an AI coding process (claude, codex, gemini, …) running **inside
a pane**. Herdr detects running agents and tracks their status, so you can drive
them programmatically: launch one, type a prompt, wait for it to finish, or
attach to take it over. An agent is always backed by a pane, so pane and agent
commands interoperate freely.

## Targets are flexible

`agent get/send/read/rename/focus/wait/attach` take a **`<target>`** that can be
any of:

- a terminal id (`term_…`),
- a unique **agent name**,
- a detected/reported **agent label**,
- a legacy **pane id**.

Find what's running first with `agent list` or `api snapshot` → `agents`.

## Commands

```sh
herdr agent list
herdr agent get    <target>
herdr agent read   <target> [--source V] [--lines N] [--format F] [--ansi]   # same options as pane read
herdr agent send   <target> "<text>"          # LITERAL text, NO Enter
herdr agent rename <target> <name> | --clear
herdr agent focus  <target>
herdr agent wait   <target> --status idle|working|blocked|unknown [--timeout MS]
herdr agent attach <target> [--takeover]
herdr agent explain <target> [--json]
herdr agent explain --file <path> --agent <label> [--json]
```

### `agent send` vs `pane run` — don't mix them up

`agent send` writes **literal text with no Enter** — it types into the agent's
prompt but does not submit. To submit, follow with
`pane send-keys <pane> Enter`, or just use `pane run <pane> "<text>"` which
types **and** presses Enter. The CLI itself states: *"agent send writes literal
text; use pane run when you want command text plus Enter."*

## Starting an agent

```sh
herdr agent start <name> [OPTIONS] -- <argv...>
# --cwd PATH · --workspace <id> · --tab <id> · --split right|down · --env KEY=VALUE · --focus|--no-focus
```

`<argv...>` after `--` is the full command line to launch (e.g. `claude`,
`codex`, `gemini`). `--split` puts the agent in a new split pane; `--tab` /
`--workspace` place it in a specific container.

```sh
herdr agent start claude --cwd ~/Repos/foo --split right --focus -- claude
```

## Agent fields

From `agent get` / `api snapshot` → `agents`: `agent`, `agent_session`,
`agent_status`, `cwd`, `foreground_cwd`, `pane_id`, `tab_id`, `workspace_id`,
`terminal_id`, `focused`, `revision`.

- `agent` — detected label (e.g. `claude`).
- `agent_session` — session identity (`source`, `agent`, `kind`, `value`); use it
  to correlate with the agent's own session files.
- `agent_status` — `idle` | `working` | `blocked` | `unknown`.

## Patterns

Launch an agent in a fresh split, then wait for it to reach its initial idle
prompt:
```sh
herdr agent start claude --cwd ~/Repos/foo --split right --focus -- claude
# the created pane id is in result.pane.pane_id of the start response
herdr agent wait <pane-id> --status idle --timeout 30000
```

Send a prompt and submit it (the agent's pane id is in `result.agent.pane_id`):
```sh
herdr agent send <pane-id> "refactor the auth middleware"
herdr pane send-keys <pane-id> Enter
```

Wait for an agent to finish working (a finished agent reports `idle` — note `done` is valid only for the lower-level `wait agent-status`, not for `agent wait`), then read its last output:
```sh
herdr agent wait w4:pD --status idle --timeout 300000
herdr agent read  w4:pD --source recent --lines 80
```

Ask Herdr to summarize what an agent is doing right now:
```sh
herdr agent explain w4:pD --json
```

## Notes

- `agent wait` blocks until the agent reaches the given status or `--timeout`
  (ms) elapses. For a specific output string rather than a status, use
  `wait output <pane> --match "<text>"` instead.
- Two different "wait" commands with slightly different status sets:
  `agent wait` takes `idle|working|blocked|unknown`; the lower-level
  `wait agent-status` also accepts `done`.
- Every agent record includes `pane_id`/`tab_id`/`workspace_id`, so you can drop
  from an agent target to its pane for `pane run` / `send-keys` / `read`.
