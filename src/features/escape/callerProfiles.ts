import { AppSettings, CallerProfile } from "@/types";

export const starterCaller: CallerProfile = {
  id: "starter-jamie",
  name: "Jamie",
  relationship: "WhatsApp audio",
  initials: "J",
  fallbackScript: "I need to speak with you for a minute.",
  audio: null,
  createdAt: 0,
};

export function createCallerId() {
  return `caller-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getSelectedCaller(settings: AppSettings) {
  return (
    settings.callers.find(
      (caller) => caller.id === settings.selectedCallerId,
    ) ??
    settings.callers[0] ??
    null
  );
}
