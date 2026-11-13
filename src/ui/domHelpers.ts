import { Notice } from "obsidian";

export function isObsidianDarkTheme(): boolean {
  return activeDocument.body.classList.contains("theme-dark");
}

export function triggerBlobDownload(content: Blob | string, filename: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = activeDocument.body.createEl("a", {
    href: url,
    attr: { download: filename }
  });
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function triggerDataUrlDownload(dataUrl: string, filename: string): void {
  const a = activeDocument.body.createEl("a", {
    href: dataUrl,
    attr: { download: filename }
  });
  a.click();
  a.remove();
}

export function mountSanitizedSvg(host: HTMLElement, svgHtml: string): void {
  const parsed = new DOMParser().parseFromString(svgHtml, "image/svg+xml");
  const svgEl = parsed.documentElement;
  if (svgEl.tagName.toLowerCase() === "svg" && !parsed.querySelector("parsererror")) {
    host.appendChild(activeDocument.importNode(svgEl, true));
  }
}

export function appendSparklineSvg(host: HTMLElement, pathD: string, stroke: string): void {
  const svg = host.createSvg("svg", {
    attr: { viewBox: "0 0 84 28", width: "84", height: "28" }
  });
  svg.createSvg("path", {
    attr: {
      d: pathD,
      fill: "none",
      stroke,
      "stroke-width": "2.2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }
  });
}

export async function copyTextWithNotice(text: string, label = "内容"): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    new Notice(`已复制${label}到剪贴板`);
  } catch {
    new Notice(`复制${label}失败`);
  }
}

export function renderStreamingSkeleton(container: HTMLElement, label: string): void {
  container.empty();
  const card = container.createDiv({ cls: "gpt-rich-card gpt-rich-skeleton-card" });
  const row = card.createDiv({ cls: "gpt-rich-skeleton-header" });
  row.createSpan({ cls: "gpt-rich-pulse-dot" });
  row.createSpan({ text: label, cls: "gpt-rich-skeleton-label" });
  card.createDiv({ cls: "gpt-rich-skeleton-bar gpt-rich-skeleton-bar-lg" });
  card.createDiv({ cls: "gpt-rich-skeleton-bar gpt-rich-skeleton-bar-md" });
}

export function renderErrorCard(container: HTMLElement, title: string, detail: string, rawSource: string): void {
  container.empty();
  const card = container.createDiv({ cls: "gpt-rich-card gpt-rich-error-card" });
  card.createDiv({ text: title, cls: "gpt-rich-error-title" });
  card.createDiv({ text: detail, cls: "gpt-rich-error-detail" });
  const pre = card.createEl("pre", { cls: "gpt-rich-source-pre" });
  pre.createEl("code", { text: rawSource });
}

export { mountWhenSizedAndConnected } from "../core/domLifecycle";
export type { DeferredMountHooks } from "../core/domLifecycle";


