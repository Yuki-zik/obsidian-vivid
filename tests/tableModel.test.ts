import { describe, it, expect } from "vitest";
import {
  parseMarkdownTable,
  classifyCellValue,
  sortTableRows,
  filterTableRows,
  exportRowsToCsv,
  tokenizeInlineCellText,
  computeColumnSummaries
} from "../src/core/tableModel";

describe("tableModel", () => {
  const md = `
| 模型名称 | 状态 | 评测得分 | 推理吞吐 | 涨跌幅 |
| :--- | :---: | ---: | ---: | ---: |
| GPT-5.4 | ✅ 已上线 | 94% | 145 tok/s | +18.5% |
| Claude Sonnet | 🚀 灰度中 | 91% | 88 tok/s | +6.2% |
| Legacy Model | ⚠️ 维护态 | 68% | 1,020 tok/s | -12.0% |
  `.trim();

  it("parses standard pipe Markdown table accurately", () => {
    const parsed = parseMarkdownTable(md);
    expect(parsed).not.toBeNull();
    expect(parsed!.headers).toEqual(["模型名称", "状态", "评测得分", "推理吞吐", "涨跌幅"]);
    expect(parsed!.rows).toHaveLength(3);
  });

  it("classifies progress percentages, signed deltas, and status badges distinctly", () => {
    expect(classifyCellValue("94%")).toEqual({ kind: "progress", percent: 94, raw: "94%" });
    expect(classifyCellValue("+18.5%")).toEqual({ kind: "delta", direction: "up", raw: "+18.5%" });
    expect(classifyCellValue("-12.0%")).toEqual({ kind: "delta", direction: "down", raw: "-12.0%" });
    expect(classifyCellValue("✅ 已上线").kind).toBe("badge");
  });

  it("tokenizes inline code and bold text safely without stripping normal words", () => {
    const tokens = tokenizeInlineCellText("超级数据表 (`table`) **Pro**");
    expect(tokens).toEqual([
      { type: "text", value: "超级数据表 (" },
      { type: "code", value: "table" },
      { type: "text", value: ") " },
      { type: "strong", value: "Pro" }
    ]);
  });

  it("computes numeric column averages and sums accurately", () => {
    const parsed = parseMarkdownTable(md)!;
    const summaries = computeColumnSummaries(parsed.headers, parsed.rows);
    expect(summaries[0]).toBeNull();
    // Column 2: 94%, 91%, 68% -> avg 84.3
    expect(summaries[2]?.avg).toBeCloseTo(84.33, 1);
    // Column 3: 145, 88, 1020 -> sum 1253
    expect(summaries[3]?.sum).toBe(1253);
  });

  it("sorts numeric cells with units and thousands separators numerically", () => {
    const parsed = parseMarkdownTable(md)!;
    const sorted = sortTableRows(parsed.rows, 3, "asc");
    expect(sorted.map((r) => r[0])).toEqual(["Claude Sonnet", "GPT-5.4", "Legacy Model"]);
  });

  it("filters rows and exports RFC-4180 CSV", () => {
    const parsed = parseMarkdownTable(md)!;
    expect(filterTableRows(parsed.rows, "claude")).toHaveLength(1);
    expect(exportRowsToCsv(["Name", "Note"], [['Model "X"', "Fast, reliable"]])).toBe(
      'Name,Note\n"Model ""X""","Fast, reliable"'
    );
  });
});
