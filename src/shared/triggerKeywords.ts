const triggerKeywords = [
  { label: "physical intelligence", pattern: /\bphysical\s+intelligence\b/i },
  { label: "big data", pattern: /\bbig\s+data\b/i },
  { label: "blockchain", pattern: /\bblockchain\b/i },
  { label: "web3", pattern: /\bweb\s*3\b/i },
  { label: "AI", pattern: /\bai\b/i },
] as const;

export function findTriggerKeyword(text: string): string | null {
  return (
    triggerKeywords.find(({ pattern }) => pattern.test(text))?.label ?? null
  );
}

export function keywordTriggerReason(keyword: string) {
  return `Immediate trigger keyword detected: ${keyword}`;
}
