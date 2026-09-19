import { router } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import {
  defaultPresets,
  getPreset,
} from "@/features/escape/presets";
import { useSettings } from "@/store/SettingsContext";
import { colors, radius, spacing } from "@/theme";
import { EscapePresetId, Sensitivity } from "@/types";

const sensitivityOptions: Sensitivity[] = ["low", "medium", "high"];

export default function HomeScreen() {
  const { settings, isHydrated, updateSettings } = useSettings();

  useEffect(() => {
    if (isHydrated && !settings.hasCompletedOnboarding) {
      router.replace("/onboarding");
    }
  }, [isHydrated, settings.hasCompletedOnboarding]);

  if (!isHydrated || !settings.hasCompletedOnboarding) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const selected = getPreset(
    settings.selectedPresetId,
    settings.customPreset,
  );
  const presets = [...defaultPresets, settings.customPreset];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>READY WHEN YOU ARE</Text>
        <Text style={styles.title}>Who should call?</Text>
        <Text style={styles.subtitle}>
          Pick your escape, then keep this app open while you talk.
        </Text>

        <View style={styles.presetGrid}>
          {presets.map((preset) => {
            const active = preset.id === settings.selectedPresetId;
            return (
              <Pressable
                accessibilityRole="button"
                key={preset.id}
                onPress={() =>
                  updateSettings({
                    selectedPresetId: preset.id as EscapePresetId,
                  })
                }
                style={[styles.preset, active && styles.presetActive]}
              >
                <View style={[styles.avatar, active && styles.avatarActive]}>
                  <Text style={styles.avatarText}>{preset.initials}</Text>
                </View>
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetRole}>{preset.relationship}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>CALL PREVIEW</Text>
          <Text style={styles.previewName}>{selected.name}</Text>
          <Text style={styles.previewScript}>“{selected.script}”</Text>
        </View>

        {settings.selectedPresetId === "custom" ? (
          <View style={styles.customForm}>
            <Text style={styles.sectionTitle}>Custom caller</Text>
            <TextInput
              accessibilityLabel="Caller name"
              onChangeText={(name) =>
                updateSettings({
                  customPreset: {
                    ...settings.customPreset,
                    name,
                    initials: name.trim().charAt(0).toUpperCase() || "?",
                  },
                })
              }
              placeholder="Caller name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={settings.customPreset.name}
            />
            <TextInput
              accessibilityLabel="Call script"
              multiline
              onChangeText={(script) =>
                updateSettings({
                  customPreset: { ...settings.customPreset, script },
                })
              }
              placeholder="What should they say?"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.scriptInput]}
              value={settings.customPreset.script}
            />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Detection sensitivity</Text>
        <View style={styles.segment}>
          {sensitivityOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => updateSettings({ sensitivity: option })}
              style={[
                styles.segmentItem,
                settings.sensitivity === option && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.sensitivity === option && styles.segmentTextActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Delay before call</Text>
        <View style={styles.segment}>
          {[0, 2, 5].map((seconds) => (
            <Pressable
              key={seconds}
              onPress={() =>
                updateSettings({ triggerDelaySeconds: seconds })
              }
              style={[
                styles.segmentItem,
                settings.triggerDelaySeconds === seconds &&
                  styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.triggerDelaySeconds === seconds &&
                    styles.segmentTextActive,
                ]}
              >
                {seconds === 0 ? "Now" : `${seconds} sec`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.privacy}>
          <Text style={styles.privacyTitle}>Private by design</Text>
          <Text style={styles.privacyBody}>
            Audio stays on this device. Short text snippets are analyzed and
            immediately discarded.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={`Start listening as ${selected.name}`}
          onPress={() => router.push("/listening")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  content: { padding: spacing.lg, paddingBottom: 120 },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginTop: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  preset: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    width: "48%",
  },
  presetActive: { borderColor: colors.primary, borderWidth: 2 },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarActive: { backgroundColor: colors.primaryDark },
  avatarText: { color: colors.text, fontSize: 18, fontWeight: "800" },
  presetName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  presetRole: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  previewLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  previewName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  previewScript: {
    color: colors.textMuted,
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  customForm: { marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scriptInput: { minHeight: 84, textAlignVertical: "top" },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  segment: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    padding: 4,
  },
  segmentItem: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    padding: spacing.sm,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  segmentTextActive: { color: colors.black },
  privacy: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  privacyTitle: { color: colors.success, fontSize: 14, fontWeight: "700" },
  privacyBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0,
  },
});
