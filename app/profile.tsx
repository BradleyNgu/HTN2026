import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
    ["⌕", "Keyword ", settings.keywordSets.join(", "), "/keyword-sets"],
    ["♧", "Situations", enabled || "none selected", "/situations"],
    ["♧", "Default alert", settings.defaultAlert === "girlfriend" ? "girlfriend" : settings.defaultAlert, "/default-alert"],
    ["✓", "Ready to listen", "Listening is enabled", "/listening"],
  ] as const;

  const testRealCall = async () => {
    setTestCallStatus("Requesting Twilio call…");
    try {
      await triggerConfiguredPhoneCall("mom");
      setTestCallStatus("Call requested");
    } catch (error) {
      setTestCallStatus(
        error instanceof Error ? error.message : "Call failed — check Render",
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader />
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Your configurations at a glance.</Text>
        <View style={styles.list}>
          {rows.map(([icon, title, detail, path]) => (
            <Pressable key={title} onPress={() => router.push(path)} style={styles.row}>
              {title === "Keyword " ? (
                <Image
                  accessibilityLabel="Keyword search"
                  source={require("../assets/search-interface-symbol (2).png")}
                  style={styles.iconImage}
                />
              ) : title === "Situations" ? (
                <Image
                  accessibilityLabel="Situations"
                  source={require("../assets/question (2).png")}
                  style={styles.iconImage}
                />
              ) : title === "Default alert" ? (
                <Image
                  accessibilityLabel="Default alert"
                  source={require("../assets/phone-call (2).png")}
                  style={styles.iconImage}
                />
              ) : title === "Ready to listen" ? (
                <Image
                  accessibilityLabel="Ready to listen"
                  source={require("../assets/deaf (2).png")}
                  style={styles.iconImage}
                />
              ) : <Text style={styles.icon}>{icon}</Text>}
              <View style={styles.copy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.detail}>{detail}</Text></View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => void testRealCall()} style={styles.alertRow}><Text style={styles.alertText}>{testCallStatus}</Text></Pressable>
      </View>
      <TalkBlockNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { flex: 1, padding: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: "500", marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  list: { borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: spacing.md, overflow: "hidden" },
  row: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", minHeight: 60, paddingHorizontal: spacing.md },
  icon: { color: colors.primary, fontSize: 23, width: 32 },
  iconImage: { height: 22, resizeMode: "contain", tintColor: colors.primary, width: 32 },
  copy: { flex: 1, marginLeft: spacing.sm },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  detail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chevron: { color: "#B7B7BB", fontSize: 27 },
  alertRow: { alignItems: "center", backgroundColor: "#FFF5F5", borderColor: "#F2C8CB", borderRadius: 12, borderWidth: 1, flexDirection: "row", justifyContent: "center", marginTop: "auto", minHeight: 48, paddingHorizontal: spacing.md },
  alertText: { color: colors.primary, fontSize: 14, fontWeight: "600", textAlign: "center" },
});
