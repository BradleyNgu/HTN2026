import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader, TalkBlockNav } from "@/components/TalkBlockChrome";
import { stopBackgroundListening } from "@/features/background/backgroundListener";
import { useBackgroundListenerStatus } from "@/features/background/useBackgroundListenerStatus";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const { settings, isHydrated } = useSettings();
  const backgroundStatus = useBackgroundListenerStatus();
  const active = Platform.OS === "android" && backgroundStatus.active;

  useEffect(() => {
    if (isHydrated && !settings.hasCompletedOnboarding) router.replace("/onboarding");
  }, [isHydrated, settings.hasCompletedOnboarding]);

  if (!isHydrated || !settings.hasCompletedOnboarding) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>READY WHEN YOU ARE</Text>
        <Text style={styles.title}>What's the nonsense{"\n"}around you?</Text>
        <Text style={styles.subtitle}>Hit the STOP button and let TalkBlock get you out of whatever BS you're stuck in.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Start listening" onPress={() => router.push("/listening")} style={styles.stop}>
          <Text style={styles.stopText}>STOP</Text>
        </Pressable>
        {active ? <Pressable onPress={() => stopBackgroundListening()}><Text style={styles.active}>Listening live · tap to stop</Text></Pressable> : null}
      </View>
      <TalkBlockNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  loading: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" },
  content: { alignItems: "center", flex: 1, paddingHorizontal: spacing.lg, paddingTop: 74 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 22, fontWeight: "500", lineHeight: 28, marginTop: spacing.md, textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, maxWidth: 250, textAlign: "center" },
  stop: { alignItems: "center", backgroundColor: colors.primary, height: 88, justifyContent: "center", marginTop: 70, transform: [{ rotate: "0deg" }], width: 88 },
  stopText: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  active: { color: colors.primary, fontSize: 12, marginTop: spacing.lg },
});
