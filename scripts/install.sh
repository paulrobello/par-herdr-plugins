#!/usr/bin/env bash
#
# Install everything this repo provides for Herdr:
#   - link every plugin under plugins/ from local source (so edits take effect)
#   - install the recommended third-party plugins (only if not already present)
#   - back up any existing ~/.config/herdr/config.toml, then symlink the repo config
#   - reload the running Herdr server's config
#
# Safe to re-run: already-installed third-party plugins are skipped (detected
# from `herdr plugin list --json`), the local link is idempotent, an existing
# config is preserved as a timestamped .bak, and a per-plugin install failure is
# reported but does not abort the run.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$REPO_ROOT/plugins"
REPO_CONFIG="$REPO_ROOT/config/herdr/config.toml"
HERDR_CONFIG_DIR="${HOME}/.config/herdr"
HERDR_CONFIG="$HERDR_CONFIG_DIR/config.toml"

# Prerequisite: Herdr must have been launched at least once. Running `herdr`
# starts its persistent server and creates ~/.config/herdr, which the CLI (and
# therefore this script) needs. Without it, `herdr plugin link` fails with a
# cryptic NotFound. The config dir is the "has Herdr run here?" signal.
if [ ! -d "$HERDR_CONFIG_DIR" ]; then
  echo "ERROR: Herdr has not been initialized on this system (no ${HERDR_CONFIG_DIR})." >&2
  echo "       Run 'herdr' once to start the server and create its config dir," >&2
  echo "       then re-run 'make install'." >&2
  echo "       Install Herdr first if needed:  brew install herdr" >&2
  echo "         or:  curl -fsSL https://herdr.dev/install.sh | sh" >&2
  exit 1
fi

echo "==> Linking local plugins"
for manifest in "$PLUGIN_DIR"/*/herdr-plugin.toml; do
  [ -f "$manifest" ] || continue
  path="$(dirname "$manifest")"
  echo "    link: $path"
  herdr plugin link "$path"
done

echo "==> Installing recommended third-party plugins"
# Match against the JSON list (compact) so detection doesn't depend on the
# human-readable format, which could change between Herdr versions.
INSTALLED="$(herdr plugin list --json 2>/dev/null || true)"
install_if_missing() {
  local id="$1" src="$2"
  if echo "$INSTALLED" | grep -Fq "\"plugin_id\":\"${id}\""; then
    echo "    skip: ${id} already installed"
  else
    echo "    install: ${src}"
    # Non-fatal: a guard miss on an already-present plugin, or a transient
    # install failure, must not abort the whole run.
    herdr plugin install "$src" || echo "    warn: ${src} — install failed (already present?); continuing"
  fi
}
install_if_missing cloudmanic.herdr-plus   cloudmanic/herdr-plus
install_if_missing herdr-floax             Tyru5/herdr-floax
install_if_missing ntindle.herdr-resurrect ntindle/herdr-resurrect

echo "==> Symlinking Herdr config -> ${REPO_CONFIG}"
mkdir -p "$HERDR_CONFIG_DIR"
if [ -L "$HERDR_CONFIG" ]; then
  current="$(readlink "$HERDR_CONFIG")"
  if [ "$current" = "$REPO_CONFIG" ]; then
    echo "    skip: already symlinks to the repo config"
  else
    echo "    note: existing symlink points at ${current} — left unchanged"
  fi
elif [ -e "$HERDR_CONFIG" ]; then
  backup="${HERDR_CONFIG}.bak.$(date +%Y%m%d%H%M%S)"
  echo "    back up existing config -> ${backup}"
  mv "$HERDR_CONFIG" "$backup"
  ln -s "$REPO_CONFIG" "$HERDR_CONFIG"
else
  ln -s "$REPO_CONFIG" "$HERDR_CONFIG"
fi

echo "==> Reloading Herdr config"
herdr server reload-config || echo "    warn: could not reload (herdr server not running?)"

echo "==> Done. Verify with: herdr plugin list"
