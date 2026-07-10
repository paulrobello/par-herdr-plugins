import { describe, expect, it } from "bun:test";
import { agentName, agentTitle, clean, pickTitle } from "./sync-title";

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
  it("returns the reported task title", () => {
    expect(agentTitle({ title: "Refactor auth", agent: "claude" })).toBe("Refactor auth");
  });
  it("is empty when no task title is reported (the bare name is not agent_title)", () => {
    expect(agentTitle({ display_agent: "Claude", agent: "claude" })).toBe("");
    expect(agentTitle({ agent: "claude" })).toBe("");
    expect(agentTitle({})).toBe("");
  });
});

describe("agentName", () => {
  it("prefers display_agent then agent", () => {
    expect(agentName({ display_agent: "Claude", agent: "claude" })).toBe("Claude");
    expect(agentName({ agent: "claude" })).toBe("claude");
  });
  it("is empty when no agent is detected", () => {
    expect(agentName({})).toBe("");
  });
});

describe("pickTitle priority (task title > tab_title > space_title > agent name)", () => {
  it("reported task title outranks everything", () => {
    expect(
      pickTitle({ title: "ship it", agent: "claude" }, { label: "plugins" }, { label: "general" }),
    ).toBe("ship it");
  });
  it("tab_title beats the bare agent name", () => {
    expect(pickTitle({ agent: "claude" }, { label: "plugins" }, { label: "general" })).toBe(
      "plugins",
    );
  });
  it("space_title beats the bare agent name", () => {
    expect(pickTitle({ agent: "claude" }, null, { label: "general" })).toBe("general");
  });
  it("bare agent name is used only when no tab or space label is set", () => {
    expect(pickTitle({ agent: "claude" }, null, null)).toBe("claude");
  });
  it("tab_title is used when there is no agent", () => {
    expect(pickTitle({}, { label: "plugins" }, { label: "general" })).toBe("plugins");
  });
  it("space_title is used when there is no tab", () => {
    expect(pickTitle({}, null, { label: "general" })).toBe("general");
  });
  it("falls back to 'herdr' when nothing is set", () => {
    expect(pickTitle({}, null, null)).toBe("herdr");
  });
});
