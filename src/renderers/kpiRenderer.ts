import { App, MarkdownRenderChild } from "obsidian";
import { buildSparklinePath, parseKpiSpec } from "../core/kpiParser";
import { interpolateFrontmatterVariables } from "../core/frontmatterBinding";
import { getNoteFrontmatter } from "../ui/obsidianBridge";
import { renderErrorCard, renderStreamingSkeleton } from "../ui/domHelpers";

export class GptKpiRenderChild extends MarkdownRenderChild {
  private app: App;
  private source: string;
  private sourcePath: string;

  constructor(app: App, containerEl: HTMLElement, source: string, sourcePath = "") {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.sourcePath = sourcePath;
  }

  onload(): void {
    this.render();
    if (this.source.includes("{{")) {
      this.registerEvent(
        this.app.metadataCache.on("changed", (file) => {
          if (file.path === this.sourcePath) this.render();
        })
      );
    }
  }

  private render(): void {
    const fm = getNoteFrontmatter(this.app, this.sourcePath);
    const interpolated = interpolateFrontmatterVariables(this.source, fm);
    const res = parseKpiSpec(interpolated);
    if (res.status === "streaming") {
      renderStreamingSkeleton(this.containerEl, "正在流式加载关键指标卡片…");
      return;
    }
    if (res.status === "error") {
      renderErrorCard(this.containerEl, "指标卡片解析失败", res.message, interpolated);
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
        top.createSpan({
          text: item.delta,
          cls: `gpt-rich-delta-pill is-${item.trend}`
        });
      }

      const mid = card.createDiv({ cls: "gpt-rich-kpi-mid" });
      mid.createDiv({ text: item.value, cls: "gpt-rich-kpi-value" });

      if (item.sparkline && item.sparkline.length >= 2) {
        const pathD = buildSparklinePath(item.sparkline, 84, 28);
        const stroke =
          item.trend === "down"
            ? "#f43f5e"
            : item.trend === "up"
              ? "#10b981"
              : "#6366f1";
        const sparkWrap = mid.createDiv({ cls: "gpt-rich-kpi-spark" });
        sparkWrap.innerHTML = `<svg viewBox="0 0 84 28" width="84" height="28" xmlns="http://www.w3.org/2000/svg"><path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      }

      if (item.caption) {
        card.createDiv({ text: item.caption, cls: "gpt-rich-kpi-caption" });
      }
    }
  }
}
