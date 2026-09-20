function normalizeKeywords(keywords: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const keyword of keywords) {
    const label = keyword.trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
  }
  return normalized;
}

function patternForKeyword(keyword: string): RegExp {
  const escaped = keyword
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

export function findTriggerKeyword(
  text: string,
  keywords: readonly string[] = [],
): string | null {
  for (const keyword of normalizeKeywords(keywords)) {
    if (patternForKeyword(keyword).test(text)) return keyword;
  }
  return null;
}

export function keywordTriggerReason(keyword: string) {
  return `Immediate trigger keyword detected: ${keyword}`;
}
