import { starterCaller } from "@/features/escape/callerProfiles";
import { AppSettings, CallerProfile, Sensitivity, SituationType } from "@/types";

export const defaultSituations: SituationType[] = [
  { id: "mom", title: "Mom", description: "You are stuck in a long family conversation.", enabled: true },
  { id: "student", title: "Student", description: "You are stuck explaining something one-on-one.", enabled: false },
  { id: "boss", title: "Boss", description: "Your boss asks you to stay longer.", enabled: true },
  { id: "tornado", title: "Tornado", description: "Severe weather is moving into the area.", enabled: false },
];

export const initialSettings: AppSettings = {
  schemaVersion: 2,
  hasCompletedOnboarding: false,
  userPhoneNumber: "",
  callers: [starterCaller],
  selectedCallerId: starterCaller.id,
  sensitivity: "medium",
  triggerDelaySeconds: 2,
  keywordSets: ["ai", "big data", "jargon"],
  situations: defaultSituations,
  defaultAlert: "mom",
  darkMode: false,
};

type LegacyPreset = {
  id?: string;
  name?: string;
  relationship?: string;
  initials?: string;
  script?: string;
};

type LegacySettings = {
  hasCompletedOnboarding?: boolean;
  selectedPresetId?: string;
  customPreset?: LegacyPreset;
  sensitivity?: Sensitivity;
  triggerDelaySeconds?: number;
};

const legacyPresets: Record<string, LegacyPreset> = {
  partner: {
    name: "Alex",
    relationship: "Partner",
    script: "Hey, I need you to come outside for a second. It is important.",
  },
  boss: {
    name: "Morgan",
    relationship: "Boss",
    script: "Sorry to call unexpectedly. Can you jump on something urgent?",
  },
  family: {
    name: "Mom",
    relationship: "Family",
    script: "Can you call me back right now? I need your help with something.",
  },
};

function isCaller(value: unknown): value is CallerProfile {
  if (!value || typeof value !== "object") return false;
  const caller = value as CallerProfile;
  return (
    typeof caller.id === "string" &&
    typeof caller.name === "string" &&
    typeof caller.relationship === "string" &&
    typeof caller.initials === "string" &&
    typeof caller.fallbackScript === "string" &&
    typeof caller.createdAt === "number" &&
    (caller.audio === null ||
      (typeof caller.audio === "object" &&
        typeof caller.audio.uri === "string" &&
        typeof caller.audio.fileName === "string"))
  );
}

function fromLegacy(input: LegacySettings): AppSettings {
  const preset =
    input.selectedPresetId === "custom"
      ? input.customPreset
      : legacyPresets[input.selectedPresetId ?? "partner"];
  const name = preset?.name?.trim() || starterCaller.name;
  const caller: CallerProfile = {
    id: "migrated-caller",
    name,
    relationship:
      preset?.relationship?.trim() || starterCaller.relationship,
    initials:
      preset?.initials?.trim() || name.charAt(0).toUpperCase() || "?",
    fallbackScript:
      preset?.script?.trim() || starterCaller.fallbackScript,
    audio: null,
    createdAt: 0,
  };

  return {
    schemaVersion: 2,
    hasCompletedOnboarding: Boolean(input.hasCompletedOnboarding),
    userPhoneNumber: "",
    callers: [caller],
    selectedCallerId: caller.id,
    sensitivity: input.sensitivity ?? "medium",
    triggerDelaySeconds: input.triggerDelaySeconds ?? 2,
    keywordSets: initialSettings.keywordSets,
    situations: initialSettings.situations,
    defaultAlert: initialSettings.defaultAlert,
    darkMode: false,
  };
}

export function migrateSettings(input: unknown): AppSettings {
  if (!input || typeof input !== "object") return initialSettings;
  const candidate = input as Partial<AppSettings>;

  if (candidate.schemaVersion !== 2) {
    return fromLegacy(input as LegacySettings);
  }

  const callers = Array.isArray(candidate.callers)
    ? candidate.callers.filter(isCaller)
    : [];
  const safeCallers = callers.length > 0 ? callers : [starterCaller];
  const selectedCallerId = safeCallers.some(
    (caller) => caller.id === candidate.selectedCallerId,
  )
    ? candidate.selectedCallerId!
    : safeCallers[0].id;

  const userPhoneNumber =
    typeof candidate.userPhoneNumber === "string"
      ? candidate.userPhoneNumber.trim()
      : "";

  return {
    schemaVersion: 2,
    hasCompletedOnboarding: Boolean(candidate.hasCompletedOnboarding),
    userPhoneNumber,
    callers: safeCallers,
    selectedCallerId,
    sensitivity: candidate.sensitivity ?? "medium",
    triggerDelaySeconds: candidate.triggerDelaySeconds ?? 2,
    keywordSets: Array.isArray(candidate.keywordSets)
      ? candidate.keywordSets.filter((keyword): keyword is string => typeof keyword === "string")
      : initialSettings.keywordSets,
    situations: defaultSituations.map((defaultSituation) => {
      const savedSituation = Array.isArray(candidate.situations)
        ? candidate.situations.find((situation) => situation?.id === defaultSituation.id)
        : undefined;
      return {
        ...defaultSituation,
        enabled: savedSituation ? Boolean(savedSituation.enabled) : defaultSituation.enabled,
      };
    }),
    defaultAlert: candidate.defaultAlert ?? initialSettings.defaultAlert,
    darkMode: Boolean(candidate.darkMode),
  };
}

export function removeCallerFromSettings(
  settings: AppSettings,
  callerId: string,
): AppSettings {
  const callers = settings.callers.filter((caller) => caller.id !== callerId);
  const safeCallers = callers.length > 0 ? callers : [starterCaller];

  return {
    ...settings,
    callers: safeCallers,
    selectedCallerId:
      settings.selectedCallerId === callerId
        ? safeCallers[0].id
        : settings.selectedCallerId,
  };
}
