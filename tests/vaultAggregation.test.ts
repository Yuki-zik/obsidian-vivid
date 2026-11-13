import { describe, it, expect } from "vitest";
import {
  VaultNoteRecord,
  aggregateVaultChartSpec,
  aggregateVaultKpiSpec
} from "../src/core/vaultAggregation";

const MOCK_NOTES: VaultNoteRecord[] = [
  {
    path: "Projects/Alpha.md",
    basename: "Alpha",
    folder: "Projects",
    ctimeMonth: "2026-09",
    size: 4200,
    tags: ["ai", "active"],
    linksCount: 6,
    frontmatter: { status: "done", score: 92, hours: 14 }
  },
  {
    path: "Projects/Beta.md",
    basename: "Beta",
    folder: "Projects",
    ctimeMonth: "2026-10",
    size: 3100,
    tags: ["ai", "research"],
    linksCount: 4,
    frontmatter: { status: "in-progress", score: 86, hours: 20 }
  },
  {
    path: "Reading/Paper1.md",
    basename: "Paper1",
    folder: "Reading",
    ctimeMonth: "2026-10",
    size: 8500,
    tags: ["research"],
    linksCount: 9,
    frontmatter: { status: "done", score: 95, hours: 6 }
  },
  {
    path: "Daily/2026-11-12.md",
    basename: "2026-11-12",
    folder: "Daily",
    ctimeMonth: "2026-11",
    size: 1200,
    tags: ["journal"],
    linksCount: 1,
    frontmatter: {}
  }
];

describe("vaultAggregation", () => {
  it("aggregates note counts grouped by frontmatter property with folder/tag filters", () => {
    const rawQuery = JSON.stringify({
      type: "bar",
      title: "Research & Project Status",
      groupBy: "status",
      agg: "count"
    });

    const res = aggregateVaultChartSpec(rawQuery, MOCK_NOTES);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.chartJson.labels).toContain("done");
      expect(res.chartJson.labels).toContain("in-progress");
      const doneIdx = (res.chartJson.labels as string[]).indexOf("done");
      expect((res.chartJson.datasets as Array<{ data: number[] }>)[0].data[doneIdx]).toBe(2);
    }
  });

  it("aggregates numeric frontmatter averages (avg score by folder)", () => {
    const rawQuery = JSON.stringify({
      type: "bar",
      title: "Average Score by Folder",
      hasProperty: "score",
      groupBy: "folder",
      agg: "avg",
      field: "score"
    });

    const res = aggregateVaultChartSpec(rawQuery, MOCK_NOTES);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      const projIdx = (res.chartJson.labels as string[]).indexOf("Projects");
      expect((res.chartJson.datasets as Array<{ data: number[] }>)[0].data[projIdx]).toBe(89);
    }
  });

  it("builds two-dimensional Sankey knowledge flow from folder -> tag", () => {
    const rawQuery = JSON.stringify({
      type: "sankey",
      title: "Vault Knowledge Flow",
      sourceBy: "folder",
      targetBy: "tag"
    });

    const res = aggregateVaultChartSpec(rawQuery, MOCK_NOTES);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      const links = res.chartJson.links as Array<{ source: string; target: string; value: number }>;
      expect(links.length).toBeGreaterThanOrEqual(3);
      expect(links.some((l) => l.source === "Projects" && l.target === "#ai" && l.value === 2)).toBe(true);
    }
  });

  it("computes live vault KPI cards from dynamic metric queries", () => {
    const rawQuery = JSON.stringify([
      { label: "Total Vault Notes", agg: "count" },
      { label: "Completed Items", where: { status: "done" }, agg: "count" },
      { label: "Avg Quality Score", hasProperty: "score", agg: "avg", field: "score", suffix: " pts" }
    ]);

    const res = aggregateVaultKpiSpec(rawQuery, MOCK_NOTES);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.items[0].value).toBe("4");
      expect(res.items[1].value).toBe("2");
      expect(res.items[2].value).toBe("91 pts");
    }
  });

  it("supports nested filter objects, aggregate/limit aliases, and custom height", () => {
    const kpiRes = aggregateVaultKpiSpec(
      JSON.stringify({
        title: "Filtered Pulse",
        metrics: [
          { label: "AI Notes Size", filter: { tag: "ai" }, aggregate: "sum", field: "size" }
        ]
      }),
      MOCK_NOTES
    );
    expect(kpiRes.status).toBe("ready");
    if (kpiRes.status === "ready") {
      expect(kpiRes.items[0].value).toBe("7,300");
    }

    const chartRes = aggregateVaultChartSpec(
      JSON.stringify({
        type: "bar",
        filter: { tag: "ai" },
        groupBy: "tag",
        aggregate: "count",
        limit: 2,
        height: 240
      }),
      MOCK_NOTES
    );
    expect(chartRes.status).toBe("ready");
    if (chartRes.status === "ready") {
      expect((chartRes.chartJson.labels as string[]).length).toBe(2);
      expect(chartRes.chartJson.height).toBe(240);
    }
  });
});
