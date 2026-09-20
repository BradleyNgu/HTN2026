import { router, usePathname } from "expo-router";
import React from "react";
import { Alert, Appearance, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { triggerConfiguredPhoneCall } from "@/features/escape/phoneCallClient";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export function TalkBlockHeader({ title }: { title?: string }) {
  const { settings, updateSettings } = useSettings();

  const toggleTheme = () => {
    const value = !settings.darkMode;
    void updateSettings({ darkMode: value });
    if (Platform.OS !== "web") {
      const setColorScheme = (Appearance as typeof Appearance & {
        setColorScheme?: (scheme: "light" | "dark") => void;
      }).setColorScheme;
      setColorScheme?.(value ? "dark" : "light");
    }
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem("conversation-escape.dark-mode", String(value));
      window.location.reload();
    }
  };

  return (
    <View style={styles.header}>
      {title ? (
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.brand, title && styles.headerTitle]}>{title ?? "TalkBlock"}</Text>
      {title ? <View style={styles.back} /> : null}
      {!title ? (
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel={settings.darkMode ? "Switch to light mode" : "Switch to dark mode"} onPress={toggleTheme} style={styles.themeButton}>
            <Image
              accessibilityLabel={settings.darkMode ? "Sun" : "Moon"}
              source={settings.darkMode ? require("../../assets/sun.png") : require("../../assets/moon.png")}
              style={styles.themeImage}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Call now"
            onPress={() => {
              if (settings.defaultAlert === "tornado") {
                Alert.alert(
                  "Call unavailable",
                  "Tornado alerts do not place a phone call. Choose Mom, Boss, or Girlfriend first.",
                );
                return;
              }
              void triggerConfiguredPhoneCall(settings.defaultAlert).catch(
                (error) => {
                  Alert.alert(
                    "Call unavailable",
                    error instanceof Error
                      ? error.message
                      : "The failsafe call could not be placed.",
                  );
                },
              );
            }}
            style={styles.helpButton}
          >
            <Image
              accessibilityLabel="Call now"
              source={settings.darkMode
                ? require("../../assets/information-dark-mode.png")
                : require("../../assets/information-light-mode.png")}
              style={styles.helpImage}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function TalkBlockNav() {
  const { settings } = useSettings();
  const pathname = usePathname();
  const profileActive = pathname.startsWith("/profile") || pathname.startsWith("/keyword") || pathname.startsWith("/situations") || pathname.startsWith("/default-alert");
  return (
    <View style={styles.nav}>
      <Pressable onPress={() => router.replace("/")} style={styles.navItem}>
        <Image
          accessibilityLabel="Home"
          source={settings.darkMode
            ? require("../../assets/home-dark-mode.png")
            : require("../../assets/home-light-mode.png")}
          style={[styles.navImage, !profileActive && styles.navImageActive]}
        />
        <Text style={[styles.navLabel, !profileActive && styles.active]}>Home</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/profile")} style={styles.navItem}>
        <Image
          accessibilityLabel="Settings"
          source={settings.darkMode
            ? require("../../assets/setting-dark-mode.png")
            : require("../../assets/setting-light-mode.png")}
          style={[styles.navImage, profileActive && styles.navImageActive]}
        />
        <Text style={[styles.navLabel, profileActive && styles.active]}>Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", minHeight: 56, paddingHorizontal: spacing.md },
  brand: { color: colors.text, flex: 1, fontSize: 20, fontWeight: "700" },
  headerTitle: { flex: 1, fontSize: 18, textAlign: "center" },
  back: { width: 40 },
  backText: { color: colors.primary, fontSize: 34, lineHeight: 34 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  themeButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  themeImage: { height: 27, width: 27 },
  helpButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  helpImage: { height: 36, width: 36 },
  nav: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingBottom: 8, paddingTop: 8 },
  navItem: { alignItems: "center", minWidth: 80 },
  navIcon: { color: colors.textMuted, fontSize: 22, lineHeight: 24 },
  navImage: { height: 22, opacity: 0.55, width: 22 },
  navImageActive: { opacity: 1 },
  navLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  active: { color: colors.primary },
});
