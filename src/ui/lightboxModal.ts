import { App, Modal } from "obsidian";

export class GptLightboxModal extends Modal {
  private titleText: string;
  private mountCallback: (bodyEl: HTMLElement) => (() => void) | void;
  private cleanupFn: (() => void) | void;

  constructor(
    app: App,
    titleText: string,
    mountCallback: (bodyEl: HTMLElement) => (() => void) | void
  ) {
    super(app);
    this.titleText = titleText;
    this.mountCallback = mountCallback;
  }

  onOpen(): void {
    const { modalEl, contentEl, titleEl } = this;
    modalEl.addClass("gpt-rich-lightbox-modal");
    titleEl.setText(this.titleText);
    contentEl.empty();
    contentEl.addClass("gpt-rich-lightbox-content");
    this.cleanupFn = this.mountCallback(contentEl);
  }

  onClose(): void {
    if (this.cleanupFn) {
      this.cleanupFn();
    }
    this.contentEl.empty();
  }
}
