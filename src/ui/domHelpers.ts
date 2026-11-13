import { Notice } from "obsidian";

export function isObsidianDarkTheme(): boolean {
  return document.body.classList.contains("theme-dark");
}

export function triggerBlobDownload(content: Blob | string, filename: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function triggerDataUrlDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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


