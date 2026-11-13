export function interpolateFrontmatterVariables(
  source: string,
  frontmatter: Record<string, unknown> | undefined
): string {
  if (!source.includes("{{")) return source;

  return source.replace(
    /(`[^`\n]+`)|\{\{\s*(?:fm|frontmatter)\.([a-zA-Z0-9_.-]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g,
    (full, codeSpan?: string, keyPath?: string, fallbackRaw?: string) => {
      if (codeSpan || !keyPath) return full;

      const parts = keyPath.split(".");
      let cur: unknown = frontmatter;
      for (const p of parts) {
        if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          cur = undefined;
          break;
        }
      }

      if (cur === undefined || cur === null || cur === "") {
        return fallbackRaw !== undefined ? fallbackRaw.trim() : full;
      }
      return String(cur);
    }
  );
}
