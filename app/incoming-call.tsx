import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
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

import { managedAudioExists } from "@/features/escape/audioStorage";
import {
  cleanupCallMedia,
  resolveCallAudio,
} from "@/features/escape/callAudio";
import { getSelectedCaller } from "@/features/escape/callerProfiles";
import { recordTriggerFeedback } from "@/features/escape/feedbackStore";
import { useSettings } from "@/store/SettingsContext";
import { colors, radius, spacing } from "@/theme";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    Math.floor(seconds % 60),
  ).padStart(2, "0")}`;
}

export default function IncomingCallScreen() {
  const { settings } = useSettings();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const caller = getSelectedCaller(settings);
  const resolvedAudio = caller
    ? resolveCallAudio(caller, (candidate) =>
        managedAudioExists(candidate.audio),
      )
    : null;
  const hasAudio = resolvedAudio?.kind === "mp3";
  const player = useAudioPlayer(hasAudio ? resolvedAudio.uri : null, {
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);
  const [accepted, setAccepted] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const ringTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
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
      cleanupCallMedia({
        pauseAudio: () => player.pause(),
        stopSpeech: () => Speech.stop(),
        cancelVibration: () => Vibration.cancel(),
        clearRing: () => {
          if (ringTimer.current) clearInterval(ringTimer.current);
        },
      });
    };
  }, [player]);

  const stopRing = () => {
    Vibration.cancel();
    Speech.stop();
    if (ringTimer.current) clearInterval(ringTimer.current);
  };

  const accept = () => {
    stopRing();
    setAccepted(true);
    if (hasAudio) {
      void player.seekTo(0).then(() => player.play());
    } else if (resolvedAudio?.kind === "fallback") {
      Speech.speak(resolvedAudio.script, {
        language: "en-US",
        rate: 0.92,
      });
    }
  };

  const finish = () => {
    stopRing();
    player.pause();
    router.replace("/");
  };

  const togglePlayback = async () => {
    if (!hasAudio) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) await player.seekTo(0);
    player.play();
  };

  const sendFeedback = async (
    type: "helpful" | "falsePositive",
  ) => {
    await recordTriggerFeedback(type);
    setFeedbackSent(true);
  };

  const progress =
    status.duration > 0
      ? Math.min(100, (status.currentTime / status.duration) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Text style={styles.label}>
          {accepted ? "SIMULATED AUDIO CALL" : "SIMULATED MESSAGING CALL"}
        </Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{caller?.initials ?? "?"}</Text>
        </View>
        <Text style={styles.name}>{caller?.name ?? "Caller"}</Text>
        <Text style={styles.relationship}>
          {accepted
            ? status.playing
              ? "Caller audio playing"
              : "Call connected"
            : `${caller?.relationship ?? "Audio call"} · incoming`}
        </Text>
      </View>

      {accepted ? (
        <View style={styles.connected}>
          <View style={styles.audioCard}>
            <Text style={styles.audioLabel}>PRERECORDED CALLER AUDIO</Text>
            <Text style={styles.audioName} numberOfLines={1}>
              {hasAudio
                ? resolvedAudio.fileName
                : "Voice fallback (add an MP3 in caller preferences)"}
            </Text>
            {hasAudio ? (
              <>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.trackProgress,
                      { width: `${progress}%` },
                    ]}
                  />
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.time}>
                    {formatTime(status.currentTime)}
                  </Text>
                  <Text style={styles.time}>
                    {formatTime(status.duration)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void togglePlayback()}
                  style={styles.playbackButton}
                >
                  <Text style={styles.playbackText}>
                    {status.playing ? "Pause caller" : "Play caller"}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>

          <Pressable
            accessibilityLabel="End call"
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
    backgroundColor: "#0B141A",
    flex: 1,
    justifyContent: "space-between",
  },
  top: { alignItems: "center", paddingTop: spacing.xxl },
  label: {
    color: "#8696A0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#1F8C59",
    borderRadius: radius.pill,
    height: 128,
    justifyContent: "center",
    marginTop: spacing.xl,
    width: 128,
  },
  avatarText: { color: colors.text, fontSize: 44, fontWeight: "700" },
  name: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "500",
    marginTop: spacing.lg,
  },
  relationship: { color: "#8696A0", fontSize: 16, marginTop: spacing.xs },
  ringing: { padding: spacing.xl },
  reason: {
    color: "#8696A0",
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
  accept: { backgroundColor: "#25D366" },
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
  audioCard: {
    alignSelf: "stretch",
    backgroundColor: "#202C33",
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  audioLabel: {
    color: "#25D366",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  audioName: {
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  track: {
    backgroundColor: "#3B4A54",
    borderRadius: radius.pill,
    height: 6,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  trackProgress: {
    backgroundColor: "#25D366",
    borderRadius: radius.pill,
    height: 6,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  time: { color: "#8696A0", fontSize: 11 },
  playbackButton: {
    alignItems: "center",
    borderColor: "#25D366",
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  playbackText: { color: "#25D366", fontSize: 13, fontWeight: "700" },
  feedback: { alignItems: "center", marginTop: spacing.xl },
  feedbackTitle: { color: "#8696A0", fontSize: 13 },
  feedbackRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  feedbackButton: {
    backgroundColor: "#202C33",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackText: { color: colors.text, fontSize: 13, fontWeight: "600" },
});
