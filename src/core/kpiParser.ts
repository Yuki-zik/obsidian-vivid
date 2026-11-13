export interface KpiMetricItem {
  label: string;
  value: string;
  delta?: string;
  trend: "up" | "down" | "neutral";
  caption?: string;
  sparkline?: number[];
}

export type ParsedKpiResult =
  | { status: "streaming" }
  | { status: "error"; message: string }
  | { status: "ready"; title?: string; items: KpiMetricItem[] };

function isIncomplete(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  const last = t[t.length - 1];
  return last !== "]" && last !== "}";
}

export function parseKpiSpec(rawSource: string): ParsedKpiResult {
  const cleaned = rawSource.trim();
  if (!cleaned) return { status: "streaming" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    if (isIncomplete(cleaned)) {
      return { status: "streaming" };
    }
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Invalid KPI JSON"
    };
  }

  let title: string | undefined;
  let rawItems: unknown[] = [];

  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.title === "string") title = obj.title;
    const arr = obj.items ?? obj.metrics ?? obj.cards ?? obj.stats;
    if (Array.isArray(arr)) {
      rawItems = arr;
    }
  }

  if (rawItems.length === 0) {
    return { status: "error", message: "KPI block requires a non-empty array of metric objects" };
  }

  const items: KpiMetricItem[] = rawItems.map((entry) => {
    const rec = (entry ?? {}) as Record<string, unknown>;
    const label = String(rec.label ?? rec.name ?? rec.title ?? "Metric");
    const value = String(rec.value ?? "-");
    const delta = rec.delta !== undefined ? String(rec.delta) : rec.change !== undefined ? String(rec.change) : undefined;
    const caption = typeof rec.caption === "string" ? rec.caption : typeof rec.description === "string" ? rec.description : undefined;

    let trend: "up" | "down" | "neutral" = "neutral";
    const explicitTrend = typeof rec.trend === "string" ? rec.trend.toLowerCase() : "";
    if (explicitTrend === "up" || explicitTrend === "positive" || explicitTrend === "good") {
      trend = "up";
    } else if (explicitTrend === "down" || explicitTrend === "negative" || explicitTrend === "bad") {
      trend = "down";
    } else if (delta) {
      if (delta.trim().startsWith("+") || delta.includes("↑")) trend = "up";
      else if (delta.trim().startsWith("-") || delta.includes("↓")) trend = "down";
    }

    const sparkline = Array.isArray(rec.sparkline)
      ? rec.sparkline.map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : undefined;

    return { label, value, delta, trend, caption, sparkline };
  });

  return { status: "ready", title, items };
}

export function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const usableH = height - pad * 2;
  const stepX = width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = +(i * stepX).toFixed(2);
      const y = +(pad + usableH - ((v - min) / span) * usableH).toFixed(2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}
