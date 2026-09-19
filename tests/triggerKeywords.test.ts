import { describe, expect, it } from "vitest";

import { classifyConversation } from "../server/classifier";
import {
  findTriggerKeyword,
  keywordTriggerReason,
} from "../src/shared/triggerKeywords";

describe("immediate trigger keywords", () => {
  it.each([
    ["AI", "AI"],
    ["big data", "big data"],
    ["BLOCKCHAIN", "blockchain"],
    ["web3", "web3"],
    ["web 3", "web3"],
    ["physical intelligence", "physical intelligence"],
  ])("matches %s as %s", (text, expected) => {
    expect(findTriggerKeyword(`We should discuss ${text} today.`)).toBe(
      expected,
    );
  });

  it("does not match AI inside another word", () => {
    expect(findTriggerKeyword("The chair is beside the staircase.")).toBeNull();
  });

  it("short-circuits the OpenAI request with full confidence", async () => {
    await expect(
      classifyConversation("This conversation suddenly mentioned blockchain."),
    ).resolves.toEqual({
      boring: true,
      confidence: 1,
      reason: keywordTriggerReason("blockchain"),
    });
  });
});
