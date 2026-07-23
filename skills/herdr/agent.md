# Agents

An **agent** is an AI coding process (claude, codex, gemini, …) running **inside
a pane**. Herdr detects running agents and tracks their status, so you can drive
them programmatically: launch one, type a prompt, wait for it to finish, or
attach to take it over. An agent is always backed by a pane, so pane and agent
commands interoperate freely.

## Targets are flexible

`agent get/prompt/send-keys/read/rename/focus/wait/attach` take a **`<target>`**
that can be any of:

- a terminal id (`term_…`),
- a unique **agent name**,
- a detected/reported **agent label**,
- a legacy **pane id**.

Find what's running first with `agent list` or `api snapshot` → `agents`.

## Commands

```sh
herdr agent list
herdr agent get       <target>
herdr agent read      <target> [--source visible|recent|recent-unwrapped|detection] [--lines N] [--format text|ansi] [--ansi]
herdr agent prompt    <target> "<text>" [--wait] [--until STATUS]... [--timeout MS]   # submit a prompt (types + submits)
herdr agent send-keys <target> <key> [key…]                                          # named keys only (no text)
herdr agent rename    <target> <name> | --clear
herdr agent focus     <target>
herdr agent wait      <target> [--until STATUS]... [--timeout MS]                    # default matches idle|done|blocked
herdr agent attach    <target> [--takeover]
herdr agent start     <name> --kind <KIND> --pane <ID> [--timeout MS] [-- <agent-args>...]
herdr agent explain   <target> [--json] | --file <path> --agent <label>
```

### `agent prompt` vs `pane run` — don't mix them up

`agent prompt <target> "<text>"` **submits** the prompt — it types the text *and*
sends the submit keystroke, so the agent starts working on it immediately. Do
**not** follow it with `pane send-keys <pane> Enter`; that fires a second, empty
prompt. There is no "literal text, no submit" agent command — for that, target
the agent's own pane with `pane send-text <pane> "<text>"`.

For shell panes the equivalent pair is `pane run <pane> "<cmd>"` (types +
Enter) vs `pane send-text <pane> "<text>"` (literal, no Enter).

## Starting an agent

`agent start` launches a supported agent **in a pane that already exists and is
sitting at an interactive shell prompt** — it does not create a pane or set a
cwd. So create the pane first (with the cwd you want), then start the agent:

```sh
herdr agent start <NAME> --kind <KIND> --pane <ID> [--timeout MS] [-- <agent-args>...]
# --kind  required — canonical executable:
#         pi|claude|codex|gemini|cursor|devin|agy|cline|omp|mastracode|opencode|
#         copilot|kimi|kiro|droid|amp|grok|hermes|kilo|qodercli|maki
# --pane  required — an existing pane at its shell prompt
# --timeout  wait for interactive readiness (default 30000; max 300000)
# -- <agent-args>  appended to the agent's argv. Pass FLAGS ONLY — --kind
#                  already selects the binary, so don't repeat it
#                  (e.g. `-- --dangerously-skip-permissions`, not `-- claude …`).
```

```sh
# 1. open a tab whose shell starts in the repo (returns result.root_pane.pane_id)
herdr tab create --workspace w4 --cwd ~/Repos/foo --no-focus
# 2. start claude in that pane
herdr agent start worker --kind claude --pane w4:pZ --timeout 120000
```

## Agent fields

From `agent get` / `api snapshot` → `agents`: `agent`, `agent_session`,
`agent_status`, `cwd`, `foreground_cwd`, `pane_id`, `tab_id`, `workspace_id`,
`terminal_id`, `focused`, `revision`.

- `agent` — detected label (e.g. `claude`).
- `agent_session` — session identity (`source`, `agent`, `kind`, `value`); use it
  to correlate with the agent's own session files.
- `agent_status` — `idle` | `working` | `blocked` | `unknown` | `done`.

## Patterns

Create a pane, start an agent in it, and wait for it to reach its initial idle
prompt:
```sh
herdr tab create --workspace w4 --cwd ~/Repos/foo --no-focus   # note result.root_pane.pane_id
herdr agent start worker --kind claude --pane w4:pZ --timeout 120000
herdr agent wait  w4:pZ --until idle --timeout 120000
```

Submit a prompt and wait for the agent to settle (the pane id is
`result.agent.pane_id` from `start`, or find it via `agent list`):
```sh
herdr agent prompt w4:pZ "refactor the auth middleware" --wait --until idle --timeout 300000
herdr agent read   w4:pZ --source recent --lines 80
```

`--wait` on `agent prompt` blocks until the first state change after submission
(a 5 s stall window, then it matches `idle`/`done`/`blocked` by default);
without `--wait` it submits and returns immediately.

Ask Herdr to summarize what an agent is doing right now:
```sh
herdr agent explain w4:pZ --json
```

## Notes

- `agent wait` blocks until the agent reaches a matching state or `--timeout`
  (ms) elapses. Without `--until` it matches `idle|done|blocked`; pass
  `--until unknown` (or `working`) to match those explicitly. For a specific
  output string rather than a status, use `pane wait-output <pane> --match "<text>"`.
- `agent_status` values are `idle`, `working`, `blocked`, `unknown`, and `done`.
  `agent wait` / `agent prompt --until` accept any of them.
- Every agent record includes `pane_id`/`tab_id`/`workspace_id`, so you can drop
  from an agent target to its pane for `pane run` / `send-text` / `send-keys` /
  `read`.
