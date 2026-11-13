(function () {
  "use strict";

  const BTN_CLASS = "gpt-obsidian-bridge-btn";

  function htmlTableToMarkdown(tableEl) {
    const rows = Array.from(tableEl.querySelectorAll("tr"));
    if (rows.length === 0) return "";
    const matrix = rows.map((tr) =>
      Array.from(tr.querySelectorAll("th, td")).map((cell) =>
        (cell.innerText || cell.textContent || "")
          .replace(/\r?\n+/g, " ")
          .replace(/\|/g, "\\|")
          .trim()
      )
    );
    const colCount = Math.max(...matrix.map((r) => r.length));
    if (colCount === 0) return "";
    const pad = (r) => Array.from({ length: colCount }, (_, i) => r[i] || "");
    const head = `| ${pad(matrix[0]).join(" | ")} |`;
    const sep = `| ${Array.from({ length: colCount }, () => ":---").join(" | ")} |`;
    const body = matrix
      .slice(1)
      .map((r) => `| ${pad(r).join(" | ")} |`)
      .join("\n");
    return `\n\n${head}\n${sep}${body ? "\n" + body : ""}\n\n`;
  }

  function serializeDomNodeToLosslessMarkdown(root) {
    const clone = root.cloneNode(true);

    // Remove UI chrome buttons inside code blocks / tables
    clone.querySelectorAll("button, ." + BTN_CLASS).forEach((b) => b.remove());

    // 1. Preserve inline rendered SVGs (> 64px diagram graphics, skip tiny UI icons)
    clone.querySelectorAll("svg").forEach((svg) => {
      const w = parseFloat(svg.getAttribute("width") || "0") || svg.clientWidth || 0;
      const vb = svg.getAttribute("viewBox") || "";
      const isDiagram = w >= 80 || (vb && Number(vb.split(/[\s,]+/)[2] || 0) >= 120);
      if (!isDiagram) {
        svg.remove();
        return;
      }
      const xml = svg.outerHTML;
      const pre = document.createTextNode(`\n\n\`\`\`svg\n${xml}\n\`\`\`\n\n`);
      svg.replaceWith(pre);
    });

    // 2. Preserve fenced code blocks with language tags
    clone.querySelectorAll("pre").forEach((pre) => {
      const codeEl = pre.querySelector("code");
      const rawCode = (codeEl ? codeEl.textContent : pre.textContent) || "";
      let lang = "";
      if (codeEl && codeEl.className) {
        const m = /language-([\w-]+)/.exec(codeEl.className);
        if (m) lang = m[1];
      }
      if (!lang && /^\s*<svg[\s>]/i.test(rawCode)) lang = "svg";
      if (!lang && /^\s*\{[\s\S]*"datasets"\s*:/.test(rawCode)) lang = "chart";
      const mdBlock = `\n\n\`\`\`${lang}\n${rawCode.trim()}\n\`\`\`\n\n`;
      pre.replaceWith(document.createTextNode(mdBlock));
    });

    // 3. Preserve HTML tables losslessly as pipe Markdown tables
    clone.querySelectorAll("table").forEach((tbl) => {
      tbl.replaceWith(document.createTextNode(htmlTableToMarkdown(tbl)));
    });

    // 4. Headings, bold, inline code, lists
    clone.querySelectorAll("h1, h2, h3, h4").forEach((h) => {
      const level = Number(h.tagName.slice(1));
      h.replaceWith(document.createTextNode(`\n\n${"#".repeat(level)} ${h.textContent.trim()}\n\n`));
    });
    clone.querySelectorAll("strong, b").forEach((b) => {
      b.replaceWith(document.createTextNode(`**${b.textContent}**`));
    });
    clone.querySelectorAll("code").forEach((c) => {
      c.replaceWith(document.createTextNode(`\`${c.textContent}\``));
    });
    clone.querySelectorAll("li").forEach((li) => {
      li.replaceWith(document.createTextNode(`\n- ${li.textContent.trim()}`));
    });
    clone.querySelectorAll("p").forEach((p) => {
      p.replaceWith(document.createTextNode(`\n\n${p.textContent.trim()}\n\n`));
    });

    return (clone.textContent || "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function exportMessageToObsidian(articleEl, btn) {
    const contentRoot =
      articleEl.querySelector('[data-message-author-role="assistant"]') ||
      articleEl.querySelector(".markdown") ||
      articleEl;

    const md = serializeDomNodeToLosslessMarkdown(contentRoot);
    if (!md) return;

    await navigator.clipboard.writeText(md);
    const pageTitle = (document.title || "ChatGPT Export")
      .replace(/\s*[-|]\s*(ChatGPT|Claude).*$/i, "")
      .trim();

    const uri =
      `obsidian://vivid-import?clipboard=1` +
      `&title=${encodeURIComponent(pageTitle || "Vivid-Note")}` +
      `&source=${encodeURIComponent(location.href)}`;

    const prevText = btn.textContent;
    btn.textContent = "✓ Sent to Obsidian";
    setTimeout(() => {
      btn.textContent = prevText;
    }, 2000);

    window.location.href = uri;
  }

  function injectButtons() {
    const messages = document.querySelectorAll(
      'article, [data-message-author-role="assistant"]'
    );
    messages.forEach((msg) => {
      if (msg.querySelector("." + BTN_CLASS)) return;
      const isAssistant =
        msg.getAttribute("data-message-author-role") === "assistant" ||
        msg.querySelector('[data-message-author-role="assistant"]');
      if (!isAssistant) return;

      const bar = document.createElement("div");
      bar.style.cssText = "display:flex;justify-content:flex-end;margin-top:8px;";

      const btn = document.createElement("button");
      btn.className = BTN_CLASS;
      btn.type = "button";
      btn.textContent = "Send to Obsidian ✨";
      btn.style.cssText = [
        "padding:4px 11px",
        "font-size:12px",
        "font-weight:600",
        "border-radius:999px",
        "border:1px solid rgba(99,102,241,0.38)",
        "background:rgba(99,102,241,0.10)",
        "color:#818cf8",
        "cursor:pointer",
        "transition:all 0.15s ease"
      ].join(";");

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        exportMessageToObsidian(msg, btn);
      });

      bar.appendChild(btn);
      msg.appendChild(bar);
    });
  }

  const obs = new MutationObserver(() => injectButtons());
  obs.observe(document.body, { childList: true, subtree: true });
  injectButtons();
})();
