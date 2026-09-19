import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "conversation-escape.feedback.v1";

type FeedbackCounts = {
  helpful: number;
  falsePositive: number;
};

export async function recordTriggerFeedback(
  type: keyof FeedbackCounts,
) {
  const stored = await AsyncStorage.getItem(KEY);
  const counts: FeedbackCounts = stored
    ? JSON.parse(stored)
    : { helpful: 0, falsePositive: 0 };
  counts[type] += 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(counts));
}
