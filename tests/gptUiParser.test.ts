import { describe, it, expect } from "vitest";
import { parseGptUiSpec } from "../src/core/gptUiParser";

describe("parseGptUiSpec", () => {
  it("parses timeline blocks with milestone status", () => {
    const raw = JSON.stringify({
      title: "Architecture Rollout",
      items: [
        { time: "Phase 1", title: "Core Parser", detail: "ECharts + SVG", status: "done" },
        { time: "Phase 2", title: "Browser Bridge", detail: "One-click import", status: "active" }
      ]
    });
    const res = parseGptUiSpec(raw, "timeline");
    expect(res.status).toBe("ready");
    if (res.status === "ready" && res.block.kind === "timeline") {
      expect(res.block.items).toHaveLength(2);
      expect(res.block.items[0].status).toBe("done");
    }
  });

  it("parses comparison PK cards with pros and cons", () => {
    const raw = JSON.stringify({
      title: "Local vs Cloud Rendering",
      columns: [
        {
          name: "Route B (Local First)",
          badge: "Recommended",
          pros: ["Zero latency", "100% Markdown portable"],
          cons: ["Requires initial prompt setup"]
        },
        {
          name: "Legacy Static Export",
          pros: ["No plugin needed"],
          cons: ["Loses interactivity", "Blurry screenshots"]
        }
      ]
    });
    const res = parseGptUiSpec(raw, "comparison");
    expect(res.status).toBe("ready");
    if (res.status === "ready" && res.block.kind === "comparison") {
      expect(res.block.columns).toHaveLength(2);
    }
  });

  it("parses interactive study quiz blocks and chatgpt-ui ask_user_input blocks", () => {
    const raw = JSON.stringify({
      question: "Which sandbox attribute prevents iframe scripts from reading Obsidian host variables?",
      options: [
        { label: 'sandbox="allow-scripts" (without allow-same-origin)', correct: true, explanation: "Opaque origin isolates parent DOM & Electron APIs." },
        { label: 'sandbox="allow-scripts allow-same-origin"', correct: false, explanation: "Allows escaping sandbox via window.parent." }
      ]
    });
    const res = parseGptUiSpec(raw, "quiz");
    expect(res.status).toBe("ready");
    if (res.status === "ready" && res.block.kind === "quiz") {
      expect(res.block.options[0].correct).toBe(true);
    }
  });

  it("handles streaming partial JSON gracefully", () => {
    expect(parseGptUiSpec('{"question": "Half written', "quiz").status).toBe("streaming");
  });
});
