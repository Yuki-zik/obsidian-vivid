---
version_tag: "v0.3 Vault-Native"
target_latency_ms: "13.8 ms"
unit_tests_passed: "35 / 35"
native_bridges: "5 大原生桥接"
tags:
  - gpt-rich-showcase
  - obsidian-bases
  - json-canvas
  - frontmatter-reactive
  - wikilinks-hover
---

# ✨ Vivid v0.3 全景能力实测画廊（Obsidian 原生深度融合版）

> 本文档完全由纯文本标准 Markdown 编写，不仅 1:1 覆盖 ChatGPT / Claude 原生全部核心富交互形态，更与 **Obsidian Bases 原生数据库 (`.base`)**、**JSON Canvas 白板 (`.canvas`)**、**YAML Frontmatter 动态属性 (`{{fm.key}}`)**、**`[[双向链接]]` 悬停预览**及 **`#标签` 全局检索**深度打通。

## 1. 核心指标看板（`kpi` · 实时绑定当前笔记 YAML Properties 属性）

```kpi
[
  {
    "label": "当前引擎版本 (绑定 fm.version_tag)",
    "value": "{{fm.version_tag | v0.3}}",
    "delta": "{{fm.native_bridges | +5 原生桥接}}",
    "trend": "up",
    "caption": "修改顶部 YAML 属性即可触发免刷新重绘",
    "sparkline": [55, 68, 79, 88, 95, 100]
  },
  {
    "label": "首屏渲染耗时 (P95)",
    "value": "{{fm.target_latency_ms | 13.8 ms}}",
    "delta": "-71.2%",
    "trend": "up",
    "caption": "纯本地硬件加速渲染，零网络延迟",
    "sparkline": [48, 39, 29, 21, 16, 13.8]
  },
  {
    "label": "自动化单元测试",
    "value": "{{fm.unit_tests_passed | 33 / 33}}",
    "delta": "100% 通过",
    "trend": "up",
    "caption": "覆盖 Vault 聚合、Bases/Canvas 导出与 XSS 沙箱",
    "sparkline": [12, 18, 24, 28, 31, 33]
  },
  {
    "label": "离线单包体积",
    "value": "< 740 KB",
    "delta": "0 CDN 依赖",
    "trend": "neutral",
    "caption": "断网环境下所有图表与原生建库能力完整可用"
  }
]
```

---

## 2. Obsidian Vault 原生深度联动专区（`vault-kpi` + `vault-chart` 实时元数据引擎）

```vault-kpi
{
  "title": "Vault Live Pulse · 实时监听 metadataCache 元数据变更",
  "metrics": [
    {
      "label": "示范画廊实时字节数",
      "filter": { "tag": "gpt-rich-showcase" },
      "aggregate": "sum",
      "field": "size",
      "suffix": " B",
      "delta": "实时统计",
      "trend": "up",
      "caption": "随笔记保存自动更新字节体积"
    },
    {
      "label": "示范画廊挂载标签数",
      "filter": { "tag": "gpt-rich-showcase" },
      "aggregate": "sum",
      "field": "tagsCount",
      "suffix": " 个标签",
      "delta": "Live 监听中",
      "trend": "up",
      "caption": "新增或修改任意笔记属性后 320ms 内自动重算"
    },
    {
      "label": "一键建库 & 转白板就绪",
      "filter": { "tag": "obsidian-bases" },
      "aggregate": "count",
      "suffix": " 篇示范",
      "delta": ".base + .canvas",
      "trend": "up",
      "caption": "表格转 Bases 数据库 · 流程图转 Canvas 白板"
    }
  ]
}
```

```vault-chart
{
  "type": "bar",
  "title": "Vault 实时标签聚合视图（点击任意柱条直接唤起 Obsidian 全局搜索）",
  "subtitle": "零 Dataview SQL 语法 · 直接读取 Obsidian 原生 metadataCache 索引",
  "filter": { "tag": "gpt-rich-showcase" },
  "groupBy": "tag",
  "aggregate": "count",
  "limit": 6,
  "height": 250
}
```

---

## 3. 双端协同与原生资产转化架构图（`svg` · 支持节点 `[[双链]]` 悬停预览 + 一键「转 Canvas 白板」）

```svg
<svg viewBox="0 0 880 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="bg-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="bg-amber" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.06"/>
    </linearGradient>
  </defs>

  <g id="Stage / I · Dual-Input-Sources">
    <rect x="26" y="34" width="188" height="84" rx="10" fill="url(#bg-indigo)" stroke="#6366f1" stroke-width="1.5"/>
    <text x="120" y="64" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#818cf8">路线 A · 浏览器一键推送</text>
    <text x="120" y="84" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">Send to Obsidian ✨ 扩展</text>
    <text x="120" y="101" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" fill="#64748b">无损提取表格 / SVG / 代码块</text>

    <rect x="26" y="162" width="188" height="84" rx="10" fill="url(#bg-indigo)" stroke="#6366f1" stroke-width="1.5"/>
    <text x="120" y="192" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#818cf8">路线 B · AI 原生直出</text>
    <text x="120" y="212" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">Custom Instructions + 右键转换</text>
    <text x="120" y="229" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" fill="#64748b">兼容 Copilot &amp; Agent Client</text>
  </g>

  <g id="Connector / data / sources-to-ast-refined">
    <path d="M 214.75 76.00 L 238.00 76.00 Q 242.00 76.00 242.00 80.00 L 242.00 124.00 Q 242.00 128.00 246.00 128.00 L 265.25 128.00" fill="none" stroke="#6366f1" stroke-width="1.8"/>
    <polygon points="273.25,128.00 265.25,123.50 265.25,132.50" fill="#6366f1"/>
    <path d="M 214.75 204.00 L 238.00 204.00 Q 242.00 204.00 242.00 200.00 L 242.00 156.00 Q 242.00 152.00 246.00 152.00 L 265.25 152.00" fill="none" stroke="#6366f1" stroke-width="1.8"/>
    <polygon points="273.25,152.00 265.25,147.50 265.25,156.50" fill="#6366f1"/>
  </g>

  <g id="Stage / II · Portable-Markdown-Protocol">
    <rect x="274" y="95" width="190" height="90" rx="10" fill="url(#bg-emerald)" stroke="#10b981" stroke-width="1.5"/>
    <text x="369" y="126" text-anchor="middle" font-family="Inter, sans-serif" font-size="13.5" font-weight="700" fill="#34d399">纯文本 + {{fm}} 属性绑定</text>
    <text x="369" y="147" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">chart · vault-chart · svg · kpi</text>
    <text x="369" y="165" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">timeline · comparison · artifact</text>
  </g>

  <g id="Connector / data / protocol-to-engines-refined">
    <path d="M 464.75 140.00 L 490.00 140.00 Q 494.00 140.00 494.00 136.00 L 494.00 78.00 Q 494.00 74.00 498.00 74.00 L 521.25 74.00" fill="none" stroke="#38bdf8" stroke-width="1.8"/>
    <polygon points="529.25,74.00 521.25,69.50 521.25,78.50" fill="#38bdf8"/>
    <path d="M 464.75 140.00 L 490.00 140.00 Q 494.00 140.00 494.00 144.00 L 494.00 202.00 Q 494.00 206.00 498.00 206.00 L 521.25 206.00" fill="none" stroke="#fbbf24" stroke-width="1.8"/>
    <polygon points="529.25,206.00 521.25,201.50 521.25,210.50" fill="#fbbf24"/>
  </g>

  <g id="Module / Visual / Full-ECharts-And-Table">
    <rect x="530" y="32" width="194" height="84" rx="10" fill="url(#bg-emerald)" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="627" y="62" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#38bdf8">超级表格 → 原生 .base 库</text>
    <text x="627" y="83" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">一键生成 Table + Cards 双视图</text>
    <text x="627" y="101" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" fill="#64748b">每行自动拆分为带属性笔记</text>
  </g>

  <g id="Module / Sandbox / Cards-And-Iframe">
    <rect x="530" y="164" width="194" height="84" rx="10" fill="url(#bg-amber)" stroke="#fbbf24" stroke-width="1.5"/>
    <text x="627" y="194" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#fbbf24">SVG / 时间轴 → .canvas 白板</text>
    <text x="627" y="215" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">无损转化为可拖拽连线原生节点</text>
    <text x="627" y="233" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" fill="#64748b">双链节点自动映射为文件卡片</text>
  </g>

  <g id="Connector / data / engines-to-obsidian-refined">
    <path d="M 724.75 74.00 L 738.00 74.00 Q 742.00 74.00 742.00 78.00 L 742.00 114.00 Q 742.00 118.00 746.00 118.00 L 753.25 118.00" fill="none" stroke="#a78bfa" stroke-width="1.8"/>
    <polygon points="761.25,118.00 753.25,113.50 753.25,122.50" fill="#a78bfa"/>
    <path d="M 724.75 206.00 L 738.00 206.00 Q 742.00 206.00 742.00 202.00 L 742.00 166.00 Q 742.00 162.00 746.00 162.00 L 753.25 162.00" fill="none" stroke="#a78bfa" stroke-width="1.8"/>
    <polygon points="761.25,162.00 753.25,157.50 753.25,166.50" fill="#a78bfa"/>
  </g>

  <g id="Scope / Obsidian-Vault">
    <rect x="762" y="85" width="94" height="110" rx="10" fill="url(#bg-indigo)" stroke="#a78bfa" stroke-width="1.5"/>
    <text x="809" y="124" text-anchor="middle" font-family="Inter, sans-serif" font-size="12.5" font-weight="700" fill="#a78bfa">[[Vivid-Showcase|Obsidian 库]]</text>
    <text x="809" y="147" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">Bases · Canvas</text>
    <text x="809" y="166" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">双链悬停预览</text>
  </g>
</svg>
```

---

## 4. 全谱系交互可视化 (`chart` · 右上角支持「柱状 | 折线 | 面积 | 数据表」一键互切)

```chart
{
  "type": "bar",
  "title": "多模型结构化视觉生成吞吐与准确率基准",
  "subtitle": "点击右上角分段按钮可实时在「柱状 / 折线 / 面积 / 底层数据表」间无缝切换",
  "labels": ["GPT-5.4", "Claude Sonnet", "Gemini Carbon", "Gemini Flash", "DeepSeek V3"],
  "datasets": [
    { "label": "输出速率 (tok/s)", "data": [118, 92, 134, 248, 142] },
    { "label": "首轮渲染成功率 (%)", "data": [98, 99, 98, 94, 93] }
  ]
}
```

```chart
{
  "type": "sankey",
  "title": "本地知识库 AI Token 路由与原生知识资产沉淀流向 (Sankey)",
  "subtitle": "从即时对话渲染直达 Obsidian 原生 .base 数据库与 .canvas 白板",
  "links": [
    { "source": "AI 结构化回复", "target": "超级数据大表", "value": 36 },
    { "source": "AI 结构化回复", "target": "SVG 架构与时间轴", "value": 34 },
    { "source": "AI 结构化回复", "target": "Vault 实时图表", "value": 30 },
    { "source": "超级数据大表", "target": "Obsidian .base 数据库", "value": 36 },
    { "source": "SVG 架构与时间轴", "target": "Obsidian .canvas 白板", "value": 34 },
    { "source": "Vault 实时图表", "target": "全局搜索与双链网络", "value": 30 }
  ]
}
```

---

## 5. 超级交互数据大表（支持 `[[双链]]` 悬停预览、`#标签` 检索、`∑ 汇总` 与一键「转 Base 库」）

```gpt-table
| 原生融合能力 | 语法/入口 | 当前状态 | 完整度 | 挂载耗时 | 效率提升 | 关联文档与标签 |
| :--- | :--- | :---: | ---: | ---: | ---: | :--- |
| **表格转原生 Base 库** | 工具栏 `转 Base 库` | ✅ 已上线 | 100% | 4.2 ms | +88.0% | [[Vivid-Showcase\|画廊规范]] #obsidian-bases |
| **SVG/时间轴转白板** | 工具栏 `转 Canvas` | ✅ 已上线 | 99% | 3.6 ms | +85.0% | [[Vivid-Showcase\|白板映射]] #json-canvas |
| **Vault 实时聚合图表** | `vault-chart` / `vault-kpi` | ✅ 已上线 | 98% | 9.5 ms | +76.0% | 监听 `metadataCache` #gpt-rich-showcase |
| **YAML 属性双向响应式** | `{{fm.property}}` | ✅ 已上线 | 100% | 1.4 ms | +64.0% | 改属性即刻重绘 #frontmatter-reactive |
| **组件内双链与标签激活** | `[[Note]]` & `#tag` | ✅ 已上线 | 100% | 2.1 ms | +72.0% | 原生悬停预览弹窗 #wikilinks-hover |
```

---

## 6. GPT 原生结构化卡片矩阵（`comparison` 方案 PK · `timeline` 可转白板路线图 · `quiz` 自测）

```comparison
{
  "title": "深度融合对比：Vivid v0.3 vs 仅做表面渲染的孤岛插件",
  "columns": [
    {
      "name": "Vivid v0.3 (Vault-Native)",
      "badge": "深度原生融合",
      "summary": "AI 生成的每一张表、每一幅图都能一键沉淀为 Obsidian 一等公民资产",
      "pros": [
        "超级表格一键生成 Obsidian 1.9+ 原生 .base 数据库与子笔记集合",
        "SVG 架构图与 Timeline 一键转化为原生 .canvas 白板自由拖拽连线",
        "支持 [[双链]] 悬停预览、#标签 下钻检索与 {{fm.key}} 属性响应式联动"
      ],
      "cons": [
        "首次接入建议将全局指令配置到常用 AI 工具中"
      ],
      "verdict": "真正让 AI 输出融入第二大脑双链与数据库生态"
    },
    {
      "name": "传统静态图表 / 截图工作流",
      "badge": "信息孤岛",
      "summary": "渲染结果仅作为死图片或孤立代码块停留在单篇笔记内",
      "pros": [
        "无需额外交互设计"
      ],
      "cons": [
        "表格数据无法进入 Obsidian Bases 做跨笔记多视图筛选",
        "流程图无法在 Canvas 白板二次重构，也不支持双链反向引用"
      ],
      "verdict": "仅能满足「看一眼」，无法形成可演进的知识资产"
    }
  ]
}
```

```timeline
{
  "title": "AI 对话到 Obsidian 知识资产闭环（点击右上角「转 Canvas」可变为原生白板）",
  "items": [
    {
      "time": "Stage 01",
      "title": "AI 直出富视觉协议 或 浏览器伴侣一键推送",
      "detail": "从 ChatGPT 网页端或侧边栏 Copilot 生成结构化表格、图表与架构图 #gpt-rich-showcase",
      "status": "done",
      "tag": "无缝采集"
    },
    {
      "time": "Stage 02",
      "title": "双链激活与 Frontmatter 动态属性绑定",
      "detail": "自动挂载 [[Vivid-Showcase|核心架构笔记]] 悬停预览，绑定 {{fm.version_tag}} 实时参数 #frontmatter-reactive",
      "status": "done",
      "tag": "双链融合"
    },
    {
      "time": "Stage 03",
      "title": "一键沉淀为原生 .base 数据库与 .canvas 白板",
      "detail": "点击卡片工具栏即可转为 Obsidian 原生数据库与无限白板继续深加工 #obsidian-bases #json-canvas",
      "status": "active",
      "tag": "资产沉淀"
    }
  ]
}
```

```quiz
{
  "title": "Interactive Study Check · Obsidian 原生融合小测验",
  "question": "当你在 GPT Rich Render 的超级表格工具栏点击「转 Base 库」时，插件会在你的库中生成什么？",
  "hint": "结合 Obsidian 1.9+ 原生 Bases 数据库架构思考",
  "options": [
    {
      "label": "自动为每一行创建带类型化 YAML Frontmatter 属性的子笔记，并生成包含「全量表格视图 + 卡片画廊视图」的原生 .base 数据库文件并立即打开",
      "correct": true,
      "explanation": "完全正确！生成的 .base 文件遵循 Obsidian 原生 Bases YAML 规范（零第三方依赖），你可以直接在 Obsidian 原生数据库视图中筛选、分组和编辑每一条记录。"
    },
    {
      "label": "只导出一张静态图片放到附件目录",
      "correct": false,
      "explanation": "静态图片无法在数据库中二次筛选或关联双链；「转 Base 库」生成的是 100% 原生可编辑的 Obsidian Bases 数据库资产。"
    }
  ]
}
```

---

## 7. 隔离沙箱动态交互微工具 (`artifact`)

```artifact
<style>
  .calc-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    display: grid;
    gap: 14px;
  }
  .calc-header { display: flex; justify-content: space-between; align-items: center; }
  .calc-title { font-weight: 700; font-size: 14.5px; }
  .calc-pill {
    font-size: 11.5px; padding: 2px 8px; border-radius: 999px;
    background: rgba(99, 102, 241, 0.15); color: var(--accent); font-weight: 600;
  }
  .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .ctrl-group { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; }
  .ctrl-label { display: flex; justify-content: space-between; color: var(--muted); }
  .ctrl-label b { color: var(--text); }
  input[type="range"] { width: 100%; accent-color: var(--accent); cursor: pointer; }
  .result-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
    padding-top: 6px; border-top: 1px dashed var(--border);
  }
  .res-item {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 12px;
  }
  .res-label { font-size: 11px; color: var(--muted); }
  .res-val { font-size: 18px; font-weight: 700; margin-top: 2px; color: var(--accent); }
</style>

<div class="calc-box">
  <div class="calc-header">
    <span class="calc-title">⚡ 本地知识库 AI 富渲染 Token 与效率实时测算器</span>
    <span class="calc-pill">实时沙箱交互</span>
  </div>
  <div class="controls">
    <div class="ctrl-group">
      <div class="ctrl-label"><span>每日生成富图表报告篇数</span><b id="v-docs">15 篇</b></div>
      <input id="r-docs" type="range" min="1" max="100" value="15" />
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label"><span>每篇包含 SVG / 图表组件数</span><b id="v-widgets">5 个</b></div>
      <input id="r-widgets" type="range" min="1" max="12" value="5" />
    </div>
  </div>
  <div class="result-grid">
    <div class="res-item">
      <div class="res-label">预计日均 Token 消耗</div>
      <div class="res-val" id="o-tokens">33,750</div>
    </div>
    <div class="res-item">
      <div class="res-label">预估 API 日成本</div>
      <div class="res-val" id="o-cost">$0.10</div>
    </div>
    <div class="res-item">
      <div class="res-label">节省手工画图时间</div>
      <div class="res-val" id="o-saved">3.8 小时/天</div>
    </div>
  </div>
</div>

<script>
  const rDocs = document.getElementById("r-docs");
  const rWidgets = document.getElementById("r-widgets");
  function update() {
    const d = Number(rDocs.value);
    const w = Number(rWidgets.value);
    document.getElementById("v-docs").textContent = d + " 篇";
    document.getElementById("v-widgets").textContent = w + " 个";
    const tokens = d * w * 450;
    document.getElementById("o-tokens").textContent = tokens.toLocaleString();
    document.getElementById("o-cost").textContent = "$" + ((tokens / 1000000) * 3.0).toFixed(2);
    document.getElementById("o-saved").textContent = ((d * w * 3) / 60).toFixed(1) + " 小时/天";
  }
  rDocs.addEventListener("input", update);
  rWidgets.addEventListener("input", update);
  update();
</script>
```
