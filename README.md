<div align="center">

# ✨ Vivid

**Turn flat ChatGPT & Claude replies — and everyday Markdown notes — into interactive charts, sortable super-tables, KPI cards, and study quizzes.**

[![Release](https://img.shields.io/github/v/release/Yuki-zik/obsidian-vivid?color=ec4899&label=Release)](https://github.com/Yuki-zik/obsidian-vivid/releases)
[![CI](https://github.com/Yuki-zik/obsidian-vivid/actions/workflows/ci.yml/badge.svg)](https://github.com/Yuki-zik/obsidian-vivid/actions/workflows/ci.yml)
[![Obsidian](https://img.shields.io/badge/Obsidian-v1.5.7%2B%20%7C%20Bases%20Ready-8b5cf6.svg)](https://obsidian.md)
[![Offline Ready](https://img.shields.io/badge/Network-100%25%20Offline%20%2F%20Zero%20CDN-10b981.svg)](#privacy-permissions--network-disclosure)
[![Tests](https://img.shields.io/badge/Tests-35%2F35%20Passing-0ea5e9.svg)](./tests)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](./LICENSE)
[![Feedback & Ideas](https://img.shields.io/badge/Feedback_%26_Ideas-Discussions-14b8a6.svg)](https://github.com/Yuki-zik/obsidian-vivid/discussions)
[![简体中文](https://img.shields.io/badge/文档-简体中文-f59e0b.svg)](./README_ZH.md)

*Export any AI table or diagram in one click into native **Obsidian `.base` databases** and **`.canvas` whiteboards** — 100% offline, plain-text safe, with live YAML property bindings and clickable `[[Wikilinks]]`.*

<br/>

![Vivid Interactive Demo (60fps Capture)](https://raw.githubusercontent.com/Yuki-zik/obsidian-vivid/main/docs/assets/hero-demo.gif)

🎬 **[Watch 60fps Video Demo](https://github.com/Yuki-zik/obsidian-vivid/blob/main/docs/assets/vivid-promo.mp4)** · 💬 **[Drop a 1-Sentence Idea / Q&A](https://github.com/Yuki-zik/obsidian-vivid/discussions/1)** · 🎨 **[Paste a Weird Snippet (30s Fix)](https://github.com/Yuki-zik/obsidian-vivid/issues/new?template=broken_render.yml)**

</div>

---

## Why Vivid?

Most visualization plugins stop at painting isolated diagrams inside a single note. **Vivid** connects rich GPT/Claude UI rendering directly with **five Vault-Native Obsidian integrations**:

| Vault-Native Integration | Problem Solved | Interactive Workflow |
| :--- | :--- | :--- |
| **1. Super-Table → Native `.base` Database** | AI comparison & literature tables get trapped inside one note without cross-note filtering | Click **`转 Base 库`** (`To Base`) on any table to generate typed YAML frontmatter child notes + an Obsidian `.base` file (`Table` & `Cards` views) |
| **2. SVG & Timeline → Native `.canvas` Whiteboard** | Static diagrams cannot be rearranged, annotated, or connected in Canvas | Click **`转 Canvas`** (`To Canvas`) to convert SVG flows or roadmaps into JSON Canvas 1.0 `.canvas` boards — auto-linking `[[Note]]` nodes to real Vault files |
| **3. Zero-SQL Live Vault Analytics (`vault-chart`, `vault-kpi`)** | Complex DataviewJS scripts break or go stale as your vault grows | Reads Obsidian's native `metadataCache` locally to aggregate folders, `#tags`, and YAML Properties (`Bar`, `Pie`, `Sankey`), drilling down into Global Search on click |
| **4. Embedded `[[Wikilinks]]` & `#tags` Inside Visuals** | Links inside generated tables/diagrams are normally dead text | Write `[[Note\|Alias]]` or `#tag` inside tables, timelines, comparison cards, and SVG `<text>` nodes to enable native Page Preview popovers and click-to-open navigation |
| **5. Reactive `{{fm.key}}` Property Binding** | Updating frontmatter metrics forces manual edits in note charts | Interpolates `{{fm.property \| fallback}}` across `kpi`, `chart`, `gpt-table`, and `gpt-ui` blocks (preserving inline code literals) and refreshes on metadata save |

### Live Showcase
![Vault Live Metadata Analytics](https://raw.githubusercontent.com/Yuki-zik/obsidian-vivid/main/docs/assets/vault-native-pulse.png)

![Super-Table to Obsidian Base & Canvas Exporters](https://raw.githubusercontent.com/Yuki-zik/obsidian-vivid/main/docs/assets/vault-native-bridges.png)

---

## Full Interactive Component Suite

### 1. Offline Apache ECharts (`chart`, `gpt-chart`, `echarts`)
Supports `bar`, `horizontalBar`, `line`, `area`, `pie`, `doughnut`, `radar`, `sankey`, `heatmap`, `gauge`, `treemap`, and native ECharts `option` specs — with one-click switching between **Bar | Line | Area | Underlying Data Table**, `2x PNG` export, and lightbox fullscreen zoom.

![Switchable Charts & Sankey Flow](https://raw.githubusercontent.com/Yuki-zik/obsidian-vivid/main/docs/assets/charts-switchable-sankey.png)

### 2. Automatic Super-Tables (Standard Markdown Tables & `gpt-table`)
Automatically upgrades Markdown tables in Reading View and AI chat sidebars with instant keyword search, unit/currency-aware numeric sorting, `∑` summary footers (`avg` / `sum`), percentage progress bars, delta pills (`+18.5%` / `-12.0%`), semantic status badges, CSV/Markdown export, and `.base` export.

![Interactive Super-Table Showcase](https://raw.githubusercontent.com/Yuki-zik/obsidian-vivid/main/docs/assets/supertable-comparison.png)

### 3. Structured Cards, Quizzes & Sandboxed Artifacts (`kpi`, `timeline`, `comparison`, `quiz`, `artifact`)
Includes responsive KPI sparkline cards, vertical roadmaps, side-by-side comparison grids, interactive self-check quizzes, and live HTML/CSS/JS widgets isolated inside opaque-origin `<iframe sandbox="allow-scripts">` containers.

![Comparison, Timeline, Quiz & Sandboxed Artifact](https://raw.githubusercontent.com/Yuki-zik/obsidian-vivid/main/docs/assets/timeline-quiz-artifact.png)

---

## Syntax Quick Reference (100% Local-First Plain Text)

1. **KPI Cards with Reactive Property Binding (`kpi` / `metrics`)**:
   ````markdown
   ```kpi
   [
     { "label": "Stage", "value": "{{fm.stage | v1.0}}", "delta": "+12.8%", "trend": "up", "sparkline": [60, 75, 88, 96] }
   ]
   ```
   ````
2. **Live Vault Metadata Analytics (`vault-chart` / `vault-kpi`)**:
   ````markdown
   ```vault-chart
   { "type": "sankey", "title": "Knowledge Flow: Folder -> Tag", "sourceBy": "folder", "targetBy": "tag", "limit": 12 }
   ```
   ````
3. **Charts (`chart` / `echarts`)**: Standard JSON with `{ type, labels, datasets }` or `{ type, data }` or full ECharts `option`.
4. **Pan-Zoom Sanitized Diagrams (`svg`)**: Standard `<svg>...</svg>` with drag-to-pan, `Cmd/Ctrl + Wheel` zoom, Light/Dark/Auto backdrops, attachment snapshots, `2x PNG` export, and JSON Canvas export.
5. **Sandboxed Micro-Apps (`artifact` / `html-preview`)**: Self-contained HTML/CSS/JS snippets auto-styled with Obsidian theme CSS variables.

---

## Installation & Workflows

### 1. Install from Obsidian Community Plugins (Recommended)
1. Open **Settings → Community plugins** in Obsidian (if Restricted mode is enabled, click **Exit Restricted mode** → **Turn on community plugins**).
2. Click **Browse**, search for **`Vivid`** *(by `a-znk`)* — or open the [Obsidian Community Directory listing](https://obsidian.md/plugins?id=vivid).
3. Click **Install**, then click **Enable**.
4. Open [examples/Vivid-Showcase.md](./examples/Vivid-Showcase.md) inside a note or run **`Cmd/Ctrl + P` → `Vivid`** to try every interactive block right away.

> **Directory Status:** Vivid (`0.3.3`) is live in Obsidian's official Community Plugins catalog. Until Obsidian staff finish their initial manual code review, the listing shows Obsidian's standard *"not been manually reviewed by Obsidian staff"* notice.

### 2. Alternative Install Methods
- **Obsidian BRAT**: Open **BRAT** → **Add Beta plugin** → enter `Yuki-zik/obsidian-vivid` → enable **Vivid**.
- **Manual Release Install**: Download `main.js`, `manifest.json`, and `styles.css` from [GitHub Releases](https://github.com/Yuki-zik/obsidian-vivid/releases) into `<YourVault>/.obsidian/plugins/vivid/`.

### 3. Companion Integrations (Optional)
- **Browser Companion (`browser-companion/`)**: Chrome/Edge MV3 extension and Tampermonkey script that add a `Send to Obsidian ✨` button on `chatgpt.com` and `claude.ai` via `obsidian://vivid-import`.
- **AI System Prompt (`GPT-CUSTOM-INSTRUCTIONS.md`)**: Run command **`Copy GPT Rich Instructions`** (`Cmd/Ctrl + P`) and paste into ChatGPT Custom Instructions or Obsidian Copilot / Agent Client so streamed AI responses render live as charts, super-tables, and diagrams.
- **Editor Selection Transform**: Highlight text in the editor, right-click, and convert it into SVG, Chart, Super-Table, or Artifact (uses your configured API key or copies the structured prompt to clipboard in zero-API-key mode).

### 4. Build from Source
```bash
git clone https://github.com/Yuki-zik/obsidian-vivid.git
cd obsidian-vivid
npm install
npm run lint
npm test
npm run build
```
Open [examples/Vivid-Showcase.md](./examples/Vivid-Showcase.md) inside Obsidian to test every block type.

---

## Feedback, Ideas & Quick Bug Drop

Running into an AI snippet that renders oddly, or wishing for a new chart/export workflow? Pick whichever feels easiest — **one sentence or a pasted snippet is plenty**:

- **💬 Casual Wishlist & Q&A ([GitHub Discussions](https://github.com/Yuki-zik/obsidian-vivid/discussions))** — No template required. Vote on ideas, ask usage questions, or show off your dashboards.
- **🎨 30-Second Render Fix ([Paste a Weird Snippet](https://github.com/Yuki-zik/obsidian-vivid/issues/new?template=broken_render.yml))** — Drop the raw Markdown/JSON block or a screenshot; no console logs needed.
- **💡 Feature Wish ([1-Box Idea Form](https://github.com/Yuki-zik/obsidian-vivid/issues/new?template=feature_idea.yml))** — Tell us what visual block or Obsidian integration would help your daily notes.

---

## Privacy, Permissions & Network Disclosure

1. **100% Offline Core & Local-First Storage**: Apache ECharts and `DOMPurify` are bundled directly inside `main.js`. There are zero external CDN loads, zero telemetry, and zero analytics. Your notes stay plain-text Markdown, standard SVG, and standard JSON.
2. **Vault Enumeration & Vault Write**: Used locally on user notes solely to power `vault-chart` / `vault-kpi` live metadata aggregation (`app.vault.getMarkdownFiles()` + `metadataCache`) and user-triggered exports (`.base`, `.canvas`, `.svg` snapshots, or browser imports via `app.vault.create`).
3. **Clipboard Access**: Invoked only when you click copy buttons (`Copy MD`, `JSON`, `Copy HTML`, `Copy SVG Source`, or `Copy Prompt`) or explicitly invoke the `import-gpt-clipboard-as-note` command.
4. **Optional External AI Endpoint**: Network requests (via Obsidian's `requestUrl`) occur **only** if you manually enter your own OpenAI-compatible API Base URL & API Key in plugin settings and trigger an editor right-click visual transform command.
5. **Security Hardening**: Every SVG passes strict `DOMPurify` sanitization and `DOMParser` mounting (no `innerHTML`), and every HTML artifact executes inside `<iframe sandbox="allow-scripts" referrerpolicy="no-referrer">` without `allow-same-origin`.

---

## License

Released under the [MIT License](./LICENSE).
