import { describe, it, expect } from "vitest";
import { parseKpiSpec, buildSparklinePath } from "../src/core/kpiParser";

describe("kpiParser", () => {
  it("parses array of KPI metric items and infers trend direction", () => {
    const raw = JSON.stringify([
      {
        label: "端到端延迟 P95",
        value: "340 ms",
        delta: "-24.5%",
        trend: "positive",
        caption: "较上一版本显著下降",
        sparkline: [520, 490, 460, 410, 380, 340]
      },
      {
        label: "知识库召回率",
        value: "96.8%",
        delta: "+4.2%"
      }
    ]);

    const res = parseKpiSpec(raw);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.items).toHaveLength(2);
      expect(res.items[0].trend).toBe("up");
      expect(res.items[1].trend).toBe("up");
      const path = buildSparklinePath(res.items[0].sparkline!, 80, 24);
      expect(path.startsWith("M ")).toBe(true);
    }
  });

  it("returns streaming state on partial JSON", () => {
    expect(parseKpiSpec('[{"label": "QPS"').status).toBe("streaming");
  });
});
