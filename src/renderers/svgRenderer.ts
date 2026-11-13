import { App, MarkdownRenderChild, Notice } from "obsidian";
import { sanitizeAndPrepareSvg } from "../core/svgSanitizer";
import { convertSvgToJsonCanvas } from "../core/obsidianExporters";
import { saveAndOpenJsonCanvas, saveSvgAttachmentSnapshot } from "../ui/obsidianBridge";
import {
  copyTextWithNotice,
  isObsidianDarkTheme,
  renderErrorCard,
  renderStreamingSkeleton,
  triggerBlobDownload,
  triggerDataUrlDownload
} from "../ui/domHelpers";
import { GptLightboxModal } from "../ui/lightboxModal";

type SvgBackdropMode = "auto" | "light" | "dark";

export class GptSvgRenderChild extends MarkdownRenderChild {
  private app: App;
  private source: string;
  private sourcePath: string;
  private showingSource = false;
  private backdropMode: SvgBackdropMode = "auto";
  private scale = 1;
  private translateX = 0;
  private translateY = 0;

  constructor(app: App, containerEl: HTMLElement, source: string, sourcePath = "") {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.sourcePath = sourcePath;
  }

  onload(): void {
    this.render();
  }

  private render(): void {
    const res = sanitizeAndPrepareSvg(this.source);
    if (res.status === "streaming") {
      renderStreamingSkeleton(this.containerEl, "正在流式绘制 SVG 矢量图…");
      return;
    }

    if (res.status === "error") {
      renderErrorCard(this.containerEl, "SVG 渲染失败", res.message, this.source);
      return;
    }

    this.containerEl.empty();
    const card = this.containerEl.createDiv({ cls: "gpt-rich-card gpt-rich-svg-card" });

    const header = card.createDiv({ cls: "gpt-rich-card-header" });
    const titleWrap = header.createDiv({ cls: "gpt-rich-card-titles" });
    titleWrap.createDiv({ text: "SVG Vector Diagram", cls: "gpt-rich-card-title" });
    titleWrap.createDiv({
      text: "拖拽平移 · Cmd+滚轮缩放 · 支持 [[双链]] 节点点击跳转与转白板",
      cls: "gpt-rich-card-subtitle"
    });

    const toolbar = header.createDiv({ cls: "gpt-rich-toolbar" });

    let stageInner: HTMLElement | null = null;
    const applyTransform = () => {
      if (stageInner) {
        stageInner.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
      }
    };

    const zoomOutBtn = toolbar.createEl("button", { text: "−", cls: "gpt-rich-btn gpt-rich-btn-icon" });
    zoomOutBtn.addEventListener("click", () => {
      this.scale = Math.max(0.4, +(this.scale - 0.2).toFixed(2));
      applyTransform();
    });

    const resetBtn = toolbar.createEl("button", { text: "100%", cls: "gpt-rich-btn" });
    resetBtn.addEventListener("click", () => {
      this.scale = 1;
      this.translateX = 0;
      this.translateY = 0;
      applyTransform();
    });

    const zoomInBtn = toolbar.createEl("button", { text: "+", cls: "gpt-rich-btn gpt-rich-btn-icon" });
    zoomInBtn.addEventListener("click", () => {
      this.scale = Math.min(4, +(this.scale + 0.2).toFixed(2));
      applyTransform();
    });

    const bgLabels: Record<SvgBackdropMode, string> = {
      auto: "底色:自适应",
      light: "底色:纯白",
      dark: "底色:深色"
    };
    const bgBtn = toolbar.createEl("button", {
      text: bgLabels[this.backdropMode],
      cls: "gpt-rich-btn"
    });
    bgBtn.addEventListener("click", () => {
      const order: SvgBackdropMode[] = ["auto", "light", "dark"];
      this.backdropMode = order[(order.indexOf(this.backdropMode) + 1) % order.length];
      this.render();
    });

    const canvasBtn = toolbar.createEl("button", {
      text: "转 Canvas",
      cls: "gpt-rich-btn",
      attr: { "aria-label": "一键转换为 Obsidian 原生 .canvas 白板进行自由拖拽编辑" }
    });
    canvasBtn.addEventListener("click", () => {
      const canvasJson = convertSvgToJsonCanvas(res.svgHtml);
      void saveAndOpenJsonCanvas(this.app, canvasJson, "Architecture-Flow");
    });

    const snapBtn = toolbar.createEl("button", {
      text: "存附件",
      cls: "gpt-rich-btn",
      attr: { "aria-label": "按 Obsidian 附件设置将 SVG 存入本地库" }
    });
    snapBtn.addEventListener("click", () => {
      void saveSvgAttachmentSnapshot(this.app, this.sourcePath, res.svgHtml);
    });

    const svgBtn = toolbar.createEl("button", { text: "SVG", cls: "gpt-rich-btn" });
    svgBtn.addEventListener("click", () => {
      triggerBlobDownload(res.svgHtml, "diagram.svg", "image/svg+xml;charset=utf-8");
      new Notice("已下载 SVG 矢量文件");
    });

    const pngBtn = toolbar.createEl("button", { text: "PNG", cls: "gpt-rich-btn" });
    pngBtn.addEventListener("click", () => {
      void this.exportSvgAsPng(res.svgHtml, res.viewBox);
    });

    const srcBtn = toolbar.createEl("button", {
      text: this.showingSource ? "预览" : "源码",
      cls: "gpt-rich-btn"
    });
    srcBtn.addEventListener("click", () => {
      this.showingSource = !this.showingSource;
      this.render();
    });

    const expandBtn = toolbar.createEl("button", {
      text: "全屏",
      cls: "gpt-rich-btn gpt-rich-btn-primary"
    });
    expandBtn.addEventListener("click", () => {
      new GptLightboxModal(this.app, "SVG 矢量流程图全屏预览", (modalBody) => {
        const wrap = modalBody.createDiv({ cls: `gpt-rich-svg-modal-stage backdrop-${this.backdropMode}` });
        wrap.innerHTML = res.svgHtml;
        this.activateVaultLinksInsideSvg(wrap);
      }).open();
    });

    if (this.showingSource) {
      const copyBar = card.createDiv({ cls: "gpt-rich-source-bar" });
      const cp = copyBar.createEl("button", { text: "复制 SVG 源码", cls: "gpt-rich-btn" });
      cp.addEventListener("click", () => void copyTextWithNotice(this.source.trim(), "SVG 源码"));
      const pre = card.createEl("pre", { cls: "gpt-rich-source-pre" });
      pre.createEl("code", { text: this.source.trim() });
      return;
    }

    const viewport = card.createDiv({
      cls: `gpt-rich-svg-viewport backdrop-${this.backdropMode}`
    });
    stageInner = viewport.createDiv({ cls: "gpt-rich-svg-stage" });
    stageInner.innerHTML = res.svgHtml;
    this.activateVaultLinksInsideSvg(stageInner);
    applyTransform();

    this.attachPanZoom(viewport, applyTransform);
  }

  private activateVaultLinksInsideSvg(rootEl: HTMLElement): void {
    // 1. Activate <text> elements containing [[Note|Alias]]
    const textNodes = Array.from(rootEl.querySelectorAll("text"));
    for (const t of textNodes) {
      const raw = (t.textContent ?? "").trim();
      const m = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(raw);
      if (!m) continue;
      const target = m[1].trim();
      const alias = m[2] ? m[2].trim() : target;
      t.textContent = raw.replace(m[0], `↗ ${alias}`);

      const hitNode = (t.closest("g") as Element | null) ?? t;
      (hitNode as HTMLElement).style.cursor = "pointer";
      hitNode.classList.add("gpt-rich-svg-link-node");

      hitNode.addEventListener("click", (ev) => {
        const me = ev as MouseEvent;
        me.stopPropagation();
        void this.app.workspace.openLinkText(target, this.sourcePath, me.metaKey || me.ctrlKey);
      });

      hitNode.addEventListener("mouseover", (ev) => {
        this.app.workspace.trigger("hover-link", {
          event: ev as MouseEvent,
          source: "preview",
          hoverParent: this,
          targetEl: hitNode as HTMLElement,
          linktext: target,
          sourcePath: this.sourcePath
        });
      });
    }
  }

  private attachPanZoom(viewport: HTMLElement, onUpdate: () => void): void {
    let dragging = false;
    let startX = 0;
    let startY = 0;

    this.registerDomEvent(viewport, "mousedown", (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX - this.translateX;
      startY = e.clientY - this.translateY;
      viewport.addClass("is-dragging");
    });

    this.registerDomEvent(window, "mousemove", (e: MouseEvent) => {
      if (!dragging) return;
      this.translateX = e.clientX - startX;
      this.translateY = e.clientY - startY;
      onUpdate();
    });

    this.registerDomEvent(window, "mouseup", () => {
      if (dragging) {
        dragging = false;
        viewport.removeClass("is-dragging");
      }
    });

    this.registerDomEvent(viewport, "dblclick", () => {
      this.scale = 1;
      this.translateX = 0;
      this.translateY = 0;
      onUpdate();
    });

    this.registerDomEvent(viewport, "wheel", (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      this.scale = Math.min(4, Math.max(0.4, +(this.scale + delta).toFixed(2)));
      onUpdate();
    });
  }

  private async exportSvgAsPng(svgHtml: string, viewBox: string): Promise<void> {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    const w = parts[2] || 900;
    const h = parts[3] || 480;
    const scaleFactor = 2;

    const img = new Image();
    const svgBlob = new Blob([svgHtml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w * scaleFactor;
      canvas.height = h * scaleFactor;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const useDark =
          this.backdropMode === "dark" ||
          (this.backdropMode === "auto" && isObsidianDarkTheme());
        ctx.fillStyle = useDark ? "#18181b" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        triggerDataUrlDownload(canvas.toDataURL("image/png"), "diagram-2x.png");
        new Notice("已导出 2x 高清 PNG");
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      new Notice("PNG 导出失败，请尝试下载 SVG");
    };
    img.src = url;
  }
}
