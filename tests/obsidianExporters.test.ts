import { describe, it, expect } from "vitest";
import {
  generateBaseBundleFromTable,
  convertSvgToJsonCanvas,
  convertTimelineToJsonCanvas
} from "../src/core/obsidianExporters";

describe("obsidianExporters", () => {
  it("converts a parsed table into native Obsidian .base YAML and structured row notes", () => {
    const bundle = generateBaseBundleFromTable("LLM Benchmark", "Bases/LLM-Benchmark", {
      headers: ["Model", "Status", "Accuracy", "Latency"],
      alignments: ["left", "center", "right", "right"],
      rows: [
        ["[[GPT-5.4]]", "✅ 已上线", "96%", "120 ms"],
        ["Claude Sonnet", "🚀 灰度中", "94%", "145 ms"]
      ]
    });

    expect(bundle.baseFilePath).toBe("Bases/LLM-Benchmark/LLM Benchmark.base");
    expect(bundle.baseYaml).toContain("type: table");
    expect(bundle.baseYaml).toContain('file.inFolder("Bases/LLM-Benchmark/items")');
    expect(bundle.rowNotes).toHaveLength(2);
    expect(bundle.rowNotes[0].path).toBe("Bases/LLM-Benchmark/items/GPT-5.4.md");
    expect(bundle.rowNotes[0].content).toContain("accuracy: 96");
    expect(bundle.rowNotes[0].content).toContain('status: "✅ 已上线"');
  });

  it("converts an SVG flowchart into valid JSON Canvas 1.0 nodes and edges", () => {
    const svg = `
      <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
        <g>
          <rect x="20" y="50" width="160" height="80" stroke="#6366f1" />
          <text x="100" y="90">[[Architecture Spec]]</text>
        </g>
        <path d="M 180 90 L 320 90" stroke="#6366f1" />
        <g>
          <rect x="320" y="50" width="160" height="80" stroke="#10b981" />
          <text x="400" y="90">Implementation</text>
        </g>
      </svg>
    `;

    const canvasJson = JSON.parse(convertSvgToJsonCanvas(svg));
    expect(canvasJson.nodes).toHaveLength(2);
    expect(canvasJson.nodes[0].type).toBe("file");
    expect(canvasJson.nodes[0].file).toBe("Architecture Spec.md");
    expect(canvasJson.nodes[1].type).toBe("text");
    expect(canvasJson.edges).toHaveLength(1);
    expect(canvasJson.edges[0].fromNode).toBe(canvasJson.nodes[0].id);
    expect(canvasJson.edges[0].toNode).toBe(canvasJson.nodes[1].id);
  });

  it("converts a timeline block into sequential JSON Canvas nodes", () => {
    const canvasJson = JSON.parse(
      convertTimelineToJsonCanvas({
        kind: "timeline",
        title: "Roadmap",
        items: [
          { time: "Q1", title: "Design", status: "done" },
          { time: "Q2", title: "Launch", status: "active" }
        ]
      })
    );
    expect(canvasJson.nodes).toHaveLength(2);
    expect(canvasJson.edges).toHaveLength(1);
  });
});
