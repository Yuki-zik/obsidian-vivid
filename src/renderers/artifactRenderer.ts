import { App, MarkdownRenderChild } from "obsidian";
import {
  ARTIFACT_SANDBOX_ATTR,
  buildSandboxedArtifactSrcdoc
} from "../core/artifactSandbox";
import {
  copyTextWithNotice,
  isObsidianDarkTheme,
  renderStreamingSkeleton
} from "../ui/domHelpers";
import { GptLightboxModal } from "../ui/lightboxModal";

let artifactSeq = 0;

export class GptArtifactRenderChild extends MarkdownRenderChild {
  private app: App;
  private source: string;
  private instanceId: string;
  private showingSource = false;
  private iframeEl: HTMLIFrameElement | null = null;

  constructor(app: App, containerEl: HTMLElement, source: string) {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.instanceId = `gpt-artifact-${++artifactSeq}-${Date.now()}`;
  }

  onload(): void {
    this.registerDomEvent(window, "message", (ev: MessageEvent) => {
      const data = ev.data as Record<string, unknown> | null;
      if (
        data &&
        data.type === "gpt-rich-artifact-resize" &&
        data.id === this.instanceId &&
        typeof data.height === "number" &&
        this.iframeEl
      ) {
        const clamped = Math.min(900, Math.max(120, Math.ceil(data.height) + 4));
        this.iframeEl.style.height = `${clamped}px`;
      }
    });

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        if (!this.showingSource) {
          this.render();
        }
      })
    );

    this.render();
  }

  private render(): void {
    const trimmed = this.source.trim();
    if (!trimmed) {
      renderStreamingSkeleton(this.containerEl, "正在流式构建交互式微组件…");
      return;
    }

    this.containerEl.empty();
    const card = this.containerEl.createDiv({ cls: "gpt-rich-card gpt-rich-artifact-card" });

    const header = card.createDiv({ cls: "gpt-rich-card-header" });
    const left = header.createDiv({ cls: "gpt-rich-artifact-badge-row" });
    left.createSpan({ cls: "gpt-rich-live-dot" });
    left.createSpan({ text: "Interactive Canvas Artifact", cls: "gpt-rich-card-title" });

    const toolbar = header.createDiv({ cls: "gpt-rich-toolbar" });

    const reloadBtn = toolbar.createEl("button", { text: "重置", cls: "gpt-rich-btn" });
    reloadBtn.addEventListener("click", () => this.render());

    const copyBtn = toolbar.createEl("button", { text: "复制 HTML", cls: "gpt-rich-btn" });
    copyBtn.addEventListener("click", () => {
      void copyTextWithNotice(trimmed, "Artifact HTML");
    });

    const srcBtn = toolbar.createEl("button", {
      text: this.showingSource ? "运行预览" : "源码",
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
      const modalId = `${this.instanceId}-modal`;
      new GptLightboxModal(this.app, "交互式微组件全屏预览", (modalBody) => {
        const frame = modalBody.createEl("iframe", {
          cls: "gpt-rich-artifact-iframe is-modal",
          attr: {
            sandbox: ARTIFACT_SANDBOX_ATTR,
            referrerpolicy: "no-referrer"
          }
        });
        frame.srcdoc = buildSandboxedArtifactSrcdoc(trimmed, modalId, isObsidianDarkTheme());
      }).open();
    });

    if (this.showingSource) {
      const pre = card.createEl("pre", { cls: "gpt-rich-source-pre" });
      pre.createEl("code", { text: trimmed });
      return;
    }

    const iframe = card.createEl("iframe", {
      cls: "gpt-rich-artifact-iframe",
      attr: {
        sandbox: ARTIFACT_SANDBOX_ATTR,
        referrerpolicy: "no-referrer"
      }
    });
    iframe.srcdoc = buildSandboxedArtifactSrcdoc(trimmed, this.instanceId, isObsidianDarkTheme());
    this.iframeEl = iframe;
  }
}
