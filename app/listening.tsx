import * as Haptics from "expo-haptics";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Modal,
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
  addBackgroundTriggerListener,
  dismissBackgroundTornadoAlert,
  getBackgroundListeningStatus,
  isBackgroundListeningSupported,
  requestBackgroundListeningPermissions,
  startBackgroundListening,
  stopBackgroundListening,
} from "@/features/background/backgroundListener";
import { useBackgroundListenerStatus } from "@/features/background/useBackgroundListenerStatus";
import { getSelectedCaller } from "@/features/escape/callerProfiles";
import { triggerConfiguredPhoneCall } from "@/features/escape/phoneCallClient";
import { useConversationDetector } from "@/features/listening/useConversationDetector";
import { useSettings } from "@/store/SettingsContext";
import { isPhoneAlert } from "@/types";
import { colors, radius, spacing } from "@/theme";

const phaseLabels = {
  idle: "Starting private transcription…",
  listening: "Listening for conversation flow",
  evaluating: "Checking the latest moment",
  suspected: "The conversation may be slowing",
  triggered: "Preparing your escape",
  cooldown: "Cooling down",
};

const SKIP_AD_DURATION_MS = 8000;

export default function ListeningScreen() {
  const { settings } = useSettings();
  const [triggerReason, setTriggerReason] = useState<string | null>(null);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [phoneCallError, setPhoneCallError] = useState<string | null>(null);
  const [tornadoWarningVisible, setTornadoWarningVisible] = useState(false);
  const [skipAdVisible, setSkipAdVisible] = useState(false);
  const [skipAdReady, setSkipAdReady] = useState(false);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAdReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEscapeRef = useRef(false);
  const adOpacity = useRef(new Animated.Value(0)).current;
  const adProgress = useRef(new Animated.Value(0)).current;
  const tornadoPlayer = useAudioPlayer(require("../audio/alert.mp3"));
  const caller = getSelectedCaller(settings);
  const backgroundStatus = useBackgroundListenerStatus();
  const usesBackgroundService =
    Platform.OS === "android" && isBackgroundListeningSupported;

  const leaveAppAfterTornado = useCallback(() => {
    router.replace("/");
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    }
  }, []);

  const dismissTornadoWarning = useCallback(() => {
    tornadoPlayer.loop = false;
    tornadoPlayer.pause();
    if (usesBackgroundService) {
      dismissBackgroundTornadoAlert();
    }
    setTornadoWarningVisible(false);
    leaveAppAfterTornado();
  }, [leaveAppAfterTornado, tornadoPlayer, usesBackgroundService]);

  const stopSkipAdAnimation = useCallback(() => {
    if (skipAdReadyTimer.current) {
      clearTimeout(skipAdReadyTimer.current);
      skipAdReadyTimer.current = null;
    }
    adOpacity.stopAnimation();
    adProgress.stopAnimation();
    setSkipAdVisible(false);
    setSkipAdReady(false);
    adOpacity.setValue(0);
    adProgress.setValue(0);
  }, [adOpacity, adProgress]);

  const presentTornadoWarning = useCallback(async () => {
    setTriggerReason("Tornado warning issued");
    setTornadoWarningVisible(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Android background service plays the alarm even when the app is closed.
    if (usesBackgroundService) return;
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      allowsRecording: false,
    });
    tornadoPlayer.volume = 1;
    tornadoPlayer.loop = true;
    await tornadoPlayer.seekTo(0);
    tornadoPlayer.play();
  }, [tornadoPlayer, usesBackgroundService]);

  const runConfiguredEscape = useCallback(() => {
    const callType = settings.defaultAlert;
    setPhoneCallError(null);
    if (callType === "tornado") {
      void presentTornadoWarning();
      return;
    }
    if (usesBackgroundService) {
      // Native Android service already requested the Twilio call.
      setTriggerReason("Real phone call requested");
      return;
    }
    void triggerConfiguredPhoneCall(callType, settings.userPhoneNumber)
      .then(() => setTriggerReason("Real phone call requested"))
      .catch((error: unknown) => {
        setPhoneCallError(
          error instanceof Error
            ? error.message
            : "The real phone call could not be placed.",
        );
      });
  }, [
    presentTornadoWarning,
    settings.defaultAlert,
    settings.userPhoneNumber,
    usesBackgroundService,
  ]);

  const finishSkipAdAndContinue = useCallback(() => {
    if (!skipAdReady) return;
    const shouldEscape = pendingEscapeRef.current;
    pendingEscapeRef.current = false;
    Animated.timing(adOpacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      stopSkipAdAnimation();
      setTriggerReason("Connecting escape…");
      if (shouldEscape) {
        runConfiguredEscape();
      }
    });
  }, [adOpacity, runConfiguredEscape, skipAdReady, stopSkipAdAnimation]);

  const presentSkipAd = useCallback(async () => {
    setTriggerReason("Sponsored interruption");
    setSkipAdVisible(true);
    setSkipAdReady(false);
    adOpacity.setValue(0);
    adProgress.setValue(0);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.timing(adOpacity, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
    Animated.timing(adProgress, {
      toValue: 1,
      duration: SKIP_AD_DURATION_MS,
      useNativeDriver: false,
    }).start();

    if (skipAdReadyTimer.current) clearTimeout(skipAdReadyTimer.current);
    skipAdReadyTimer.current = setTimeout(() => {
      setSkipAdReady(true);
    }, SKIP_AD_DURATION_MS);
  }, [adOpacity, adProgress]);

  const handleTrigger = useCallback(
    (reason: string) => {
      pendingEscapeRef.current = true;
      setTriggerReason(`${reason} · loading sponsored interruption`);
      setPhoneCallError(null);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
      timer.current = setTimeout(() => {
        void presentSkipAd();
      }, settings.triggerDelaySeconds * 1000);
    },
    [presentSkipAd, settings.triggerDelaySeconds],
  );

  const detector = useConversationDetector({
    sensitivity: settings.sensitivity,
    keywords: settings.keywordSets,
    detectionContext: settings.detectionContext,
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
      if (isPhoneAlert(settings.defaultAlert) && !settings.userPhoneNumber) {
        setBackgroundError("Add your phone number before starting listening.");
        return false;
      }
      startBackgroundListening({
        callerId: caller.id,
        callerName: caller.name,
        callerRelationship: caller.relationship,
        sensitivity: settings.sensitivity,
        triggerDelaySeconds: settings.triggerDelaySeconds,
        apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
        locale: "en-US",
        callType: isPhoneAlert(settings.defaultAlert)
          ? settings.defaultAlert
          : null,
        localAlert: settings.defaultAlert === "tornado" ? "tornado" : null,
        phoneNumber: settings.userPhoneNumber,
        detectionContext: settings.detectionContext,
        keywords: settings.keywordSets
          .map((keyword) => keyword.trim())
          .filter(Boolean),
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
    settings.defaultAlert,
    settings.keywordSets,
    settings.userPhoneNumber,
    settings.detectionContext,
    usesBackgroundService,
  ]);

  useEffect(() => {
    if (!usesBackgroundService) return;
    const subscription = addBackgroundTriggerListener(() => {
      pendingEscapeRef.current = true;
      timer.current = setTimeout(() => {
        void presentSkipAd();
      }, settings.triggerDelaySeconds * 1000);
    });
    return () => subscription?.remove();
  }, [presentSkipAd, settings.triggerDelaySeconds, usesBackgroundService]);

  useEffect(() => {
    if (
      !usesBackgroundService ||
      backgroundStatus.phase !== "triggered" ||
      skipAdVisible ||
      tornadoWarningVisible
    ) {
      return;
    }
    pendingEscapeRef.current = true;
    void presentSkipAd();
  }, [
    backgroundStatus.phase,
    presentSkipAd,
    skipAdVisible,
    tornadoWarningVisible,
    usesBackgroundService,
  ]);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      if (caller) void startSession();
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (skipAdCompleteTimer.current) clearTimeout(skipAdCompleteTimer.current);
      tornadoPlayer.loop = false;
      tornadoPlayer.pause();
    };
    // Android intentionally keeps its native service alive after this screen unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSession = () => {
    pendingEscapeRef.current = false;
    dismissTornadoWarning();
    stopSkipAdAnimation();
    if (usesBackgroundService) {
      stopBackgroundListening();
    } else {
      detector.stop();
    }
    router.replace("/");
  };

  const phase = usesBackgroundService
    ? backgroundStatus.phase
    : detector.phase;
  const isRecognizing = usesBackgroundService
    ? backgroundStatus.active
    : detector.isRecognizing;
  const visibleError = usesBackgroundService
    ? phoneCallError ?? backgroundError ?? backgroundStatus.lastError
    : phoneCallError ?? detector.error;
  const statusLabel = usesBackgroundService
    ? backgroundStatus.phase === "triggered"
      ? skipAdVisible
        ? "Sponsored interruption"
        : settings.defaultAlert === "tornado"
          ? "Tornado warning issued"
          : "Real phone call requested"
      : backgroundStatus.phase === "reconnecting"
        ? "Reconnecting speech recognition"
        : backgroundStatus.phase === "evaluating"
          ? "Checking the latest moment"
          : backgroundStatus.active
            ? "Listening continues when locked or on Home"
            : "Starting background listening…"
    : phaseLabels[detector.phase];

  const skipProgressWidth = adProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <Modal
        animationType="fade"
        onRequestClose={dismissTornadoWarning}
        transparent
        visible={tornadoWarningVisible}
      >
        <View style={styles.warningBackdrop}>
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <View style={styles.warningIconWrap}>
                <View style={styles.warningTriangle} />
                <Text style={styles.warningIconMark}>!</Text>
              </View>
              <Text style={styles.warningHeaderTitle}>
                Severe weather (Tornado warning)
              </Text>
            </View>
            <Text style={styles.warningTitle}>Emergency Alert</Text>
            <Text style={styles.warningBody}>
              A tornado warning has been issued for your area. Seek shelter
              immediately in a basement or an interior room away from windows.
            </Text>
            <View style={styles.warningActions}>
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={dismissTornadoWarning}
              >
                <Text style={styles.warningOk}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="none"
        transparent
        visible={skipAdVisible}
      >
        <Animated.View style={[styles.adBackdrop, { opacity: adOpacity }]}>
          <Animated.View
            style={[styles.adPlayer, { transform: [{ scale: adPulse }] }]}
          >
            <View style={styles.adStage}>
              <Text style={styles.adEyebrow}>Sponsored</Text>
              <Text style={styles.adHeadline}>
                Still stuck in this conversation?
              </Text>
              <Text style={styles.adBody}>
                TalkBlock Premium escapes awkward chats 40% faster. Limited time
                offer for people who nodded once and regret it.
              </Text>
              <View style={styles.adFakeCta}>
                <Text style={styles.adFakeCtaText}>Learn more</Text>
              </View>
            </View>
            <View style={styles.adChrome}>
              <View style={styles.adBadge}>
                <Text style={styles.adBadgeText}>Ad</Text>
              </View>
              <Text style={styles.adTimer}>Skipping…</Text>
              <View style={styles.skipChip}>
                <Text style={styles.skipChipText}>Skip Ad ›</Text>
                <View style={styles.skipProgressTrack}>
                  <Animated.View
                    style={[styles.skipProgressFill, { width: skipProgressWidth }]}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <TalkBlockHeader />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>LIVE <Text style={styles.liveDot}>●</Text></Text>
        <Text style={styles.title}>
          {phase === "suspected" ? "Conversation slowing down" : "Listening..."}
        </Text>
        <Text style={styles.subtitle}>{triggerReason ?? visibleError ?? statusLabel}</Text>
        <View style={styles.wave}>{[18, 28, 42, 22, 50, 32, 22, 38, 18].map((height, index) => <View key={index} style={[styles.waveBar, { height }]} />)}</View>
        <Text style={styles.helper}>Keyword check{"\n"}is active</Text>
        <View style={styles.transcript}>
          <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
          <Text style={styles.transcriptText}>
            {usesBackgroundService
              ? backgroundStatus.recentText ||
                `Listening for speech… ${backgroundStatus.wordsHeard} words captured`
              : detector.partialTranscript ||
                detector.recentText ||
                "Listening for speech..."}
          </Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>DETECTION CHECKS</Text>
          <View style={styles.checks}>
            {[0].map((index) => (
              <View
                key={index}
                style={[
                  styles.check,
                  (usesBackgroundService
                    ? backgroundStatus.phase === "evaluating" ||
                      backgroundStatus.phase === "triggered"
                    : detector.consecutivePositive > index) &&
                    styles.checkActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressCopy}>
            One confident 10-word check triggers the configured alert.
          </Text>
        </View>

        {visibleError && !isRecognizing ? (
          <PrimaryButton label="Try again" onPress={() => void startSession()} />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={stopSession} style={styles.endSession}>
          <Text style={styles.endSessionText}>End session</Text>
        </Pressable>
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
  transcript: { alignSelf: "stretch", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.lg, minHeight: 70, padding: spacing.md },
  transcriptLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  transcriptText: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
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
  footer: { padding: spacing.md },
  endSession: { alignItems: "center", backgroundColor: "#FFF5F5", borderColor: "#F2C8CB", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 48 },
  endSessionText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  panic: {
    alignItems: "center",
    borderColor: colors.primaryDark,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  panicTitle: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  panicBody: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  warningBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  warningCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    elevation: 8,
    maxWidth: 360,
    paddingBottom: 10,
    paddingHorizontal: 22,
    paddingTop: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    width: "100%",
  },
  warningHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  warningIconWrap: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 24,
  },
  warningTriangle: {
    backgroundColor: "transparent",
    borderBottomColor: "#D93025",
    borderBottomWidth: 20,
    borderLeftColor: "transparent",
    borderLeftWidth: 11,
    borderRightColor: "transparent",
    borderRightWidth: 11,
    borderStyle: "solid",
    height: 0,
    position: "absolute",
    top: 1,
    width: 0,
  },
  warningIconMark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14,
    marginTop: 7,
    textAlign: "center",
    zIndex: 1,
  },
  warningHeaderTitle: {
    color: "#202124",
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
  },
  warningTitle: {
    color: "#202124",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 14,
  },
  warningBody: {
    color: "#3C4043",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  warningActions: {
    alignItems: "flex-end",
    marginTop: 18,
  },
  warningOk: {
    color: "#1A73E8",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  adBackdrop: {
    backgroundColor: "#000000",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  adPlayer: {
    alignSelf: "center",
    backgroundColor: "#111111",
    borderRadius: 8,
    maxWidth: 420,
    overflow: "hidden",
    width: "100%",
  },
  adStage: {
    backgroundColor: "#1B1B1B",
    minHeight: 220,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  adEyebrow: {
    color: "#FFCC00",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  adHeadline: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    marginTop: spacing.md,
  },
  adBody: {
    color: "#CFCFCF",
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  adFakeCta: {
    alignSelf: "flex-start",
    backgroundColor: "#3EA6FF",
    borderRadius: 2,
    marginTop: spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  adFakeCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  adChrome: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  adBadge: {
    backgroundColor: "#FFCC00",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adBadgeText: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "900",
  },
  adTimer: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  skipChip: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 2,
    minWidth: 108,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipChipText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  skipProgressTrack: {
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 1,
    height: 2,
    marginTop: 6,
    overflow: "hidden",
    width: "100%",
  },
  skipProgressFill: {
    backgroundColor: "#111111",
    height: "100%",
  },
});
