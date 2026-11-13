import { describe, it, expect } from "vitest";
import { tokenizeInlineCellText } from "../src/core/tableModel";
import { interpolateFrontmatterVariables } from "../src/core/frontmatterBinding";

describe("wikilinks, tags, and frontmatter binding", () => {
  it("parses [[Wikilinks]], [[Note|Alias]], and #tags without breaking hex colors", () => {
    const tokens = tokenizeInlineCellText("关联 [[Ideaverse Home|主页]] 与 [[Agent Spec]] 标签 #ai/agent 颜色 #6366f1");
    const wikiTokens = tokens.filter((t) => t.type === "wikilink");
    const tagTokens = tokens.filter((t) => t.type === "tag");

    expect(wikiTokens).toEqual([
      { type: "wikilink", target: "Ideaverse Home", alias: "主页" },
      { type: "wikilink", target: "Agent Spec", alias: "Agent Spec" }
    ]);
    expect(tagTokens).toEqual([{ type: "tag", tag: "#ai/agent" }]);
  });

  it("interpolates {{fm.key}} and {{frontmatter.key | fallback}} dynamically", () => {
    const template = '{"type":"gauge","value":{{fm.progress | 50}},"title":"{{frontmatter.project_name | Untitled}}"}';
    const rendered = interpolateFrontmatterVariables(template, {
      progress: 88.5,
      project_name: "Obsidian Rich Engine"
    });
    expect(rendered).toBe('{"type":"gauge","value":88.5,"title":"Obsidian Rich Engine"}');

    const withFallback = interpolateFrontmatterVariables(template, undefined);
    expect(withFallback).toBe('{"type":"gauge","value":50,"title":"Untitled"}');

    const literalCode = "语法示例：`{{fm.property}}` 实时值：{{fm.progress}}";
    expect(interpolateFrontmatterVariables(literalCode, { progress: 99 })).toBe(
      "语法示例：`{{fm.property}}` 实时值：99"
    );
  });
});
