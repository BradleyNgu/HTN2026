import { describe, expect, it } from "vitest";

import { DetectorMachine } from "../src/features/listening/detectorMachine";

const positive = {
  boring: true,
  confidence: 0.9,
  reason: "Repetitive small talk",
  suggestedPreset: null,
} as const;

const negative = {
  boring: false,
  confidence: 0.9,
  reason: "Active exchange",
  suggestedPreset: null,
} as const;

describe("DetectorMachine", () => {
  it("requires two consecutive positive results", () => {
    const machine = new DetectorMachine("medium");
    machine.start(0);
    expect(machine.apply(1, positive, 1).snapshot.phase).toBe("suspected");
    const second = machine.apply(2, positive, 2);
    expect(second.triggered).toBe(true);
    expect(second.snapshot.phase).toBe("triggered");
  });

  it("resets its evidence after a negative result", () => {
    const machine = new DetectorMachine("medium");
    machine.start(0);
    machine.apply(1, positive, 1);
    expect(machine.apply(2, negative, 2).snapshot.consecutivePositive).toBe(0);
    expect(machine.apply(3, positive, 3).triggered).toBe(false);
  });

  it("discards stale responses", () => {
    const machine = new DetectorMachine("medium");
    machine.start(0);
    machine.apply(2, positive, 1);
    const stale = machine.apply(1, positive, 2);
    expect(stale.stale).toBe(true);
    expect(stale.snapshot.consecutivePositive).toBe(1);
  });

  it("enters cooldown after a trigger", () => {
    const machine = new DetectorMachine("high", 1, 120_000);
    machine.start(0);
    machine.apply(1, positive, 1_000);
    expect(machine.start(2_000).phase).toBe("cooldown");
    expect(machine.start(122_000).phase).toBe("listening");
  });
});
