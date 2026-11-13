import { ParsedTableData } from "./tableModel";
import { GptUiBlock } from "./gptUiParser";

export interface GeneratedBaseBundle {
  baseFilePath: string;
  baseYaml: string;
  itemsFolderPath: string;
  rowNotes: Array<{ path: string; content: string }>;
}

function sanitizeFileName(name: string): string {
  const strippedWiki = name.replace(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/, "$1");
  const strippedMd = strippedWiki.replace(/[*`[\]]/g, "").trim();
  const safe = strippedMd.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return safe || "Item";
}

function sanitizePropertyKey(header: string, fallbackIdx: number): string {
  const cleaned = header
    .replace(/[*`[\]()]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\u4e00-\u9fa5-]/g, "");
  return cleaned || `col_${fallbackIdx}`;
}

function formatYamlScalar(raw: string): string {
  const t = raw.trim();
  if (!t) return '""';
  // Pure percentage -> store numeric for Bases sorting/formulas
  const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(t);
  if (pct) return pct[1];
  if (/^-?\d+(\.\d+)?$/.test(t)) return t;
  if (t === "true" || t === "false") return t;
  return JSON.stringify(t);
}

export function generateBaseBundleFromTable(
  baseTitle: string,
  targetRootFolder: string,
  data: ParsedTableData
): GeneratedBaseBundle {
  const cleanTitle = sanitizeFileName(baseTitle);
  const root = targetRootFolder.replace(/\/+$/, "");
  const itemsFolderPath = `${root}/items`;
  const baseFilePath = `${root}/${cleanTitle}.base`;

  const propKeys = data.headers.slice(1).map((h, idx) => sanitizePropertyKey(h, idx + 1));

  const rowNotes = data.rows.map((row, rIdx) => {
    const titleRaw = row[0] || `Row-${rIdx + 1}`;
    const noteName = sanitizeFileName(titleRaw);
    const fmLines = ["---"];
    propKeys.forEach((key, pIdx) => {
      const val = row[pIdx + 1] ?? "";
      fmLines.push(`${key}: ${formatYamlScalar(val)}`);
    });
    fmLines.push("---", "", `# ${noteName}`, "");
    return {
      path: `${itemsFolderPath}/${noteName}.md`,
      content: fmLines.join("\n")
    };
  });

  const orderLines = ["      - file.name", ...propKeys.map((k) => `      - ${k}`)].join("\n");
  const baseYaml = [
    "filters:",
    "  and:",
    `    - file.inFolder("${itemsFolderPath}")`,
    "views:",
    "  - type: table",
    `    name: "${cleanTitle}"`,
    "    order:",
    orderLines,
    "  - type: cards",
    '    name: "Cards View"',
    "    order:",
    orderLines,
    ""
  ].join("\n");

  return {
    baseFilePath,
    baseYaml,
    itemsFolderPath,
    rowNotes
  };
}

interface CanvasNode {
  id: string;
  type: "text" | "file";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  file?: string;
  color?: string;
}

interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: "top" | "right" | "bottom" | "left";
  toNode: string;
  toSide: "top" | "right" | "bottom" | "left";
}

function mapStrokeToCanvasColor(stroke: string): string | undefined {
  const s = stroke.toLowerCase();
  if (s.includes("ef4444") || s.includes("f43f5e")) return "1"; // Red
  if (s.includes("f59e0b") || s.includes("fbbf24")) return "2"; // Orange/Amber
  if (s.includes("10b981") || s.includes("34d399")) return "4"; // Green
  if (s.includes("0ea5e9") || s.includes("38bdf8")) return "5"; // Cyan
  if (s.includes("6366f1") || s.includes("8b5cf6") || s.includes("a78bfa")) return "6"; // Purple
  return undefined;
}

export function convertSvgToJsonCanvas(svgHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgHtml, "image/svg+xml");
  const rects = Array.from(doc.querySelectorAll("rect"));
  const texts = Array.from(doc.querySelectorAll("text"));
  const paths = Array.from(doc.querySelectorAll("path, line"));

  const nodes: CanvasNode[] = [];
  let idx = 0;

  for (const r of rects) {
    const x = parseFloat(r.getAttribute("x") ?? "0");
    const y = parseFloat(r.getAttribute("y") ?? "0");
    const width = parseFloat(r.getAttribute("width") ?? "0");
    const height = parseFloat(r.getAttribute("height") ?? "0");
    if (width < 40 || height < 28) continue;

    // Collect text elements falling inside this rect
    const insideTexts = texts
      .filter((t) => {
        const tx = parseFloat(t.getAttribute("x") ?? "-999");
        const ty = parseFloat(t.getAttribute("y") ?? "-999");
        return tx >= x - 8 && tx <= x + width + 8 && ty >= y - 4 && ty <= y + height + 8;
      })
      .map((t) => (t.textContent ?? "").trim())
      .filter(Boolean);

    const id = `node-${++idx}`;
    const color = mapStrokeToCanvasColor(r.getAttribute("stroke") ?? "");
    const dataNote = r.getAttribute("data-note") || r.parentElement?.getAttribute("data-note");
    const wikiMatch = insideTexts.join(" ").match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);

    if (dataNote || wikiMatch) {
      const target = (dataNote || wikiMatch![1]).replace(/\.md$/i, "") + ".md";
      nodes.push({
        id,
        type: "file",
        file: target,
        x: Math.round(x * 1.25),
        y: Math.round(y * 1.25),
        width: Math.round(Math.max(220, width * 1.25)),
        height: Math.round(Math.max(120, height * 1.25)),
        ...(color ? { color } : {})
      });
    } else {
      const mdLines = insideTexts.map((line, i) => (i === 0 ? `### ${line}` : line)).join("\n\n");
      nodes.push({
        id,
        type: "text",
        text: mdLines || "Node",
        x: Math.round(x * 1.25),
        y: Math.round(y * 1.25),
        width: Math.round(Math.max(200, width * 1.25)),
        height: Math.round(Math.max(105, height * 1.25)),
        ...(color ? { color } : {})
      });
    }
  }

  const edges: CanvasEdge[] = [];
  let edgeIdx = 0;

  for (const p of paths) {
    let sx = NaN;
    let sy = NaN;
    let ex = NaN;
    let ey = NaN;

    if (p.tagName.toLowerCase() === "line") {
      sx = parseFloat(p.getAttribute("x1") ?? "");
      sy = parseFloat(p.getAttribute("y1") ?? "");
      ex = parseFloat(p.getAttribute("x2") ?? "");
      ey = parseFloat(p.getAttribute("y2") ?? "");
    } else {
      const d = p.getAttribute("d") ?? "";
      const coordPairs = Array.from(d.matchAll(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/g));
      if (coordPairs.length >= 2) {
        sx = parseFloat(coordPairs[0][1]) * 1.25;
        sy = parseFloat(coordPairs[0][2]) * 1.25;
        ex = parseFloat(coordPairs[coordPairs.length - 1][1]) * 1.25;
        ey = parseFloat(coordPairs[coordPairs.length - 1][2]) * 1.25;
      }
    }

    if (!Number.isFinite(sx) || !Number.isFinite(ex) || nodes.length < 2) continue;

    const findClosest = (px: number, py: number): CanvasNode | null => {
      let best: CanvasNode | null = null;
      let bestDist = Infinity;
      for (const n of nodes) {
        const cx = Math.max(n.x, Math.min(px, n.x + n.width));
        const cy = Math.max(n.y, Math.min(py, n.y + n.height));
        const dist = Math.hypot(px - cx, py - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = n;
        }
      }
      return bestDist < 120 ? best : null;
    };

    const fromNode = findClosest(sx, sy);
    const toNode = findClosest(ex, ey);
    if (fromNode && toNode && fromNode.id !== toNode.id) {
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      edges.push({
        id: `edge-${++edgeIdx}`,
        fromNode: fromNode.id,
        fromSide: horizontal ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top",
        toNode: toNode.id,
        toSide: horizontal ? (dx >= 0 ? "left" : "right") : dy >= 0 ? "top" : "bottom"
      });
    }
  }

  return JSON.stringify({ nodes, edges }, null, 2);
}

export function convertTimelineToJsonCanvas(
  block: Extract<GptUiBlock, { kind: "timeline" }>
): string {
  const nodes: CanvasNode[] = block.items.map((item, idx) => ({
    id: `step-${idx + 1}`,
    type: "text",
    x: idx * 320,
    y: 0,
    width: 260,
    height: 150,
    color: item.status === "done" ? "4" : item.status === "active" ? "5" : undefined,
    text: `${item.time ? `\`${item.time}\` ` : ""}**${item.title}**${
      item.detail ? `\n\n${item.detail}` : ""
    }`
  }));

  const edges: CanvasEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge-${i + 1}`,
      fromNode: nodes[i].id,
      fromSide: "right",
      toNode: nodes[i + 1].id,
      toSide: "left"
    });
  }

  return JSON.stringify({ nodes, edges }, null, 2);
}
