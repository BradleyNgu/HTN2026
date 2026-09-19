import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader, TalkBlockNav } from "@/components/TalkBlockChrome";
import { triggerConfiguredPhoneCall } from "@/features/escape/phoneCallClient";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export default function ProfileScreen() {
  const { settings } = useSettings();
  const [testCallStatus, setTestCallStatus] = useState("Test real phone call");
  const enabled = settings.situations.filter((item) => item.enabled).map((item) => item.title.toLowerCase()).join(" + ");
  const rows = [
    ["⌕", "Keyword sets", settings.keywordSets.join(", "), "/keyword-sets"],
    ["♧", "Situations", enabled || "none selected", "/situations"],
    ["♧", "Default alert", settings.defaultAlert === "girlfriend" ? "girlfriend" : settings.defaultAlert, "/default-alert"],
    ["✓", "Ready to listen", "Listening is enabled", "/listening"],
  ] as const;

  const testRealCall = async () => {
    setTestCallStatus("Requesting Twilio call…");
    try {
      await triggerConfiguredPhoneCall("mom");
      setTestCallStatus("Call requested");
    } catch {
      setTestCallStatus("Call failed — check Render");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your configuration at a glance.</Text>
        <View style={styles.list}>
          {rows.map(([icon, title, detail, path]) => (
            <Pressable key={title} onPress={() => router.push(path)} style={styles.row}>
              <Text style={styles.icon}>{icon}</Text>
              <View style={styles.copy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.detail}>{detail}</Text></View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => void testRealCall()} style={styles.alertRow}><Text style={styles.alertIcon}>♧</Text><Text style={styles.alertText}>{testCallStatus}</Text><Text style={styles.chevron}>›</Text></Pressable>
        <Pressable style={styles.row}><Text style={styles.icon}>↪</Text><Text style={styles.rowTitle}>Sign out</Text><Text style={styles.chevron}>›</Text></Pressable>
      </ScrollView>
      <TalkBlockNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "500", marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  list: { borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: spacing.md, overflow: "hidden" },
  row: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", minHeight: 60, paddingHorizontal: spacing.md },
  icon: { color: colors.primary, fontSize: 23, width: 32 },
  copy: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  detail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chevron: { color: "#B7B7BB", fontSize: 27 },
  alertRow: { alignItems: "center", backgroundColor: "#FFF5F5", borderColor: "#F2C8CB", borderRadius: 12, borderWidth: 1, flexDirection: "row", marginTop: spacing.md, minHeight: 48, paddingHorizontal: spacing.md },
  alertIcon: { color: colors.primary, fontSize: 20, width: 32 },
  alertText: { color: colors.primary, flex: 1, fontSize: 14, fontWeight: "600" },
});
