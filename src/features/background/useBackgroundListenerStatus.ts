import { useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  getBackgroundListeningStatus,
  idleBackgroundStatus,
  isBackgroundListeningSupported,
  observeBackgroundStatus,
  type BackgroundListenerStatus,
} from "./backgroundListener";

export function useBackgroundListenerStatus() {
  const [status, setStatus] = useState<BackgroundListenerStatus>(
    isBackgroundListeningSupported
      ? getBackgroundListeningStatus()
      : idleBackgroundStatus,
  );

  useEffect(() => {
    if (!isBackgroundListeningSupported) return;
    const nativeSubscription = observeBackgroundStatus(setStatus);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setStatus(getBackgroundListeningStatus());
    });
    return () => {
      nativeSubscription?.remove();
      appStateSubscription.remove();
    };
  }, []);

  return status;
}
