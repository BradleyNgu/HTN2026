import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader } from "@/components/TalkBlockChrome";
import { stopBackgroundListening } from "@/features/background/backgroundListener";
import { useBackgroundListenerStatus } from "@/features/background/useBackgroundListenerStatus";
import { triggerConfiguredPhoneCall } from "@/features/escape/phoneCallClient";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const { settings } = useSettings();
  const backgroundStatus = useBackgroundListenerStatus();
  const active = Platform.OS === "android" && backgroundStatus.active;
  const [callStatus, setCallStatus] = useState("Test real call");

  const testRealCall = async () => {
    setCallStatus("Requesting call...");
    try {
      await triggerConfiguredPhoneCall(settings.defaultAlert === "tornado" ? "mom" : settings.defaultAlert);
      setCallStatus("Call requested");
    } catch (error) {
      setCallStatus(error instanceof Error ? error.message : "Call failed");
      Alert.alert("Call unavailable", error instanceof Error ? error.message : "The call could not be placed.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>READY WHEN YOU ARE</Text>
        <Text style={styles.title}>What's the nonsense{"\n"}around you?</Text>
        <Text style={styles.subtitle}>Hit the STOP button and let TalkBlock get you out of whatever BS you're stuck in.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Start listening" onPress={() => router.push("/listening")} style={styles.stop}>
          <Image accessibilityLabel="TalkBlock logo" source={require("../assets/icon.png")} style={styles.stopImage} />
        </Pressable>
        {active ? <Pressable onPress={() => stopBackgroundListening()}><Text style={styles.active}>Listening live · tap to stop</Text></Pressable> : null}
        <View style={styles.quickSettings}>
          <Pressable onPress={() => router.push("/keyword-sets")} style={styles.quickRow}>
            <Text style={styles.quickTitle}>Keywords</Text>
            <Text style={styles.quickValue}>{settings.keywordSets.join(", ")}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/default-alert")} style={styles.quickRow}>
            <Text style={styles.quickTitle}>Default alert</Text>
            <Text style={styles.quickValue}>{settings.defaultAlert}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable onPress={() => void testRealCall()} style={styles.testCall}>
            <Text style={styles.testCallText}>{callStatus}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "500", lineHeight: 28, marginTop: spacing.md, textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, maxWidth: 250, textAlign: "center" },
  stop: { alignItems: "center", height: 180, justifyContent: "center", marginTop: 50, width: 180 },
  stopImage: { height: 180, width: 180 },
  active: { color: colors.primary, fontSize: 12, marginTop: spacing.lg },
  quickSettings: { alignSelf: "stretch", marginTop: spacing.lg },
  quickRow: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", marginBottom: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
  quickTitle: { color: colors.text, fontSize: 13, fontWeight: "700", width: 105 },
  quickValue: { color: colors.textMuted, flex: 1, fontSize: 12 },
  chevron: { color: colors.textMuted, fontSize: 24 },
  testCall: { alignItems: "center", backgroundColor: "#FFF5F5", borderColor: "#F2C8CB", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 48 },
  testCallText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
