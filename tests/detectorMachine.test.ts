import { describe, expect, it } from "vitest";

import { DetectorMachine } from "../src/features/listening/detectorMachine";

const positive = {
  boring: true,
  confidence: 0.9,
  reason: "Repetitive small talk",
} as const;

const negative = {
  boring: false,
  confidence: 0.9,
  reason: "Active exchange",
} as const;

describe("DetectorMachine", () => {
  it("triggers after one confident positive result", () => {
    const machine = new DetectorMachine("medium");
    machine.start(0);
    const first = machine.apply(1, positive, 1);
    expect(first.triggered).toBe(true);
    expect(first.snapshot.phase).toBe("triggered");
  });

  it("does not trigger on a negative result", () => {
    const machine = new DetectorMachine("medium");
    machine.start(0);
    expect(machine.apply(1, negative, 1).triggered).toBe(false);
    expect(machine.apply(1, negative, 1).snapshot.consecutivePositive).toBe(0);
  });

  it("discards stale responses", () => {
    const machine = new DetectorMachine("medium");
    machine.start(0);
    machine.apply(2, positive, 1);
    const stale = machine.apply(1, positive, 2);
    expect(stale.stale).toBe(true);
    expect(stale.triggered).toBe(false);
  });

  it("enters cooldown after a trigger", () => {
    const machine = new DetectorMachine("high", 1, 120_000);
    machine.start(0);
    machine.apply(1, positive, 1_000);
    expect(machine.start(2_000).phase).toBe("cooldown");
    expect(machine.start(122_000).phase).toBe("listening");
  });
});
