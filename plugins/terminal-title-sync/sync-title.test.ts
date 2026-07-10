import { describe, expect, it } from "bun:test";
import { agentTitle, clean, pickTitle } from "./sync-title";

describe("clean", () => {
  it("strips control characters", () => {
    expect(clean("a\x07b")).toBe("a b");
  });
  it("treats tabs and newlines as whitespace", () => {
    expect(clean("a\tb\n c")).toBe("a b c");
  });
  it("trims surrounding whitespace", () => {
    expect(clean("  hi  ")).toBe("hi");
  });
  it("treats nullish input as empty", () => {
    expect(clean(undefined)).toBe("");
    expect(clean(null)).toBe("");
  });
  it("caps length at 200 characters", () => {
    expect(clean("x".repeat(500)).length).toBe(200);
  });
});

describe("agentTitle", () => {
  it("prefers the reported task title", () => {
    expect(agentTitle({ title: "Refactor auth", agent: "claude" })).toBe("Refactor auth");
  });
  it("falls back to display_agent then agent", () => {
    expect(agentTitle({ display_agent: "Claude", agent: "claude" })).toBe("Claude");
    expect(agentTitle({ agent: "claude" })).toBe("claude");
  });
  it("is empty when no agent context is present", () => {
    expect(agentTitle({})).toBe("");
  });
});

describe("pickTitle priority (agent_title > tab_title > space_title)", () => {
  it("agent task title outranks tab and space", () => {
    expect(
      pickTitle({ title: "ship it", agent: "claude" }, { label: "plugins" }, { label: "general" }),
    ).toBe("ship it");
  });
  it("agent name still outranks tab and space when no task title", () => {
    expect(pickTitle({ agent: "claude" }, { label: "plugins" }, { label: "general" })).toBe(
      "claude",
    );
  });
  it("tab_title is used when there is no agent title", () => {
    expect(pickTitle({}, { label: "plugins" }, { label: "general" })).toBe("plugins");
  });
  it("space_title is used when there is no tab", () => {
    expect(pickTitle({}, null, { label: "general" })).toBe("general");
  });
  it("falls back to 'herdr' when nothing is set", () => {
    expect(pickTitle({}, null, null)).toBe("herdr");
  });
});
