# par-herdr-plugins

A monorepo of custom [Herdr](https://herdr.dev) plugins. Each plugin lives in its
own subfolder under [`plugins/`](./plugins) and is independently linkable or
installable.

## Plugins

| Plugin | Description |
| --- | --- |
| [terminal-title-sync](./plugins/terminal-title-sync) | Set the outer terminal title from the focused agent, tab, or workspace (`agent_title` > `tab_title` > `space_title`). |

## Develop

Requires [Bun](https://bun.sh) on `PATH`.

```sh
bun install        # dev tooling: typescript, @types/bun, biome
make checkall      # typecheck + lint + tests
```

Standard targets (see [`Makefile`](./Makefile)): `build`, `test`, `lint`, `fmt`,
`typecheck`, `checkall`.

## Link a plugin locally

From a plugin's own folder:

```sh
cd plugins/terminal-title-sync
herdr plugin link .
```

Then verify it linked with no warnings:

```sh
herdr plugin list
```

## Conventions

- Plugins are written in **TypeScript run directly by Bun** (`bun sync-title.ts`)
  with **no runtime dependencies** — only `node:` built-ins. The TypeScript and
  Biome toolchain is root-only dev tooling.
- Plugin ids use the `par.` namespace (e.g. `par.terminal-title-sync`); adjust to
  taste before publishing.
- Each plugin needs Herdr `0.7.0+` and Bun, and targets `macos`/`linux`.

## License

MIT
