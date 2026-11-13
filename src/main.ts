import {
  App,
  Editor,
  MarkdownView,
  Menu,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  normalizePath,
  requestUrl
} from "obsidian";
import { GptChartRenderChild } from "./renderers/chartRenderer";
import { GptSvgRenderChild } from "./renderers/svgRenderer";
import {
  GptTableBlockRenderChild,
  enhanceNativeTableElements
} from "./renderers/tableRenderer";
import { GptKpiRenderChild } from "./renderers/kpiRenderer";
import { GptArtifactRenderChild } from "./renderers/artifactRenderer";
import { GptUiRenderChild } from "./renderers/gptUiRenderer";
import {
  VaultLiveChartRenderChild,
  VaultLiveKpiRenderChild
} from "./renderers/vaultLiveRenderer";
import { GPT_CUSTOM_INSTRUCTIONS_PROMPT } from "./prompts/gptCustomInstructions";
import { copyTextWithNotice } from "./ui/domHelpers";
import {
  VisualTransformTarget,
  buildVisualTransformPrompt,
  extractCleanBlockFromAiReply
} from "./core/aiTransform";

interface GptRichRenderSettings {
  enhanceNativeTables: boolean;
  importFolder: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
}

const DEFAULT_SETTINGS: GptRichRenderSettings = {
  enhanceNativeTables: true,
  importFolder: "GPT Imports",
  aiBaseUrl: "https://api.openai.com/v1",
  aiApiKey: "",
  aiModel: "gpt-4o-mini"
};

export default class GptRichRenderPlugin extends Plugin {
  settings: GptRichRenderSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    // 1. Full-spectrum Interactive Charts: ```chart, ```gpt-chart, ```echarts
    for (const lang of ["chart", "gpt-chart", "echarts"]) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptChartRenderChild(this.app, el, source, ctx.sourcePath));
      });
    }

    // 1b. Obsidian Vault-Native Live Analytics: ```vault-chart, ```vault-kpi
    this.registerMarkdownCodeBlockProcessor("vault-chart", (source, el, ctx) => {
      ctx.addChild(new VaultLiveChartRenderChild(this.app, el, source, ctx.sourcePath));
    });
    this.registerMarkdownCodeBlockProcessor("vault-kpi", (source, el, ctx) => {
      ctx.addChild(new VaultLiveKpiRenderChild(this.app, el, source, ctx.sourcePath));
    });

    // 2. Zoomable Sanitized Vector Diagrams: ```svg, ```gpt-svg
    for (const lang of ["svg", "gpt-svg"]) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptSvgRenderChild(this.app, el, source, ctx.sourcePath));
      });
    }

    // 3. Explicit Interactive Super Tables: ```gpt-table, ```datatable
    for (const lang of ["gpt-table", "datatable"]) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptTableBlockRenderChild(this.app, el, source, ctx.sourcePath));
      });
    }

    // 4. KPI Metric Cards: ```kpi, ```metrics
    for (const lang of ["kpi", "metrics"]) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptKpiRenderChild(this.app, el, source, ctx.sourcePath));
      });
    }

    // 5. Structured GPT Native UI Cards: timeline, comparison, quiz, gpt-ui, chatgpt-ui
    for (const lang of ["timeline", "steps"] as const) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptUiRenderChild(this.app, el, source, "timeline", ctx.sourcePath));
      });
    }
    for (const lang of ["comparison", "pros-cons"] as const) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptUiRenderChild(this.app, el, source, "comparison", ctx.sourcePath));
      });
    }
    this.registerMarkdownCodeBlockProcessor("quiz", (source, el, ctx) => {
      ctx.addChild(new GptUiRenderChild(this.app, el, source, "quiz", ctx.sourcePath));
    });
    for (const lang of ["gpt-ui", "chatgpt-ui"] as const) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptUiRenderChild(this.app, el, source, lang, ctx.sourcePath));
      });
    }

    // 6. Sandboxed Interactive HTML Canvas / Artifacts: ```artifact, ```html-preview
    for (const lang of ["artifact", "html-preview"]) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        ctx.addChild(new GptArtifactRenderChild(this.app, el, source));
      });
    }

    // 7. Automatic Enhancement for Standard Markdown Tables in Reading View & AI Chat Sidebars
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!this.settings.enhanceNativeTables) return;
      enhanceNativeTableElements(this.app, el, ctx.sourcePath);
    });

    // 8. Route A Receiver: obsidian://vivid-import (plus legacy obsidian://gpt-rich-import)
    for (const proto of ["vivid-import", "gpt-rich-import"]) {
      this.registerObsidianProtocolHandler(proto, async (params) => {
        await this.handleGptRichImport(params);
      });
    }

    // 9. Editor Context Menu: Select text -> Right click -> Transform to Rich Visual
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
        const selected = editor.getSelection();
        if (!selected || selected.trim().length < 6) return;

        menu.addSeparator();
        const actions: Array<{ target: VisualTransformTarget; title: string; icon: string }> = [
          { target: "svg", title: "GPT 视觉化：转为高审美 SVG 架构流程图", icon: "git-branch" },
          { target: "chart", title: "GPT 视觉化：转为交互式统计图表 (Chart)", icon: "bar-chart-2" },
          { target: "table", title: "GPT 视觉化：提炼为 KPI + 超级对比表", icon: "table" },
          { target: "artifact", title: "GPT 视觉化：生成动态沙箱微工具 (Artifact)", icon: "sparkles" }
        ];

        for (const act of actions) {
          menu.addItem((item) => {
            item
              .setTitle(act.title)
              .setIcon(act.icon)
              .onClick(() => {
                void this.runVisualTransformOnSelection(editor, act.target);
              });
          });
        }
      })
    );

    // 10. Command Palette Shortcuts
    this.addCommand({
      id: "copy-gpt-custom-instructions",
      name: "复制 GPT 富渲染全局指令 (Custom Instructions / Agent System Prompt)",
      callback: () => {
        void copyTextWithNotice(GPT_CUSTOM_INSTRUCTIONS_PROMPT, "GPT 富渲染全局指令");
      }
    });

    this.addCommand({
      id: "import-gpt-clipboard-as-note",
      name: "从剪贴板一键创建 GPT 富渲染笔记",
      callback: async () => {
        await this.handleGptRichImport({ clipboard: "1", title: "GPT Rich Clip" });
      }
    });

    this.addCommand({
      id: "transform-selection-to-svg",
      name: "将选中文本转为 SVG 架构流程图",
      editorCallback: (editor) => void this.runVisualTransformOnSelection(editor, "svg")
    });

    this.addCommand({
      id: "transform-selection-to-chart",
      name: "将选中文本转为交互式统计图表",
      editorCallback: (editor) => void this.runVisualTransformOnSelection(editor, "chart")
    });

    this.addCommand({
      id: "insert-vault-live-dashboard",
      name: "插入当前 Vault 实时知识流向面板 (Vault Live Dashboard)",
      editorCallback: (editor) => {
        const snippet = [
          "```vault-kpi",
          JSON.stringify(
            {
              title: "当前知识库实时脉搏 (Vault Live Pulse)",
              metrics: [
                { label: "Markdown 笔记总数", aggregate: "count", caption: "全库实时索引" },
                { label: "内部双链总数", aggregate: "sum", field: "linksCount", caption: "知识连接密度" },
                { label: "平均单篇双链", aggregate: "avg", field: "linksCount", caption: "双向链接活跃度" }
              ]
            },
            null,
            2
          ),
          "```",
          "",
          "```vault-chart",
          JSON.stringify(
            {
              type: "bar",
              title: "各目录笔记沉淀分布 (点击柱条即可全局检索)",
              groupBy: "folder",
              aggregate: "count",
              limit: 8
            },
            null,
            2
          ),
          "```",
          "",
          "```vault-chart",
          JSON.stringify(
            {
              type: "sankey",
              title: "知识拓扑流向：一级目录 → 高频标签",
              sourceBy: "folder",
              targetBy: "tag",
              limit: 12
            },
            null,
            2
          ),
          "```"
        ].join("\n");
        editor.replaceSelection(`\n${snippet}\n`);
        new Notice("✨ 已插入 Vault 实时知识流向面板！");
      }
    });

    this.addSettingTab(new GptRichRenderSettingTab(this.app, this));
  }

  private async handleGptRichImport(params: Record<string, string>): Promise<void> {
    try {
      let body = params.content ?? "";
      if (params.clipboard === "1" || !body) {
        body = await navigator.clipboard.readText();
      }
      if (!body || !body.trim()) {
        new Notice("未检测到可导入的内容，请先在 ChatGPT 点击复制或使用浏览器伴侣按钮");
        return;
      }

      const folder = normalizePath(this.settings.importFolder.trim() || "GPT Imports");
      if (!this.app.vault.getAbstractFileByPath(folder)) {
        await this.app.vault.createFolder(folder);
      }

      const rawTitle = (params.title || "GPT-Note").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filePath = normalizePath(`${folder}/${rawTitle}-${stamp}.md`);

      const sourceUrlLine = params.source ? `source: "${params.source}"\n` : "";
      const fullMd = `---\ncreated: "${new Date().toISOString()}"\n${sourceUrlLine}tags:\n  - gpt-rich-import\n---\n\n${body.trim()}\n`;

      const file = await this.app.vault.create(filePath, fullMd);
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file, { state: { mode: "preview" } });
      new Notice(`已无损导入并渲染：${file.basename}`);
    } catch (err) {
      new Notice(`导入失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async runVisualTransformOnSelection(
    editor: Editor,
    target: VisualTransformTarget
  ): Promise<void> {
    const selected = editor.getSelection();
    if (!selected.trim()) {
      new Notice("请先框选一段需要视觉化的文字或数据");
      return;
    }

    const promptPair = buildVisualTransformPrompt(target, selected);

    // Dual-mode fallback: If no API key configured, copy ready-to-run prompt for Copilot / Agent Client
    if (!this.settings.aiApiKey.trim()) {
      const combined = `${promptPair.system}\n\n---\n\n${promptPair.user}`;
      await copyTextWithNotice(combined, "视觉化转换提示词（可直接粘贴至 Copilot / Agent Client）");
      return;
    }

    const notice = new Notice("✨ 正在调用大模型生成富视觉组件…", 0);
    try {
      const endpoint = `${this.settings.aiBaseUrl.replace(/\/+$/, "")}/chat/completions`;
      const resp = await requestUrl({
        url: endpoint,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.settings.aiApiKey.trim()}`
        },
        body: JSON.stringify({
          model: this.settings.aiModel.trim() || "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: promptPair.system },
            { role: "user", content: promptPair.user }
          ]
        })
      });

      const json = resp.json as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content ?? "";
      if (!reply.trim()) {
        throw new Error("模型返回内容为空");
      }

      const block = extractCleanBlockFromAiReply(reply, target);
      const cursorTo = editor.getCursor("to");
      editor.replaceRange(`\n\n${block}\n\n`, cursorTo);
      notice.hide();
      new Notice("✅ 已生成富视觉组件！");

      // Ensure view updates nicely
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        view.previewMode?.rerender(true);
      }
    } catch (err) {
      notice.hide();
      new Notice(`生成失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async loadSettings(): Promise<void> {
    const raw: unknown = await this.loadData();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const rec = raw as Record<string, unknown>;
      this.settings = {
        enhanceNativeTables:
          typeof rec.enhanceNativeTables === "boolean"
            ? rec.enhanceNativeTables
            : DEFAULT_SETTINGS.enhanceNativeTables,
        importFolder:
          typeof rec.importFolder === "string"
            ? rec.importFolder
            : DEFAULT_SETTINGS.importFolder,
        aiBaseUrl:
          typeof rec.aiBaseUrl === "string" ? rec.aiBaseUrl : DEFAULT_SETTINGS.aiBaseUrl,
        aiApiKey:
          typeof rec.aiApiKey === "string" ? rec.aiApiKey : DEFAULT_SETTINGS.aiApiKey,
        aiModel:
          typeof rec.aiModel === "string" ? rec.aiModel : DEFAULT_SETTINGS.aiModel
      };
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class GptRichRenderSettingTab extends PluginSettingTab {
  plugin: GptRichRenderPlugin;

  constructor(app: App, plugin: GptRichRenderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem<keyof GptRichRenderSettings>[] {
    return [
      {
        name: "自动增强标准 Markdown 表格",
        desc: "在阅读视图（Reading View）以及 Copilot / Agent Client 聊天窗口中，自动将普通 Markdown 表格升级为支持搜索、智能排序、∑ 汇总、状态徽章、内嵌进度条与 CSV 导出的超级表格。",
        control: {
          type: "toggle",
          key: "enhanceNativeTables",
          defaultValue: DEFAULT_SETTINGS.enhanceNativeTables
        }
      },
      {
        name: "浏览器一键同步保存目录 (路线 A)",
        desc: "通过 Chrome 扩展 / 油猴脚本「Send to Obsidian」导入时的默认目标文件夹。",
        control: {
          type: "text",
          key: "importFolder",
          defaultValue: DEFAULT_SETTINGS.importFolder,
          placeholder: "GPT Imports"
        }
      },
      {
        name: "一键复制 GPT 全局输出规范提示词 (路线 B)",
        desc: "粘贴进网页版 ChatGPT Custom Instructions 或 Obsidian Copilot / Agent Client 的 System Prompt 后，AI 输出即可 1:1 自动渲染。",
        render: (setting) => {
          setting.addButton((btn) =>
            btn
              .setButtonText("复制全局指令")
              .setCta()
              .onClick(() => {
                void copyTextWithNotice(GPT_CUSTOM_INSTRUCTIONS_PROMPT, "GPT 富渲染全局指令");
              })
          );
        }
      },
      {
        type: "group",
        heading: "编辑器框选右键「一键 AI 视觉化」配置（可选）",
        items: [
          {
            name: "API Base URL",
            desc: "兼容 OpenAI / DeepSeek / Claude 网关 / Ollama 本地接口。若留空 API Key，右键点击时会自动复制提示词到剪贴板。",
            control: {
              type: "text",
              key: "aiBaseUrl",
              defaultValue: DEFAULT_SETTINGS.aiBaseUrl,
              placeholder: "https://api.openai.com/v1"
            }
          },
          {
            name: "API Key",
            render: (setting) => {
              setting.addText((text) => {
                text.inputEl.type = "password";
                text
                  .setPlaceholder("sk-...")
                  .setValue(this.plugin.settings.aiApiKey)
                  .onChange(async (val) => {
                    this.plugin.settings.aiApiKey = val;
                    await this.plugin.saveSettings();
                  });
              });
            }
          },
          {
            name: "Model 名称",
            control: {
              type: "text",
              key: "aiModel",
              defaultValue: DEFAULT_SETTINGS.aiModel,
              placeholder: "gpt-4o-mini / deepseek-chat"
            }
          }
        ]
      }
    ];
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("自动增强标准 Markdown 表格")
      .setDesc(
        "在阅读视图（Reading View）以及 Copilot / Agent Client 聊天窗口中，自动将普通 Markdown 表格升级为支持搜索、智能排序、∑ 汇总、状态徽章、内嵌进度条与 CSV 导出的超级表格。"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enhanceNativeTables)
          .onChange(async (value) => {
            this.plugin.settings.enhanceNativeTables = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("浏览器一键同步保存目录 (路线 A)")
      .setDesc("通过 Chrome 扩展 / 油猴脚本「Send to Obsidian」导入时的默认目标文件夹。")
      .addText((text) =>
        text
          .setPlaceholder("GPT Imports")
          .setValue(this.plugin.settings.importFolder)
          .onChange(async (val) => {
            this.plugin.settings.importFolder = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("一键复制 GPT 全局输出规范提示词 (路线 B)")
      .setDesc(
        "粘贴进网页版 ChatGPT Custom Instructions 或 Obsidian Copilot / Agent Client 的 System Prompt 后，AI 输出即可 1:1 自动渲染。"
      )
      .addButton((btn) =>
        btn
          .setButtonText("复制全局指令")
          .setCta()
          .onClick(() => {
            void copyTextWithNotice(GPT_CUSTOM_INSTRUCTIONS_PROMPT, "GPT 富渲染全局指令");
          })
      );

    new Setting(containerEl)
      .setName("编辑器框选右键「一键 AI 视觉化」配置（可选）")
      .setDesc(
        "兼容 OpenAI / DeepSeek / Claude 网关 / Ollama 本地接口。若留空 API Key，右键点击时会自动将组装好的转换提示词复制到剪贴板供侧边栏 AI 使用。"
      )
      .setHeading();

    new Setting(containerEl)
      .setName("API Base URL")
      .addText((text) =>
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.aiBaseUrl)
          .onChange(async (val) => {
            this.plugin.settings.aiBaseUrl = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("API Key")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.aiApiKey)
          .onChange(async (val) => {
            this.plugin.settings.aiApiKey = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Model 名称")
      .addText((text) =>
        text
          .setPlaceholder("gpt-4o-mini / deepseek-chat")
          .setValue(this.plugin.settings.aiModel)
          .onChange(async (val) => {
            this.plugin.settings.aiModel = val;
            await this.plugin.saveSettings();
          })
      );
  }
}
