import { App, MarkdownRenderChild } from "obsidian";
import { echarts } from "../core/echartsRuntime";
import { CartesianViewMode, parseChartSpec } from "../core/chartParser";
import { aggregateVaultChartSpec, aggregateVaultKpiSpec } from "../core/vaultAggregation";
import { buildSparklinePath } from "../core/kpiParser";
import {
  collectVaultNoteRecords,
  getNoteFrontmatter,
  openGlobalObsidianSearch
} from "../ui/obsidianBridge";
import { interpolateFrontmatterVariables } from "../core/frontmatterBinding";
import {
  isObsidianDarkTheme,
  mountWhenSizedAndConnected,
  renderErrorCard,
  renderStreamingSkeleton
} from "../ui/domHelpers";
import { buildInteractiveTableWidget } from "./tableRenderer";

export class VaultLiveChartRenderChild extends MarkdownRenderChild {
  private app: App;
  private source: string;
  private sourcePath: string;
  private chartInstance: echarts.ECharts | null = null;
  private mountCleanup: (() => void) | null = null;
  private viewMode: CartesianViewMode | "table" = "default";
  private debounceTimer: number | null = null;

  constructor(app: App, containerEl: HTMLElement, source: string, sourcePath: string) {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.sourcePath = sourcePath;
  }

  onload(): void {
    this.render();
    this.registerEvent(this.app.workspace.on("css-change", () => this.render()));
    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => this.render(), 320);
      })
    );
  }

  onunload(): void {
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
    if (this.mountCleanup) {
      this.mountCleanup();
      this.mountCleanup = null;
    }
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }

  private render(): void {
    if (this.mountCleanup) {
      this.mountCleanup();
      this.mountCleanup = null;
    }
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }

    const fm = getNoteFrontmatter(this.app, this.sourcePath);
    const interpolated = interpolateFrontmatterVariables(this.source, fm);
    const records = collectVaultNoteRecords(this.app);
    const aggRes = aggregateVaultChartSpec(interpolated, records);

    if (aggRes.status === "streaming") {
      renderStreamingSkeleton(this.containerEl, "正在实时聚合 Vault 笔记元数据…");
      return;
    }
    if (aggRes.status === "error") {
      renderErrorCard(this.containerEl, "Vault 动态图表聚合提示", aggRes.message, interpolated);
      return;
    }

    const chartMode: CartesianViewMode =
      this.viewMode === "table" ? "default" : this.viewMode;
    const parsed = parseChartSpec(
      JSON.stringify(aggRes.chartJson),
      isObsidianDarkTheme(),
      chartMode
    );
    if (parsed.status !== "ready") return;

    this.containerEl.empty();
    const card = this.containerEl.createDiv({ cls: "gpt-rich-card gpt-rich-chart-card" });

    const header = card.createDiv({ cls: "gpt-rich-card-header" });
    const titleWrap = header.createDiv({ cls: "gpt-rich-card-titles" });
    const badgeRow = titleWrap.createDiv({ cls: "gpt-rich-artifact-badge-row" });
    badgeRow.createSpan({ cls: "gpt-rich-live-dot" });
    badgeRow.createSpan({
      text: parsed.title || "Vault Live Analytics",
      cls: "gpt-rich-card-title"
    });
    if (parsed.subtitle) {
      titleWrap.createDiv({ text: parsed.subtitle, cls: "gpt-rich-card-subtitle" });
    }

    const toolbar = header.createDiv({ cls: "gpt-rich-toolbar" });
    if (parsed.switchableCartesian) {
      const seg = toolbar.createDiv({ cls: "gpt-rich-segmented" });
      for (const m of [
        { key: "bar" as const, label: "柱状" },
        { key: "line" as const, label: "折线" },
        { key: "area" as const, label: "面积" },
        { key: "table" as const, label: "数据表" }
      ]) {
        const b = seg.createEl("button", {
          text: m.label,
          cls: this.viewMode === m.key ? "gpt-rich-seg-btn is-active" : "gpt-rich-seg-btn"
        });
        b.addEventListener("click", () => {
          this.viewMode = this.viewMode === m.key ? "default" : m.key;
          this.render();
        });
      }
    }

    const refreshBtn = toolbar.createEl("button", { text: "刷新", cls: "gpt-rich-btn" });
    refreshBtn.addEventListener("click", () => this.render());

    if (this.viewMode === "table" && parsed.tabularBackup) {
      const host = card.createDiv({ cls: "gpt-rich-embedded-table-host" });
      buildInteractiveTableWidget(
        this.app,
        host,
        {
          headers: parsed.tabularBackup.headers,
          alignments: parsed.tabularBackup.headers.map((_, i) => (i === 0 ? "left" : "right")),
          rows: parsed.tabularBackup.rows
        },
        false,
        this.sourcePath,
        this
      );
      return;
    }

    const canvasWrap = card.createDiv({ cls: "gpt-rich-chart-canvas" });
    canvasWrap.style.height = `${parsed.height ?? 310}px`;

    const handle = mountWhenSizedAndConnected(canvasWrap, {
      onMount: () => {
        this.chartInstance = echarts.init(canvasWrap);
        this.chartInstance.setOption(parsed.option);

        // Click chart element -> Drill down into native Obsidian Search!
        this.chartInstance.on("click", (params: { name?: string }) => {
          const clickedName = params?.name;
          if (!clickedName) return;
          const dim = aggRes.groupFilterField;
          if (clickedName.startsWith("#")) {
            openGlobalObsidianSearch(this.app, `tag:${clickedName}`);
          } else if (dim === "folder") {
            const q = clickedName === "(根目录)" ? "/" : `path:"${clickedName}"`;
            openGlobalObsidianSearch(this.app, q);
          } else if (dim && dim !== "ctimeMonth" && dim !== "month") {
            openGlobalObsidianSearch(this.app, `["${dim}":${clickedName}]`);
          } else {
            openGlobalObsidianSearch(this.app, clickedName);
          }
        });
      },
      onResize: () => {
        this.chartInstance?.resize();
      },
      onDispose: () => {
        if (this.chartInstance) {
          this.chartInstance.dispose();
          this.chartInstance = null;
        }
      }
    });
    this.mountCleanup = handle.cleanup;
  }
}

export class VaultLiveKpiRenderChild extends MarkdownRenderChild {
  private app: App;
  private source: string;
  private sourcePath: string;
  private debounceTimer: number | null = null;

  constructor(app: App, containerEl: HTMLElement, source: string, sourcePath: string) {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.sourcePath = sourcePath;
  }

  onload(): void {
    this.render();
    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => this.render(), 320);
      })
    );
  }

  onunload(): void {
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
  }

  private render(): void {
    const fm = getNoteFrontmatter(this.app, this.sourcePath);
    const interpolated = interpolateFrontmatterVariables(this.source, fm);
    const records = collectVaultNoteRecords(this.app);
    const res = aggregateVaultKpiSpec(interpolated, records);

    if (res.status === "streaming") {
      renderStreamingSkeleton(this.containerEl, "正在实时统计知识库指标…");
      return;
    }
    if (res.status === "error") {
      renderErrorCard(this.containerEl, "Vault KPI 解析失败", res.message, interpolated);
      return;
    }

    this.containerEl.empty();
    const wrapper = this.containerEl.createDiv({ cls: "gpt-rich-kpi-section" });
    if (res.title) {
      wrapper.createDiv({ text: res.title, cls: "gpt-rich-kpi-section-title" });
    }

    const grid = wrapper.createDiv({ cls: "gpt-rich-kpi-grid" });
    for (const item of res.items) {
      const card = grid.createDiv({ cls: "gpt-rich-card gpt-rich-kpi-card" });
      const top = card.createDiv({ cls: "gpt-rich-kpi-top" });
      top.createSpan({ text: item.label, cls: "gpt-rich-kpi-label" });
      if (item.delta) {
        top.createSpan({ text: item.delta, cls: `gpt-rich-delta-pill is-${item.trend}` });
      }
      const mid = card.createDiv({ cls: "gpt-rich-kpi-mid" });
      mid.createDiv({ text: item.value, cls: "gpt-rich-kpi-value" });
      if (item.sparkline && item.sparkline.length >= 2) {
        const d = buildSparklinePath(item.sparkline, 84, 28);
        const spark = mid.createDiv({ cls: "gpt-rich-kpi-spark" });
        spark.innerHTML = `<svg viewBox="0 0 84 28" width="84" height="28"><path d="${d}" fill="none" stroke="#10b981" stroke-width="2.2"/></svg>`;
      }
      if (item.caption) {
        card.createDiv({ text: item.caption, cls: "gpt-rich-kpi-caption" });
      }
    }
  }
}
