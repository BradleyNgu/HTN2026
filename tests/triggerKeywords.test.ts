import { describe, expect, it } from "vitest";

import { classifyConversation } from "../server/classifier";
import {
  findTriggerKeyword,
  keywordTriggerReason,
} from "../src/shared/triggerKeywords";

const demoKeywords = [
  "AI",
  "big data",
  "blockchain",
  "web3",
  "physical intelligence",
];

describe("immediate trigger keywords", () => {
  it.each([
    ["AI", "AI"],
    ["big data", "big data"],
    ["BLOCKCHAIN", "blockchain"],
    ["web3", "web3"],
    ["web 3", null],
    ["physical intelligence", "physical intelligence"],
  ])("matches %s as %s against configured keywords", (text, expected) => {
    expect(
      findTriggerKeyword(`We should discuss ${text} today.`, demoKeywords),
    ).toBe(expected);
  });

  it("ignores keywords that are not configured", () => {
    expect(
      findTriggerKeyword("We should discuss blockchain today.", ["AI"]),
    ).toBeNull();
  });

  it("does not match AI inside another word", () => {
    expect(
      findTriggerKeyword("The chair is beside the staircase.", demoKeywords),
    ).toBeNull();
  });

  it("short-circuits the OpenAI request with configured keywords", async () => {
    await expect(
      classifyConversation(
        "This conversation suddenly mentioned blockchain.",
        ["blockchain"],
      ),
    ).resolves.toEqual({
      boring: true,
      confidence: 1,
      reason: keywordTriggerReason("blockchain"),
    });
  });

  it("does not match when no keywords are configured", () => {
    expect(
      findTriggerKeyword("This conversation suddenly mentioned blockchain.", []),
    ).toBeNull();
  });
});
