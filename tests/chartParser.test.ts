import { describe, it, expect } from "vitest";
import { parseChartSpec } from "../src/core/chartParser";

describe("parseChartSpec", () => {
  it("detects incomplete streaming JSON gracefully without throwing", () => {
    const partial = '{\n  "type": "bar",\n  "title": "Q4 Revenue",\n  "labels": ["Oct", "Nov"';
    const res = parseChartSpec(partial, false);
    expect(res.status).toBe("streaming");
  });

  it("converts simplified GPT chart spec into switchable ECharts option with tabular backup", () => {
    const raw = JSON.stringify({
      type: "bar",
      title: "Model Throughput Comparison",
      subtitle: "Tokens per second (higher is better)",
      labels: ["GPT-5.4", "Claude Sonnet", "Gemini Flash", "DeepSeek V3"],
      datasets: [
        { label: "Prefill", data: [120, 105, 240, 165] },
        { label: "Decode", data: [85, 78, 190, 112] }
      ]
    });

    const res = parseChartSpec(raw, true);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.title).toBe("Model Throughput Comparison");
      expect(res.switchableCartesian).toBe(true);
      expect(res.tabularBackup?.headers).toEqual(["维度", "Prefill", "Decode"]);
      expect(res.tabularBackup?.rows).toHaveLength(4);
    }
  });

  it("supports GPT-Vis style flat data records (category + value)", () => {
    const raw = JSON.stringify({
      type: "pie",
      title: "Token Budget Allocation",
      data: [
        { category: "System Prompt", value: 18 },
        { category: "RAG Context", value: 52 },
        { category: "Conversation", value: 30 }
      ]
    });

    const res = parseChartSpec(raw, false);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      const series = res.option.series as Array<Record<string, unknown>>;
      expect(series[0].type).toBe("pie");
      expect((series[0].data as unknown[]).length).toBe(3);
    }
  });

  it("supports sankey flow diagram spec", () => {
    const raw = JSON.stringify({
      type: "sankey",
      title: "Token Routing Flow",
      nodes: ["User Query", "Router", "Fast Model", "Deep Model"],
      links: [
        { source: "User Query", target: "Router", value: 100 },
        { source: "Router", target: "Fast Model", value: 70 },
        { source: "Router", target: "Deep Model", value: 30 }
      ]
    });

    const res = parseChartSpec(raw, true);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      const series = res.option.series as Array<Record<string, unknown>>;
      expect(series[0].type).toBe("sankey");
    }
  });

  it("supports gauge, heatmap, and treemap chart specs", () => {
    const gaugeRes = parseChartSpec(
      JSON.stringify({ type: "gauge", title: "Health Score", value: 94.5, unit: "%" }),
      true
    );
    expect(gaugeRes.status).toBe("ready");

    const heatmapRes = parseChartSpec(
      JSON.stringify({
        type: "heatmap",
        title: "Attention Matrix",
        xLabels: ["Q1", "Q2"],
        yLabels: ["K1", "K2"],
        data: [
          [0, 0, 0.85],
          [0, 1, 0.15],
          [1, 0, 0.25],
          [1, 1, 0.75]
        ]
      }),
      false
    );
    expect(heatmapRes.status).toBe("ready");

    const treemapRes = parseChartSpec(
      JSON.stringify({
        type: "treemap",
        title: "Vault Storage Breakdown",
        data: [
          { name: "Papers", value: 450 },
          { name: "Code Notes", value: 280 }
        ]
      }),
      true
    );
    expect(treemapRes.status).toBe("ready");
  });
});
