import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { getPreset } from "@/features/escape/presets";
import { useConversationDetector } from "@/features/listening/useConversationDetector";
import { useSettings } from "@/store/SettingsContext";
import { colors, radius, spacing } from "@/theme";

const phaseLabels = {
  idle: "Starting private transcription…",
  listening: "Listening for conversation flow",
  evaluating: "Checking the latest moment",
  suspected: "The conversation may be slowing",
  triggered: "Preparing your escape",
  cooldown: "Cooling down",
};

export default function ListeningScreen() {
  const { settings } = useSettings();
  const [triggerReason, setTriggerReason] = useState<string | null>(null);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preset = getPreset(
    settings.selectedPresetId,
    settings.customPreset,
  );

  const handleTrigger = useCallback(
    (reason: string) => {
      setTriggerReason(reason);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
      timer.current = setTimeout(() => {
        router.replace({
          pathname: "/incoming-call",
          params: { reason },
        });
      }, settings.triggerDelaySeconds * 1000);
    },
    [settings.triggerDelaySeconds],
  );

  const detector = useConversationDetector({
    sensitivity: settings.sensitivity,
    onTrigger: handleTrigger,
  });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void detector.start();
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // The detector owns teardown; this effect intentionally starts once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSession = () => {
    detector.stop();
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              detector.isRecognizing && styles.statusDotActive,
            ]}
          />
          <Text style={styles.statusText}>
            {triggerReason
              ? `Calling ${preset.name}…`
              : phaseLabels[detector.phase]}
          </Text>
        </View>

        <View style={styles.orbWrap}>
          <View style={styles.orbOuter}>
            <View style={styles.orb}>
              {detector.isRecognizing ? (
                <View style={styles.wave}>
                  {[24, 46, 68, 38, 56].map((height, index) => (
                    <View
                      key={index}
                      style={[styles.waveBar, { height }]}
                    />
                  ))}
                </View>
              ) : (
                <ActivityIndicator color={colors.primary} size="large" />
              )}
            </View>
          </View>
        </View>

        <Text style={styles.title}>
          {detector.phase === "suspected"
            ? "Conversation slowing down"
            : "You’re covered"}
        </Text>
        <Text style={styles.subtitle}>
          {detector.error
            ? detector.error
            : detector.recentText
              ? `Heard recently: “${detector.recentText}”`
              : "Speak naturally. Audio stays on this device."}
        </Text>

        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>DETECTION CHECKS</Text>
          <View style={styles.checks}>
            {[0, 1].map((index) => (
              <View
                key={index}
                style={[
                  styles.check,
                  index < detector.consecutivePositive &&
                    styles.checkActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressCopy}>
            Two confident checks are required before the call appears.
          </Text>
        </View>

        {detector.error && detector.phase === "idle" ? (
          <PrimaryButton label="Try again" onPress={() => void detector.start()} />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="Trigger escape now"
          accessibilityRole="button"
          disabled={Boolean(triggerReason)}
          onLongPress={detector.triggerManually}
          style={styles.panic}
        >
          <Text style={styles.panicTitle}>Hold for instant escape</Text>
          <Text style={styles.panicBody}>Manual fallback</Text>
        </Pressable>
        <PrimaryButton
          label="End session"
          onPress={stopSession}
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: {
    alignItems: "center",
    flex: 1,
    padding: spacing.lg,
  },
  statusRow: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.sm,
  },
  statusDot: {
    backgroundColor: colors.textMuted,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  statusDotActive: { backgroundColor: colors.success },
  statusText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  orbWrap: { marginTop: spacing.xxl },
  orbOuter: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 210,
    justifyContent: "center",
    width: 210,
  },
  orb: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 166,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 30,
    width: 166,
  },
  wave: { alignItems: "center", flexDirection: "row", gap: 7 },
  waveBar: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    width: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: spacing.xl,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    minHeight: 66,
    textAlign: "center",
  },
  progressCard: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  checks: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  check: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    flex: 1,
    height: 8,
  },
  checkActive: { backgroundColor: colors.primary },
  progressCopy: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  footer: { gap: spacing.md, padding: spacing.lg },
  panic: {
    alignItems: "center",
    borderColor: colors.primaryDark,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  panicTitle: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  panicBody: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
