export const ARTIFACT_SANDBOX_ATTR = "allow-scripts";

export function buildSandboxedArtifactSrcdoc(
  userHtml: string,
  instanceId: string,
  isDark: boolean
): string {
  const themeAttr = isDark ? "dark" : "light";
  const bg = isDark ? "#18181b" : "#ffffff";
  const surface = isDark ? "#232329" : "#f8fafc";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)";
  const text = isDark ? "#f3f4f6" : "#0f172a";
  const muted = isDark ? "#9ca3af" : "#64748b";
  const accent = isDark ? "#818cf8" : "#4f46e5";

  const baseStyles = `
<style id="gpt-rich-artifact-theme">
  :root {
    --bg: ${bg};
    --surface: ${surface};
    --border: ${border};
    --text: ${text};
    --muted: ${muted};
    --accent: ${accent};
    color-scheme: ${themeAttr};
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: var(--text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.55;
    overflow-x: hidden;
  }
  body { padding: 16px; }
  button, input, select {
    font: inherit;
  }
</style>`;

  const resizeScript = `
<script>
(function() {
  var id = ${JSON.stringify(instanceId)};
  var lastHeight = 0;
  function report() {
    var body = document.body;
    var docEl = document.documentElement;
    if (!body || !docEl) return;
    var h = Math.max(body.scrollHeight, body.offsetHeight, docEl.offsetHeight);
    if (Math.abs(h - lastHeight) > 2) {
      lastHeight = h;
      parent.postMessage({ type: "gpt-rich-artifact-resize", id: id, height: h }, "*");
    }
  }
  window.addEventListener("load", report);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(report).observe(document.documentElement);
  }
  setInterval(report, 400);
  setTimeout(report, 30);
})();
</script>`;

  const hasFullDoc = /<html[\s>]/i.test(userHtml);
  if (hasFullDoc) {
    let injected = userHtml.replace(
      /<html([^>]*)>/i,
      `<html$1 data-theme="${themeAttr}">`
    );
    if (/<\/head>/i.test(injected)) {
      injected = injected.replace(/<\/head>/i, `${baseStyles}</head>`);
    } else {
      injected = `${baseStyles}${injected}`;
    }
    if (/<\/body>/i.test(injected)) {
      injected = injected.replace(/<\/body>/i, `${resizeScript}</body>`);
    } else {
      injected = `${injected}${resizeScript}`;
    }
    return injected;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${themeAttr}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${baseStyles}
</head>
<body>
${userHtml}
${resizeScript}
</body>
</html>`;
}
