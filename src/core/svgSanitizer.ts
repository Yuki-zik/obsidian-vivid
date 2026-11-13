import DOMPurify from "dompurify";

export type SanitizedSvgResult =
  | { status: "streaming" }
  | { status: "error"; message: string }
  | { status: "ready"; svgHtml: string; viewBox: string };

export function sanitizeAndPrepareSvg(rawSource: string): SanitizedSvgResult {
  const trimmed = rawSource.trim();
  if (!trimmed) {
    return { status: "streaming" };
  }

  const startIdx = trimmed.search(/<svg[\s>]/i);
  if (startIdx === -1) {
    return { status: "streaming" };
  }

  const hasClosing = /<\/svg\s*>/i.test(trimmed);
  if (!hasClosing) {
    return { status: "streaming" };
  }

  const endMatch = /<\/svg\s*>/gi;
  let lastEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = endMatch.exec(trimmed)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  const extracted = trimmed.slice(startIdx, lastEnd);

  const clean = DOMPurify.sanitize(extracted, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: [
      "onload",
      "onerror",
      "onclick",
      "onmouseover",
      "onmouseenter",
      "onmousedown",
      "onfocus"
    ]
  });

  if (!clean || !clean.includes("<svg")) {
    return { status: "error", message: "SVG sanitization resulted in empty graphic" };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(clean, "image/svg+xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    return { status: "error", message: "Malformed SVG XML syntax" };
  }

  const svgEl = doc.querySelector("svg");
  if (!svgEl) {
    return { status: "error", message: "Missing root <svg> element" };
  }

  let viewBox = svgEl.getAttribute("viewBox");
  if (!viewBox) {
    const wAttr = parseFloat(svgEl.getAttribute("width") ?? "") || 800;
    const hAttr = parseFloat(svgEl.getAttribute("height") ?? "") || 420;
    viewBox = `0 0 ${wAttr} ${hAttr}`;
    svgEl.setAttribute("viewBox", viewBox);
  }

  svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgEl.classList.add("gpt-rich-svg-el");
  svgEl.removeAttribute("width");
  svgEl.removeAttribute("height");

  const serializer = new XMLSerializer();
  return {
    status: "ready",
    svgHtml: serializer.serializeToString(svgEl),
    viewBox
  };
}
