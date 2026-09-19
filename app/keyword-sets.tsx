import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader } from "@/components/TalkBlockChrome";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export default function KeywordSetsScreen() {
  const { settings, updateSettings } = useSettings();
  const edit = (index: number) => {
    const next = [...settings.keywordSets];
    next[index] = next[index] === "jargon" ? "keywords" : `${next[index]}+`;
    void updateSettings({ keywordSets: next });
  };
  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader title="Keyword sets" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>TalkBlock listens for the words in your keyword sets to spot jargon or BS.</Text>
        {settings.keywordSets.map((keyword, index) => <View key={`${keyword}-${index}`} style={styles.card}><View style={styles.copy}><Text style={styles.name}>{keyword}</Text><Text style={styles.detail}>e.g. {keyword === "ai" ? "artificial intelligence, machine learning" : keyword === "big data" ? "data lake, data-driven" : "synergy, paradigm shift, best practice"}</Text></View><Pressable onPress={() => edit(index)}><Text style={styles.edit}>⌕</Text></Pressable></View>)}
        <Pressable onPress={() => void updateSettings({ keywordSets: [...settings.keywordSets, "new set"] })} style={styles.add}><Text style={styles.addText}>+ Add keyword set</Text></Pressable>
        <Pressable onPress={() => router.back()} style={styles.continue}><Text style={styles.continueText}>Continue</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, content: { padding: spacing.md }, intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md }, card: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", marginBottom: spacing.sm, minHeight: 68, padding: spacing.md }, copy: { flex: 1 }, name: { color: colors.primary, fontSize: 16, fontWeight: "700" }, detail: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 }, edit: { color: colors.primary, fontSize: 22 }, add: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, marginTop: 135, minHeight: 42, justifyContent: "center" }, addText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" }, continue: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, marginTop: spacing.sm, minHeight: 42, justifyContent: "center" }, continueText: { color: colors.primary, fontSize: 14, fontWeight: "700" } });
