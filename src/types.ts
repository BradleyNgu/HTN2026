export type EscapePresetId = "partner" | "boss" | "family" | "custom";

export type EscapePreset = {
  id: EscapePresetId;
  name: string;
  relationship: string;
  initials: string;
  script: string;
};

export type Sensitivity = "low" | "medium" | "high";

export type AppSettings = {
  hasCompletedOnboarding: boolean;
  selectedPresetId: EscapePresetId;
  customPreset: EscapePreset;
  sensitivity: Sensitivity;
  triggerDelaySeconds: number;
};

export type Classification = {
  boring: boolean;
  confidence: number;
  reason: string;
  suggestedPreset: EscapePresetId | null;
};

export type DetectorPhase =
  | "idle"
  | "listening"
  | "evaluating"
  | "suspected"
  | "triggered"
  | "cooldown";
