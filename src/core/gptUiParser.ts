export interface TimelineItem {
  time?: string;
  title: string;
  detail?: string;
  status: "done" | "active" | "upcoming";
  tag?: string;
}

export interface ComparisonColumn {
  name: string;
  badge?: string;
  summary?: string;
  pros: string[];
  cons: string[];
  verdict?: string;
}

export interface QuizOption {
  label: string;
  correct: boolean;
  explanation?: string;
}

export type GptUiBlock =
  | { kind: "timeline"; title?: string; items: TimelineItem[] }
  | { kind: "comparison"; title?: string; columns: ComparisonColumn[] }
  | { kind: "quiz"; title?: string; question: string; hint?: string; options: QuizOption[] };

export type ParsedGptUiResult =
  | { status: "streaming" }
  | { status: "error"; message: string }
  | { status: "ready"; block: GptUiBlock };

function isIncompleteJson(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  const last = t[t.length - 1];
  return last !== "}" && last !== "]";
}

function asText(val: unknown, fallback: string): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") {
    return String(val);
  }
  return fallback;
}

export function parseGptUiSpec(
  rawSource: string,
  hintLang: "timeline" | "comparison" | "quiz" | "gpt-ui" | "chatgpt-ui"
): ParsedGptUiResult {
  const cleaned = rawSource.trim();
  if (!cleaned) return { status: "streaming" };

  let parsed: Record<string, unknown>;
  try {
    const val: unknown = JSON.parse(cleaned);
    parsed = Array.isArray(val) ? { items: val } : (val as Record<string, unknown>);
  } catch (err) {
    if (isIncompleteJson(cleaned)) return { status: "streaming" };
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Invalid JSON in GPT UI block"
    };
  }

  const explicitKind = typeof parsed.kind === "string"
    ? parsed.kind.toLowerCase()
    : typeof parsed.type === "string"
      ? parsed.type.toLowerCase()
      : hintLang;

  const title = typeof parsed.title === "string" ? parsed.title : undefined;

  // 1. Timeline / Steps
  if (
    explicitKind === "timeline" ||
    explicitKind === "steps" ||
    (Array.isArray(parsed.items) && hintLang === "timeline")
  ) {
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    if (rawItems.length === 0) {
      return { status: "error", message: "Timeline requires a non-empty items array" };
    }
    const items: TimelineItem[] = rawItems.map((it) => {
      const r = (it ?? {}) as Record<string, unknown>;
      const st = typeof r.status === "string" ? r.status.toLowerCase() : "done";
      const status: "done" | "active" | "upcoming" =
        st === "active" || st === "current" || st === "in_progress"
          ? "active"
          : st === "upcoming" || st === "pending" || st === "todo"
            ? "upcoming"
            : "done";
      return {
        time: typeof r.time === "string" ? r.time : typeof r.phase === "string" ? r.phase : undefined,
        title: asText(r.title ?? r.label, "Step"),
        detail: typeof r.detail === "string" ? r.detail : typeof r.description === "string" ? r.description : undefined,
        status,
        tag: typeof r.tag === "string" ? r.tag : undefined
      };
    });
    return { status: "ready", block: { kind: "timeline", title, items } };
  }

  // 2. Comparison / Pros & Cons PK
  if (
    explicitKind === "comparison" ||
    explicitKind === "pros-cons" ||
    Array.isArray(parsed.columns)
  ) {
    const rawCols = Array.isArray(parsed.columns) ? parsed.columns : [];
    if (rawCols.length === 0) {
      return { status: "error", message: "Comparison card requires non-empty columns array" };
    }
    const columns: ComparisonColumn[] = rawCols.map((col) => {
      const r = (col ?? {}) as Record<string, unknown>;
      return {
        name: asText(r.name ?? r.title, "Option"),
        badge: typeof r.badge === "string" ? r.badge : undefined,
        summary: typeof r.summary === "string" ? r.summary : undefined,
        pros: Array.isArray(r.pros) ? r.pros.map(String) : [],
        cons: Array.isArray(r.cons) ? r.cons.map(String) : [],
        verdict: typeof r.verdict === "string" ? r.verdict : undefined
      };
    });
    return { status: "ready", block: { kind: "comparison", title, columns } };
  }

  // 3. Quiz / Study Card / chatgpt-ui ask_user_input
  if (
    explicitKind === "quiz" ||
    explicitKind === "ask_user_input" ||
    typeof parsed.question === "string"
  ) {
    const question = asText(parsed.question ?? parsed.prompt, "Interactive Check");
    const rawOpts = Array.isArray(parsed.options) ? parsed.options : Array.isArray(parsed.choices) ? parsed.choices : [];
    if (rawOpts.length === 0) {
      return { status: "error", message: "Quiz block requires non-empty options array" };
    }
    const options: QuizOption[] = rawOpts.map((o, idx) => {
      if (typeof o === "string") {
        return { label: o, correct: idx === 0 };
      }
      const r = (o ?? {}) as Record<string, unknown>;
      return {
        label: asText(r.label ?? r.text, `Option ${idx + 1}`),
        correct: Boolean(r.correct ?? r.isCorrect ?? false),
        explanation: typeof r.explanation === "string" ? r.explanation : typeof r.rationale === "string" ? r.rationale : undefined
      };
    });
    return {
      status: "ready",
      block: {
        kind: "quiz",
        title,
        question,
        hint: typeof parsed.hint === "string" ? parsed.hint : undefined,
        options
      }
    };
  }

  return {
    status: "error",
    message: "Unsupported gpt-ui block kind. Expected timeline, comparison, or quiz."
  };
}
