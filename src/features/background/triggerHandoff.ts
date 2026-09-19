import { getSelectedCaller } from "@/features/escape/callerProfiles";
import type { AppSettings } from "@/types";

type RouteValue = string | string[] | undefined;

function first(value: RouteValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeTriggerRouteParams(params: {
  callerId?: RouteValue;
  reason?: RouteValue;
}) {
  return {
    callerId: first(params.callerId),
    reason: first(params.reason),
  };
}

export function getTriggerCaller(
  settings: AppSettings,
  callerId: string | undefined,
) {
  return (
    settings.callers.find((candidate) => candidate.id === callerId) ??
    getSelectedCaller(settings)
  );
}
