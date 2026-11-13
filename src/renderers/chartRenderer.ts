import { App, MarkdownRenderChild, Notice } from "obsidian";
import { echarts } from "../core/echartsRuntime";
import { CartesianViewMode, parseChartSpec } from "../core/chartParser";
import { interpolateFrontmatterVariables } from "../core/frontmatterBinding";
import { getNoteFrontmatter } from "../ui/obsidianBridge";
import { buildInteractiveTableWidget } from "./tableRenderer";
import {
  isObsidianDarkTheme,
  mountWhenSizedAndConnected,
  renderErrorCard,
  renderStreamingSkeleton,
  triggerDataUrlDownload,
  copyTextWithNotice
} from "../ui/domHelpers";
import { GptLightboxModal } from "../ui/lightboxModal";

export class GptChartRenderChild extends MarkdownRenderChild {
  private app: App;
  private source: string;
  private sourcePath: string;
  private chartInstance: echarts.ECharts | null = null;
  private mountCleanup: (() => void) | null = null;
  private viewMode: CartesianViewMode | "table" | "source" = "default";

  constructor(app: App, containerEl: HTMLElement, source: string, sourcePath = "") {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.sourcePath = sourcePath;
  }

  onload(): void {
    this.render();
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        if (this.viewMode !== "source") {
          this.render();
        }
      })
    );
    if (this.source.includes("{{")) {
      this.registerEvent(
        this.app.metadataCache.on("changed", (file) => {
          if (file.path === this.sourcePath && this.viewMode !== "source") {
            this.render();
          }
        })
      );
    }
  }

  onunload(): void {
    this.disposeChart();
  }

  private disposeChart(): void {
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
    this.disposeChart();
    const dark = isObsidianDarkTheme();
    const chartOverride: CartesianViewMode =
      this.viewMode === "bar" || this.viewMode === "line" || this.viewMode === "area"
        ? this.viewMode
        : "default";
    const fm = getNoteFrontmatter(this.app, this.sourcePath);
    const interpolated = interpolateFrontmatterVariables(this.source, fm);
    const parsed = parseChartSpec(interpolated, dark, chartOverride);

    if (parsed.status === "streaming") {
      renderStreamingSkeleton(this.containerEl, "正在流式解析交互图表数据…");
      return;
    }

    if (parsed.status === "error") {
      renderErrorCard(this.containerEl, "图表配置解析失败", parsed.message, this.source);
      return;
    }

    this.containerEl.empty();
    const card = this.containerEl.createDiv({ cls: "gpt-rich-card gpt-rich-chart-card" });

    const header = card.createDiv({ cls: "gpt-rich-card-header" });
    const titleWrap = header.createDiv({ cls: "gpt-rich-card-titles" });
    titleWrap.createDiv({
      text: parsed.title || "Interactive Data Visualization",
      cls: "gpt-rich-card-title"
    });
    if (parsed.subtitle) {
      titleWrap.createDiv({ text: parsed.subtitle, cls: "gpt-rich-card-subtitle" });
    }

    const toolbar = header.createDiv({ cls: "gpt-rich-toolbar" });

    // Cartesian Instant View Switcher (Bar | Line | Area | Table)
    if (parsed.switchableCartesian) {
      const seg = toolbar.createDiv({ cls: "gpt-rich-segmented" });
      const modes: Array<{ key: CartesianViewMode | "table"; label: string }> = [
        { key: "bar", label: "柱状" },
        { key: "line", label: "折线" },
        { key: "area", label: "面积" },
        { key: "table", label: "数据表" }
      ];
      for (const m of modes) {
        const b = seg.createEl("button", {
          text: m.label,
          cls:
            this.viewMode === m.key
              ? "gpt-rich-seg-btn is-active"
              : "gpt-rich-seg-btn"
        });
        b.addEventListener("click", () => {
          this.viewMode = this.viewMode === m.key ? "default" : m.key;
          this.render();
        });
      }
    }

    if (this.viewMode !== "table" && this.viewMode !== "source") {
      const pngBtn = toolbar.createEl("button", {
        text: "PNG",
        cls: "gpt-rich-btn",
        attr: { "aria-label": "导出 2x 高清图表图片" }
      });
      pngBtn.addEventListener("click", () => {
        if (!this.chartInstance) return;
        const url = this.chartInstance.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: isObsidianDarkTheme() ? "#18181b" : "#ffffff"
        });
        const slug = (parsed.title || "gpt-chart").replace(/[^\w\u4e00-\u9fa5-]+/g, "-");
        triggerDataUrlDownload(url, `${slug}.png`);
        new Notice("已导出 2x 高清 PNG 图表");
      });
    }

    const copyBtn = toolbar.createEl("button", { text: "JSON", cls: "gpt-rich-btn" });
    copyBtn.addEventListener("click", () => {
      void copyTextWithNotice(this.source.trim(), "图表 JSON");
    });

    const toggleBtn = toolbar.createEl("button", {
      text: this.viewMode === "source" ? "图表" : "源码",
      cls: "gpt-rich-btn"
    });
    toggleBtn.addEventListener("click", () => {
      this.viewMode = this.viewMode === "source" ? "default" : "source";
      this.render();
    });

    const expandBtn = toolbar.createEl("button", {
      text: "全屏",
      cls: "gpt-rich-btn gpt-rich-btn-primary"
    });
    expandBtn.addEventListener("click", () => {
      new GptLightboxModal(this.app, parsed.title || "交互图表全屏视图", (modalBody) => {
        const modalCanvas = modalBody.createDiv({ cls: "gpt-rich-chart-canvas-modal" });
        const modalChart = echarts.init(modalCanvas);
        const fresh = parseChartSpec(interpolated, isObsidianDarkTheme(), chartOverride);
        if (fresh.status === "ready") {
          modalChart.setOption(fresh.option);
        }
        const obs = new ResizeObserver(() => modalChart.resize());
        obs.observe(modalCanvas);
        return () => {
          obs.disconnect();
          modalChart.dispose();
        };
      }).open();
    });

    if (this.viewMode === "source") {
      const pre = card.createEl("pre", { cls: "gpt-rich-source-pre" });
      pre.createEl("code", { text: this.source.trim() });
      return;
    }

    if (this.viewMode === "table" && parsed.tabularBackup) {
      const tableHost = card.createDiv({ cls: "gpt-rich-embedded-table-host" });
      buildInteractiveTableWidget(
        this.app,
        tableHost,
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

    const chartHeight = parsed.height ?? 320;
    const canvasWrap = card.createDiv({ cls: "gpt-rich-chart-canvas" });
    canvasWrap.style.height = `${chartHeight}px`;

    const handle = mountWhenSizedAndConnected(canvasWrap, {
      onMount: () => {
        this.chartInstance = echarts.init(canvasWrap);
        this.chartInstance.setOption(parsed.option);
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
