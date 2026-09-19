import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { defaultCustomPreset } from "@/features/escape/presets";
import { AppSettings } from "@/types";

const STORAGE_KEY = "conversation-escape.settings.v1";

const initialSettings: AppSettings = {
  hasCompletedOnboarding: false,
  selectedPresetId: "partner",
  customPreset: defaultCustomPreset,
  sensitivity: "medium",
  triggerDelaySeconds: 2,
};

type SettingsContextValue = {
  settings: AppSettings;
  isHydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(initialSettings);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setSettings({ ...initialSettings, ...JSON.parse(stored) });
        }
      })
      .catch(() => {
        // Defaults keep the app usable if local storage is unavailable.
      })
      .finally(() => setIsHydrated(true));
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [settings],
  );

  const resetSettings = useCallback(async () => {
    setSettings(initialSettings);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ settings, isHydrated, updateSettings, resetSettings }),
    [settings, isHydrated, updateSettings, resetSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}
