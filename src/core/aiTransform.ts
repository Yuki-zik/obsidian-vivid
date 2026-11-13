export type VisualTransformTarget = "svg" | "chart" | "table" | "artifact";

export interface TransformPromptPair {
  system: string;
  user: string;
}

export function buildVisualTransformPrompt(
  target: VisualTransformTarget,
  selectedText: string
): TransformPromptPair {
  const instructionsByTarget: Record<VisualTransformTarget, string> = {
    svg: `你是一位顶级信息架构师与矢量图形设计师。请将用户提供的文本逻辑转换为一张现代极简风格的高颜值 \`\`\`svg 代码块。
要求：
1. 只输出一个完整的 \`\`\`svg ... \`\`\` 代码块，不要任何前后解释文字；
2. 必带 viewBox="0 0 880 340"（高度按内容自适应）和 xmlns="http://www.w3.org/2000/svg"；
3. 几何铁律：所有连接线采用 90° 正交圆角路径（Q 指令平滑圆角 r=4px），箭头尖端严格终止于目标边框外沿（零边框穿透，水平/垂直进入段与箭头轴线严格数学共线）；
4. 节点采用圆角矩形 rx="10"，字号清晰（标题 13.5px 加粗，说明 11.5px），留白充裕绝不重叠。`,
    chart: `你是一位数据可视化专家。请提炼用户文本中的数据或对比关系，只输出一个严格合法的 \`\`\`chart JSON 代码块（禁止注释与尾随逗号），不要任何额外解释文字。
可选 type：bar / horizontalBar / line / area / pie / radar / sankey / heatmap / treemap / gauge。
示例结构：
\`\`\`chart
{"type":"bar","title":"主标题","subtitle":"口径说明","labels":["A","B"],"datasets":[{"label":"指标1","data":[120,180]}]}
\`\`\``,
    table: `你是一位结构化分析专家。请将用户提供的文本提炼为「1 个 \`\`\`kpi 顶部核心指标 JSON 块 + 1 张增强标准 Markdown 对比表格」，不要输出多余寒暄：
- 表格状态列使用语义徽章词（如 ✅ 已完成、🚀 进行中、⚠️ 风险）；
- 占比/得分使用 0%~100% 百分比，涨跌变化带显式正负号（如 +15.2%）。`,
    artifact: `你是一位交互式前端微应用工程师。请根据用户的描述或公式逻辑，生成一个自包含的 \`\`\`artifact 单文件 HTML+CSS+JS 交互式小工具（如滑块测算器、动态演示面板或参数模拟器）。
要求：只输出一个 \`\`\`artifact ... \`\`\` 代码块，使用 CSS 变量 var(--surface)、var(--bg)、var(--text)、var(--muted)、var(--border)、var(--accent) 自动适配亮暗主题，零外部 CDN 依赖。`
  };

  return {
    system: instructionsByTarget[target],
    user: `请将以下内容转换为富视觉组件：\n\n${selectedText.trim()}`
  };
}

export function extractCleanBlockFromAiReply(
  reply: string,
  target: VisualTransformTarget
): string {
  const trimmed = reply.trim();
  if (target === "table") {
    return trimmed;
  }

  const fenceTag = target === "svg" ? "svg" : target === "chart" ? "chart" : "artifact";
  const fenceRegex = new RegExp("```(?:" + fenceTag + "|json|html|xml)?\\s*([\\s\\S]*?)```", "i");
  const match = fenceRegex.exec(trimmed);
  if (match) {
    return `\`\`\`${fenceTag}\n${match[1].trim()}\n\`\`\``;
  }

  return `\`\`\`${fenceTag}\n${trimmed}\n\`\`\``;
}
