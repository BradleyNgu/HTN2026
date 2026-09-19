import { EscapePreset } from "@/types";

export const defaultPresets: EscapePreset[] = [
  {
    id: "partner",
    name: "Alex",
    relationship: "Partner",
    initials: "A",
    script: "Hey, I need you to come outside for a second. It is important.",
  },
  {
    id: "boss",
    name: "Morgan",
    relationship: "Boss",
    initials: "M",
    script: "Sorry to call unexpectedly. Can you jump on something urgent?",
  },
  {
    id: "family",
    name: "Mom",
    relationship: "Family",
    initials: "M",
    script: "Can you call me back right now? I need your help with something.",
  },
];

export const defaultCustomPreset: EscapePreset = {
  id: "custom",
  name: "Jamie",
  relationship: "Important call",
  initials: "J",
  script: "I need to speak with you for a minute.",
};

export function getPreset(
  id: EscapePreset["id"],
  customPreset: EscapePreset,
): EscapePreset {
  return (
    defaultPresets.find((preset) => preset.id === id) ?? customPreset
  );
}
