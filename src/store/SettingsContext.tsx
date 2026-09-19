import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { deleteManagedAudio } from "@/features/escape/audioStorage";
import { AppSettings, CallerProfile } from "@/types";
import {
  initialSettings,
  migrateSettings,
  removeCallerFromSettings,
} from "./settingsModel";

const STORAGE_KEY = "conversation-escape.settings.v1";

type SettingsContextValue = {
  settings: AppSettings;
  isHydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  saveCaller: (caller: CallerProfile) => Promise<void>;
  deleteCaller: (callerId: string) => Promise<void>;
  resetSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(initialSettings);
  const settingsRef = useRef(initialSettings);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const migrated = migrateSettings(JSON.parse(stored));
          settingsRef.current = migrated;
          setSettings(migrated);
        }
      })
      .catch(() => {
        // Defaults keep the app usable if local storage is unavailable.
      })
      .finally(() => setIsHydrated(true));
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      setSettings(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [],
  );

  const saveCaller = useCallback(async (caller: CallerProfile) => {
    const previous = settingsRef.current.callers.find(
      (item) => item.id === caller.id,
    );
    const callers = previous
      ? settingsRef.current.callers.map((item) =>
          item.id === caller.id ? caller : item,
        )
      : [...settingsRef.current.callers, caller];
    const next = {
      ...settingsRef.current,
      callers,
      selectedCallerId: caller.id,
    };

    settingsRef.current = next;
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    if (previous?.audio?.uri !== caller.audio?.uri) {
      deleteManagedAudio(previous?.audio ?? null);
    }
  }, []);

  const deleteCaller = useCallback(async (callerId: string) => {
    const caller = settingsRef.current.callers.find(
      (item) => item.id === callerId,
    );
    const next = removeCallerFromSettings(settingsRef.current, callerId);
    settingsRef.current = next;
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    deleteManagedAudio(caller?.audio ?? null);
  }, []);

  const resetSettings = useCallback(async () => {
    settingsRef.current.callers.forEach((caller) =>
      deleteManagedAudio(caller.audio),
    );
    settingsRef.current = initialSettings;
    setSettings(initialSettings);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isHydrated,
      updateSettings,
      saveCaller,
      deleteCaller,
      resetSettings,
    }),
    [
      settings,
      isHydrated,
      updateSettings,
      saveCaller,
      deleteCaller,
      resetSettings,
    ],
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
