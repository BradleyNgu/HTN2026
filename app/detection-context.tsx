import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader } from "@/components/TalkBlockChrome";
import {
  DEFAULT_DETECTION_CONTEXT,
  DETECTION_CONTEXT_MAX_LENGTH,
} from "@/shared/detectionContext";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export default function DetectionContextScreen() {
  const { settings, updateSettings } = useSettings();
  const [draft, setDraft] = useState(
    settings.detectionContext || DEFAULT_DETECTION_CONTEXT,
  );

  useEffect(() => {
    setDraft(settings.detectionContext || DEFAULT_DETECTION_CONTEXT);
  }, [settings.detectionContext]);

  const save = async () => {
    const trimmed = draft.trim().slice(0, DETECTION_CONTEXT_MAX_LENGTH);
    await updateSettings({
      detectionContext: trimmed || DEFAULT_DETECTION_CONTEXT,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader title="Detection context" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Tell TalkBlock what conversation patterns should trigger an escape.
          This replaces the default “boring” criteria sent to the classifier.
        </Text>
        <Text style={styles.eyebrow}>WHEN SHOULD WE GET YOU OUT?</Text>
        <TextInput
          multiline
          onChangeText={(value) =>
            setDraft(value.slice(0, DETECTION_CONTEXT_MAX_LENGTH))
          }
          placeholder={DEFAULT_DETECTION_CONTEXT}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlignVertical="top"
          value={draft}
        />
        <Text style={styles.hint}>
          {draft.length}/{DETECTION_CONTEXT_MAX_LENGTH} · Use bullets or plain
          sentences.
        </Text>
        <Pressable
          onPress={() => setDraft(DEFAULT_DETECTION_CONTEXT)}
          style={styles.reset}
        >
          <Text style={styles.resetText}>Reset to default</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={() => void save()} style={styles.save}>
          <Text style={styles.saveText}>Save context</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
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
  input: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 200,
    padding: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  reset: { alignSelf: "flex-start", marginTop: spacing.md, paddingVertical: 6 },
  resetText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md,
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 42,
  },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
