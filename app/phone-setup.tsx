import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader } from "@/components/TalkBlockChrome";
import {
  isValidE164,
  normalizePhoneNumber,
} from "@/features/escape/phoneNumber";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export default function PhoneSetupScreen() {
  const { settings, isHydrated, updateSettings } = useSettings();
  const [phoneInput, setPhoneInput] = useState(settings.userPhoneNumber);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(settings.userPhoneNumber);

  useEffect(() => {
    if (isHydrated && settings.userPhoneNumber) {
      setPhoneInput(settings.userPhoneNumber);
    }
  }, [isHydrated, settings.userPhoneNumber]);

  const save = async () => {
    const normalized = normalizePhoneNumber(phoneInput);
    if (!isValidE164(normalized)) {
      Alert.alert(
        "Invalid phone number",
        "Enter a valid number with country code, e.g. +14155552671 or (415) 555-2671.",
      );
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        userPhoneNumber: normalized,
        hasCompletedOnboarding: true,
      });
      if (editing) {
        router.back();
      } else {
        router.replace("/");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader showBack={editing} title="Your phone" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <Text style={styles.eyebrow}>WHERE SHOULD WE CALL?</Text>
        <Text style={styles.title}>
          {editing ? "Update your phone number" : "Enter your phone number"}
        </Text>
        <Text style={styles.subtitle}>
          TalkBlock rings this number when an escape call is triggered. Use the
          phone you have with you.
        </Text>
        <TextInput
          autoComplete="tel"
          autoFocus={!editing}
          keyboardType="phone-pad"
          onChangeText={setPhoneInput}
          placeholder="+1 (415) 555-2671"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textContentType="telephoneNumber"
          value={phoneInput}
        />
        <Text style={styles.hint}>Include country code. US/Canada: 10 digits is fine.</Text>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void save()}
          style={[styles.save, saving && styles.saveDisabled]}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving…" : editing ? "Save number" : "Continue"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "500",
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  input: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginTop: spacing.lg,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
