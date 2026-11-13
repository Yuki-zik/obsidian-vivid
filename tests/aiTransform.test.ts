import { describe, it, expect } from "vitest";
import { buildVisualTransformPrompt, extractCleanBlockFromAiReply } from "../src/core/aiTransform";

describe("aiTransform", () => {
  it("builds strict target-specific prompt containing user selection", () => {
    const prompt = buildVisualTransformPrompt("svg", "User login -> Auth API -> Issue JWT -> Dashboard");
    expect(prompt.system).toContain("```svg");
    expect(prompt.system).toContain("零边框穿透");
    expect(prompt.user).toContain("Issue JWT");
  });

  it("normalizes AI reply whether wrapped in fences or returned raw", () => {
    const rawSvg = '<svg viewBox="0 0 100 50"><rect width="100" height="50"/></svg>';
    expect(extractCleanBlockFromAiReply(rawSvg, "svg")).toBe("```svg\n" + rawSvg + "\n```");

    const alreadyFenced = "Here is the chart:\n```chart\n{\"type\":\"bar\"}\n```\nHope this helps!";
    expect(extractCleanBlockFromAiReply(alreadyFenced, "chart")).toBe("```chart\n{\"type\":\"bar\"}\n```");
  });
});
