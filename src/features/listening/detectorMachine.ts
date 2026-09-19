import {
  Classification,
  DetectorPhase,
  Sensitivity,
} from "@/types";

const thresholds: Record<Sensitivity, number> = {
  low: 0.85,
  medium: 0.75,
  high: 0.65,
};

export type DetectorSnapshot = {
  phase: DetectorPhase;
  consecutivePositive: number;
  lastReason: string | null;
  cooldownUntil: number;
};

export class DetectorMachine {
  private state: DetectorSnapshot = {
    phase: "idle",
    consecutivePositive: 0,
    lastReason: null,
    cooldownUntil: 0,
  };
  private latestAppliedWindowId = 0;

  constructor(
    private readonly sensitivity: Sensitivity,
    private readonly requiredPositiveResults = 2,
    private readonly cooldownMs = 120_000,
  ) {}

  start(now = Date.now()) {
    this.state = {
      phase: now < this.state.cooldownUntil ? "cooldown" : "listening",
      consecutivePositive: 0,
      lastReason: null,
      cooldownUntil: this.state.cooldownUntil,
    };
    this.latestAppliedWindowId = 0;
    return this.snapshot();
  }

  evaluating() {
    if (this.state.phase === "listening") {
      this.state.phase = "evaluating";
    }
    return this.snapshot();
  }

  apply(
    windowId: number,
    result: Classification,
    now = Date.now(),
  ): { snapshot: DetectorSnapshot; triggered: boolean; stale: boolean } {
    if (windowId <= this.latestAppliedWindowId) {
      return { snapshot: this.snapshot(), triggered: false, stale: true };
    }
    this.latestAppliedWindowId = windowId;

    if (now < this.state.cooldownUntil) {
      this.state.phase = "cooldown";
      return { snapshot: this.snapshot(), triggered: false, stale: false };
    }

    const positive =
      result.boring && result.confidence >= thresholds[this.sensitivity];
    this.state.lastReason = result.reason;
    this.state.consecutivePositive = positive
      ? this.state.consecutivePositive + 1
      : 0;

    if (this.state.consecutivePositive >= this.requiredPositiveResults) {
      this.state.phase = "triggered";
      this.state.cooldownUntil = now + this.cooldownMs;
      return { snapshot: this.snapshot(), triggered: true, stale: false };
    }

    this.state.phase = positive ? "suspected" : "listening";
    return { snapshot: this.snapshot(), triggered: false, stale: false };
  }

  fail() {
    if (
      this.state.phase !== "triggered" &&
      this.state.phase !== "cooldown"
    ) {
      this.state.phase = "listening";
    }
    return this.snapshot();
  }

  triggerManually(now = Date.now()) {
    this.state.phase = "triggered";
    this.state.cooldownUntil = now + this.cooldownMs;
    return this.snapshot();
  }

  stop() {
    this.state.phase = "idle";
    this.state.consecutivePositive = 0;
    return this.snapshot();
  }

  snapshot(): DetectorSnapshot {
    return { ...this.state };
  }
}
