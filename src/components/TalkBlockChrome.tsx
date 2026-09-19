import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

export function TalkBlockHeader({ title }: { title?: string }) {
  return (
    <View style={styles.header}>
      {title ? (
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.brand, title && styles.headerTitle]}>{title ?? "TalkBlock"}</Text>
      {!title ? (
        <Pressable accessibilityLabel="Open settings" onPress={() => router.push("/profile")} style={styles.settings}>
          <Text style={styles.settingsText}>☷</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TalkBlockNav() {
  const pathname = usePathname();
  const profileActive = pathname.startsWith("/profile") || pathname.startsWith("/keyword") || pathname.startsWith("/situations") || pathname.startsWith("/default-alert");
  return (
    <View style={styles.nav}>
      <Pressable onPress={() => router.replace("/")} style={styles.navItem}>
        <Text style={[styles.navIcon, !profileActive && styles.active]}>⌂</Text>
        <Text style={[styles.navLabel, !profileActive && styles.active]}>Home</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/profile")} style={styles.navItem}>
        <Text style={[styles.navIcon, profileActive && styles.active]}>♙</Text>
        <Text style={[styles.navLabel, profileActive && styles.active]}>Profile</Text>
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
  settings: { alignItems: "center", backgroundColor: colors.surfaceRaised, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  settingsText: { color: colors.textMuted, fontSize: 22, transform: [{ rotate: "90deg" }] },
  nav: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingBottom: 8, paddingTop: 8 },
  navItem: { alignItems: "center", minWidth: 80 },
  navIcon: { color: colors.textMuted, fontSize: 22, lineHeight: 24 },
  navLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  active: { color: colors.primary },
});
