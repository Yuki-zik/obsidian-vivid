export type CartesianViewMode = "default" | "bar" | "line" | "area";

export interface ReadyChartSpec {
  status: "ready";
  title?: string;
  subtitle?: string;
  height?: number;
  switchableCartesian?: boolean;
  tabularBackup?: { headers: string[]; rows: string[][] };
  option: Record<string, unknown>;
}

export interface StreamingChartSpec {
  status: "streaming";
}

export interface ErrorChartSpec {
  status: "error";
  message: string;
}

export type ParsedChartResult = ReadyChartSpec | StreamingChartSpec | ErrorChartSpec;

const PALETTE_LIGHT = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6"
];

const PALETTE_DARK = [
  "#818cf8",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#2dd4bf"
];

function isLikelyIncompleteJson(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;

  let depthBrace = 0;
  let depthBracket = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depthBrace++;
    else if (ch === "}") depthBrace--;
    else if (ch === "[") depthBracket++;
    else if (ch === "]") depthBracket--;
  }

  return inString || depthBrace > 0 || depthBracket > 0;
}

export function parseChartSpec(
  rawSource: string,
  isDark: boolean,
  overrideMode: CartesianViewMode = "default"
): ParsedChartResult {
  const cleaned = rawSource.trim();
  if (!cleaned) {
    return { status: "streaming" };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch (err) {
    if (isLikelyIncompleteJson(cleaned)) {
      return { status: "streaming" };
    }
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Invalid JSON chart specification"
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { status: "error", message: "Chart specification must be a JSON object" };
  }

  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const gridBorderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.07)";
  const tooltipBg = isDark ? "rgba(24, 24, 27, 0.94)" : "rgba(255, 255, 255, 0.96)";
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.08)";

  const title = typeof parsed.title === "string" ? parsed.title : undefined;
  const subtitle = typeof parsed.subtitle === "string" ? parsed.subtitle : undefined;
  const height = typeof parsed.height === "number" ? parsed.height : undefined;

  const baseTheme: Record<string, unknown> = {
    backgroundColor: "transparent",
    color: palette,
    textStyle: {
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: textColor
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: textColor, fontSize: 12 },
      axisPointer: {
        type: "shadow",
        shadowStyle: {
          color: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)"
        }
      }
    }
  };

  // 1. Native ECharts option pass-through
  const nativeSource =
    parsed.option && typeof parsed.option === "object"
      ? (parsed.option as Record<string, unknown>)
      : Array.isArray(parsed.series)
        ? parsed
        : null;

  if (nativeSource) {
    const mergedOption: Record<string, unknown> = {
      ...baseTheme,
      ...nativeSource,
      backgroundColor: "transparent",
      color: nativeSource.color ?? palette
    };
    const extractedTitle =
      title ??
      (typeof nativeSource.title === "object" &&
      nativeSource.title !== null &&
      typeof (nativeSource.title as Record<string, unknown>).text === "string"
        ? ((nativeSource.title as Record<string, unknown>).text as string)
        : undefined);
    if (extractedTitle && typeof mergedOption.title === "object") {
      delete mergedOption.title;
    }
    return {
      status: "ready",
      title: extractedTitle,
      subtitle,
      height,
      option: mergedOption
    };
  }

  const chartType = typeof parsed.type === "string" ? parsed.type.toLowerCase() : "bar";

  // 2. Sankey Flow Diagram
  if (chartType === "sankey" && Array.isArray(parsed.links)) {
    const links = parsed.links as Array<{ source: string; target: string; value: number }>;
    const rawNodes = Array.isArray(parsed.nodes)
      ? parsed.nodes
      : Array.from(new Set(links.flatMap((l) => [l.source, l.target])));
    const nodes = rawNodes.map((n) =>
      typeof n === "string" ? { name: n } : (n as Record<string, unknown>)
    );
    return {
      status: "ready",
      title,
      subtitle,
      height: height ?? 340,
      option: {
        ...baseTheme,
        tooltip: { ...((baseTheme.tooltip as Record<string, unknown>) || {}), trigger: "item" },
        series: [
          {
            type: "sankey",
            left: 16,
            right: 144,
            top: 16,
            bottom: 16,
            nodeWidth: 16,
            nodeGap: 12,
            emphasis: { focus: "adjacency" },
            lineStyle: { color: "gradient", curveness: 0.5, opacity: isDark ? 0.36 : 0.28 },
            itemStyle: { borderRadius: 4, borderWidth: 0 },
            label: { color: textColor, fontSize: 12, fontWeight: 500 },
            data: nodes,
            links
          }
        ]
      }
    };
  }

  // 3. Gauge Meter
  if (chartType === "gauge" && parsed.value !== undefined) {
    const val = Number(parsed.value ?? 0);
    const unit = typeof parsed.unit === "string" ? parsed.unit : "";
    const min = typeof parsed.min === "number" ? parsed.min : 0;
    const max = typeof parsed.max === "number" ? parsed.max : 100;
    const gaugeLabel = typeof parsed.label === "string" ? parsed.label : title ?? "Score";
    return {
      status: "ready",
      title,
      subtitle,
      height: height ?? 280,
      option: {
        ...baseTheme,
        tooltip: { show: false },
        series: [
          {
            type: "gauge",
            min,
            max,
            startAngle: 210,
            endAngle: -30,
            radius: "86%",
            center: ["50%", "58%"],
            progress: { show: true, width: 14, roundCap: true },
            axisLine: {
              roundCap: true,
              lineStyle: {
                width: 14,
                color: [[1, isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"]]
              }
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { color: mutedColor, distance: 20, fontSize: 11 },
            pointer: { show: false },
            title: { offsetCenter: [0, "24%"], fontSize: 12.5, color: mutedColor },
            detail: {
              valueAnimation: true,
              fontSize: 28,
              fontWeight: 700,
              color: textColor,
              offsetCenter: [0, "-6%"],
              formatter: `{value}${unit}`
            },
            data: [{ value: val, name: gaugeLabel }]
          }
        ]
      }
    };
  }

  // 4. Heatmap Matrix
  if (
    chartType === "heatmap" &&
    Array.isArray(parsed.xLabels) &&
    Array.isArray(parsed.yLabels) &&
    Array.isArray(parsed.data)
  ) {
    const heatData = parsed.data as Array<[number, number, number]>;
    const vals = heatData.map((d) => Number(d[2] ?? 0));
    const minV = vals.length ? Math.min(...vals) : 0;
    const maxV = vals.length ? Math.max(...vals) : 1;
    return {
      status: "ready",
      title,
      subtitle,
      height: height ?? 320,
      option: {
        ...baseTheme,
        tooltip: { ...((baseTheme.tooltip as Record<string, unknown>) || {}), position: "top", trigger: "item" },
        grid: { top: 16, bottom: 44, left: 16, right: 16, containLabel: true },
        xAxis: {
          type: "category",
          data: parsed.xLabels,
          splitArea: { show: true },
          axisLabel: { color: mutedColor },
          axisTick: { show: false }
        },
        yAxis: {
          type: "category",
          data: parsed.yLabels,
          splitArea: { show: true },
          axisLabel: { color: mutedColor },
          axisTick: { show: false }
        },
        visualMap: {
          min: minV,
          max: maxV,
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: 0,
          textStyle: { color: mutedColor, fontSize: 11 },
          inRange: {
            color: isDark
              ? ["#1e1b4b", "#4338ca", "#6366f1", "#38bdf8", "#34d399"]
              : ["#eef2ff", "#c7d2fe", "#818cf8", "#4f46e5", "#312e81"]
          }
        },
        series: [
          {
            type: "heatmap",
            data: heatData,
            label: { show: true, color: isDark ? "#f9fafb" : "#111827", fontSize: 11.5 },
            itemStyle: { borderRadius: 4, borderColor: isDark ? "#18181b" : "#ffffff", borderWidth: 2 }
          }
        ]
      }
    };
  }

  // 5. Treemap Hierarchy
  if (chartType === "treemap" && Array.isArray(parsed.data)) {
    return {
      status: "ready",
      title,
      subtitle,
      height: height ?? 320,
      option: {
        ...baseTheme,
        tooltip: { ...((baseTheme.tooltip as Record<string, unknown>) || {}), trigger: "item", formatter: "{b}: <b>{c}</b>" },
        series: [
          {
            type: "treemap",
            roam: false,
            breadcrumb: { show: false },
            left: 8,
            right: 8,
            top: 8,
            bottom: 8,
            itemStyle: {
              borderColor: isDark ? "#18181b" : "#ffffff",
              borderWidth: 2,
              gapWidth: 2,
              borderRadius: 6
            },
            label: { show: true, formatter: "{b}\n{c}", fontSize: 12, fontWeight: 600 },
            data: parsed.data
          }
        ]
      }
    };
  }

  // 6. Radar Chart
  if (chartType === "radar" && Array.isArray(parsed.indicators) && Array.isArray(parsed.datasets)) {
    const datasets = parsed.datasets as Array<{ label?: string; name?: string; data: number[] }>;
    return {
      status: "ready",
      title,
      subtitle,
      height,
      option: {
        ...baseTheme,
        tooltip: { ...((baseTheme.tooltip as Record<string, unknown>) || {}), trigger: "item" },
        legend: {
          bottom: 0,
          textStyle: { color: mutedColor, fontSize: 12 },
          itemWidth: 10,
          itemHeight: 10,
          icon: "circle"
        },
        radar: {
          indicator: parsed.indicators,
          radius: "56%",
          center: ["50%", "50%"],
          axisName: { color: textColor, fontSize: 12, fontWeight: 500 },
          splitArea: {
            areaStyle: {
              color: isDark
                ? ["rgba(255,255,255,0.01)", "rgba(255,255,255,0.03)"]
                : ["rgba(15,23,42,0.01)", "rgba(15,23,42,0.025)"]
            }
          },
          splitLine: { lineStyle: { color: gridBorderColor } },
          axisLine: { lineStyle: { color: gridBorderColor } }
        },
        series: [
          {
            type: "radar",
            symbolSize: 6,
            data: datasets.map((ds) => ({
              name: ds.label ?? ds.name ?? "Series",
              value: ds.data,
              areaStyle: { opacity: 0.18 },
              lineStyle: { width: 2 }
            }))
          }
        ]
      }
    };
  }

  // 7. GPT-Vis flat `data` array
  if (Array.isArray(parsed.data)) {
    const records = parsed.data as Array<Record<string, unknown>>;
    if (chartType === "pie" || chartType === "doughnut" || chartType === "donut") {
      return {
        status: "ready",
        title,
        subtitle,
        height,
        option: {
          ...baseTheme,
          tooltip: {
            ...((baseTheme.tooltip as Record<string, unknown>) || {}),
            trigger: "item",
            formatter: "{b}: <b>{c}</b> ({d}%)"
          },
          legend: { bottom: 0, textStyle: { color: mutedColor, fontSize: 12 }, icon: "circle" },
          series: [
            {
              type: "pie",
              radius: chartType === "pie" ? ["38%", "68%"] : ["48%", "72%"],
              center: ["50%", "45%"],
              itemStyle: {
                borderRadius: 6,
                borderColor: isDark ? "#18181b" : "#ffffff",
                borderWidth: 2
              },
              label: { color: textColor, fontSize: 12 },
              data: records.map((r) => ({
                name: String(r.category ?? r.name ?? r.label ?? ""),
                value: Number(r.value ?? 0)
              }))
            }
          ]
        }
      };
    }

    const categories = Array.from(
      new Set(records.map((r) => String(r.category ?? r.time ?? r.name ?? r.x ?? "")))
    );
    const groups = Array.from(
      new Set(records.map((r) => (r.group !== undefined ? String(r.group) : "Value")))
    );
    const activeMode = overrideMode !== "default" ? overrideMode : chartType;
    const mappedType = activeMode === "column" ? "bar" : activeMode === "area" ? "line" : activeMode;

    const series = groups.map((g) => ({
      name: g,
      type: mappedType,
      smooth: mappedType === "line" ? 0.35 : undefined,
      barMaxWidth: 36,
      itemStyle: mappedType === "bar" ? { borderRadius: [6, 6, 0, 0] } : undefined,
      areaStyle: activeMode === "area" ? { opacity: 0.18 } : undefined,
      data: categories.map((c) => {
        const hit = records.find(
          (r) =>
            String(r.category ?? r.time ?? r.name ?? r.x ?? "") === c &&
            (r.group !== undefined ? String(r.group) : "Value") === g
        );
        return hit ? Number(hit.value ?? hit.y ?? 0) : 0;
      })
    }));

    return {
      status: "ready",
      title,
      subtitle,
      height,
      switchableCartesian: true,
      tabularBackup: {
        headers: ["维度", ...groups],
        rows: categories.map((c, rIdx) => [c, ...series.map((s) => String((s.data as number[])[rIdx] ?? 0))])
      },
      option: buildCartesianOption(
        baseTheme,
        categories,
        series,
        groups.length > 1,
        mutedColor,
        gridBorderColor,
        false
      )
    };
  }

  // 8. Simplified GPT `{ type, labels, datasets }`
  if (Array.isArray(parsed.labels) && Array.isArray(parsed.datasets)) {
    const labels = (parsed.labels as unknown[]).map((l) => String(l));
    const datasets = parsed.datasets as Array<{
      label?: string;
      name?: string;
      data: number[];
      type?: string;
    }>;

    if (chartType === "pie" || chartType === "doughnut" || chartType === "donut") {
      const first = datasets[0]?.data ?? [];
      return {
        status: "ready",
        title,
        subtitle,
        height,
        option: {
          ...baseTheme,
          tooltip: {
            ...((baseTheme.tooltip as Record<string, unknown>) || {}),
            trigger: "item",
            formatter: "{b}: <b>{c}</b> ({d}%)"
          },
          legend: { bottom: 0, textStyle: { color: mutedColor, fontSize: 12 }, icon: "circle" },
          series: [
            {
              type: "pie",
              radius: ["42%", "70%"],
              center: ["50%", "45%"],
              itemStyle: {
                borderRadius: 6,
                borderColor: isDark ? "#18181b" : "#ffffff",
                borderWidth: 2
              },
              label: { color: textColor, fontSize: 12 },
              data: labels.map((name, idx) => ({ name, value: first[idx] ?? 0 }))
            }
          ]
        }
      };
    }

    const isHorizontal =
      overrideMode === "default" && (chartType === "horizontalbar" || chartType === "hbar");
    const series = datasets.map((ds) => {
      const dsTypeRaw =
        overrideMode !== "default" ? overrideMode : (ds.type ?? chartType).toLowerCase();
      const isArea = dsTypeRaw === "area";
      const echartsType =
        dsTypeRaw === "area"
          ? "line"
          : dsTypeRaw === "column" || isHorizontal
            ? "bar"
            : dsTypeRaw;
      return {
        name: ds.label ?? ds.name ?? "Series",
        type: echartsType,
        smooth: echartsType === "line" ? 0.35 : undefined,
        symbolSize: echartsType === "line" ? 6 : undefined,
        barMaxWidth: 34,
        itemStyle:
          echartsType === "bar"
            ? { borderRadius: isHorizontal ? [0, 6, 6, 0] : [6, 6, 0, 0] }
            : undefined,
        areaStyle: isArea ? { opacity: 0.18 } : undefined,
        data: ds.data
      };
    });

    const dsNames = datasets.map((d, i) => d.label ?? d.name ?? `系列 ${i + 1}`);
    return {
      status: "ready",
      title,
      subtitle,
      height,
      switchableCartesian: true,
      tabularBackup: {
        headers: ["维度", ...dsNames],
        rows: labels.map((lbl, idx) => [lbl, ...datasets.map((d) => String(d.data[idx] ?? ""))])
      },
      option: buildCartesianOption(
        baseTheme,
        labels,
        series,
        datasets.length > 1,
        mutedColor,
        gridBorderColor,
        isHorizontal,
        typeof parsed.yAxisUnit === "string" ? parsed.yAxisUnit : undefined
      )
    };
  }

  return {
    status: "error",
    message:
      "Unrecognized chart schema. Supported types: bar, horizontalBar, line, area, pie, doughnut, radar, sankey, gauge, heatmap, treemap, or native ECharts { series }."
  };
}

function buildCartesianOption(
  baseTheme: Record<string, unknown>,
  categories: string[],
  series: Array<Record<string, unknown>>,
  showLegend: boolean,
  mutedColor: string,
  gridBorderColor: string,
  horizontal: boolean,
  unit?: string
): Record<string, unknown> {
  const categoryAxis = {
    type: "category",
    data: categories,
    axisLine: { lineStyle: { color: gridBorderColor } },
    axisTick: { show: false },
    axisLabel: { color: mutedColor, fontSize: 11.5 }
  };

  const valueAxis = {
    type: "value",
    splitLine: { lineStyle: { color: gridBorderColor, type: "dashed" } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: mutedColor,
      fontSize: 11.5,
      formatter: unit ? `{value} ${unit}` : undefined
    }
  };

  return {
    ...baseTheme,
    legend: showLegend
      ? {
          top: 0,
          right: 8,
          textStyle: { color: mutedColor, fontSize: 12 },
          icon: "roundRect",
          itemWidth: 12,
          itemHeight: 8
        }
      : { show: false },
    grid: {
      top: showLegend ? 36 : 16,
      left: 12,
      right: 16,
      bottom: 8,
      containLabel: true
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series
  };
}
