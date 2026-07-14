# Terminal Title Sync

A [Herdr](https://herdr.dev) plugin that sets the **outer terminal window title**
to the most meaningful label of the focused pane. Useful for terminals and clients
that track the terminal title (Moshi, iTerm, terminal tab bars) — the role tmux's
`set-titles` plays for tmux.

The title is resolved in strict priority order — the first available source wins:

1. **agent_title** — the focused pane's reported agent task title (e.g. `Refactor auth`).
2. **tab_title** — the focused tab's label.
3. **space_title** — the focused workspace's label.
4. the detected agent's bare name (e.g. `claude`) — used only when no tab or space label is set.

Lower-priority sources are not appended; the first non-empty value is used. If all
are empty the title falls back to `herdr`.

## Install

```sh
herdr plugin install paulrobello/par-herdr-plugins/plugins/terminal-title-sync
```

For local development:

```sh
herdr plugin link .
```

## Manual refresh

```sh
herdr plugin action invoke par.terminal-title-sync.refresh
```

The title also updates automatically on focus moves, renames, agent detection and
status changes, and pane lifecycle events.

## How it works

On each refresh the plugin queries the focused pane through the Herdr CLI
(`HERDR_BIN_PATH`) — `pane current`, `tab get`, `workspace get` — picks the title,
and sets it via `herdr terminal title set`. The last title is cached in
`HERDR_PLUGIN_STATE_DIR/last-title` so unchanged titles aren't re-written. Title
text is sanitized (control characters stripped, whitespace collapsed, length
capped) before being emitted.

## Requirements

- Herdr `0.7.0` or newer
- [Bun](https://bun.sh) on `PATH`
- macOS or Linux

## Privacy

Runs locally; sends nothing over the network. It reads only Herdr state (pane, tab,
workspace labels) — it does **not** read agent session/prompt files.

## License

MIT
