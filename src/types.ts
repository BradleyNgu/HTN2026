export type ManagedAudio = {
  uri: string;
  fileName: string;
  size?: number;
};

export type CallerProfile = {
  id: string;
  name: string;
  relationship: string;
  initials: string;
  fallbackScript: string;
  audio: ManagedAudio | null;
  createdAt: number;
};

export type Sensitivity = "low" | "medium" | "high";

export type AppSettings = {
  schemaVersion: 2;
  hasCompletedOnboarding: boolean;
  callers: CallerProfile[];
  selectedCallerId: string;
  sensitivity: Sensitivity;
  triggerDelaySeconds: number;
};

export type Classification = {
  boring: boolean;
  confidence: number;
  reason: string;
};

export type DetectorPhase =
  | "idle"
  | "listening"
  | "evaluating"
  | "suspected"
  | "triggered"
  | "cooldown";
