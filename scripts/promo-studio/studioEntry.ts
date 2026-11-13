// 1. Deterministic Virtual Clock Shim — MUST run BEFORE ECharts initializes,
// because zrender's Animation loop uses `new Date().getTime()`.
let studioTimeMs = 0;
const BASE_EPOCH = 1731500000000;
const OrigDate = window.Date;

class VirtualDate extends OrigDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      super(BASE_EPOCH + studioTimeMs);
    } else {
      // @ts-expect-error spread variadic Date constructor args
      super(...args);
    }
  }
  static now(): number {
    return BASE_EPOCH + studioTimeMs;
  }
}
window.Date = VirtualDate as unknown as DateConstructor;
Object.defineProperty(window.performance, "now", {
  configurable: true,
  value: () => studioTimeMs
});

interface RafEntry {
  id: number;
  cb: FrameRequestCallback;
}
let nextRafId = 1;
let rafQueue: RafEntry[] = [];

window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  const id = nextRafId++;
  rafQueue.push({ id, cb });
  return id;
};

window.cancelAnimationFrame = (id: number): void => {
  rafQueue = rafQueue.filter((item) => item.id !== id);
};

function flushRafQueue(): void {
  const batch = rafQueue;
  rafQueue = [];
  for (const item of batch) {
    try {
      item.cb(studioTimeMs);
    } catch {
      // Ignore individual animation frame glitches in headless capture
    }
  }
}

// 2. Import real obsidian-gpt-rich-render core modules (zero runtime dependency on Obsidian)
import { echarts } from "../../src/core/echartsRuntime";
import { CartesianViewMode, parseChartSpec } from "../../src/core/chartParser";
import { sanitizeAndPrepareSvg } from "../../src/core/svgSanitizer";
import {
  ParsedTableData,
  classifyCellValue,
  computeColumnSummaries,
  parseMarkdownTable,
  tokenizeInlineCellText
} from "../../src/core/tableModel";
import { buildSparklinePath, parseKpiSpec } from "../../src/core/kpiParser";
import { parseGptUiSpec } from "../../src/core/gptUiParser";

// 3. Real-World Business, Financial Modeling & Knowledge Flywheel Fixtures (Zero dev debug stats, zero personal info)

// Tab 1: Q4 Commercial Operations & Key Account CRM
const BIZ_KPI_JSON = JSON.stringify([
  {
    label: "MRR 月经常性收入",
    value: "¥42.8 万",
    delta: "+18.4% 环比",
    trend: "up",
    caption: "连续 6 个月正增长 · 年度目标达成 89%",
    sparkline: [26.5, 29.8, 33.2, 36.1, 38.9, 42.8]
  },
  {
    label: "新客获客成本 (CAC)",
    value: "¥138",
    delta: "-21.6% 优化",
    trend: "up",
    caption: "内容种草占比提升带动获客成本下降",
    sparkline: [215, 196, 182, 168, 151, 138]
  },
  {
    label: "净收入留存率 (NRR)",
    value: "118.4%",
    delta: "+4.2 pts",
    trend: "up",
    caption: "存量企业客户增购坐席驱动净扩张",
    sparkline: [108, 110, 112, 114, 116, 118.4]
  },
  {
    label: "现金流安全跑道",
    value: "22.5 个月",
    delta: "经营净流入",
    trend: "up",
    caption: "实时绑定笔记属性 {{fm.runway}}",
    sparkline: [14, 15.5, 17, 18.8, 20.4, 22.5]
  }
]);

const BIZ_CHART_JSON = JSON.stringify({
  type: "bar",
  title: "各获客渠道季度贡献营收与净利对比（万元）",
  subtitle: "一键切换「柱状对比 / 趋势面积 / 财务明细表」，同一组经营数据回答不同管理问题",
  height: 210,
  labels: ["小红书深度种草", "搜索 SEO 长尾", "B站/视频号实测", "老客裂变转介绍", "行业峰会与BD"],
  datasets: [
    { label: "季度贡献营收 (万)", data: [146, 118, 94, 168, 82] },
    { label: "渠道净利贡献 (万)", data: [92, 86, 58, 139, 41] }
  ]
});

const BIZ_TABLE_MD = `| 客户与项目 | 跟进阶段 | 年度合同额 (万) | 交付里程碑 | 毛利率变动 | 关联纪要与标签 |
| :--- | :---: | ---: | ---: | ---: | :--- |
| **星海智能 · 私有化知识库** | ✅ 已签约回款 | ¥24.0 万 | 95% | +14.2% | [[星海CTO访谈纪要]] #KA大客户 |
| **远航跨境 · 多语种客服中台** | 🟢 商务终审 | ¥18.5 万 | 82% | +11.5% | [[远航报价测算单]] #跨境电商 |
| **青禾医疗 · 临床文献助手** | 🟡 POC 实测 | ¥15.0 万 | 68% | +9.8% | [[医疗合规清单]] #私有部署 |
| **极光硬件 · 售后工单洞察** | 🔵 方案演示 | ¥11.0 万 | 45% | +6.4% | [[渠道返点协议]] #智能硬件 |`;

// Tab 2: P&L Flow Sankey + Enterprise Comparison + Pricing Sandbox
const FIN_SANKEY_JSON = JSON.stringify({
  type: "sankey",
  title: "2026 Q3 营收来源与成本利润流向全景（单位：万元）",
  subtitle: "直观呈现「三大业务线营收 → 毛利与直接成本 → 研发/获客费用与净经营利润」完整去向",
  height: 255,
  links: [
    { source: "订阅年费 368万", target: "总营收 608万", value: 368 },
    { source: "私有化部署 165万", target: "总营收 608万", value: 165 },
    { source: "顾问与培训 75万", target: "总营收 608万", value: 75 },
    { source: "总营收 608万", target: "营业毛利 462万", value: 462 },
    { source: "总营收 608万", target: "算力与交付成本 146万", value: 146 },
    { source: "营业毛利 462万", target: "净经营利润 218万", value: 218 },
    { source: "营业毛利 462万", target: "产研投入 154万", value: 154 },
    { source: "营业毛利 462万", target: "市场获客 90万", value: 90 }
  ]
});

const FIN_COMPARISON_JSON = JSON.stringify({
  title: "商业交付模式评估：私有化买断年费 vs 公有云订阅",
  columns: [
    {
      name: "企业私有化方案",
      badge: "高毛利主力",
      summary: "金融 · 医疗 · 制造业政企首选",
      pros: ["数据不出内网，信息安全合规免审过关", "客单价 ¥18万+/年，老客增购净留存率达 124%"],
      cons: ["首次上线需约 2 天标准容器化交付部署"]
    },
    {
      name: "公有云轻量 SaaS",
      badge: "自助获客",
      summary: "中小增长团队与个人专业用户",
      pros: ["网页注册即用，适合部门级快速验证与扩散", "功能按周热更新，零运维与驻场人力投入"],
      cons: ["大型集团采购常受数据出境合规红线限制"]
    }
  ]
});

// Tab 3: Second Brain · Reading Pulse + Cognitive Flywheel SVG + Feynman Quiz
const BRAIN_KPI_JSON = JSON.stringify([
  {
    label: "本月精读研报与论文",
    value: "26 篇",
    delta: "+8 篇环比",
    trend: "up",
    caption: "vault-kpi 自动统计 02-Reading/ 目录增量",
    sparkline: [12, 15, 18, 20, 23, 26]
  },
  {
    label: "已沉淀双链概念卡片",
    value: "342 张",
    delta: "连通率 94%",
    trend: "up",
    caption: "监听 metadataCache 保存后自动重算",
    sparkline: [210, 242, 268, 295, 319, 342]
  },
  {
    label: "进行中课题与专栏",
    value: "5 项",
    delta: "3 项已建白板",
    trend: "up",
    caption: "点击任意卡片即可直达全局检索下钻",
    sparkline: [2, 3, 3, 4, 4, 5]
  }
]);

const BRAIN_SVG_SOURCE = `<svg viewBox="0 0 880 230" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pk-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="pk-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="pk-sky" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="pk-amber" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.06"/>
    </linearGradient>
  </defs>

  <g id="Stage / I · Multi-Source-Input">
    <rect x="18" y="22" width="188" height="76" rx="10" fill="url(#pk-indigo)" stroke="#6366f1" stroke-width="1.5"/>
    <text x="112" y="51" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#a5b4fc">📥 研报 / 财报 / 论文</text>
    <text x="112" y="72" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">PDF 批注与网页剪藏直入库</text>

    <rect x="18" y="132" width="188" height="76" rx="10" fill="url(#pk-indigo)" stroke="#6366f1" stroke-width="1.5"/>
    <text x="112" y="161" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#a5b4fc">🎙️ 访谈 / 播客纪要</text>
    <text x="112" y="182" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">会议逐字稿与用户原声片段</text>
  </g>

  <g id="Connector / data / input-to-ai-refined">
    <path d="M 206.75 60.00 L 231.00 60.00 Q 235.00 60.00 235.00 64.00 L 235.00 96.00 Q 235.00 100.00 239.00 100.00 L 255.25 100.00" fill="none" stroke="#6366f1" stroke-width="1.8"/>
    <polygon points="263.25,100.00 255.25,95.50 255.25,104.50" fill="#6366f1"/>
    <path d="M 206.75 170.00 L 231.00 170.00 Q 235.00 170.00 235.00 166.00 L 235.00 134.00 Q 235.00 130.00 239.00 130.00 L 255.25 130.00" fill="none" stroke="#6366f1" stroke-width="1.8"/>
    <polygon points="263.25,130.00 255.25,125.50 255.25,134.50" fill="#6366f1"/>
  </g>

  <g id="Stage / II · AI-Structured-Distill">
    <rect x="264" y="70" width="186" height="90" rx="10" fill="url(#pk-emerald)" stroke="#10b981" stroke-width="1.5"/>
    <text x="357" y="102" text-anchor="middle" font-family="Inter, sans-serif" font-size="13.5" font-weight="700" fill="#34d399">🤖 AI 结构化提炼</text>
    <text x="357" y="123" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">自动拆解关键论点与数据</text>
    <text x="357" y="141" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" fill="#64748b">直出图表 · 表格 · 卡片与自测</text>
  </g>

  <g id="Connector / data / ai-to-assets-refined">
    <path d="M 450.75 102.00 L 475.00 102.00 Q 479.00 102.00 479.00 98.00 L 479.00 64.00 Q 479.00 60.00 483.00 60.00 L 499.25 60.00" fill="none" stroke="#38bdf8" stroke-width="1.8"/>
    <polygon points="507.25,60.00 499.25,55.50 499.25,64.50" fill="#38bdf8"/>
    <path d="M 450.75 128.00 L 475.00 128.00 Q 479.00 128.00 479.00 132.00 L 479.00 166.00 Q 479.00 170.00 483.00 170.00 L 499.25 170.00" fill="none" stroke="#fbbf24" stroke-width="1.8"/>
    <polygon points="507.25,170.00 499.25,165.50 499.25,174.50" fill="#fbbf24"/>
  </g>

  <g id="Module / Knowledge / Base-And-Canvas">
    <rect x="508" y="22" width="192" height="76" rx="10" fill="url(#pk-sky)" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="604" y="51" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#38bdf8">🗂️ 沉淀 .base 知识库</text>
    <text x="604" y="72" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">多维评分筛选文献与行动项</text>

    <rect x="508" y="132" width="192" height="76" rx="10" fill="url(#pk-amber)" stroke="#fbbf24" stroke-width="1.5"/>
    <text x="604" y="161" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#fbbf24">🎨 展开 .canvas 白板</text>
    <text x="604" y="182" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">自由拖拽连线、补充思考批注</text>
  </g>

  <g id="Connector / data / assets-to-feynman-refined">
    <path d="M 700.75 60.00 L 724.00 60.00 Q 728.00 60.00 728.00 64.00 L 728.00 94.00 Q 728.00 98.00 732.00 98.00 L 747.25 98.00" fill="none" stroke="#a78bfa" stroke-width="1.8"/>
    <polygon points="755.25,98.00 747.25,93.50 747.25,102.50" fill="#a78bfa"/>
    <path d="M 700.75 170.00 L 724.00 170.00 Q 728.00 170.00 728.00 166.00 L 728.00 136.00 Q 728.00 132.00 732.00 132.00 L 747.25 132.00" fill="none" stroke="#a78bfa" stroke-width="1.8"/>
    <polygon points="755.25,132.00 747.25,127.50 747.25,136.50" fill="#a78bfa"/>
  </g>

  <g id="Scope / Output-Flywheel">
    <rect x="756" y="62" width="108" height="106" rx="10" fill="url(#pk-indigo)" stroke="#a78bfa" stroke-width="1.5"/>
    <text x="810" y="99" text-anchor="middle" font-family="Inter, sans-serif" font-size="12.5" font-weight="700" fill="#c4b5fd">🚀 复利输出</text>
    <text x="810" y="121" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">专栏文章 · 内化</text>
    <text x="810" y="140" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">费曼自测闭环</text>
  </g>
</svg>`;

const BRAIN_QUIZ_JSON = JSON.stringify({
  title: "📚 读完即测 · 费曼主动回忆卡（《SaaS 增长经济学》精读笔记自测）",
  question: "当企业软件的净收入留存率（NRR）持续大于 115% 时，最核心的商业含义是什么？",
  hint: "关联笔记 [[2026 增长复盘模型]]",
  options: [
    {
      label: "即便暂停新客投放，仅靠存量老客户的续费与坐席增购，公司总营收依然保持复利正增长",
      correct: true,
      explanation: "完全正确！老客增购已彻底覆盖客户流失，所有新增获客投入都将转化为净增量。"
    },
    {
      label: "说明获客渠道投放预算已经全部停止，进入纯维护阶段",
      correct: false,
      explanation: "NRR 衡量的是存量客户收入变化，与是否停止新客预算无关。"
    }
  ]
});

// 4. Inline Token Helper (mirroring src/ui/obsidianBridge.ts without Obsidian imports)
function appendInlineTokens(parent: HTMLElement, raw: string, isFirstWikilinkRef: { used: boolean }): void {
  const tokens = tokenizeInlineCellText(raw);
  for (const tok of tokens) {
    if (tok.type === "wikilink") {
      const a = document.createElement("a");
      a.className = "internal-link gpt-rich-wikilink";
      a.textContent = tok.alias;
      if (!isFirstWikilinkRef.used) {
        a.setAttribute("data-act", "table-wikilink");
        isFirstWikilinkRef.used = true;
      }
      parent.appendChild(a);
    } else if (tok.type === "tag") {
      const s = document.createElement("a");
      s.className = "tag gpt-rich-tag-pill";
      s.textContent = tok.tag;
      parent.appendChild(s);
    } else if (tok.type === "code") {
      const code = document.createElement("code");
      code.className = "gpt-rich-inline-code";
      code.textContent = tok.value;
      parent.appendChild(code);
    } else if (tok.type === "strong") {
      const strong = document.createElement("strong");
      strong.textContent = tok.value;
      parent.appendChild(strong);
    } else {
      parent.appendChild(document.createTextNode(tok.value));
    }
  }
}

function renderKpiStrip(container: HTMLElement, rawJson: string, gridClass = "gpt-rich-kpi-grid"): void {
  const res = parseKpiSpec(rawJson);
  if (res.status !== "ready") return;
  const grid = document.createElement("div");
  grid.className = gridClass;
  for (const item of res.items) {
    const card = document.createElement("div");
    card.className = "gpt-rich-card gpt-rich-kpi-card";
    const top = document.createElement("div");
    top.className = "gpt-rich-kpi-top";
    top.innerHTML = `<span class="gpt-rich-kpi-label">${item.label}</span>${
      item.delta ? `<span class="gpt-rich-delta-pill is-${item.trend}">${item.delta}</span>` : ""
    }`;
    const mid = document.createElement("div");
    mid.className = "gpt-rich-kpi-mid";
    mid.innerHTML = `<div class="gpt-rich-kpi-value">${item.value}</div>`;
    if (item.sparkline && item.sparkline.length >= 2) {
      const d = buildSparklinePath(item.sparkline, 82, 26);
      mid.innerHTML += `<div class="gpt-rich-kpi-spark"><svg viewBox="0 0 82 26" width="82" height="26"><path d="${d}" fill="none" stroke="#10b981" stroke-width="2.2"/></svg></div>`;
    }
    card.appendChild(top);
    card.appendChild(mid);
    if (item.caption) {
      const cap = document.createElement("div");
      cap.className = "gpt-rich-kpi-caption";
      cap.textContent = item.caption;
      card.appendChild(cap);
    }
    grid.appendChild(card);
  }
  container.appendChild(grid);
}

// 5. Build Multi-Tab Obsidian Desktop Stage
function buildStudioApp() {
  const root = document.getElementById("app")!;
  root.innerHTML = `
    <div id="viewport">
      <div id="camera-rig">
        <div class="wallpaper-backdrop"></div>
        <div class="macos-obsidian-window theme-dark">
          <div class="macos-titlebar">
            <div class="traffic-lights">
              <span class="tl tl-red"></span>
              <span class="tl tl-yellow"></span>
              <span class="tl tl-green"></span>
            </div>
            <div class="obsidian-tabs-bar">
              <button data-act="tab-biz" class="obsidian-tab-btn is-active">
                <span class="tab-dot"></span>
                <span>💼 Q4 商业经营与客户台账.md</span>
              </button>
              <button data-act="tab-fin" class="obsidian-tab-btn">
                <span class="tab-dot"></span>
                <span>📈 财报流向与定价推演.md</span>
              </button>
              <button data-act="tab-brain" class="obsidian-tab-btn">
                <span class="tab-dot"></span>
                <span>🧠 深度阅读与知识飞轮.md</span>
              </button>
            </div>
            <div class="titlebar-right-pill">
              <span class="live-pulse"></span>
              <span>Obsidian · Vault-Native</span>
            </div>
          </div>

          <div class="obsidian-workspace-body">
            <div class="obsidian-mini-ribbon">
              <div class="ribbon-icon is-active">✦</div>
              <div class="ribbon-icon">⊞</div>
              <div class="ribbon-icon">◈</div>
              <div class="ribbon-icon">⚙</div>
            </div>

            <div id="obsidian-scroll-pane" class="obsidian-scroll-pane theme-dark">
              <div class="obsidian-doc-container">
                <!-- TAB 1: Commercial Ops & CRM -->
                <div id="panel-biz" class="tab-panel is-active">
                  <div class="doc-header-row">
                    <div class="doc-hero-title">💼 2026 Q4 商业经营复盘与重点客户管线</div>
                    <div class="doc-meta-pills">
                      <span class="doc-meta-pill">fm.quarter: 2026-Q4</span>
                      <span class="doc-meta-pill">Obsidian Bases Ready</span>
                    </div>
                  </div>
                  <div id="tab1-kpi-host"></div>
                  <div id="tab1-chart-host"></div>
                  <div id="tab1-table-host"></div>
                </div>

                <!-- TAB 2: Earnings Sankey + Comparison + Live Pricing Sandbox -->
                <div id="panel-fin" class="tab-panel">
                  <div class="doc-header-row">
                    <div class="doc-hero-title">📈 2026 Q3 利润表流向拆解与 SaaS 定价沙箱推演</div>
                    <div class="doc-meta-pills">
                      <span class="doc-meta-pill">财报级 Sankey 流向图</span>
                      <span class="doc-meta-pill">隔离沙箱敏感度测算</span>
                    </div>
                  </div>
                  <div id="tab2-sankey-host"></div>
                  <div class="tab2-bottom-grid">
                    <div id="tab2-comparison-host"></div>
                    <div id="tab2-artifact-host"></div>
                  </div>
                </div>

                <!-- TAB 3: Deep Reading + Cognitive Flywheel SVG + Feynman Quiz -->
                <div id="panel-brain" class="tab-panel">
                  <div class="doc-header-row">
                    <div class="doc-hero-title">🧠 深度研报拆解、认知飞轮与费曼主动内化</div>
                    <div class="doc-meta-pills">
                      <span class="doc-meta-pill">Vault 实时脉搏</span>
                      <span class="doc-meta-pill">一键转 .canvas 白板</span>
                    </div>
                  </div>
                  <div id="tab3-pulse-host"></div>
                  <div id="tab3-svg-host"></div>
                  <div id="tab3-quiz-host"></div>
                </div>
              </div>

              <div id="wikilink-popover" class="obsidian-popover">
                <div class="popover-title">📄 星海CTO访谈纪要.md</div>
                <div class="popover-meta">客户级别: KA 战略级 · ACV: ¥240,000 · 负责人: 林远</div>
                <div class="popover-body">预算已获董事会批复；核心看重 100% 本地离线渲染与无外部 CDN 合规架构，预计下周二签署二期 120 坐席增购协议。</div>
              </div>
            </div>
          </div>
        </div>

        <div id="click-ripples"></div>
        <div id="macos-cursor" aria-hidden="true">
          <svg width="0" height="0" style="position:absolute">
            <defs>
              <filter id="cursor-motion-blur" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur id="cursor-blur-fe" in="SourceGraphic" stdDeviation="0 0" />
              </filter>
            </defs>
          </svg>
          <div id="cursor-halo"></div>
          <div id="cursor-blur-outer" style="transform-origin: 0 0; filter: url(#cursor-motion-blur);">
            <div id="cursor-counter-inner" style="transform-origin: 0 0;">
              <div id="cursor-shape-arrow" style="position:absolute; left:0; top:0; transform-origin:0 0;">
                <svg width="54" height="62" viewBox="-8 -8 42 50" style="display:block; margin-left:-10.29px; margin-top:-9.92px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.48));">
                  <path d="M 0 0 L 0 31.5 L 7.6 24.0 L 13.3 36.8 L 18.1 34.7 L 12.4 21.8 L 22.3 21.8 Z"
                        fill="#09090b" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round"/>
                </svg>
              </div>
              <div id="cursor-shape-hand" style="position:absolute; left:0; top:0; transform-origin:0 0; opacity:0;">
                <svg width="58" height="64" viewBox="-20 -8 48 52" style="display:block; margin-left:-24.17px; margin-top:-9.85px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.48));">
                  <g>
                    <path d="M -3.4 3.4 A 3.4 3.4 0 0 1 3.4 3.4 L 3.4 13.6 A 3.0 3.0 0 0 1 9.2 14.8 L 9.2 17.2 A 2.9 2.9 0 0 1 14.8 16.5 L 14.8 19.2 A 2.7 2.7 0 0 1 19.8 18.8 L 19.8 24.8 C 19.8 31.0 15.8 35.0 10.0 35.0 L 1.0 35.0 C -4.0 35.0 -7.2 31.6 -9.2 27.0 L -13.6 18.6 C -14.8 16.3 -13.7 13.7 -11.4 12.9 C -9.3 12.2 -7.0 13.4 -5.6 15.7 L -3.4 19.3 Z"
                          fill="#ffffff" stroke="#09090b" stroke-width="2.2" stroke-linejoin="round"/>
                    <path d="M 3.4 13.6 L 3.4 21.6 M 9.2 15.2 L 9.2 22.0 M 14.8 17.0 L 14.8 22.5"
                          fill="none" stroke="#09090b" stroke-width="1.65" stroke-linecap="round"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="obsidian-toast" class="obsidian-toast"></div>
      <div id="caption-pill" class="studio-caption-pill">
        <span class="caption-badge">REAL WORKFLOW</span>
        <span id="caption-text">💼 经营指标与全渠道 ROI · 一键在柱状/面积/明细表间无缝视角切换</span>
      </div>
    </div>
  `;

  // --- Helper: Smart Super-Table Builder ---
  function createTableElement(data: ParsedTableData, showSummary: boolean): HTMLTableElement {
    const table = document.createElement("table");
    table.className = "gpt-rich-table";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    data.headers.forEach((h, i) => {
      const th = document.createElement("th");
      th.className = `align-${data.alignments[i]}`;
      th.textContent = h + " ⇅";
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const firstWikiFlag = { used: false };
    for (const r of data.rows) {
      const tr = document.createElement("tr");
      r.forEach((cell, i) => {
        const td = document.createElement("td");
        td.className = `align-${data.alignments[i]}`;
        const cls = classifyCellValue(cell);
        if (cls.kind === "progress") {
          const tone = cls.percent >= 80 ? "high" : cls.percent >= 50 ? "mid" : "low";
          td.innerHTML = `<div class="gpt-rich-progress-cell"><div class="gpt-rich-progress-track"><div class="gpt-rich-progress-fill tone-${tone}" style="width:${cls.percent}%"></div></div><span class="gpt-rich-progress-label">${cls.raw}</span></div>`;
        } else if (cls.kind === "delta") {
          td.innerHTML = `<span class="gpt-rich-delta-pill is-${cls.direction}">${cls.raw}</span>`;
        } else if (cls.kind === "badge") {
          td.innerHTML = `<span class="gpt-rich-badge tone-${cls.tone}">${cls.label}</span>`;
        } else if (cls.kind === "number") {
          td.innerHTML = `<span class="gpt-rich-mono-num">${cls.raw}</span>`;
        } else {
          appendInlineTokens(td, cell, firstWikiFlag);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    if (showSummary) {
      const summaries = computeColumnSummaries(data.headers, data.rows);
      const tfoot = document.createElement("tfoot");
      const fr = document.createElement("tr");
      fr.className = "gpt-rich-summary-row";
      data.headers.forEach((_, idx) => {
        const td = document.createElement("td");
        td.className = `align-${data.alignments[idx]}`;
        const s = summaries[idx];
        if (idx === 0) {
          td.innerHTML = `<span class="gpt-rich-summary-tag">∑ 汇总/均值</span>`;
        } else if (s) {
          td.innerHTML = `<span class="gpt-rich-summary-val">${
            s.isPercent ? `均值 ${s.avg}%` : `Σ ¥${s.sum}万 · μ ${s.avg}万`
          }</span>`;
        } else {
          td.textContent = "—";
          td.style.color = "var(--text-faint)";
        }
        fr.appendChild(td);
      });
      tfoot.appendChild(fr);
      table.appendChild(tfoot);
    }
    return table;
  }

  // --- Tab 1 Renderers ---
  renderKpiStrip(document.getElementById("tab1-kpi-host")!, BIZ_KPI_JSON);

  const bizChartHost = document.getElementById("tab1-chart-host")!;
  let activeChartMode: CartesianViewMode | "table" = "bar";
  let bizChartInstance: echarts.ECharts | null = null;

  const renderBizChart = (animate = true) => {
    bizChartInstance?.dispose();
    bizChartInstance = null;
    bizChartHost.innerHTML = "";
    const override: CartesianViewMode =
      activeChartMode === "bar" || activeChartMode === "line" || activeChartMode === "area"
        ? activeChartMode
        : "default";
    const parsed = parseChartSpec(BIZ_CHART_JSON, true, override);
    if (parsed.status !== "ready") return;

    const card = document.createElement("div");
    card.className = "gpt-rich-card gpt-rich-chart-card";
    card.style.margin = "0";
    const header = document.createElement("div");
    header.className = "gpt-rich-card-header";
    header.innerHTML = `
      <div class="gpt-rich-card-titles">
        <div class="gpt-rich-card-title">${parsed.title}</div>
        <div class="gpt-rich-card-subtitle">${parsed.subtitle}</div>
      </div>
      <div class="gpt-rich-toolbar">
        <div class="gpt-rich-segmented">
          <button data-act="chart-bar" class="gpt-rich-seg-btn ${activeChartMode === "bar" ? "is-active" : ""}">柱状</button>
          <button data-act="chart-line" class="gpt-rich-seg-btn ${activeChartMode === "line" ? "is-active" : ""}">折线</button>
          <button data-act="chart-area" class="gpt-rich-seg-btn ${activeChartMode === "area" ? "is-active" : ""}">面积</button>
          <button data-act="chart-table" class="gpt-rich-seg-btn ${activeChartMode === "table" ? "is-active" : ""}">数据表</button>
        </div>
        <button class="gpt-rich-btn">PNG</button>
        <button class="gpt-rich-btn gpt-rich-btn-primary">全屏</button>
      </div>
    `;
    card.appendChild(header);

    if (activeChartMode === "table" && parsed.tabularBackup) {
      const wrap = document.createElement("div");
      wrap.className = "gpt-rich-table-scroll";
      wrap.style.height = "210px";
      wrap.appendChild(
        createTableElement(
          {
            headers: parsed.tabularBackup.headers,
            alignments: parsed.tabularBackup.headers.map((_, i) => (i === 0 ? "left" : "right")),
            rows: parsed.tabularBackup.rows
          },
          false
        )
      );
      card.appendChild(wrap);
      bizChartHost.appendChild(card);
      return;
    }

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "gpt-rich-chart-canvas";
    canvasWrap.style.height = "210px";
    card.appendChild(canvasWrap);
    bizChartHost.appendChild(card);

    bizChartInstance = echarts.init(canvasWrap);
    bizChartInstance.setOption({
      ...parsed.option,
      animation: animate,
      animationDuration: animate ? 520 : 0,
      animationDurationUpdate: animate ? 520 : 0
    });
  };
  renderBizChart(false);

  const bizTableHost = document.getElementById("tab1-table-host")!;
  const parsedBizTable = parseMarkdownTable(BIZ_TABLE_MD)!;
  let tableSummaryVisible = false;
  let baseExported = false;

  const renderBizTable = () => {
    bizTableHost.innerHTML = "";
    const card = document.createElement("div");
    card.className = "gpt-rich-card gpt-rich-table-card";
    card.style.margin = "0";
    card.innerHTML = `
      <div class="gpt-rich-table-topbar">
        <div class="gpt-rich-table-meta">
          <span class="gpt-rich-count-pill">4 个 KA 商机</span>
          <input class="gpt-rich-search-input" value="" placeholder="搜索客户名、标签或状态..." readonly />
        </div>
        <div class="gpt-rich-toolbar">
          <button data-act="table-sum" class="gpt-rich-btn ${tableSummaryVisible ? "gpt-rich-btn-primary" : ""}">∑ 汇总</button>
          <button data-act="table-to-base" class="gpt-rich-btn ${baseExported ? "gpt-rich-btn-primary" : ""}">${
            baseExported ? "✓ 已存入 CRM.base" : "转 Base 库"
          }</button>
          <button class="gpt-rich-btn">导出 CSV</button>
        </div>
      </div>
    `;
    const scroll = document.createElement("div");
    scroll.className = "gpt-rich-table-scroll";
    scroll.appendChild(createTableElement(parsedBizTable, tableSummaryVisible));
    card.appendChild(scroll);
    bizTableHost.appendChild(card);
  };
  renderBizTable();

  // --- Tab 2 Renderers (Initialized on demand when Tab 2 becomes visible) ---
  const finSankeyHost = document.getElementById("tab2-sankey-host")!;
  let sankeyInstance: echarts.ECharts | null = null;

  const renderFinSankey = (animate = true) => {
    sankeyInstance?.dispose();
    sankeyInstance = null;
    finSankeyHost.innerHTML = "";
    const parsed = parseChartSpec(FIN_SANKEY_JSON, true);
    if (parsed.status !== "ready") return;

    const card = document.createElement("div");
    card.className = "gpt-rich-card gpt-rich-chart-card";
    card.style.margin = "0";
    card.innerHTML = `
      <div class="gpt-rich-card-header">
        <div class="gpt-rich-card-titles">
          <div class="gpt-rich-card-title">${parsed.title}</div>
          <div class="gpt-rich-card-subtitle">${parsed.subtitle}</div>
        </div>
        <div class="gpt-rich-toolbar">
          <button class="gpt-rich-btn">PNG</button>
          <button class="gpt-rich-btn gpt-rich-btn-primary">全屏</button>
        </div>
      </div>
    `;
    const canvasWrap = document.createElement("div");
    canvasWrap.className = "gpt-rich-chart-canvas";
    canvasWrap.style.height = "255px";
    card.appendChild(canvasWrap);
    finSankeyHost.appendChild(card);

    sankeyInstance = echarts.init(canvasWrap);
    sankeyInstance.setOption({
      ...parsed.option,
      animation: animate,
      animationDuration: animate ? 650 : 0
    });
  };

  const finCompHost = document.getElementById("tab2-comparison-host")!;
  const compParsed = parseGptUiSpec(FIN_COMPARISON_JSON, "comparison");
  if (compParsed.status === "ready" && compParsed.block.kind === "comparison") {
    const block = compParsed.block;
    finCompHost.innerHTML = `
      <div class="gpt-rich-card" style="height:100%; margin:0; display:flex; flex-direction:column;">
        <div class="gpt-rich-card-header">
          <div class="gpt-rich-card-title">${block.title}</div>
          <span class="gpt-rich-count-pill">方案选型 PK</span>
        </div>
        <div class="gpt-rich-comparison-grid" style="flex:1; padding:12px 14px;">
          ${block.columns
            .map(
              (col) => `
            <div class="gpt-rich-comparison-col">
              <div class="gpt-rich-comparison-top">
                <span class="gpt-rich-comparison-name">${col.name}</span>
                ${col.badge ? `<span class="gpt-rich-badge tone-info">${col.badge}</span>` : ""}
              </div>
              ${col.summary ? `<div class="gpt-rich-comparison-summary">${col.summary}</div>` : ""}
              <div class="gpt-rich-pros-list">
                ${col.pros
                  .map((p) => `<div class="gpt-rich-pro-item"><span class="gpt-rich-pro-icon">＋</span><span>${p}</span></div>`)
                  .join("")}
              </div>
              <div class="gpt-rich-cons-list">
                ${col.cons
                  .map((c) => `<div class="gpt-rich-con-item"><span class="gpt-rich-con-icon">－</span><span>${c}</span></div>`)
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  const finArtifactHost = document.getElementById("tab2-artifact-host")!;
  let saasPrice = 1299;

  const renderPricingArtifact = () => {
    const seats = Math.round(1850 * (1 - (saasPrice - 1299) * 0.00012));
    const arrWan = Math.round((saasPrice * seats) / 10000);
    const grossMargin = (74.2 + ((saasPrice - 1299) / 1200) * 11.6).toFixed(1);
    const paybackMonths = Math.max(2.4, 5.6 - ((saasPrice - 1299) / 1200) * 2.5).toFixed(1);
    const netCashWan = Math.round(arrWan * 0.62 - 67);
    const safetyPct = Math.min(94, Math.max(48, Math.round(58 + ((saasPrice - 1299) / 1200) * 28)));

    finArtifactHost.innerHTML = `
      <div class="gpt-rich-card gpt-rich-artifact-card" style="height:100%; margin:0; display:flex; flex-direction:column;">
        <div class="gpt-rich-card-header">
          <div class="gpt-rich-artifact-badge-row">
            <span class="gpt-rich-live-dot"></span>
            <span class="gpt-rich-card-title">SaaS 定价与盈亏平衡实时沙箱</span>
          </div>
          <span class="gpt-rich-count-pill">实时推演</span>
        </div>
        <div class="studio-calc-body">
          <div class="studio-calc-row">
            <div class="studio-calc-label">
              <span>专业版年费定价 (动态弹性席位: ${seats.toLocaleString()} 人)</span>
              <b>¥${saasPrice.toLocaleString()} / 年</b>
            </div>
            <input data-act="price-slider" class="studio-calc-range" type="range" min="1299" max="2499" value="${saasPrice}" />
          </div>
          <div class="studio-calc-stats">
            <div class="studio-stat-box">
              <div class="studio-stat-k">年度经常性 ARR</div>
              <div class="studio-stat-v">¥${arrWan} 万</div>
            </div>
            <div class="studio-stat-box">
              <div class="studio-stat-k">预估综合毛利率</div>
              <div class="studio-stat-v">${grossMargin}%</div>
            </div>
            <div class="studio-stat-box">
              <div class="studio-stat-k">CAC 回本周期</div>
              <div class="studio-stat-v">${paybackMonths} 月</div>
            </div>
            <div class="studio-stat-box">
              <div class="studio-stat-k">年度净现金流入</div>
              <div class="studio-stat-v">+¥${netCashWan} 万</div>
            </div>
          </div>
          <div class="safety-bar-wrap">
            <div class="safety-bar-head">
              <span>经营现金流安全垫指数</span>
              <span style="color:#6ee7b7; font-weight:600;">${safetyPct}% · 财务健康优</span>
            </div>
            <div class="safety-bar-track">
              <div class="safety-bar-fill" style="width:${safetyPct}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  };
  renderPricingArtifact();

  // --- Tab 3 Renderers (Reading Pulse + Cognitive Flywheel SVG + Feynman Quiz) ---
  renderKpiStrip(document.getElementById("tab3-pulse-host")!, BRAIN_KPI_JSON, "vault-pulse-grid");

  const brainSvgHost = document.getElementById("tab3-svg-host")!;
  let canvasConverted = false;

  const renderBrainSvg = () => {
    brainSvgHost.innerHTML = "";
    const prep = sanitizeAndPrepareSvg(BRAIN_SVG_SOURCE);
    if (prep.status !== "ready") return;
    const card = document.createElement("div");
    card.className = "gpt-rich-card gpt-rich-svg-card";
    card.style.margin = "0";
    card.innerHTML = `
      <div class="gpt-rich-card-header">
        <div class="gpt-rich-card-titles">
          <div class="gpt-rich-card-title">个人第二大脑认知飞轮（AI 研报拆解 → Obsidian 双链资产）</div>
          <div class="gpt-rich-card-subtitle">支持无损缩放、节点悬停双链预览，及一键转化为可拖拽批注的原生 .canvas 思维白板</div>
        </div>
        <div class="gpt-rich-toolbar">
          <button class="gpt-rich-btn">100%</button>
          <button class="gpt-rich-btn">底色:自适应</button>
          <button data-act="svg-to-canvas" class="gpt-rich-btn ${canvasConverted ? "gpt-rich-btn-primary" : ""}">${
            canvasConverted ? "✓ 已生成思维白板" : "转 Canvas 白板"
          }</button>
          <button class="gpt-rich-btn">PNG</button>
        </div>
      </div>
      <div class="gpt-rich-svg-viewport backdrop-dark" style="height: 230px;">
        <div class="gpt-rich-svg-stage">
          ${prep.svgHtml}
        </div>
      </div>
    `;
    brainSvgHost.appendChild(card);
  };
  renderBrainSvg();

  const brainQuizHost = document.getElementById("tab3-quiz-host")!;
  const quizParsed = parseGptUiSpec(BRAIN_QUIZ_JSON, "quiz");
  let quizAnswered = false;

  const renderBrainQuiz = () => {
    if (quizParsed.status !== "ready" || quizParsed.block.kind !== "quiz") return;
    const block = quizParsed.block;
    brainQuizHost.innerHTML = `
      <div class="gpt-rich-card gpt-rich-quiz-card" style="margin:0;">
        <div class="gpt-rich-card-header">
          <div class="gpt-rich-card-title">${block.title}</div>
          <button class="gpt-rich-btn">下一题</button>
        </div>
        <div class="gpt-rich-quiz-body" style="padding:12px 16px; gap:10px;">
          <div class="gpt-rich-quiz-question" style="font-size:14px;">${block.question}</div>
          <div class="gpt-rich-quiz-options" style="gap:8px;">
            ${block.options
              .map(
                (opt, i) => `
              <button ${i === 0 ? 'data-act="quiz-opt-0"' : ""} class="gpt-rich-quiz-opt ${
                  quizAnswered && i === 0 ? "is-correct" : ""
                }" style="padding:9px 12px;">
                <span class="gpt-rich-quiz-opt-key">${String.fromCharCode(65 + i)}</span>
                <span>${opt.label}</span>
              </button>
            `
              )
              .join("")}
          </div>
          ${
            quizAnswered
              ? `<div class="gpt-rich-quiz-feedback is-correct">
                  <div class="gpt-rich-quiz-feedback-title">✅ 回答正确！</div>
                  <div>${block.options[0].explanation}</div>
                </div>`
              : ""
          }
        </div>
      </div>
    `;
  };
  renderBrainQuiz();

  // --- Tab Switcher ---
  type TabId = "biz" | "fin" | "brain";
  function switchTab(next: TabId): void {
    document.querySelector('[data-act="tab-biz"]')!.classList.toggle("is-active", next === "biz");
    document.querySelector('[data-act="tab-fin"]')!.classList.toggle("is-active", next === "fin");
    document.querySelector('[data-act="tab-brain"]')!.classList.toggle("is-active", next === "brain");

    document.getElementById("panel-biz")!.classList.toggle("is-active", next === "biz");
    document.getElementById("panel-fin")!.classList.toggle("is-active", next === "fin");
    document.getElementById("panel-brain")!.classList.toggle("is-active", next === "brain");

    if (next === "fin") {
      renderFinSankey(true);
    } else if (next === "biz") {
      bizChartInstance?.resize();
    }
  }

  // --- Toast & Popover ---
  const toastEl = document.getElementById("obsidian-toast")!;
  const popoverEl = document.getElementById("wikilink-popover")!;
  let toastHideAt = -1;

  function showToast(text: string): void {
    toastEl.textContent = text;
    toastEl.classList.add("is-visible");
    toastHideAt = studioTimeMs + 2200;
  }

  function showPopoverNearTarget(el: HTMLElement): void {
    const r = el.getBoundingClientRect();
    const pane = document.getElementById("obsidian-scroll-pane")!.getBoundingClientRect();
    const relX = (r.left - pane.left) / currentZoom;
    const relY = (r.top - pane.top) / currentZoom;
    popoverEl.style.left = `${Math.max(20, Math.min(960, relX - 180))}px`;
    popoverEl.style.top = `${Math.max(16, relY - 122)}px`;
    popoverEl.classList.add("is-visible");
  }

  // 6. C² Minimum-Jerk Camera & Cursor Director
  const cameraRig = document.getElementById("camera-rig")!;
  const cursorEl = document.getElementById("macos-cursor")!;
  const cursorHaloEl = document.getElementById("cursor-halo")!;
  const cursorBlurOuter = document.getElementById("cursor-blur-outer")!;
  const cursorCounterInner = document.getElementById("cursor-counter-inner")!;
  const cursorShapeArrow = document.getElementById("cursor-shape-arrow")!;
  const cursorShapeHand = document.getElementById("cursor-shape-hand")!;
  const cursorBlurFe = document.getElementById("cursor-blur-fe")!;
  const clickRipplesEl = document.getElementById("click-ripples")!;
  const captionTextEl = document.getElementById("caption-text")!;

  let currentZoom = 1.0;
  let currentFocusX = 960;
  let currentFocusY = 540;
  let currentTx = 0;
  let currentTy = 0;

  let curX = 960;
  let curY = 520;
  let prevCurX = 960;
  let prevCurY = 520;
  let smoothVelBoost = 0;
  let smoothTiltDeg = 0;
  let currentCursorKind: "arrow" | "pointer" = "arrow";
  let lastMorphTime = -9999;
  let lastClickTime = -9999;

  function smootherstep(t: number): number {
    const u = Math.max(0, Math.min(1, t));
    return u * u * u * (u * (u * 6 - 15) + 10);
  }

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  function applyCamera(zoom: number, fx: number, fy: number): void {
    currentZoom = zoom;
    currentFocusX = fx;
    currentFocusY = fy;
    currentTx = Math.min(0, Math.max(1920 - 1920 * zoom, 960 - zoom * fx));
    currentTy = Math.min(0, Math.max(1080 - 1080 * zoom, 540 - zoom * fy));
    cameraRig.style.transform = `translate3d(${currentTx.toFixed(3)}px, ${currentTy.toFixed(
      3
    )}px, 0) scale(${zoom.toFixed(4)})`;
  }

  function getStageCenter(selector: string): { x: number; y: number } {
    const el = document.querySelector(selector);
    if (!el) return { x: curX, y: curY };
    const r = el.getBoundingClientRect();
    return {
      x: (r.left + r.width / 2 - currentTx) / currentZoom,
      y: (r.top + r.height / 2 - currentTy) / currentZoom
    };
  }

  function getPriceSliderStagePos(fraction: number): { x: number; y: number } {
    const el = document.querySelector('[data-act="price-slider"]');
    if (!el) return { x: curX, y: curY };
    const r = el.getBoundingClientRect();
    const xPx = r.left + 8 + (r.width - 16) * fraction;
    const yPx = r.top + r.height / 2;
    return {
      x: (xPx - currentTx) / currentZoom,
      y: (yPx - currentTy) / currentZoom
    };
  }

  function spawnRipple(x: number, y: number): void {
    const rip = document.createElement("div");
    rip.className = "cursor-ripple";
    rip.style.left = `${x}px`;
    rip.style.top = `${y}px`;
    rip.setAttribute("data-born", String(studioTimeMs));
    clickRipplesEl.appendChild(rip);

    const rip2 = document.createElement("div");
    rip2.className = "cursor-ripple is-secondary";
    rip2.style.left = `${x}px`;
    rip2.style.top = `${y}px`;
    rip2.setAttribute("data-born", String(studioTimeMs + 55));
    clickRipplesEl.appendChild(rip2);
  }

  // Camera Keyframes (fx = 960 centered everywhere -> ZERO left/right axis or column clipping!)
  const CAM_KEYFRAMES = [
    { atMs: 0, zoom: 1.0, fx: 960, fy: 540 },
    { atMs: 1050, zoom: 1.0, fx: 960, fy: 540 },
    { atMs: 2050, zoom: 1.22, fx: 960, fy: 410 },
    { atMs: 4450, zoom: 1.22, fx: 960, fy: 410 },
    { atMs: 5450, zoom: 1.24, fx: 960, fy: 625 },
    { atMs: 9100, zoom: 1.24, fx: 960, fy: 625 },
    { atMs: 10050, zoom: 1.06, fx: 960, fy: 495 },
    { atMs: 10550, zoom: 1.06, fx: 960, fy: 495 },
    { atMs: 11500, zoom: 1.14, fx: 960, fy: 480 },
    { atMs: 12350, zoom: 1.14, fx: 960, fy: 480 },
    { atMs: 13350, zoom: 1.24, fx: 960, fy: 635 },
    { atMs: 16300, zoom: 1.24, fx: 960, fy: 635 },
    { atMs: 17250, zoom: 1.06, fx: 960, fy: 495 },
    { atMs: 17650, zoom: 1.06, fx: 960, fy: 495 },
    { atMs: 18450, zoom: 1.22, fx: 960, fy: 575 },
    { atMs: 22250, zoom: 1.22, fx: 960, fy: 575 },
    { atMs: 23150, zoom: 1.0, fx: 960, fy: 540 },
    { atMs: 24000, zoom: 1.0, fx: 960, fy: 540 }
  ];

  function sampleCameraAt(t: number): { zoom: number; fx: number; fy: number } {
    if (t <= CAM_KEYFRAMES[0].atMs) return CAM_KEYFRAMES[0];
    for (let i = 0; i < CAM_KEYFRAMES.length - 1; i++) {
      const a = CAM_KEYFRAMES[i];
      const b = CAM_KEYFRAMES[i + 1];
      if (t <= b.atMs) {
        const s = smootherstep((t - a.atMs) / Math.max(1, b.atMs - a.atMs));
        return {
          zoom: lerp(a.zoom, b.zoom, s),
          fx: lerp(a.fx, b.fx, s),
          fy: lerp(a.fy, b.fy, s)
        };
      }
    }
    return CAM_KEYFRAMES[CAM_KEYFRAMES.length - 1];
  }

  // Cursor C² Keyframe Anchors
  type AnchorKind =
    | "origin"
    | "chart-area"
    | "chart-table"
    | "table-wikilink"
    | "table-sum"
    | "table-to-base"
    | "tab-fin"
    | "sankey-rest"
    | "slider-start"
    | "slider-end"
    | "tab-brain"
    | "svg-to-canvas"
    | "quiz-opt-0"
    | "tab-biz";

  interface CursorSegment {
    startMs: number;
    endMs: number;
    from: AnchorKind;
    to: AnchorKind;
    arcY: number;
    interactive: boolean;
    isDragging?: boolean;
  }

  function resolveAnchor(kind: AnchorKind, t: number): { x: number; y: number } {
    switch (kind) {
      case "origin":
        return { x: 960, y: 520 };
      case "chart-area":
        return getStageCenter('[data-act="chart-area"]');
      case "chart-table":
        return getStageCenter('[data-act="chart-table"]');
      case "table-wikilink":
        return getStageCenter('[data-act="table-wikilink"]');
      case "table-sum":
        return getStageCenter('[data-act="table-sum"]');
      case "table-to-base":
        return getStageCenter('[data-act="table-to-base"]');
      case "tab-fin":
        return getStageCenter('[data-act="tab-fin"]');
      case "sankey-rest":
        return { x: 1460, y: 260 };
      case "slider-start":
        return getPriceSliderStagePos(0);
      case "slider-end": {
        const frac = smootherstep((t - 13450) / 1900);
        return getPriceSliderStagePos(frac);
      }
      case "tab-brain":
        return getStageCenter('[data-act="tab-brain"]');
      case "svg-to-canvas":
        return getStageCenter('[data-act="svg-to-canvas"]');
      case "quiz-opt-0":
        return getStageCenter('[data-act="quiz-opt-0"]');
      case "tab-biz":
        return getStageCenter('[data-act="tab-biz"]');
    }
  }

  const CURSOR_TIMELINE: CursorSegment[] = [
    { startMs: 0, endMs: 1150, from: "origin", to: "origin", arcY: 0, interactive: false },
    { startMs: 1150, endMs: 2050, from: "origin", to: "chart-area", arcY: -22, interactive: true },
    { startMs: 2050, endMs: 3250, from: "chart-area", to: "chart-area", arcY: 0, interactive: true },
    { startMs: 3250, endMs: 3650, from: "chart-area", to: "chart-table", arcY: -8, interactive: true },
    { startMs: 3650, endMs: 4600, from: "chart-table", to: "chart-table", arcY: 0, interactive: true },
    { startMs: 4600, endMs: 5400, from: "chart-table", to: "table-wikilink", arcY: 18, interactive: true },
    { startMs: 5400, endMs: 6900, from: "table-wikilink", to: "table-wikilink", arcY: 0, interactive: true },
    { startMs: 6900, endMs: 7400, from: "table-wikilink", to: "table-sum", arcY: -12, interactive: true },
    { startMs: 7400, endMs: 7850, from: "table-sum", to: "table-sum", arcY: 0, interactive: true },
    { startMs: 7850, endMs: 8200, from: "table-sum", to: "table-to-base", arcY: -6, interactive: true },
    { startMs: 8200, endMs: 9300, from: "table-to-base", to: "table-to-base", arcY: 0, interactive: true },
    { startMs: 9300, endMs: 10100, from: "table-to-base", to: "tab-fin", arcY: -20, interactive: true },
    { startMs: 10100, endMs: 10500, from: "tab-fin", to: "tab-fin", arcY: 0, interactive: true },
    { startMs: 10500, endMs: 11350, from: "tab-fin", to: "sankey-rest", arcY: 18, interactive: false },
    { startMs: 11350, endMs: 12400, from: "sankey-rest", to: "sankey-rest", arcY: 0, interactive: false },
    { startMs: 12400, endMs: 13300, from: "sankey-rest", to: "slider-start", arcY: 22, interactive: true },
    { startMs: 13300, endMs: 13450, from: "slider-start", to: "slider-start", arcY: 0, interactive: true },
    { startMs: 13450, endMs: 15350, from: "slider-end", to: "slider-end", arcY: 0, interactive: true, isDragging: true },
    { startMs: 15350, endMs: 16400, from: "slider-end", to: "slider-end", arcY: 0, interactive: true },
    { startMs: 16400, endMs: 17250, from: "slider-end", to: "tab-brain", arcY: -22, interactive: true },
    { startMs: 17250, endMs: 18050, from: "tab-brain", to: "tab-brain", arcY: 0, interactive: true },
    { startMs: 18050, endMs: 18950, from: "tab-brain", to: "svg-to-canvas", arcY: 18, interactive: true },
    { startMs: 18950, endMs: 19950, from: "svg-to-canvas", to: "svg-to-canvas", arcY: 0, interactive: true },
    { startMs: 19950, endMs: 20700, from: "svg-to-canvas", to: "quiz-opt-0", arcY: -20, interactive: true },
    { startMs: 20700, endMs: 22300, from: "quiz-opt-0", to: "quiz-opt-0", arcY: 0, interactive: true },
    { startMs: 22300, endMs: 23050, from: "quiz-opt-0", to: "tab-biz", arcY: -24, interactive: true },
    { startMs: 23050, endMs: 23200, from: "tab-biz", to: "tab-biz", arcY: 0, interactive: true },
    { startMs: 23200, endMs: 23850, from: "tab-biz", to: "origin", arcY: 20, interactive: false },
    { startMs: 23850, endMs: 24000, from: "origin", to: "origin", arcY: 0, interactive: false }
  ];

  // Scripted Trigger Events (8 purposeful actions with rich reading holds)
  interface TriggerEvent {
    atMs: number;
    fired: boolean;
    run: () => void;
  }

  const events: TriggerEvent[] = [
    {
      atMs: 2250,
      fired: false,
      run: () => {
        activeChartMode = "area";
        renderBizChart(true);
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    },
    {
      atMs: 3800,
      fired: false,
      run: () => {
        activeChartMode = "table";
        renderBizChart(false);
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    },
    {
      atMs: 5550,
      fired: false,
      run: () => {
        const link = document.querySelector('[data-act="table-wikilink"]') as HTMLElement | null;
        if (link) showPopoverNearTarget(link);
      }
    },
    {
      atMs: 6900,
      fired: false,
      run: () => {
        popoverEl.classList.remove("is-visible");
      }
    },
    {
      atMs: 7550,
      fired: false,
      run: () => {
        tableSummaryVisible = true;
        renderBizTable();
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    },
    {
      atMs: 8350,
      fired: false,
      run: () => {
        baseExported = true;
        renderBizTable();
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
        showToast("✅ 已一键生成原生 CRM.base 数据库（含 Table 看板 + KA 客户档案）");
      }
    },
    {
      atMs: 10250,
      fired: false,
      run: () => {
        switchTab("fin");
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    },
    {
      atMs: 13450,
      fired: false,
      run: () => {
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    },
    {
      atMs: 17400,
      fired: false,
      run: () => {
        switchTab("brain");
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    },
    {
      atMs: 19150,
      fired: false,
      run: () => {
        canvasConverted = true;
        renderBrainSvg();
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
        showToast("🧩 已无损转化为原生 JSON Canvas 思维白板：Cognitive-Flywheel.canvas");
      }
    },
    {
      atMs: 20850,
      fired: false,
      run: () => {
        quizAnswered = true;
        renderBrainQuiz();
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    },
    {
      atMs: 23150,
      fired: false,
      run: () => {
        activeChartMode = "bar";
        tableSummaryVisible = false;
        baseExported = false;
        renderBizChart(false);
        renderBizTable();
        switchTab("biz");
        spawnRipple(curX, curY);
        lastClickTime = studioTimeMs;
      }
    }
  ];

  function evaluateTimeline(t: number, dtSec: number): void {
    // Caption track (synced cleanly with 3 workflow tabs)
    if (t < 4600) {
      captionTextEl.textContent = "💼 商业经营面板 · 营收/获客/NRR 一键在柱状、面积与财务表间切视角";
    } else if (t < 10250) {
      captionTextEl.textContent = "🗂️ 客户台账 CRM · 悬停预览访谈纪要 + ∑ 汇总金额 + 一键转原生 .base 库";
    } else if (t < 13350) {
      captionTextEl.textContent = "📈 Q3 利润表 Sankey 流向图 · 营收、毛利、产研费用与净利润一目了然";
    } else if (t < 17400) {
      captionTextEl.textContent = "🧮 方案对比 & SaaS 定价实时沙箱 · 拖动客单价即时算清 ARR 与回本周期";
    } else if (t < 23150) {
      captionTextEl.textContent = "🧠 知识飞轮 & 费曼自测 · 研报一键转 .canvas 白板，主动回忆沉淀复利";
    } else {
      captionTextEl.textContent = "✨ Obsidian GPT Rich Render v0.3 · 让商业分析与日常学习长在双链里";
    }

    // 1. Evaluate C² continuous camera position BEFORE resolving screen-to-stage target coords
    const cam = sampleCameraAt(t);
    applyCamera(cam.zoom, cam.fx, cam.fy);

    // 2. Live SaaS Pricing Slider Scrub during [13450ms .. 15350ms]
    if (t >= 13450 && t <= 15350) {
      const scrub = smootherstep((t - 13450) / 1900);
      const nextPrice = Math.round(lerp(1299, 2499, scrub));
      if (nextPrice !== saasPrice) {
        saasPrice = nextPrice;
        renderPricingArtifact();
      }
    }

    // 3. Evaluate C² Minimum-Jerk Cursor Position
    prevCurX = curX;
    prevCurY = curY;
    let activeSeg = CURSOR_TIMELINE[CURSOR_TIMELINE.length - 1];
    for (const seg of CURSOR_TIMELINE) {
      if (t <= seg.endMs) {
        activeSeg = seg;
        break;
      }
    }

    const segDuration = Math.max(1, activeSeg.endMs - activeSeg.startMs);
    const u = Math.max(0, Math.min(1, (t - activeSeg.startMs) / segDuration));
    const s = smootherstep(u);
    const pFrom = resolveAnchor(activeSeg.from, t);
    const pTo = resolveAnchor(activeSeg.to, t);

    // C² smooth curved arc via sin^3(pi*u) (zero velocity and zero acceleration at endpoints)
    const arc = activeSeg.arcY * Math.pow(Math.sin(Math.PI * u), 3);
    curX = lerp(pFrom.x, pTo.x, s);
    curY = lerp(pFrom.y, pTo.y, s) + arc;

    // 4. Fire Scripted Trigger Events at exact timestamps
    for (const ev of events) {
      if (!ev.fired && t >= ev.atMs) {
        ev.fired = true;
        ev.run();
      }
    }

    // 5. Tasteful Apple-grade velocity swell (<=12%), gentle tilt (<=±6°), and soft directional blur
    const safeDt = Math.max(1 / 120, dtSec);
    const curVx = dtSec > 0 ? (curX - prevCurX) / safeDt : 0;
    const curVy = dtSec > 0 ? (curY - prevCurY) / safeDt : 0;
    const speedPxSec = Math.hypot(curVx, curVy);
    const speedPxPerFrame = speedPxSec / 60;

    const rawBoost = Math.max(0, Math.min(0.12, (speedPxSec - 300) / 2200));
    const boostRate = rawBoost > smoothVelBoost ? 14 : 8;
    smoothVelBoost = lerp(smoothVelBoost, rawBoost, 1 - Math.exp(-boostRate * safeDt));

    const rawTilt = Math.max(-6, Math.min(6, curVx * 0.005));
    smoothTiltDeg = lerp(smoothTiltDeg, rawTilt, 1 - Math.exp(-12 * safeDt));

    const angleDeg = speedPxSec > 10 ? (Math.atan2(curVy, curVx) * 180) / Math.PI : 0;
    const blurX = speedPxPerFrame > 5.0 ? Math.min(3.2, (speedPxPerFrame - 5.0) * 0.16) : 0;

    // Arrow <-> Pointing Hand morphing
    const distToTarget = Math.hypot(pTo.x - curX, pTo.y - curY);
    const nextKind: "arrow" | "pointer" =
      activeSeg.interactive && (distToTarget < 85 || Boolean(activeSeg.isDragging)) ? "pointer" : "arrow";
    if (nextKind !== currentCursorKind) {
      currentCursorKind = nextKind;
      lastMorphTime = t;
      cursorShapeArrow.style.opacity = nextKind === "arrow" ? "1" : "0";
      cursorShapeHand.style.opacity = nextKind === "pointer" ? "1" : "0";
    }

    const morphAge = t - lastMorphTime;
    let morphPopScale = 1.0;
    if (morphAge >= 0 && morphAge < 130) {
      morphPopScale = 1.0 + 0.09 * Math.sin((morphAge / 130) * Math.PI);
    }

    const clickAge = t - lastClickTime;
    let clickScale = 1.0;
    if (clickAge >= 0 && clickAge < 220) {
      if (clickAge < 90) {
        clickScale = lerp(1.0, 0.80, clickAge / 90);
      } else {
        clickScale = lerp(0.80, 1.0, smootherstep((clickAge - 90) / 130));
      }
    }

    const zoomComp = 1 / Math.pow(currentZoom, 0.30);
    const totalCursorScale = zoomComp * (1 + smoothVelBoost) * clickScale * morphPopScale;

    cursorEl.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;
    cursorBlurOuter.style.transform = `rotate(${angleDeg.toFixed(2)}deg)`;
    cursorCounterInner.style.transform = `rotate(${(smoothTiltDeg - angleDeg).toFixed(
      2
    )}deg) scale(${totalCursorScale.toFixed(3)})`;
    cursorBlurFe.setAttribute("stdDeviation", `${blurX.toFixed(2)} 0`);

    const clickBoost = clickAge >= 0 && clickAge < 280 ? (1 - clickAge / 280) * 0.40 : 0;
    const haloOpacity = Math.min(0.75, 0.18 + smoothVelBoost * 0.8 + (activeSeg.isDragging ? 0.25 : 0) + clickBoost);
    const haloScale = totalCursorScale * (1 + clickBoost * 0.45);
    cursorHaloEl.style.opacity = haloOpacity.toFixed(3);
    cursorHaloEl.style.transform = `scale(${haloScale.toFixed(3)})`;

    // Update dual click ripples
    for (const rip of Array.from(clickRipplesEl.children)) {
      const born = Number(rip.getAttribute("data-born") || "0");
      const age = t - born;
      if (age < 0) continue;
      if (age > 600) {
        rip.remove();
        continue;
      }
      const p = age / 600;
      const isSecondary = rip.classList.contains("is-secondary");
      const maxExpand = isSecondary ? 1.72 : 1.42;
      (rip as HTMLElement).style.transform = `translate(-50%, -50%) scale(${(0.35 + p * maxExpand).toFixed(3)})`;
      (rip as HTMLElement).style.opacity = `${Math.max(0, (1 - p) * (isSecondary ? 0.60 : 0.85)).toFixed(3)}`;
    }

    if (toastHideAt > 0 && t >= toastHideAt) {
      toastEl.classList.remove("is-visible");
      toastHideAt = -1;
    }
  }

  // Expose deterministic frame stepper for headless CDP capture
  (window as unknown as { __stepStudio: (dtMs: number) => void; __studioReady: boolean }).__stepStudio = (
    dtMs: number
  ) => {
    if (dtMs > 0) {
      studioTimeMs += dtMs;
      evaluateTimeline(studioTimeMs, dtMs / 1000);
      flushRafQueue();
    } else {
      evaluateTimeline(studioTimeMs, 0);
      flushRafQueue();
    }
  };
  (window as unknown as { __studioReady: boolean }).__studioReady = true;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildStudioApp);
} else {
  buildStudioApp();
}
