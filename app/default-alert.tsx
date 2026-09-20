import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader } from "@/components/TalkBlockChrome";
import { useSettings } from "@/store/SettingsContext";
import { AlertType } from "@/types";
import { colors, spacing } from "@/theme";

const alerts: [AlertType, string][] = [
  ["mom", "Mom"],
  ["girlfriend", "Girlfriend"],
  ["boss", "Boss"],
  ["tornado", "Tornado"],
];
const alertImages = {
  mom: require("../assets/parent-and-child.png"),
  girlfriend: require("../assets/heart.png"),
  boss: require("../assets/boss.png"),
  tornado: require("../assets/hurricane.png"),
};

export default function DefaultAlertScreen() {
  const { settings, updateSettings } = useSettings();
  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader title="Default alert" />
      <View style={styles.content}>
        <Text style={styles.intro}>
          This is the &quot;alert&quot; TalkBlock will place after the Skip Ad
          chip finishes when nonsense is recognized.
        </Text>
        <Text style={styles.eyebrow}>CHOOSE DEFAULT ALERT</Text>
        {alerts.map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => void updateSettings({ defaultAlert: id })}
            style={[styles.row, settings.defaultAlert === id && styles.selected]}
          >
            <View
              style={[
                styles.radio,
                settings.defaultAlert === id && styles.radioSelected,
              ]}
            />
            <Image
              accessibilityLabel={label}
              source={alertImages[id]}
              style={styles.icon}
            />
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.back()} style={styles.save}>
          <Text style={styles.saveText}>Save configuration</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { flex: 1, padding: spacing.md },
  intro: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  row: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.sm,
    minHeight: 45,
    paddingHorizontal: spacing.md,
  },
  selected: { backgroundColor: "#FFF0F1", borderColor: "#F0AEB3" },
  radio: {
    borderColor: "#D4D4D4",
    borderRadius: 10,
    borderWidth: 1,
    height: 19,
    width: 19,
  },
  radioSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  icon: {
    height: 22,
    marginLeft: spacing.lg,
    resizeMode: "contain",
    tintColor: colors.primary,
    width: 28,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    bottom: spacing.md,
    left: spacing.md,
    minHeight: 42,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
  },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
