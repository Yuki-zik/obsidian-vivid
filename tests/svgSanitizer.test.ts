import { describe, it, expect } from "vitest";
import { sanitizeAndPrepareSvg } from "../src/core/svgSanitizer";

describe("sanitizeAndPrepareSvg", () => {
  it("returns streaming state when closing </svg> tag has not arrived yet", () => {
    const partial = '<svg width="600" height="300"><rect x="10" y="10" width="100" height="50" />';
    const res = sanitizeAndPrepareSvg(partial);
    expect(res.status).toBe("streaming");
  });

  it("strips malicious <script> tags and inline event handlers while keeping valid SVG geometry", () => {
    const dirty = `
      <svg width="400" height="200" onload="alert('xss')">
        <script>require('child_process').exec('whoami')</script>
        <rect x="10" y="10" width="120" height="60" rx="8" fill="#3b82f6" onclick="evil()" />
        <text x="70" y="45" text-anchor="middle">Safe Node</text>
      </svg>
    `;
    const res = sanitizeAndPrepareSvg(dirty);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.svgHtml).not.toContain("<script");
      expect(res.svgHtml).not.toContain("onload");
      expect(res.svgHtml).not.toContain("onclick");
      expect(res.svgHtml).toContain("Safe Node");
      expect(res.svgHtml).toContain('viewBox="0 0 400 200"');
    }
  });

  it("preserves existing viewBox and gradients/markers needed for flowcharts", () => {
    const flowchart = `
      <svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6366f1" />
            <stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
        </defs>
        <path d="M 100 160 L 240 160" stroke="#6366f1" stroke-width="2" fill="none" />
      </svg>
    `;
    const res = sanitizeAndPrepareSvg(flowchart);
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.svgHtml).toContain("linearGradient");
      expect(res.svgHtml).toContain('viewBox="0 0 800 320"');
    }
  });
});
