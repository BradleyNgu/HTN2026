import { router } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import {
  getSelectedCaller,
} from "@/features/escape/callerProfiles";
import { useSettings } from "@/store/SettingsContext";
import { colors, radius, spacing } from "@/theme";
import { Sensitivity } from "@/types";

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

  const selected = getSelectedCaller(settings);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>ESCAPE CALL</Text>
        <Text style={styles.title}>Who should call?</Text>
        <Text style={styles.subtitle}>
          Choose a caller and attach a prerecorded MP3 for after you answer.
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your callers</Text>
          <Pressable onPress={() => router.push("/caller-editor")}>
            <Text style={styles.addText}>+ Add caller</Text>
          </Pressable>
        </View>

        <View style={styles.callerList}>
          {settings.callers.map((caller) => {
            const active = caller.id === settings.selectedCallerId;
            return (
              <Pressable
                accessibilityRole="button"
                key={caller.id}
                onPress={() =>
                  updateSettings({ selectedCallerId: caller.id })
                }
                style={[styles.caller, active && styles.callerActive]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{caller.initials}</Text>
                </View>
                <View style={styles.callerCopy}>
                  <Text style={styles.callerName}>{caller.name}</Text>
                  <Text style={styles.callerMeta}>
                    {caller.audio
                      ? `MP3 · ${caller.audio.fileName}`
                      : "No MP3 · voice fallback"}
                  </Text>
                </View>
                {active ? <Text style={styles.check}>✓</Text> : null}
                <Pressable
                  accessibilityLabel={`Edit ${caller.name}`}
                  hitSlop={8}
                  onPress={(event) => {
                    event.stopPropagation();
                    router.push({
                      pathname: "/caller-editor",
                      params: { id: caller.id },
                    });
                  }}
                  style={styles.edit}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        {selected ? (
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>SIMULATED AUDIO CALL</Text>
            <Text style={styles.previewName}>{selected.name}</Text>
            <Text style={styles.previewStatus}>
              {selected.audio
                ? selected.audio.fileName
                : "Add an MP3 for prerecorded caller audio"}
            </Text>
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
            Caller MP3s remain on this phone. They are never sent to the
            conversation classifier.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          disabled={!selected}
          label={
            selected ? `Start listening as ${selected.name}` : "Add a caller"
          }
          onPress={() =>
            selected
              ? router.push("/listening")
              : router.push("/caller-editor")
          }
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
  content: { padding: spacing.lg, paddingBottom: 130 },
  eyebrow: {
    color: "#3ED47E",
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
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  addText: { color: "#3ED47E", fontSize: 14, fontWeight: "700" },
  callerList: { gap: spacing.sm, marginTop: spacing.sm },
  caller: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.md,
  },
  callerActive: { borderColor: "#3ED47E", borderWidth: 2 },
  avatar: {
    alignItems: "center",
    backgroundColor: "#1F8C59",
    borderRadius: radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: { color: colors.text, fontSize: 17, fontWeight: "800" },
  callerCopy: { flex: 1, marginLeft: spacing.md },
  callerName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  callerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    maxWidth: 190,
  },
  check: { color: "#3ED47E", fontSize: 18, marginRight: spacing.sm },
  edit: { padding: spacing.xs },
  editText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  previewLabel: {
    color: "#3ED47E",
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
  previewStatus: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
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
  segmentActive: { backgroundColor: "#3ED47E" },
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
