# par-herdr-plugins

A monorepo of custom [Herdr](https://herdr.dev) plugins. Each plugin lives in
its own subfolder under [`plugins/`](./plugins) and is independently linkable or
installable.

## Plugins

| Plugin | Description |
| --- | --- |
| [terminal-title-sync](./plugins/terminal-title-sync) | Set the outer terminal title from the focused agent, tab, or workspace (`agent_title` > `tab_title` > `space_title`). |

## Prerequisites

- **Herdr 0.7.0+** — install from Homebrew or the official script:
  ```sh
  brew install herdr
  # or
  curl -fsSL https://herdr.dev/install.sh | sh
  ```
- **Bun** on `PATH` (plugins are TypeScript run directly by Bun).
- **Run Herdr once before `make install`.** `make install` drives Herdr through
  its CLI, which talks to Herdr's persistent server over `~/.config/herdr/herdr.sock`.
  If Herdr has never been launched, that socket and `~/.config/herdr/` don't exist
  yet and `make install` fails (the installer checks for this and tells you). Run
  `herdr` once to start the server and initialize its config dir, then re-run
  `make install`.

## Install a plugin

Install everything at once — this repo's plugin(s) linked from local source, the
[recommended third-party plugins](#recommended-plugins), the Herdr config
symlink, and the Claude Code `herdr` skill symlinked into `~/.claude/skills/`
(existing config/skill paths are backed up first):

```sh
make install
```

See [`scripts/install.sh`](./scripts/install.sh) for exactly what it does. Or
install a plugin individually:

### From GitHub

```sh
herdr plugin install paulrobello/par-herdr-plugins/plugins/terminal-title-sync
```

### Local development (link)

From a plugin's own folder, link it so edits to the TypeScript source take
effect immediately:

```sh
cd plugins/terminal-title-sync
herdr plugin link .
herdr plugin list     # verify it linked with no warnings
```

## Recommended plugins

Third-party Herdr plugins I run alongside `terminal-title-sync`. The curated
`config/herdr/config.toml` already binds keys for the floating-pane and
snapshot plugins (with `prefix = "ctrl+space"`), so installing these makes
those bindings work out of the box.

| Plugin | What it does | Install |
| --- | --- | --- |
| [Herdr Plus](https://github.com/cloudmanic/herdr-plus) | Projects — fuzzy-pick a template to spin up a full workspace (tabs, panes, startup commands); Quick Actions — fuzzy launcher for one-off scripts. | `herdr plugin install cloudmanic/herdr-plus` |
| [herdr-floax](https://github.com/Tyru5/herdr-floax) | Toggle a floating scratch shell for the current workspace (à la tmux-floax). | `herdr plugin install Tyru5/herdr-floax` |
| [herdr-resurrect](https://github.com/ntindle/herdr-resurrect) | Snapshot the whole herd (workspaces, tabs, panes, cwd, agents) and restore after a crash or reboot (à la tmux-resurrect). | `herdr plugin install ntindle/herdr-resurrect` |

The config binds `prefix+f` (floax toggle), `prefix+ctrl+s` (resurrect save),
and `prefix+ctrl+r` (resurrect restore).

## Herdr config

This repo also keeps a curated Herdr config at
[`config/herdr/config.toml`](./config/herdr/config.toml). To use it, symlink it
into Herdr's config folder (`~/.config/herdr/config.toml`) so the file stays
version-controlled here while Herdr reads it from its expected location:

```sh
# from the repo root
mkdir -p ~/.config/herdr
# back up an existing config so you don't lose it
if [ -e ~/.config/herdr/config.toml ]; then
  mv ~/.config/herdr/config.toml ~/.config/herdr/config.toml.bak
fi
ln -s "$(pwd)/config/herdr/config.toml" ~/.config/herdr/config.toml
```

Then reload Herdr to pick it up:

```sh
herdr server reload-config
```

## Develop

Requires [Bun](https://bun.sh) on `PATH`.

```sh
bun install        # dev tooling: typescript, @types/bun, biome
make checkall      # typecheck + lint + tests
```

Standard targets (see [`Makefile`](./Makefile)): `build`, `test`, `lint`, `fmt`,
`typecheck`, `checkall`.

## Conventions

- Plugins are written in **TypeScript run directly by Bun** (`bun sync-title.ts`)
  with **no runtime dependencies** — only `node:` built-ins. The TypeScript and
  Biome toolchain is root-only dev tooling.
- Plugin ids use the `par.` namespace (e.g. `par.terminal-title-sync`); adjust to
  taste before publishing.
- Each plugin needs Herdr `0.7.0+` and Bun, and targets `macos`/`linux`.

## License

MIT
