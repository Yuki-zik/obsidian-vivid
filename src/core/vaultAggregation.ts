import { KpiMetricItem } from "./kpiParser";

export interface VaultNoteRecord {
  path: string;
  basename: string;
  folder: string;
  ctimeMonth: string;
  size: number;
  tags: string[];
  tagsCount?: number;
  linksCount: number;
  frontmatter: Record<string, unknown>;
}

export type AggregatedVaultChartResult =
  | { status: "streaming" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      chartJson: Record<string, unknown>;
      matchedCount: number;
      groupFilterField?: string;
    };

export type AggregatedVaultKpiResult =
  | { status: "streaming" }
  | { status: "error"; message: string }
  | { status: "ready"; title?: string; items: KpiMetricItem[] };

function isIncomplete(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  const last = t[t.length - 1];
  return last !== "}" && last !== "]";
}

function filterNotes(notes: VaultNoteRecord[], spec: Record<string, unknown>): VaultNoteRecord[] {
  const nestedFilter =
    spec.filter && typeof spec.filter === "object" && !Array.isArray(spec.filter)
      ? (spec.filter as Record<string, unknown>)
      : {};
  const merged = { ...nestedFilter, ...spec };

  const folderPrefix = typeof merged.folder === "string" ? merged.folder.replace(/^\/+|\/+$/g, "") : "";
  const rawTag = typeof merged.tag === "string" ? merged.tag.replace(/^#/, "").toLowerCase() : "";
  const hasProp = typeof merged.hasProperty === "string" ? merged.hasProperty : "";
  const whereObj =
    merged.where && typeof merged.where === "object" && !Array.isArray(merged.where)
      ? (merged.where as Record<string, unknown>)
      : null;

  return notes.filter((n) => {
    if (folderPrefix && n.folder !== folderPrefix && !n.path.startsWith(`${folderPrefix}/`)) {
      return false;
    }
    if (rawTag && !n.tags.some((t) => t.toLowerCase() === rawTag || t.toLowerCase().startsWith(`${rawTag}/`))) {
      return false;
    }
    if (hasProp && (n.frontmatter[hasProp] === undefined || n.frontmatter[hasProp] === null || n.frontmatter[hasProp] === "")) {
      return false;
    }
    if (whereObj) {
      for (const [k, expected] of Object.entries(whereObj)) {
        const actual = n.frontmatter[k];
        if (String(actual ?? "") !== String(expected)) {
          return false;
        }
      }
    }
    return true;
  });
}

function extractDimensionValues(note: VaultNoteRecord, dim: string): string[] {
  if (dim === "folder") return [note.folder || "/"];
  if (dim === "ctimeMonth" || dim === "month") return [note.ctimeMonth];
  if (dim === "tag" || dim === "tags") {
    return note.tags.length > 0 ? note.tags.map((t) => `#${t}`) : ["(无标签)"];
  }
  const fmVal = note.frontmatter[dim];
  if (fmVal === undefined || fmVal === null || fmVal === "") return [];
  if (Array.isArray(fmVal)) return fmVal.map((v) => String(v));
  return [String(fmVal)];
}

function extractNumericMetric(note: VaultNoteRecord, field?: string): number | null {
  if (!field || field === "count") return 1;
  if (field === "size") return note.size;
  if (field === "tags" || field === "tagsCount") return note.tagsCount ?? note.tags.length;
  if (field === "links" || field === "linksCount") return note.linksCount;
  const raw = note.frontmatter[field];
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[,%$¥]/g, "").trim();
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export function aggregateVaultChartSpec(
  rawSource: string,
  allNotes: VaultNoteRecord[]
): AggregatedVaultChartResult {
  const cleaned = rawSource.trim();
  if (!cleaned) return { status: "streaming" };

  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(cleaned) as Record<string, unknown>;
  } catch (err) {
    if (isIncomplete(cleaned)) return { status: "streaming" };
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Invalid vault-chart JSON"
    };
  }

  const filtered = filterNotes(allNotes, spec);
  const chartType = typeof spec.type === "string" ? spec.type.toLowerCase() : "bar";
  const title = typeof spec.title === "string" ? spec.title : "Vault Live Analytics";
  const rawLimit = typeof spec.topN === "number" ? spec.topN : typeof spec.limit === "number" ? spec.limit : 12;
  const topN = rawLimit > 0 ? rawLimit : 12;
  const customHeight = typeof spec.height === "number" && spec.height >= 160 ? spec.height : undefined;

  // Case A: Two-dimensional Sankey flow (e.g. folder -> tag, category -> status)
  if (
    chartType === "sankey" &&
    typeof spec.sourceBy === "string" &&
    typeof spec.targetBy === "string"
  ) {
    const srcDim = spec.sourceBy;
    const tgtDim = spec.targetBy;
    const pairCounts = new Map<string, number>();

    for (const n of filtered) {
      const sources = extractDimensionValues(n, srcDim);
      const targets = extractDimensionValues(n, tgtDim);
      for (const s of sources) {
        for (const t of targets) {
          const left = s === t ? `${s} (源)` : s;
          const right = s === t ? `${t} (目标)` : t;
          const key = `${left}\u0000${right}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const links = Array.from(pairCounts.entries())
      .map(([k, value]) => {
        const [source, target] = k.split("\u0000");
        return { source, target, value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, topN * 2);

    if (links.length === 0) {
      return { status: "error", message: "当前筛选条件下未匹配到足够的双维关联笔记数据" };
    }

    return {
      status: "ready",
      matchedCount: filtered.length,
      chartJson: {
        type: "sankey",
        title,
        subtitle:
          typeof spec.subtitle === "string"
            ? spec.subtitle
            : `实时扫描 ${filtered.length} 篇笔记 · ${srcDim} → ${tgtDim}`,
        ...(customHeight ? { height: customHeight } : {}),
        links
      }
    };
  }

  // Case B: Single-dimension grouping (bar / pie / line / area / doughnut / treemap)
  const groupBy = typeof spec.groupBy === "string" ? spec.groupBy : "folder";
  const rawAgg = typeof spec.agg === "string" ? spec.agg : typeof spec.aggregate === "string" ? spec.aggregate : "count";
  const agg = rawAgg.toLowerCase();
  const field = typeof spec.field === "string" ? spec.field : undefined;

  const buckets = new Map<string, number[]>();
  for (const n of filtered) {
    const keys = extractDimensionValues(n, groupBy);
    if (keys.length === 0) continue;
    const metricVal = agg === "count" ? 1 : extractNumericMetric(n, field);
    if (metricVal === null) continue;
    for (const k of keys) {
      const arr = buckets.get(k) ?? [];
      arr.push(metricVal);
      buckets.set(k, arr);
    }
  }

  let entries = Array.from(buckets.entries()).map(([key, vals]) => {
    const sum = vals.reduce((a, b) => a + b, 0);
    const val = agg === "avg" ? +(sum / vals.length).toFixed(2) : +sum.toFixed(2);
    return { key, val };
  });

  if (groupBy === "ctimeMonth" || groupBy === "month") {
    entries.sort((a, b) => a.key.localeCompare(b.key));
  } else {
    entries.sort((a, b) => b.val - a.val);
  }
  entries = entries.slice(0, topN);

  if (entries.length === 0) {
    return {
      status: "error",
      message: `未找到包含维度 "${groupBy}" 的匹配笔记`
    };
  }

  const subtitle =
    typeof spec.subtitle === "string"
      ? spec.subtitle
      : `Vault 实时聚合 (${filtered.length} 篇笔记 · 按 ${groupBy} 分组 · 点击图元可检索)`;

  if (chartType === "pie" || chartType === "doughnut" || chartType === "treemap") {
    return {
      status: "ready",
      matchedCount: filtered.length,
      groupFilterField: groupBy,
      chartJson: {
        type: chartType,
        title,
        subtitle,
        ...(customHeight ? { height: customHeight } : {}),
        data: entries.map((e) => ({ name: e.key, category: e.key, value: e.val }))
      }
    };
  }

  return {
    status: "ready",
    matchedCount: filtered.length,
    groupFilterField: groupBy,
    chartJson: {
      type: chartType,
      title,
      subtitle,
      ...(customHeight ? { height: customHeight } : {}),
      labels: entries.map((e) => e.key),
      datasets: [
        {
          label:
            typeof spec.seriesLabel === "string"
              ? spec.seriesLabel
              : agg === "count"
                ? "笔记数量"
                : `${agg.toUpperCase()}(${field ?? groupBy})`,
          data: entries.map((e) => e.val)
        }
      ]
    }
  };
}

export function aggregateVaultKpiSpec(
  rawSource: string,
  allNotes: VaultNoteRecord[]
): AggregatedVaultKpiResult {
  const cleaned = rawSource.trim();
  if (!cleaned) return { status: "streaming" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    if (isIncomplete(cleaned)) return { status: "streaming" };
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Invalid vault-kpi JSON"
    };
  }

  const obj = !Array.isArray(parsed) && parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : null;
  const title = obj && typeof obj.title === "string" ? obj.title : undefined;
  const rawMetrics = Array.isArray(parsed)
    ? parsed
    : obj && Array.isArray(obj.metrics ?? obj.items)
      ? ((obj.metrics ?? obj.items) as unknown[])
      : [];

  if (rawMetrics.length === 0) {
    return { status: "error", message: "vault-kpi requires a non-empty array of metric queries" };
  }

  const items: KpiMetricItem[] = rawMetrics.map((m) => {
    const spec = (m ?? {}) as Record<string, unknown>;
    const matched = filterNotes(allNotes, spec);
    const rawAgg = typeof spec.agg === "string" ? spec.agg : typeof spec.aggregate === "string" ? spec.aggregate : "count";
    const agg = rawAgg.toLowerCase();
    const field = typeof spec.field === "string" ? spec.field : undefined;
    const suffix = typeof spec.suffix === "string" ? spec.suffix : "";
    const prefix = typeof spec.prefix === "string" ? spec.prefix : "";

    let computed = 0;
    if (agg === "count") {
      computed = matched.length;
    } else {
      const nums = matched
        .map((n) => extractNumericMetric(n, field))
        .filter((v): v is number => v !== null);
      const sum = nums.reduce((a, b) => a + b, 0);
      computed = nums.length === 0 ? 0 : agg === "avg" ? +(sum / nums.length).toFixed(1) : +sum.toFixed(1);
    }

    return {
      label: String(spec.label ?? "Vault Metric"),
      value: `${prefix}${computed.toLocaleString()}${suffix}`,
      delta: typeof spec.delta === "string" ? spec.delta : `${matched.length} 篇匹配`,
      trend:
        spec.trend === "down"
          ? "down"
          : spec.trend === "neutral"
            ? "neutral"
            : "up",
      caption: typeof spec.caption === "string" ? spec.caption : "随知识库属性修改实时刷新"
    };
  });

  return { status: "ready", title, items };
}
