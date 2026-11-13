import { App, MarkdownRenderChild, Notice } from "obsidian";
import {
  ParsedTableData,
  classifyCellValue,
  computeColumnSummaries,
  exportRowsToCsv,
  exportRowsToMarkdown,
  extractHtmlTableData,
  filterTableRows,
  parseMarkdownTable,
  sortTableRows
} from "../core/tableModel";
import { interpolateFrontmatterVariables } from "../core/frontmatterBinding";
import {
  appendRichInlineTokens,
  exportTableToObsidianBase,
  getNoteFrontmatter
} from "../ui/obsidianBridge";
import { copyTextWithNotice, renderErrorCard, triggerBlobDownload } from "../ui/domHelpers";
import { GptLightboxModal } from "../ui/lightboxModal";

export function buildInteractiveTableWidget(
  app: App,
  hostEl: HTMLElement,
  data: ParsedTableData,
  allowExpand = true,
  sourcePath = "",
  hoverParent: unknown = null
): void {
  hostEl.empty();
  const card = hostEl.createDiv({ cls: "gpt-rich-card gpt-rich-table-card" });

  let searchQuery = "";
  let sortCol: number | null = null;
  let sortDir: "asc" | "desc" | null = null;
  let searchVisible = data.rows.length >= 4;
  let showSummaryFooter = false;

  const initialSummaries = computeColumnSummaries(data.headers, data.rows);
  const hasAnyNumericSummary = initialSummaries.some((s) => s !== null);

  const topBar = card.createDiv({ cls: "gpt-rich-table-topbar" });
  const leftMeta = topBar.createDiv({ cls: "gpt-rich-table-meta" });
  const countBadge = leftMeta.createSpan({
    text: `${data.rows.length} 行`,
    cls: "gpt-rich-count-pill"
  });

  const searchInput = leftMeta.createEl("input", {
    type: "search",
    placeholder: "搜索过滤表格内容…",
    cls: "gpt-rich-table-search"
  });
  searchInput.toggleClass("gpt-rich-is-hidden", !searchVisible);

  const actions = topBar.createDiv({ cls: "gpt-rich-toolbar" });

  if (!searchVisible) {
    const searchToggleBtn = actions.createEl("button", { text: "筛选", cls: "gpt-rich-btn" });
    searchToggleBtn.addEventListener("click", () => {
      searchVisible = !searchVisible;
      searchInput.toggleClass("gpt-rich-is-hidden", !searchVisible);
      if (searchVisible) searchInput.focus();
    });
  }

  if (hasAnyNumericSummary) {
    const sumBtn = actions.createEl("button", { text: "∑ 汇总", cls: "gpt-rich-btn" });
    sumBtn.addEventListener("click", () => {
      showSummaryFooter = !showSummaryFooter;
      sumBtn.toggleClass("gpt-rich-btn-primary", showSummaryFooter);
      renderFooter();
    });
  }

  const toBaseBtn = actions.createEl("button", {
    text: "转 Base 库",
    cls: "gpt-rich-btn",
    attr: { "aria-label": "将表格一键转换为 Obsidian 原生 .base 数据库与属性笔记集" }
  });
  toBaseBtn.addEventListener("click", () => {
    const baseName = sourcePath
      ? sourcePath.replace(/\.md$/i, "").split("/").pop() || "GPT-Table"
      : "GPT-Table";
    void exportTableToObsidianBase(
      app,
      { headers: data.headers, alignments: data.alignments, rows: getProcessedRows() },
      baseName
    );
  });

  const copyMdBtn = actions.createEl("button", { text: "复制 MD", cls: "gpt-rich-btn" });
  copyMdBtn.addEventListener("click", () => {
    const md = exportRowsToMarkdown(data.headers, data.alignments, getProcessedRows());
    void copyTextWithNotice(md, "Markdown 表格");
  });

  const csvBtn = actions.createEl("button", { text: "导出 CSV", cls: "gpt-rich-btn" });
  csvBtn.addEventListener("click", () => {
    const csv = "\uFEFF" + exportRowsToCsv(data.headers, getProcessedRows());
    triggerBlobDownload(csv, "table-export.csv", "text/csv;charset=utf-8");
    new Notice("已导出 CSV 文件（Excel 兼容 UTF-8 BOM）");
  });

  if (allowExpand) {
    const expandBtn = actions.createEl("button", {
      text: "全屏",
      cls: "gpt-rich-btn gpt-rich-btn-primary"
    });
    expandBtn.addEventListener("click", () => {
      new GptLightboxModal(app, "数据表格全屏视图", (modalBody) => {
        buildInteractiveTableWidget(app, modalBody, data, false, sourcePath, hoverParent);
      }).open();
    });
  }

  const scrollWrap = card.createDiv({ cls: "gpt-rich-table-scroll" });
  const table = scrollWrap.createEl("table", { cls: "gpt-rich-table" });
  const thead = table.createEl("thead");
  const tbody = table.createEl("tbody");
  const tfoot = table.createEl("tfoot", { cls: "gpt-rich-table-tfoot" });

  const getProcessedRows = (): string[][] => {
    const filtered = filterTableRows(data.rows, searchQuery);
    if (sortCol !== null && sortDir !== null) {
      return sortTableRows(filtered, sortCol, sortDir);
    }
    return filtered;
  };

  const renderHeader = () => {
    thead.empty();
    const tr = thead.createEl("tr");
    data.headers.forEach((h, idx) => {
      const align = data.alignments[idx] ?? "left";
      const th = tr.createEl("th", { cls: `align-${align} is-sortable` });
      const inner = th.createDiv({ cls: "gpt-rich-th-inner" });
      const labelSpan = inner.createSpan();
      appendRichInlineTokens(app, sourcePath, hoverParent, labelSpan, h);

      const indicator = sortCol === idx ? (sortDir === "asc" ? " ↑" : " ↓") : " ⇅";
      inner.createSpan({
        text: indicator,
        cls: sortCol === idx ? "gpt-rich-sort-icon is-active" : "gpt-rich-sort-icon"
      });

      th.addEventListener("click", () => {
        if (sortCol !== idx) {
          sortCol = idx;
          sortDir = "asc";
        } else if (sortDir === "asc") {
          sortDir = "desc";
        } else {
          sortCol = null;
          sortDir = null;
        }
        renderHeader();
        renderBody();
      });
    });
  };

  const renderFooter = () => {
    tfoot.empty();
    if (!showSummaryFooter) return;
    const rows = getProcessedRows();
    const summaries = computeColumnSummaries(data.headers, rows);
    const tr = tfoot.createEl("tr");
    data.headers.forEach((_, idx) => {
      const align = data.alignments[idx] ?? "left";
      const td = tr.createEl("td", { cls: `align-${align}` });
      const s = summaries[idx];
      if (idx === 0 && !s) {
        td.setText("统计汇总 (Avg / Σ)");
      } else if (s) {
        td.setText(s.isPercent ? `Avg ${s.avg}%` : `Avg ${s.avg} · Σ ${s.sum}`);
      } else {
        td.setText("—");
      }
    });
  };

  const renderBody = () => {
    tbody.empty();
    const rows = getProcessedRows();
    countBadge.setText(
      searchQuery.trim()
        ? `${rows.length} / ${data.rows.length} 行`
        : `${data.rows.length} 行`
    );

    if (rows.length === 0) {
      const emptyTr = tbody.createEl("tr");
      emptyTr.createEl("td", {
        text: "没有匹配的筛选结果",
        cls: "gpt-rich-table-empty",
        attr: { colspan: String(data.headers.length) }
      });
      renderFooter();
      return;
    }

    for (const row of rows) {
      const tr = tbody.createEl("tr");
      row.forEach((cellRaw, colIdx) => {
        const align = data.alignments[colIdx] ?? "left";
        const td = tr.createEl("td", { cls: `align-${align}` });
        const classified = classifyCellValue(cellRaw);

        if (classified.kind === "progress") {
          const wrap = td.createDiv({ cls: "gpt-rich-progress-cell" });
          const track = wrap.createDiv({ cls: "gpt-rich-progress-track" });
          const fill = track.createDiv({ cls: "gpt-rich-progress-fill" });
          fill.style.width = `${Math.min(100, Math.max(0, classified.percent))}%`;
          if (classified.percent >= 80) fill.addClass("tone-high");
          else if (classified.percent >= 50) fill.addClass("tone-mid");
          else fill.addClass("tone-low");
          wrap.createSpan({ text: classified.raw, cls: "gpt-rich-progress-label" });
        } else if (classified.kind === "delta") {
          td.createSpan({
            text: classified.raw,
            cls: `gpt-rich-delta-pill is-${classified.direction}`
          });
        } else if (classified.kind === "badge") {
          td.createSpan({
            text: classified.label,
            cls: `gpt-rich-badge tone-${classified.tone}`
          });
        } else if (classified.kind === "number") {
          td.createSpan({ text: classified.raw, cls: "gpt-rich-mono-num" });
        } else {
          appendRichInlineTokens(app, sourcePath, hoverParent, td, classified.raw);
        }
      });
    }

    renderFooter();
  };

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderBody();
  });

  renderHeader();
  renderBody();
}

export class GptTableBlockRenderChild extends MarkdownRenderChild {
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
    const parsed = parseMarkdownTable(interpolated);
    if (!parsed) {
      renderErrorCard(
        this.containerEl,
        "无法解析 Markdown 表格",
        "请确保包含表头行与 | --- | 分隔行",
        interpolated
      );
      return;
    }
    buildInteractiveTableWidget(this.app, this.containerEl, parsed, true, this.sourcePath, this);
  }
}

export function enhanceNativeTableElements(
  app: App,
  rootEl: HTMLElement,
  sourcePath = ""
): void {
  if (rootEl.closest(".cm-table-widget") || rootEl.classList.contains("cm-table-widget")) {
    return;
  }

  const tables = Array.from(rootEl.querySelectorAll("table"));
  for (const tableEl of tables) {
    if (
      tableEl.classList.contains("gpt-rich-table") ||
      tableEl.closest(".gpt-rich-card") ||
      tableEl.closest(".cm-table-widget") ||
      tableEl.closest(".dataview")
    ) {
      continue;
    }

    const parsed = extractHtmlTableData(tableEl);
    if (!parsed || parsed.rows.length < 1 || parsed.headers.length < 2) {
      continue;
    }

    const host = createDiv({ cls: "gpt-rich-native-table-host" });
    tableEl.replaceWith(host);
    buildInteractiveTableWidget(app, host, parsed, true, sourcePath, app.workspace);
  }
}
