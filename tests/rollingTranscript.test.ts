import { describe, expect, it } from "vitest";

import { RollingTranscriptBuffer } from "../src/features/listening/rollingTranscript";

const words = (start: number, count: number) =>
  Array.from({ length: count }, (_, index) => `word${start + index}`).join(
    " ",
  );

describe("RollingTranscriptBuffer", () => {
  it("waits for a full window", () => {
    const buffer = new RollingTranscriptBuffer();
    expect(buffer.add(words(0, 49))).toBeNull();
    expect(buffer.add("word49")).toMatchObject({
      id: 1,
      wordCount: 50,
    });
  });

  it("evaluates every 20 new words with overlap", () => {
    const buffer = new RollingTranscriptBuffer();
    const first = buffer.add(words(0, 50));
    expect(first?.text.startsWith("word0 ")).toBe(true);
    expect(buffer.add(words(50, 19))).toBeNull();
    const second = buffer.add("word69");
    expect(second?.id).toBe(2);
    expect(second?.text.startsWith("word20 ")).toBe(true);
    expect(second?.text.endsWith(" word69")).toBe(true);
  });

  it("clears all in-memory conversation text", () => {
    const buffer = new RollingTranscriptBuffer();
    buffer.add(words(0, 50));
    buffer.clear();
    expect(buffer.getRecentText()).toBe("");
    expect(buffer.add(words(100, 20))).toBeNull();
  });
});
