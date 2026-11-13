// ==UserScript==
// @name         Vivid — One-Click Send to Obsidian
// @namespace    https://github.com/Yuki-zik/obsidian-vivid
// @version      0.3.0
// @description  Losslessly send ChatGPT & Claude rich responses (tables, SVGs, charts, artifacts) straight into Obsidian with 1:1 interactive rendering.
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const BTN_CLASS = "gpt-obsidian-bridge-userscript-btn";

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
    clone.querySelectorAll("button, ." + BTN_CLASS).forEach((b) => b.remove());

    clone.querySelectorAll("svg").forEach((svg) => {
      const w = parseFloat(svg.getAttribute("width") || "0") || svg.clientWidth || 0;
      const vb = svg.getAttribute("viewBox") || "";
      const isDiagram = w >= 80 || (vb && Number(vb.split(/[\s,]+/)[2] || 0) >= 120);
      if (!isDiagram) {
        svg.remove();
        return;
      }
      svg.replaceWith(document.createTextNode(`\n\n\`\`\`svg\n${svg.outerHTML}\n\`\`\`\n\n`));
    });

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
      pre.replaceWith(document.createTextNode(`\n\n\`\`\`${lang}\n${rawCode.trim()}\n\`\`\`\n\n`));
    });

    clone.querySelectorAll("table").forEach((tbl) => {
      tbl.replaceWith(document.createTextNode(htmlTableToMarkdown(tbl)));
    });

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

    return (clone.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function injectButtons() {
    document.querySelectorAll('article, [data-message-author-role="assistant"]').forEach((msg) => {
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
      btn.style.cssText =
        "padding:4px 11px;font-size:12px;font-weight:600;border-radius:999px;border:1px solid rgba(99,102,241,0.38);background:rgba(99,102,241,0.10);color:#818cf8;cursor:pointer;";

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const root =
          msg.querySelector('[data-message-author-role="assistant"]') ||
          msg.querySelector(".markdown") ||
          msg;
        const md = serializeDomNodeToLosslessMarkdown(root);
        if (!md) return;
        await navigator.clipboard.writeText(md);
        const title = (document.title || "GPT Note").replace(/\s*[-|]\s*(ChatGPT|Claude).*$/i, "").trim();
        btn.textContent = "✓ Sent to Obsidian";
        setTimeout(() => (btn.textContent = "Send to Obsidian ✨"), 2000);
        window.location.href = `obsidian://vivid-import?clipboard=1&title=${encodeURIComponent(title)}&source=${encodeURIComponent(location.href)}`;
      });

      bar.appendChild(btn);
      msg.appendChild(bar);
    });
  }

  new MutationObserver(injectButtons).observe(document.body, { childList: true, subtree: true });
  injectButtons();
})();
