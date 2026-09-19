import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { recordTriggerFeedback } from "@/features/escape/feedbackStore";
import { getPreset } from "@/features/escape/presets";
import { useSettings } from "@/store/SettingsContext";
import { colors, radius, spacing } from "@/theme";

export default function IncomingCallScreen() {
  const { settings } = useSettings();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [accepted, setAccepted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preset = getPreset(
    settings.selectedPresetId,
    settings.customPreset,
  );

  useEffect(() => {
    Vibration.vibrate([0, 850, 450], true);
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning,
    );
    const ring = () =>
      Speech.speak("ring ring", {
        language: "en-US",
        rate: 1.35,
        pitch: 1.2,
      });
    ring();
    ringTimer.current = setInterval(ring, 3000);
    return () => {
      Vibration.cancel();
      Speech.stop();
      if (speechTimer.current) clearTimeout(speechTimer.current);
      if (ringTimer.current) clearInterval(ringTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!accepted) return;
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [accepted]);

  const accept = () => {
    Vibration.cancel();
    Speech.stop();
    if (ringTimer.current) clearInterval(ringTimer.current);
    setAccepted(true);
    speechTimer.current = setTimeout(() => {
      Speech.speak(preset.script, {
        language: "en-US",
        rate: 0.92,
        pitch: 1,
      });
    }, 700);
  };

  const finish = () => {
    Vibration.cancel();
    Speech.stop();
    if (ringTimer.current) clearInterval(ringTimer.current);
    router.replace("/");
  };

  const sendFeedback = async (
    type: "helpful" | "falsePositive",
  ) => {
    await recordTriggerFeedback(type);
    setFeedbackSent(true);
  };

  const duration = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Text style={styles.label}>
          {accepted ? duration : "CONVERSATION ESCAPE"}
        </Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{preset.initials}</Text>
        </View>
        <Text style={styles.name}>{preset.name}</Text>
        <Text style={styles.relationship}>
          {accepted ? "Call connected" : `${preset.relationship} · mobile`}
        </Text>
      </View>

      {accepted ? (
        <View style={styles.connected}>
          <View style={styles.scriptCard}>
            <Text style={styles.scriptLabel}>WHAT YOU’LL HEAR</Text>
            <Text style={styles.script}>“{preset.script}”</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={finish}
            style={[styles.callButton, styles.decline]}
          >
            <Text style={styles.callIcon}>×</Text>
          </Pressable>
          <Text style={styles.callButtonLabel}>End</Text>

          <View style={styles.feedback}>
            <Text style={styles.feedbackTitle}>
              {feedbackSent ? "Thanks — saved privately." : "Was this useful?"}
            </Text>
            {!feedbackSent ? (
              <View style={styles.feedbackRow}>
                <Pressable
                  onPress={() => void sendFeedback("helpful")}
                  style={styles.feedbackButton}
                >
                  <Text style={styles.feedbackText}>Yes</Text>
                </Pressable>
                <Pressable
                  onPress={() => void sendFeedback("falsePositive")}
                  style={styles.feedbackButton}
                >
                  <Text style={styles.feedbackText}>False alarm</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.ringing}>
          <Text style={styles.reason} numberOfLines={2}>
            {reason ?? "Your configured escape is ready"}
          </Text>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Pressable
                accessibilityLabel="Decline call"
                accessibilityRole="button"
                onPress={finish}
                style={[styles.callButton, styles.decline]}
              >
                <Text style={styles.callIcon}>×</Text>
              </Pressable>
              <Text style={styles.callButtonLabel}>Decline</Text>
            </View>
            <View style={styles.action}>
              <Pressable
                accessibilityLabel="Accept call"
                accessibilityRole="button"
                onPress={accept}
                style={[styles.callButton, styles.accept]}
              >
                <Text style={styles.phoneIcon}>⌕</Text>
              </Pressable>
              <Text style={styles.callButtonLabel}>Accept</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "#101722",
    flex: 1,
    justifyContent: "space-between",
  },
  top: { alignItems: "center", paddingTop: spacing.xxl },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#596273",
    borderRadius: radius.pill,
    height: 128,
    justifyContent: "center",
    marginTop: spacing.xl,
    width: 128,
  },
  avatarText: { color: colors.text, fontSize: 48, fontWeight: "700" },
  name: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "500",
    marginTop: spacing.lg,
  },
  relationship: {
    color: colors.textMuted,
    fontSize: 17,
    marginTop: spacing.xs,
  },
  ringing: { padding: spacing.xl },
  reason: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  action: { alignItems: "center" },
  callButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.success },
  callIcon: { color: colors.text, fontSize: 45, fontWeight: "300" },
  phoneIcon: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "700",
    transform: [{ rotate: "-45deg" }],
  },
  callButtonLabel: {
    color: colors.text,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  connected: { alignItems: "center", padding: spacing.xl },
  scriptCard: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  scriptLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  script: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  feedback: { alignItems: "center", marginTop: spacing.xl },
  feedbackTitle: { color: colors.textMuted, fontSize: 13 },
  feedbackRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  feedbackButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackText: { color: colors.text, fontSize: 13, fontWeight: "600" },
});
