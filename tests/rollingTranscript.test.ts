import { describe, expect, it } from "vitest";

import { RollingTranscriptBuffer } from "../src/features/listening/rollingTranscript";

const words = (start: number, count: number) =>
  Array.from({ length: count }, (_, index) => `word${start + index}`).join(
    " ",
  );

describe("RollingTranscriptBuffer", () => {
  it("waits for a full 10-word window", () => {
    const buffer = new RollingTranscriptBuffer();
    expect(buffer.add(words(0, 9))).toBeNull();
    expect(buffer.add("word9")).toMatchObject({
      id: 1,
      wordCount: 10,
    });
  });

  it("evaluates every 10 new words", () => {
    const buffer = new RollingTranscriptBuffer();
    const first = buffer.add(words(0, 10));
    expect(first?.text.startsWith("word0 ")).toBe(true);
    expect(buffer.add(words(10, 9))).toBeNull();
    const second = buffer.add("word19");
    expect(second?.id).toBe(2);
    expect(second?.text.startsWith("word10 ")).toBe(true);
    expect(second?.text.endsWith(" word19")).toBe(true);
  });

  it("clears all in-memory conversation text", () => {
    const buffer = new RollingTranscriptBuffer();
    buffer.add(words(0, 10));
    buffer.clear();
    expect(buffer.getRecentText()).toBe("");
    expect(buffer.add(words(100, 5))).toBeNull();
  });
});
