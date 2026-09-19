import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
  deleteManagedAudio,
  pickAndStoreMp3,
} from "@/features/escape/audioStorage";
import {
  createCallerId,
  initialsFor,
} from "@/features/escape/callerProfiles";
import { useSettings } from "@/store/SettingsContext";
import { colors, radius, spacing } from "@/theme";
import { CallerProfile, ManagedAudio } from "@/types";

export default function CallerEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { settings, saveCaller, deleteCaller } = useSettings();
  const generatedId = useRef(createCallerId()).current;
  const existing = settings.callers.find((caller) => caller.id === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [relationship, setRelationship] = useState(
    existing?.relationship ?? "WhatsApp audio",
  );
  const [audio, setAudio] = useState<ManagedAudio | null>(
    existing?.audio ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const temporaryAudio = useRef<ManagedAudio | null>(null);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const callerId = existing?.id ?? generatedId;

  useEffect(
    () => () => {
      player.pause();
      deleteManagedAudio(temporaryAudio.current);
    },
    [player],
  );

  const chooseAudio = async () => {
    setError(null);
    try {
      const picked = await pickAndStoreMp3(callerId);
      if (!picked) return;
      deleteManagedAudio(temporaryAudio.current);
      temporaryAudio.current = picked;
      setAudio(picked);
      player.replace(picked.uri);
      player.play();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not import this MP3.",
      );
    }
  };

  const togglePreview = async () => {
    if (!audio) return;
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    if (playerStatus.didJustFinish) {
      await player.seekTo(0);
    } else if (!playerStatus.isLoaded) {
      player.replace(audio.uri);
    }
    player.play();
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a caller name.");
      return;
    }

    const caller: CallerProfile = {
      id: callerId,
      name: trimmedName,
      relationship: relationship.trim() || "WhatsApp audio",
      initials: initialsFor(trimmedName),
      fallbackScript:
        existing?.fallbackScript ??
        "Hey, can you step away? I need to speak with you.",
      audio,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    await saveCaller(caller);
    temporaryAudio.current = null;
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(
      `Delete ${existing.name}?`,
      "Their saved MP3 will also be removed from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteCaller(existing.id).then(() => router.back());
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFor(name)}</Text>
        </View>

        <Text style={styles.label}>CALLER NAME</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setName}
          placeholder="e.g. Taylor"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>CALL LABEL</Text>
        <TextInput
          onChangeText={setRelationship}
          placeholder="e.g. WhatsApp audio"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={relationship}
        />

        <Text style={styles.label}>CALLER AUDIO</Text>
        <View style={styles.audioCard}>
          <View style={styles.audioCopy}>
            <Text style={styles.audioName} numberOfLines={1}>
              {audio?.fileName ?? "No MP3 selected"}
            </Text>
            <Text style={styles.audioHint}>
              {audio
                ? "Plays after you accept the call"
                : "Choose a voice recording up to 25 MB"}
            </Text>
          </View>
          {audio ? (
            <Pressable onPress={() => void togglePreview()} style={styles.preview}>
              <Text style={styles.previewText}>
                {playerStatus.playing ? "Pause" : "Preview"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.audioActions}>
          <Pressable onPress={() => void chooseAudio()}>
            <Text style={styles.actionText}>
              {audio ? "Replace MP3" : "Choose MP3"}
            </Text>
          </Pressable>
          {audio ? (
            <Pressable
              onPress={() => {
                player.pause();
                if (temporaryAudio.current?.uri === audio.uri) {
                  deleteManagedAudio(temporaryAudio.current);
                  temporaryAudio.current = null;
                }
                setAudio(null);
              }}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Stored only on this phone</Text>
          <Text style={styles.noticeBody}>
            The MP3 is copied into this app’s private storage and is never sent
            to the classifier.
          </Text>
        </View>

        <PrimaryButton
          label={existing ? "Save caller" : "Add caller"}
          onPress={() => void save()}
          style={styles.save}
        />

        {existing ? (
          <Pressable onPress={confirmDelete} style={styles.delete}>
            <Text style={styles.deleteText}>Delete caller</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  avatar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#1F8C59",
    borderRadius: radius.pill,
    height: 92,
    justifyContent: "center",
    marginVertical: spacing.lg,
    width: 92,
  },
  avatarText: { color: colors.text, fontSize: 32, fontWeight: "800" },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  audioCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.md,
  },
  audioCopy: { flex: 1 },
  audioName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  audioHint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  preview: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  audioActions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  actionText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  removeText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  notice: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  noticeTitle: { color: colors.success, fontSize: 14, fontWeight: "700" },
  noticeBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  save: { marginTop: spacing.xl },
  delete: { alignItems: "center", marginTop: spacing.lg, padding: spacing.sm },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
});
