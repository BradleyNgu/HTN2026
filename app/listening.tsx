import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { TalkBlockHeader } from "@/components/TalkBlockChrome";
import {
  getBackgroundListeningStatus,
  isBackgroundListeningSupported,
  requestBackgroundListeningPermissions,
  startBackgroundListening,
  stopBackgroundListening,
} from "@/features/background/backgroundListener";
import { useBackgroundListenerStatus } from "@/features/background/useBackgroundListenerStatus";
import { getSelectedCaller } from "@/features/escape/callerProfiles";
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
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caller = getSelectedCaller(settings);
  const backgroundStatus = useBackgroundListenerStatus();
  const usesBackgroundService =
    Platform.OS === "android" && isBackgroundListeningSupported;

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

  const startSession = useCallback(async () => {
    if (!caller) return false;
    if (!usesBackgroundService) return detector.start();
    if (getBackgroundListeningStatus().active) return true;
    setBackgroundError(null);
    const granted = await requestBackgroundListeningPermissions();
    if (!granted) {
      setBackgroundError(
        "Microphone and notification permissions are required for background listening.",
      );
      return false;
    }
    try {
      startBackgroundListening({
        callerId: caller.id,
        callerName: caller.name,
        callerRelationship: caller.relationship,
        sensitivity: settings.sensitivity,
        triggerDelaySeconds: settings.triggerDelaySeconds,
        apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
        locale: "en-US",
      });
      return true;
    } catch (error) {
      setBackgroundError(
        error instanceof Error ? error.message : "Background listening failed.",
      );
      return false;
    }
  }, [
    caller,
    detector,
    settings.sensitivity,
    settings.triggerDelaySeconds,
    usesBackgroundService,
  ]);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      if (caller) void startSession();
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Android intentionally keeps its native service alive after this screen unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSession = () => {
    if (usesBackgroundService) {
      stopBackgroundListening();
    } else {
      detector.stop();
    }
    router.back();
  };

  const phase = usesBackgroundService
    ? backgroundStatus.phase
    : detector.phase;
  const isRecognizing = usesBackgroundService
    ? backgroundStatus.active
    : detector.isRecognizing;
  const visibleError = usesBackgroundService
    ? backgroundError ?? backgroundStatus.lastError
    : detector.error;
  const statusLabel = usesBackgroundService
    ? backgroundStatus.phase === "triggered"
      ? "Escape ready — open the notification"
      : backgroundStatus.phase === "reconnecting"
        ? "Reconnecting speech recognition"
        : backgroundStatus.phase === "evaluating"
          ? "Checking the latest moment"
          : backgroundStatus.active
            ? "Listening continues when locked or on Home"
            : "Starting background listening…"
    : phaseLabels[detector.phase];

  const triggerManually = () => {
    if (usesBackgroundService) {
      stopBackgroundListening();
      handleTrigger("Manual escape requested");
    } else {
      detector.triggerManually();
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <TalkBlockHeader />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>LISTENING LIVE <Text style={styles.liveDot}>●</Text></Text>
        <Text style={styles.title}>
          {phase === "suspected" ? "Conversation slowing down" : "Ready to listen"}
        </Text>
        <Text style={styles.subtitle}>{visibleError ?? "Alert: Mom / GF / Boss"}</Text>
        <View style={styles.wave}>{[18, 28, 42, 22, 50, 32, 22, 38, 18].map((height, index) => <View key={index} style={[styles.waveBar, { height }]} />)}</View>
        <Text style={styles.helper}>Keyword + situation check{"\n"}are active</Text>

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

        {visibleError && !isRecognizing ? (
          <PrimaryButton label="Try again" onPress={() => void startSession()} />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="Trigger escape now"
          accessibilityRole="button"
          disabled={Boolean(triggerReason)}
          onLongPress={triggerManually}
          style={styles.manual}
        >
          <Text style={styles.manualIcon}>♧</Text>
          <Text style={styles.panicTitle}>Manual button</Text>
          <Text style={styles.panicBody}>failsafe tap</Text>
        </Pressable>
        <Pressable onPress={stopSession} style={styles.manual}><Text style={styles.manualIcon}>□</Text><Text style={styles.panicTitle}>End session</Text><Text style={styles.panicBody}>stop listening</Text></Pressable>
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
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginTop: spacing.lg },
  liveDot: { color: colors.primary, fontSize: 12 },
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
  wave: { alignItems: "center", flexDirection: "row", gap: 4, marginTop: spacing.md },
  waveBar: {
    backgroundColor: "#F1848B",
    borderRadius: radius.pill,
    width: 3,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: spacing.md,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    minHeight: 28,
    textAlign: "center",
  },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.md, textAlign: "center" },
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
  footer: { flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  manual: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 80, justifyContent: "center" },
  manualIcon: { color: colors.primary, fontSize: 21, marginBottom: 2 },
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
