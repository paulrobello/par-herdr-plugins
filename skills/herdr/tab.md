# Tabs

A **tab** is a layout of panes inside a workspace. Switching tabs keeps separate
tasks visually separated while staying in one workspace. Each tab has a stable
`tab_id` (e.g. `w4:tA`), a `label`, and a 1-based `number`.

## Commands

```sh
herdr tab list [--workspace <workspace_id>]   # tabs (JSON); no flag = focused workspace
herdr tab get <tab_id>
herdr tab create [OPTIONS]
herdr tab focus <tab_id>
herdr tab rename <tab_id> <label>
herdr tab close <tab_id>
```

### `tab create` options

| Option | Meaning |
| --- | --- |
| `--workspace <id>` | target workspace (default: focused) |
| `--cwd PATH` | starting directory for the first pane |
| `--label TEXT` | human label |
| `--env KEY=VALUE` | extra env vars (repeatable) |
| `--focus` / `--no-focus` | whether it takes focus |

## Fields

| Field | Meaning |
| --- | --- |
| `tab_id` | stable id, e.g. `w4:tA` |
| `workspace_id` | parent workspace |
| `label` | human label |
| `number` | 1-based position within its workspace |
| `pane_count` | panes in this tab |
| `agent_status` | rolled-up status |
| `focused` | is this the focused tab |

## Patterns

Open a fresh tab in the current workspace for a build:
```sh
herdr tab create --label build --cwd ~/Repos/foo
```

Add a tab to a *specific* (non-focused) workspace without stealing focus:
```sh
herdr tab create --workspace w7 --label logs --no-focus
```

List only the tabs in one workspace:
```sh
herdr tab list --workspace w7
```

Rename / close:
```sh
herdr tab rename w4:tA "build"
herdr tab close w4:tA
```

## Notes

- `tab list` with no `--workspace` returns the **focused** workspace's tabs.
- A tab's `agent_status` rolls up its panes — a tab shows `working` if any pane's
  agent is working.
- Closing a tab closes every pane in it.
- To move an existing pane into its own tab instead of creating an empty one, use
  `herdr pane move <pane> --new-tab --label <text>` (see **pane.md**).
