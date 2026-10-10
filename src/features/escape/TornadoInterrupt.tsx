import * as Haptics from "expo-haptics";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Options = {
  /** When true, skip playing alert audio (native Android service already did). */
  skipLocalAudio?: boolean;
  onBeforeDismiss?: () => void;
};

export function useTornadoInterrupt(options: Options = {}) {
  const { skipLocalAudio = false, onBeforeDismiss } = options;
  const [visible, setVisible] = useState(false);
  const player = useAudioPlayer(require("../../../audio/alert.mp3"));

  const stopAudio = useCallback(() => {
    player.loop = false;
    player.pause();
  }, [player]);

  const present = useCallback(async () => {
    setVisible(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (skipLocalAudio) return;
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      allowsRecording: false,
    });
    player.volume = 1;
    player.loop = true;
    await player.seekTo(0);
    player.play();
  }, [player, skipLocalAudio]);

  const dismiss = useCallback(() => {
    stopAudio();
    setVisible(false);
    onBeforeDismiss?.();
    if (Platform.OS === "android") {
      BackHandler.exitApp();
      return;
    }
    router.replace("/");
  }, [onBeforeDismiss, stopAudio]);

  return {
    visible,
    present,
    dismiss,
    stopAudio,
  };
}

export function TornadoWarningModal({
  visible,
  onOk,
}: {
  visible: boolean;
  onOk: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onOk}
      transparent
      visible={visible}
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
            <Pressable accessibilityRole="button" hitSlop={12} onPress={onOk}>
              <Text style={styles.warningOk}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});
