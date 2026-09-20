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

export type AlertType = "mom" | "girlfriend" | "boss" | "tornado";

export type AppSettings = {
  schemaVersion: 2;
  hasCompletedOnboarding: boolean;
  /** E.164 number that receives escape calls (e.g. +14155552671). */
  userPhoneNumber: string;
  callers: CallerProfile[];
  selectedCallerId: string;
  sensitivity: Sensitivity;
  triggerDelaySeconds: number;
  keywordSets: string[];
  defaultAlert: AlertType;
  darkMode: boolean;
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
