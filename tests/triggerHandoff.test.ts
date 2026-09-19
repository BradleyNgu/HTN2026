import { describe, expect, it } from "vitest";

import {
  getTriggerCaller,
  normalizeTriggerRouteParams,
} from "../src/features/background/triggerHandoff";
import type { AppSettings } from "../src/types";

const settings: AppSettings = {
  schemaVersion: 2,
  hasCompletedOnboarding: true,
  sensitivity: "medium",
  triggerDelaySeconds: 0,
  selectedCallerId: "caller-1",
  keywordSets: ["ai", "big data", "jargon"],
  situations: [],
  defaultAlert: "mom",
  callers: [
    {
      id: "caller-1",
      name: "Jamie",
      relationship: "Friend",
      initials: "J",
      fallbackScript: "Hello",
      audio: null,
      createdAt: 1,
    },
    {
      id: "caller-2",
      name: "Morgan",
      relationship: "Boss",
      initials: "M",
      fallbackScript: "Call me back",
      audio: null,
      createdAt: 2,
    },
  ],
};

describe("background trigger handoff", () => {
  it("normalizes Expo deep-link arrays to scalar parameters", () => {
    expect(
      normalizeTriggerRouteParams({
        callerId: ["caller-2"],
        reason: ["Conversation slowed"],
      }),
    ).toEqual({
      callerId: "caller-2",
      reason: "Conversation slowed",
    });
  });

  it("uses the caller encoded in the notification deep link", () => {
    expect(getTriggerCaller(settings, "caller-2")?.name).toBe("Morgan");
    expect(getTriggerCaller(settings, "missing")?.name).toBe("Jamie");
  });
});
