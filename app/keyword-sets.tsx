import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TalkBlockHeader } from "@/components/TalkBlockChrome";
import { useSettings } from "@/store/SettingsContext";
import { colors, spacing } from "@/theme";

export default function KeywordSetsScreen() {
  const { settings, updateSettings } = useSettings();
  const commonKeywords = ["AI", "big data", "data centers", "agentic"];
  const updateKeyword = (index: number, value: string) => {
    const next = [...settings.keywordSets];
    next[index] = value;
    void updateSettings({ keywordSets: next });
  };
  const deleteKeyword = (index: number) => {
    void updateSettings({
      keywordSets: settings.keywordSets.filter((_, keywordIndex) => keywordIndex !== index),
    });
  };
  const toggleCommonKeyword = (keyword: string) => {
    const selected = settings.keywordSets.some((item) => item.toLowerCase() === keyword.toLowerCase());
    const next = selected
      ? settings.keywordSets.filter((item) => item.toLowerCase() !== keyword.toLowerCase())
      : [...settings.keywordSets, keyword];
    void updateSettings({ keywordSets: next });
  };
  return (
    <SafeAreaView style={styles.safe}>
      <TalkBlockHeader title="Keyword" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>TalkBlock listens for the words in your keywords to spot terms of literal no use in the conversation.</Text>
        {settings.keywordSets.map((keyword, index) => <View key={`keyword-${index}`} style={styles.card}><View style={styles.copy}><TextInput autoCapitalize="none" onChangeText={(value) => updateKeyword(index, value)} placeholder="Type a keyword" placeholderTextColor={colors.textMuted} style={styles.name} value={keyword} /></View><Pressable accessibilityLabel={`Delete ${keyword || "keyword"}`} onPress={() => deleteKeyword(index)} style={styles.delete}><Text style={styles.deleteText}>×</Text></Pressable></View>)}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={() => void updateSettings({ keywordSets: [...settings.keywordSets, ""] })} style={styles.add}><Text style={styles.addText}>+ Add keyword</Text></Pressable>
        <Text style={styles.commonLabel}>Common keywords</Text>
        <View style={styles.suggestions}>
          {commonKeywords.map((keyword) => {
            const selected = settings.keywordSets.some((item) => item.toLowerCase() === keyword.toLowerCase());
            return <Pressable key={keyword} onPress={() => toggleCommonKeyword(keyword)} style={[styles.suggestion, selected && styles.suggestionSelected]}><Text style={[styles.suggestionText, selected && styles.suggestionTextSelected]}>{keyword}</Text></Pressable>;
          })}
        </View>
        <Pressable onPress={() => router.back()} style={styles.continue}><Text style={styles.continueText}>Continue</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, content: { padding: spacing.md }, intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md }, card: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", marginBottom: spacing.sm, minHeight: 68, padding: spacing.md }, copy: { flex: 1 }, name: { color: colors.primary, fontSize: 16, fontWeight: "700", padding: 0 }, delete: { alignItems: "center", height: 32, justifyContent: "center", width: 32 }, deleteText: { color: colors.primary, fontSize: 25, fontWeight: "300" }, footer: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1, padding: spacing.md }, add: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, minHeight: 42, justifyContent: "center" }, addText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" }, commonLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: spacing.md }, suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }, suggestion: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.md }, suggestionSelected: { backgroundColor: "#FFF0F1", borderColor: colors.primary }, suggestionText: { color: colors.primary, fontSize: 12, textAlign: "center" }, suggestionTextSelected: { fontWeight: "700" }, continue: { alignItems: "center", borderColor: colors.primary, borderRadius: 10, borderWidth: 1, marginTop: spacing.sm, minHeight: 42, justifyContent: "center" }, continueText: { color: colors.primary, fontSize: 14, fontWeight: "700" } });
