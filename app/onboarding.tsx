import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useSettings } from "@/store/SettingsContext";
import { colors, radius, spacing } from "@/theme";

const promises = [
  ["On-device first", "Speech becomes text on your phone."],
  ["No audio uploads", "Only short transcript windows reach the classifier."],
  ["You stay in control", "Listening runs only while this screen is active."],
];

export default function OnboardingScreen() {
  const { updateSettings } = useSettings();

  const finish = async () => {
    await updateSettings({ hasCompletedOnboarding: true });
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>CONVERSATION ESCAPE</Text>
        <Text style={styles.title}>A graceful exit, right when you need it.</Text>
        <Text style={styles.body}>
          Start a private listening session. If the conversation stalls, your
          chosen caller appears with a believable interruption.
        </Text>

        <View style={styles.list}>
          {promises.map(([title, copy], index) => (
            <View key={title} style={styles.row}>
              <Text style={styles.number}>{index + 1}</Text>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowBody}>{copy}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.consent}>
          Everyone nearby should know when speech recognition is active.
        </Text>
        <PrimaryButton label="I understand — continue" onPress={finish} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, paddingTop: spacing.xxl },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 46,
    marginTop: spacing.md,
  },
  body: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing.md,
  },
  list: { gap: spacing.md, marginTop: spacing.xl },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    padding: spacing.md,
  },
  number: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "800",
    width: 38,
  },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  rowBody: { color: colors.textMuted, fontSize: 14, marginTop: 3 },
  footer: { gap: spacing.md, padding: spacing.lg },
  consent: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
});
