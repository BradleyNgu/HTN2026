import { Platform, PermissionsAndroid } from "react-native";

import BackgroundListenerModule, {
  type BackgroundListenerOptions,
  type BackgroundListenerStatus,
  type BackgroundTrigger,
  type PendingBackgroundTrigger,
} from "../../../modules/background-listener";

export type {
  BackgroundListenerOptions,
  BackgroundListenerStatus,
  BackgroundTrigger,
  PendingBackgroundTrigger,
};

export const idleBackgroundStatus: BackgroundListenerStatus = {
  active: false,
  phase: "idle",
  startedAt: 0,
  wordsHeard: 0,
  recentText: "",
  lastError: null,
};

export const isBackgroundListeningSupported =
  Platform.OS === "android" && BackgroundListenerModule !== null;

export async function requestBackgroundListeningPermissions() {
  if (Platform.OS !== "android") return true;
  const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

export function startBackgroundListening(
  options: BackgroundListenerOptions,
): BackgroundListenerStatus {
  if (!BackgroundListenerModule) {
    throw new Error("Background listening is available only in the Android app.");
  }
  if (!options.apiUrl.trim()) {
    throw new Error("EXPO_PUBLIC_API_URL is required for background classification.");
  }
  return BackgroundListenerModule.start(options);
}

export function stopBackgroundListening() {
  return BackgroundListenerModule?.stop() ?? false;
}

export function getBackgroundListeningStatus() {
  return BackgroundListenerModule?.getStatus() ?? idleBackgroundStatus;
}

export function consumePendingBackgroundTrigger() {
  return BackgroundListenerModule?.consumePendingTrigger() ?? null;
}

export function addBackgroundStatusListener(
  listener: (status: BackgroundListenerStatus) => void,
) {
  return BackgroundListenerModule?.addListener("onStatus", listener) ?? null;
}

export function addBackgroundTriggerListener(
  listener: (trigger: BackgroundTrigger) => void,
) {
  return BackgroundListenerModule?.addListener("onTrigger", listener) ?? null;
}

export function observeBackgroundStatus(
  listener: (status: BackgroundListenerStatus) => void,
) {
  listener(getBackgroundListeningStatus());
  return addBackgroundStatusListener(listener);
}
