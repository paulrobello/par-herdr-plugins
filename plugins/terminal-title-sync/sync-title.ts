#!/usr/bin/env bun
//
// Terminal Title Sync
//
// Sets the outer terminal window title from the focused Herdr pane, resolving in
// strict priority order:  agent_title  >  tab_title  >  space_title.
//
// Run by the plugin's `refresh` action and by Herdr event hooks. Herdr injects
// HERDR_BIN_PATH (portable CLI wrapper) and HERDR_PLUGIN_STATE_DIR (scratch dir).

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const HERDR = process.env.HERDR_BIN_PATH || "herdr";
const STATE_DIR = process.env.HERDR_PLUGIN_STATE_DIR || "/tmp";
const STATE_PATH = join(STATE_DIR, "last-title");

// The title travels through an OSC escape sequence; keep it bounded and
// control-char free so it can never corrupt the host terminal.
const MAX_TITLE_LEN = 200;

interface PaneInfo {
  title?: string;
  display_agent?: string;
  agent?: string;
  tab_id?: string;
  workspace_id?: string;
}

interface TabInfo {
  label?: string;
}

interface WorkspaceInfo {
  label?: string;
}

/** Normalize one title fragment: drop control chars, collapse whitespace, trim, cap. */
export function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LEN);
}

/** The reported agent task title (e.g. "Refactor auth") — the top-priority source. */
export function agentTitle(pane: PaneInfo): string {
  return clean(pane.title);
}

/** The detected agent's bare name (e.g. "claude") — a last-resort fallback. */
export function agentName(pane: PaneInfo): string {
  return clean(pane.display_agent) || clean(pane.agent);
}

/**
 * Resolve the title from pane/tab/workspace data:
 * agent task title > tab_title > space_title > bare agent name > "herdr".
 *
 * The bare agent name is deliberately last: a set tab or workspace label is more
 * informative than a near-constant name like "claude".
 */
export function pickTitle(
  pane: PaneInfo,
  tab: TabInfo | null,
  workspace: WorkspaceInfo | null,
): string {
  const fromAgent = agentTitle(pane);
  if (fromAgent) return fromAgent;

  const fromTab = clean(tab?.label);
  if (fromTab) return fromTab;

  const fromSpace = clean(workspace?.label);
  if (fromSpace) return fromSpace;

  const fromName = agentName(pane);
  if (fromName) return fromName;

  return "herdr";
}

/** Run a herdr CLI subcommand; return trimmed stdout. Throws on failure. */
function herdrRun(args: string[]): string {
  const result = spawnSync(HERDR, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `herdr ${args.join(" ")} failed (exit ${result.status}): ${(result.stderr || result.stdout).trim()}`,
    );
  }
  return result.stdout.trim();
}

/** Run a herdr query that returns a JSON envelope and pull out result[key]. */
function herdrQuery<T>(args: string[], key: string): T | null {
  const output = herdrRun(args);
  if (!output) return null;
  let envelope: { result?: Record<string, unknown> };
  try {
    envelope = JSON.parse(output);
  } catch {
    return null;
  }
  return (envelope.result?.[key] ?? null) as T | null;
}

/** Fetch live state and resolve the title via pickTitle. */
function resolveTitle(): string {
  const pane = herdrQuery<PaneInfo>(["pane", "current"], "pane") ?? {};

  // agent_title needs no extra round-trip; only fetch tab/space if it is empty.
  if (agentTitle(pane)) return pickTitle(pane, null, null);

  const tab = pane.tab_id ? herdrQuery<TabInfo>(["tab", "get", pane.tab_id], "tab") : null;
  if (clean(tab?.label)) return pickTitle(pane, tab, null);

  const workspace = pane.workspace_id
    ? herdrQuery<WorkspaceInfo>(["workspace", "get", pane.workspace_id], "workspace")
    : null;
  return pickTitle(pane, tab, workspace);
}

function lastTitle(): string {
  try {
    return readFileSync(STATE_PATH, "utf8").trim();
  } catch {
    return "";
  }
}

function saveTitle(title: string): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, `${title}\n`);
}

function main(): void {
  try {
    const title = resolveTitle();
    if (title && title !== lastTitle()) {
      herdrRun(["terminal", "title", "set", title]);
      saveTitle(title);
    }
    console.log(title);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.main) main();
