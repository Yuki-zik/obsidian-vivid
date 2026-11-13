import { App, Notice, TFile, getAllTags, normalizePath } from "obsidian";
import { VaultNoteRecord } from "../core/vaultAggregation";
import { ParsedTableData, tokenizeInlineCellText } from "../core/tableModel";
import { generateBaseBundleFromTable } from "../core/obsidianExporters";

export function collectVaultNoteRecords(app: App): VaultNoteRecord[] {
  const files = app.vault.getMarkdownFiles();
  return files.map((file: TFile) => {
    const cache = app.metadataCache.getFileCache(file);
    const rawTags = cache ? getAllTags(cache) ?? [] : [];
    const uniqueTags = Array.from(
      new Set(rawTags.map((t) => t.replace(/^#/, "").trim()).filter(Boolean))
    );
    const d = new Date(file.stat.ctime);
    const ctimeMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const fm = (cache?.frontmatter as Record<string, unknown> | undefined) ?? {};

    return {
      path: file.path,
      basename: file.basename,
      folder: file.parent?.path && file.parent.path !== "/" ? file.parent.path : "(根目录)",
      ctimeMonth,
      size: file.stat.size,
      tags: uniqueTags,
      linksCount: (cache?.links?.length ?? 0) + (cache?.embeds?.length ?? 0),
      frontmatter: fm
    };
  });
}

export function getNoteFrontmatter(
  app: App,
  sourcePath: string
): Record<string, unknown> | undefined {
  if (!sourcePath) return undefined;
  const abstract = app.vault.getAbstractFileByPath(sourcePath);
  if (abstract instanceof TFile) {
    return app.metadataCache.getFileCache(abstract)?.frontmatter as
      | Record<string, unknown>
      | undefined;
  }
  return undefined;
}

export function openGlobalObsidianSearch(app: App, query: string): void {
  const internalPlugins = (app as unknown as {
    internalPlugins?: {
      getPluginById?: (id: string) => { instance?: { openGlobalSearch?: (q: string) => void } };
    };
  }).internalPlugins;

  const searchInstance = internalPlugins?.getPluginById?.("global-search")?.instance;
  if (searchInstance?.openGlobalSearch) {
    searchInstance.openGlobalSearch(query);
    return;
  }
  new Notice(`筛选条件：${query}`);
}

export function appendRichInlineTokens(
  app: App,
  sourcePath: string,
  hoverParent: unknown,
  targetEl: HTMLElement,
  raw: string
): void {
  const tokens = tokenizeInlineCellText(raw);
  for (const tok of tokens) {
    if (tok.type === "wikilink") {
      const a = targetEl.createEl("a", {
        text: tok.alias,
        cls: "internal-link gpt-rich-wikilink",
        attr: { "data-href": tok.target, href: tok.target }
      });
      a.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        void app.workspace.openLinkText(tok.target, sourcePath, e.metaKey || e.ctrlKey);
      });
      a.addEventListener("mouseover", (e: MouseEvent) => {
        app.workspace.trigger("hover-link", {
          event: e,
          source: "preview",
          hoverParent: hoverParent ?? app.workspace,
          targetEl: a,
          linktext: tok.target,
          sourcePath
        });
      });
    } else if (tok.type === "tag") {
      const tagAnchor = targetEl.createEl("a", {
        text: tok.tag,
        cls: "tag gpt-rich-tag-pill",
        attr: { href: tok.tag }
      });
      tagAnchor.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openGlobalObsidianSearch(app, `tag:${tok.tag}`);
      });
    } else if (tok.type === "code") {
      targetEl.createEl("code", { text: tok.value, cls: "gpt-rich-inline-code" });
    } else if (tok.type === "strong") {
      targetEl.createEl("strong", { text: tok.value });
    } else if (tok.type === "link") {
      targetEl.createEl("a", {
        text: tok.label,
        href: tok.href,
        cls: "external-link",
        attr: { target: "_blank", rel: "noopener noreferrer" }
      });
    } else {
      targetEl.appendText(tok.value);
    }
  }
}

export async function exportTableToObsidianBase(
  app: App,
  data: ParsedTableData,
  suggestedName = "GPT-Table-Base"
): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = `${suggestedName}-${stamp}`;
  const folderRoot = normalizePath(`Bases/${baseName}`);
  const bundle = generateBaseBundleFromTable(baseName, folderRoot, data);

  for (const dir of ["Bases", folderRoot, bundle.itemsFolderPath]) {
    if (!(await app.vault.adapter.exists(dir))) {
      await app.vault.createFolder(dir);
    }
  }

  for (const note of bundle.rowNotes) {
    const p = normalizePath(note.path);
    if (!(await app.vault.adapter.exists(p))) {
      await app.vault.create(p, note.content);
    }
  }

  const basePath = normalizePath(bundle.baseFilePath);
  let baseFile = app.vault.getAbstractFileByPath(basePath);
  if (!baseFile) {
    baseFile = await app.vault.create(basePath, bundle.baseYaml);
  }

  if (baseFile instanceof TFile) {
    const leaf = app.workspace.getLeaf("tab");
    await leaf.openFile(baseFile);
  }
  new Notice(`✅ 已生成原生 Obsidian Base 数据库（含 ${bundle.rowNotes.length} 篇结构化属性笔记）`);
}

export async function saveAndOpenJsonCanvas(
  app: App,
  canvasJson: string,
  prefix = "GPT-Diagram"
): Promise<void> {
  const folder = "Canvases";
  if (!(await app.vault.adapter.exists(folder))) {
    await app.vault.createFolder(folder);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filePath = normalizePath(`${folder}/${prefix}-${stamp}.canvas`);
  const file = await app.vault.create(filePath, canvasJson);
  const leaf = app.workspace.getLeaf("tab");
  await leaf.openFile(file);
  new Notice(`🧩 已转换为原生 Obsidian Canvas 白板：${file.basename}`);
}

export async function saveSvgAttachmentSnapshot(
  app: App,
  sourcePath: string,
  svgHtml: string
): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const destPath = await app.fileManager.getAvailablePathForAttachment(
    `gpt-diagram-${stamp}.svg`,
    sourcePath
  );
  await app.vault.create(destPath, svgHtml);
  new Notice(`📥 已保存矢量快照至附件库：${destPath}`);
}
