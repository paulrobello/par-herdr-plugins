# Workspaces

A **workspace** ("space") is the top of the live hierarchy — a collection of
tabs. It is the unit you switch between when context-changing (different repo,
different project). Each workspace has a stable `workspace_id` (e.g. `w4`), a
`label`, and an active tab.

## Commands

```sh
herdr workspace list                         # all workspaces (JSON)
herdr workspace get <workspace_id>           # one workspace (JSON)
herdr workspace create [OPTIONS]             # new workspace
herdr workspace focus <workspace_id>         # switch focus to it
herdr workspace rename <workspace_id> <label>
herdr workspace close <workspace_id>         # destroy it and its tabs/panes
```

### `workspace create` options

| Option | Meaning |
| --- | --- |
| `--cwd PATH` | starting directory for the first pane |
| `--label TEXT` | human label |
| `--env KEY=VALUE` | extra env vars (repeatable) |
| `--focus` / `--no-focus` | whether it takes focus (default `--focus`) |

The new workspace's id is returned in the JSON result (`result.workspace.workspace_id`)
— capture it for follow-up commands.

## Fields (from `workspace get` / `api snapshot`)

| Field | Meaning |
| --- | --- |
| `workspace_id` | stable id, e.g. `w4` |
| `label` | human label |
| `number` | 1-based position |
| `active_tab_id` | currently focused tab |
| `tab_count`, `pane_count` | sizes |
| `agent_status` | rolled-up status (`idle`/`working`/`blocked`/`unknown`) |
| `focused` | is this the focused workspace |

## Patterns

Spin up a workspace for a repo and focus it:
```sh
herdr workspace create --cwd ~/Repos/foo --label foo --focus
```

Switch context without losing the current one:
```sh
herdr workspace focus w7
```

Rename from a generic label to something meaningful:
```sh
herdr workspace rename w4 "auth-refactor"
```

Tear down cleanly (closes every tab and pane inside):
```sh
herdr workspace close w7
```

## Notes

- **Closing is destructive.** `workspace close` destroys every tab and pane in
  it — there is no "close but keep". Confirm the id from `workspace list` first.
- `workspace get` is a cheap, targeted read; `api snapshot` returns every
  workspace at once if you need to scan them all.
- The focused workspace's label is the lowest-priority source for terminal-title
  plugins (a set tab or agent title wins over it).
