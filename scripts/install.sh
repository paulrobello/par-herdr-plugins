#!/usr/bin/env bash
#
# Install everything this repo provides for Herdr:
#   - link every plugin under plugins/ from local source (so edits take effect)
#   - install the recommended third-party plugins (only if not already present)
#   - back up any existing ~/.config/herdr/config.toml, then symlink the repo config
#   - symlink the Claude Code skill (skills/herdr) into ~/.claude/skills/herdr
#   - reload the running Herdr server's config
#
# Safe to re-run: already-installed third-party plugins are skipped (detected
# from `herdr plugin list --json`), the local link is idempotent, existing
# config/skill paths are preserved as a timestamped .bak before symlinking, and
# a per-plugin install failure is reported but does not abort the run.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$REPO_ROOT/plugins"
REPO_CONFIG="$REPO_ROOT/config/herdr/config.toml"
HERDR_CONFIG_DIR="${HOME}/.config/herdr"
HERDR_CONFIG="$HERDR_CONFIG_DIR/config.toml"
CLAUDE_SKILLS_DIR="${HOME}/.claude/skills"
REPO_SKILL="$REPO_ROOT/skills/herdr"

# symlink_to_repo <target> <repo_source>
# Idempotent: skip if target already symlinks to repo_source; back up an existing
# real file/dir to a timestamped .bak; leave a symlink pointing elsewhere untouched.
symlink_to_repo() {
  local target="$1" src="$2"
  if [ -L "$target" ]; then
    current="$(readlink "$target")"
    if [ "$current" = "$src" ]; then
      echo "    skip: ${target} already symlinks to repo"
    else
      echo "    note: ${target} is a symlink to ${current} — left unchanged"
    fi
  elif [ -e "$target" ]; then
    backup="${target}.bak.$(date +%Y%m%d%H%M%S)"
    echo "    back up existing ${target} -> ${backup}"
    mv "$target" "$backup"
    ln -s "$src" "$target"
  else
    echo "    symlink: ${target} -> ${src}"
    ln -s "$src" "$target"
  fi
}

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
symlink_to_repo "$HERDR_CONFIG" "$REPO_CONFIG"

echo "==> Symlinking Claude Code skill -> ${REPO_SKILL}"
mkdir -p "$CLAUDE_SKILLS_DIR"
symlink_to_repo "${CLAUDE_SKILLS_DIR}/herdr" "$REPO_SKILL"

echo "==> Reloading Herdr config"
herdr server reload-config || echo "    warn: could not reload (herdr server not running?)"

echo "==> Done. Verify with: herdr plugin list"
