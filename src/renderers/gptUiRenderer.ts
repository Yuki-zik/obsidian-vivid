import { App, MarkdownRenderChild } from "obsidian";
import { GptUiBlock, parseGptUiSpec } from "../core/gptUiParser";
import { interpolateFrontmatterVariables } from "../core/frontmatterBinding";
import { convertTimelineToJsonCanvas } from "../core/obsidianExporters";
import {
  appendRichInlineTokens,
  getNoteFrontmatter,
  saveAndOpenJsonCanvas
} from "../ui/obsidianBridge";
import { renderErrorCard, renderStreamingSkeleton } from "../ui/domHelpers";

export class GptUiRenderChild extends MarkdownRenderChild {
  private app: App;
  private source: string;
  private sourcePath: string;
  private hintLang: "timeline" | "comparison" | "quiz" | "gpt-ui" | "chatgpt-ui";

  constructor(
    app: App,
    containerEl: HTMLElement,
    source: string,
    hintLang: "timeline" | "comparison" | "quiz" | "gpt-ui" | "chatgpt-ui",
    sourcePath = ""
  ) {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.hintLang = hintLang;
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
    const res = parseGptUiSpec(interpolated, this.hintLang);
    if (res.status === "streaming") {
      renderStreamingSkeleton(this.containerEl, "正在流式构建结构化交互卡片…");
      return;
    }
    if (res.status === "error") {
      renderErrorCard(this.containerEl, "结构化卡片解析失败", res.message, interpolated);
      return;
    }

    this.containerEl.empty();
    this.renderBlock(res.block);
  }

  private renderBlock(block: GptUiBlock): void {
    if (block.kind === "timeline") {
      const card = this.containerEl.createDiv({ cls: "gpt-rich-card gpt-rich-timeline-card" });
      const hdr = card.createDiv({ cls: "gpt-rich-card-header" });
      hdr.createDiv({ text: block.title || "Timeline Roadmap", cls: "gpt-rich-card-title" });
      const canvasBtn = hdr.createEl("button", {
        text: "转 Canvas 白板",
        cls: "gpt-rich-btn"
      });
      canvasBtn.addEventListener("click", () => {
        const json = convertTimelineToJsonCanvas(block);
        void saveAndOpenJsonCanvas(this.app, json, "Timeline-Roadmap");
      });

      const list = card.createDiv({ cls: "gpt-rich-timeline-list" });
      for (const item of block.items) {
        const row = list.createDiv({ cls: `gpt-rich-timeline-item status-${item.status}` });
        const rail = row.createDiv({ cls: "gpt-rich-timeline-rail" });
        rail.createDiv({ cls: "gpt-rich-timeline-dot" });
        rail.createDiv({ cls: "gpt-rich-timeline-line" });

        const body = row.createDiv({ cls: "gpt-rich-timeline-body" });
        const metaRow = body.createDiv({ cls: "gpt-rich-timeline-meta" });
        if (item.time) {
          metaRow.createSpan({ text: item.time, cls: "gpt-rich-timeline-time" });
        }
        const titleSpan = metaRow.createSpan({ cls: "gpt-rich-timeline-title" });
        appendRichInlineTokens(this.app, this.sourcePath, this, titleSpan, item.title);
        if (item.tag) {
          metaRow.createSpan({ text: item.tag, cls: "gpt-rich-count-pill" });
        }
        if (item.detail) {
          const detailDiv = body.createDiv({ cls: "gpt-rich-timeline-detail" });
          appendRichInlineTokens(this.app, this.sourcePath, this, detailDiv, item.detail);
        }
      }
      return;
    }

    if (block.kind === "comparison") {
      const card = this.containerEl.createDiv({ cls: "gpt-rich-card gpt-rich-comparison-card" });
      if (block.title) {
        const hdr = card.createDiv({ cls: "gpt-rich-card-header" });
        hdr.createDiv({ text: block.title, cls: "gpt-rich-card-title" });
      }
      const grid = card.createDiv({ cls: "gpt-rich-comparison-grid" });
      for (const col of block.columns) {
        const pane = grid.createDiv({ cls: "gpt-rich-comparison-col" });
        const top = pane.createDiv({ cls: "gpt-rich-comparison-top" });
        const nameSpan = top.createSpan({ cls: "gpt-rich-comparison-name" });
        appendRichInlineTokens(this.app, this.sourcePath, this, nameSpan, col.name);
        if (col.badge) {
          top.createSpan({ text: col.badge, cls: "gpt-rich-badge tone-info" });
        }
        if (col.summary) {
          const sumDiv = pane.createDiv({ cls: "gpt-rich-comparison-summary" });
          appendRichInlineTokens(this.app, this.sourcePath, this, sumDiv, col.summary);
        }
        if (col.pros.length > 0) {
          const prosList = pane.createDiv({ cls: "gpt-rich-pros-list" });
          for (const p of col.pros) {
            const item = prosList.createDiv({ cls: "gpt-rich-pro-item" });
            item.createSpan({ text: "✓", cls: "gpt-rich-pro-icon" });
            const txt = item.createSpan();
            appendRichInlineTokens(this.app, this.sourcePath, this, txt, p);
          }
        }
        if (col.cons.length > 0) {
          const consList = pane.createDiv({ cls: "gpt-rich-cons-list" });
          for (const c of col.cons) {
            const item = consList.createDiv({ cls: "gpt-rich-con-item" });
            item.createSpan({ text: "△", cls: "gpt-rich-con-icon" });
            const txt = item.createSpan();
            appendRichInlineTokens(this.app, this.sourcePath, this, txt, c);
          }
        }
        if (col.verdict) {
          const vDiv = pane.createDiv({ cls: "gpt-rich-comparison-verdict" });
          appendRichInlineTokens(this.app, this.sourcePath, this, vDiv, col.verdict);
        }
      }
      return;
    }

    if (block.kind === "quiz") {
      const card = this.containerEl.createDiv({ cls: "gpt-rich-card gpt-rich-quiz-card" });
      const hdr = card.createDiv({ cls: "gpt-rich-card-header" });
      hdr.createDiv({
        text: block.title || "Interactive Knowledge Check",
        cls: "gpt-rich-card-title"
      });
      const resetBtn = hdr.createEl("button", { text: "重做", cls: "gpt-rich-btn" });

      const body = card.createDiv({ cls: "gpt-rich-quiz-body" });
      const qDiv = body.createDiv({ cls: "gpt-rich-quiz-question" });
      appendRichInlineTokens(this.app, this.sourcePath, this, qDiv, block.question);
      if (block.hint) {
        body.createDiv({ text: `提示：${block.hint}`, cls: "gpt-rich-quiz-hint" });
      }

      const optsWrap = body.createDiv({ cls: "gpt-rich-quiz-options" });
      const feedbackEl = body.createDiv({ cls: "gpt-rich-quiz-feedback" });
      feedbackEl.style.display = "none";

      let answered = false;

      const buildOptions = () => {
        answered = false;
        optsWrap.empty();
        feedbackEl.style.display = "none";
        feedbackEl.empty();

        block.options.forEach((opt, idx) => {
          const btn = optsWrap.createEl("button", { cls: "gpt-rich-quiz-opt" });
          btn.createSpan({
            text: String.fromCharCode(65 + idx),
            cls: "gpt-rich-quiz-opt-key"
          });
          btn.createSpan({ text: opt.label, cls: "gpt-rich-quiz-opt-label" });

          btn.addEventListener("click", () => {
            if (answered) return;
            answered = true;
            btn.addClass(opt.correct ? "is-correct" : "is-wrong");
            if (!opt.correct) {
              const rightIdx = block.options.findIndex((o) => o.correct);
              if (rightIdx >= 0) {
                optsWrap.children[rightIdx]?.addClass("is-correct");
              }
            }
            feedbackEl.style.display = "block";
            feedbackEl.className = opt.correct
              ? "gpt-rich-quiz-feedback is-correct"
              : "gpt-rich-quiz-feedback is-wrong";
            feedbackEl.createDiv({
              text: opt.correct ? "✓ 回答正确" : "✕ 再想想",
              cls: "gpt-rich-quiz-feedback-title"
            });
            if (opt.explanation) {
              const expDiv = feedbackEl.createDiv({
                cls: "gpt-rich-quiz-feedback-detail"
              });
              appendRichInlineTokens(this.app, this.sourcePath, this, expDiv, opt.explanation);
            }
          });
        });
      };

      resetBtn.addEventListener("click", buildOptions);
      buildOptions();
    }
  }
}
