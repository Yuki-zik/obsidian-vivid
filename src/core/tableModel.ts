export type ColumnAlignment = "left" | "center" | "right";

export interface ParsedTableData {
  headers: string[];
  alignments: ColumnAlignment[];
  rows: string[][];
}

export type InlineCellToken =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "strong"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "wikilink"; target: string; alias: string }
  | { type: "tag"; tag: string };

export interface ColumnNumericSummary {
  sum: number;
  avg: number;
  count: number;
  isPercent: boolean;
}

export type CellClassification =
  | { kind: "progress"; percent: number; raw: string }
  | { kind: "delta"; direction: "up" | "down"; raw: string }
  | { kind: "badge"; tone: "success" | "info" | "warning" | "danger" | "neutral"; label: string }
  | { kind: "number"; numeric: number; raw: string }
  | { kind: "text"; raw: string };

function splitPipeRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

export function parseMarkdownTable(markdown: string): ParsedTableData | null {
  const lines = markdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;
  if (!lines[0].includes("|") || !lines[1].includes("-")) return null;

  const headers = splitPipeRow(lines[0]);
  const sepCells = splitPipeRow(lines[1]);
  if (headers.length === 0 || sepCells.length < headers.length) return null;
  if (!sepCells.every((c) => /^:?-{2,}:?$/.test(c))) return null;

  const alignments: ColumnAlignment[] = sepCells.slice(0, headers.length).map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].includes("|")) continue;
    const rawCells = splitPipeRow(lines[i]);
    const normalized = headers.map((_, colIdx) => rawCells[colIdx] ?? "");
    rows.push(normalized);
  }

  return { headers, alignments, rows };
}

export function extractHtmlTableData(tableEl: HTMLTableElement): ParsedTableData | null {
  const headerEls = Array.from(tableEl.querySelectorAll("thead tr th, thead tr td"));
  const bodyRows = Array.from(tableEl.querySelectorAll("tbody tr"));

  if (headerEls.length === 0) return null;

  const headers = headerEls.map((th) => extractRichTextPreservingCode(th));
  const alignments: ColumnAlignment[] = headerEls.map((th) => {
    const alignAttr = (th.getAttribute("align") ?? "").toLowerCase();
    const styleAlign = (th as HTMLElement).style?.textAlign?.toLowerCase() ?? "";
    const effective = styleAlign || alignAttr;
    if (effective === "center") return "center";
    if (effective === "right") return "right";
    return "left";
  });

  const rows = bodyRows.map((tr) => {
    const cells = Array.from(tr.querySelectorAll("td, th"));
    return headers.map((_, idx) => (cells[idx] ? extractRichTextPreservingCode(cells[idx]) : ""));
  });

  return { headers, alignments, rows };
}

function extractRichTextPreservingCode(el: Element): string {
  let out = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childEl = node as HTMLElement;
      const tag = childEl.tagName.toLowerCase();
      if (tag === "code") {
        out += `\`${childEl.textContent ?? ""}\``;
      } else if (tag === "strong" || tag === "b") {
        out += `**${childEl.textContent ?? ""}**`;
      } else if (tag === "a" && childEl.classList.contains("internal-link")) {
        const target = childEl.getAttribute("data-href") ?? childEl.textContent ?? "";
        const alias = (childEl.textContent ?? "").trim();
        out += alias && alias !== target ? `[[${target}|${alias}]]` : `[[${target}]]`;
      } else if (tag === "a" && childEl.classList.contains("tag")) {
        out += (childEl.textContent ?? "").trim();
      } else if (tag === "a") {
        const href = childEl.getAttribute("href") ?? "";
        if (/^https?:\/\//i.test(href)) {
          out += `[${childEl.textContent ?? ""}](${href})`;
        } else {
          out += childEl.textContent ?? "";
        }
      } else {
        out += extractRichTextPreservingCode(childEl);
      }
    }
  });
  return out.trim();
}

export function tokenizeInlineCellText(raw: string): InlineCellToken[] {
  const tokens: InlineCellToken[] = [];
  const pattern =
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(?<=^|\s)(#(?![0-9a-fA-F]{3}(?:\b|$)|[0-9a-fA-F]{6}(?:\b|$))[a-zA-Z\u4e00-\u9fa5][\w\u4e00-\u9fa5/-]*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: raw.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      const target = match[1].trim();
      const alias = match[2] !== undefined ? match[2].trim() : target;
      tokens.push({ type: "wikilink", target, alias });
    } else if (match[3] !== undefined) {
      tokens.push({ type: "code", value: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ type: "strong", value: match[4] });
    } else if (match[5] !== undefined && match[6] !== undefined) {
      tokens.push({ type: "link", label: match[5], href: match[6] });
    } else if (match[7] !== undefined) {
      tokens.push({ type: "tag", tag: match[7] });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < raw.length) {
    tokens.push({ type: "text", value: raw.slice(lastIndex) });
  }
  return tokens.length > 0 ? tokens : [{ type: "text", value: raw }];
}

export function computeColumnSummaries(
  headers: string[],
  rows: string[][]
): Array<ColumnNumericSummary | null> {
  if (rows.length < 2) return headers.map(() => null);
  return headers.map((_, colIdx) => {
    const nums: number[] = [];
    let pctCount = 0;
    for (const r of rows) {
      const cell = (r[colIdx] ?? "").trim();
      if (!cell) continue;
      const n = extractSortableNumber(cell);
      if (n === null) return null;
      nums.push(n);
      if (cell.endsWith("%")) pctCount++;
    }
    if (nums.length < 2) return null;
    const sum = nums.reduce((acc, v) => acc + v, 0);
    return {
      sum: +sum.toFixed(2),
      avg: +(sum / nums.length).toFixed(2),
      count: nums.length,
      isPercent: pctCount === nums.length
    };
  });
}

export function classifyCellValue(rawInput: string): CellClassification {
  const raw = rawInput.trim();
  if (!raw) return { kind: "text", raw: "" };

  if (/^[+-]\s*\d+(\.\d+)?\s*(%|x|pts|bps|ms|s)?$/i.test(raw)) {
    return {
      kind: "delta",
      direction: raw.startsWith("-") ? "down" : "up",
      raw
    };
  }

  const pctMatch = /^(\d{1,3}(?:\.\d+)?)\s*%$/.exec(raw);
  if (pctMatch) {
    const val = parseFloat(pctMatch[1]);
    if (val >= 0 && val <= 100) {
      return { kind: "progress", percent: val, raw };
    }
  }

  if (/^(✅|🟢)/.test(raw) || /^(已完成|已上线|通过|正常|推荐|active|done|passed|ready|production|stable|high)$/i.test(raw)) {
    return { kind: "badge", tone: "success", label: raw };
  }
  if (/^(🚀|🔵|⚡)/.test(raw) || /^(进行中|灰度中|实验中|开发中|运行中|进阶可选|in progress|beta|preview|running)$/i.test(raw)) {
    return { kind: "badge", tone: "info", label: raw };
  }
  if (/^(⚠️|🟡|⏳)/.test(raw) || /^(待定|维护态|观察中|中等|风险|体验受限|pending|warning|experimental|medium)$/i.test(raw)) {
    return { kind: "badge", tone: "warning", label: raw };
  }
  if (/^(❌|🔴|⛔)/.test(raw) || /^(失败|已废弃|阻塞|高危|failed|blocked|deprecated|error|critical)$/i.test(raw)) {
    return { kind: "badge", tone: "danger", label: raw };
  }

  const num = extractSortableNumber(raw);
  if (num !== null && /^[$¥€£]?\s*-?\d[\d,]*(\.\d+)?\s*([a-zA-Z/%/\u4e00-\u9fa5]+)?$/.test(raw)) {
    return { kind: "number", numeric: num, raw };
  }

  return { kind: "text", raw };
}

export function extractSortableNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/^[$¥€£+]\s*/, "").replace(/,/g, "");
  const match = /^(-?\d+(?:\.\d+)?)(?:\s*[a-zA-Z/%°/\u4e00-\u9fa5]+)?$/.exec(cleaned);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function sortTableRows(
  rows: string[][],
  colIndex: number,
  direction: "asc" | "desc"
): string[][] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const cellA = a[colIndex] ?? "";
    const cellB = b[colIndex] ?? "";
    const numA = extractSortableNumber(cellA);
    const numB = extractSortableNumber(cellB);

    if (numA !== null && numB !== null) {
      return (numA - numB) * factor;
    }
    return cellA.localeCompare(cellB, "zh-CN", { numeric: true, sensitivity: "base" }) * factor;
  });
}

export function filterTableRows(rows: string[][], query: string): string[][] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
}

function escapeCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportRowsToCsv(headers: string[], rows: string[][]): string {
  const all = [headers, ...rows];
  return all.map((r) => r.map(escapeCsvField).join(",")).join("\n");
}

export function exportRowsToMarkdown(
  headers: string[],
  alignments: ColumnAlignment[],
  rows: string[][]
): string {
  const headLine = `| ${headers.join(" | ")} |`;
  const sepLine = `| ${alignments
    .map((a) => (a === "center" ? ":---:" : a === "right" ? "---:" : ":---"))
    .join(" | ")} |`;
  const bodyLines = rows.map((r) => `| ${r.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`);
  return [headLine, sepLine, ...bodyLines].join("\n");
}
