import OpenAI from "openai";

import {
  DETECTION_CONTEXT_MAX_LENGTH,
  resolveDetectionContext,
} from "../src/shared/detectionContext";
import {
  findTriggerKeyword,
  keywordTriggerReason,
} from "../src/shared/triggerKeywords";
import {
  ClassificationResult,
  classificationSchema,
} from "./schema";

function buildSystemPrompt(detectionContext: string): string {
  const context = resolveDetectionContext(detectionContext).slice(
    0,
    DETECTION_CONTEXT_MAX_LENGTH,
  );

  return `You classify whether a casual in-person conversation has become boring enough that a participant might reasonably want a graceful exit.

Mark boring=true when the excerpt matches any of these user-defined patterns:
${context}

Treat a clear match as sufficient even if the listener's reaction is not included. A neutral, balanced discussion is not automatically boring.

Safety rules:
- Always return boring=false for distress, conflict, threats, harassment, medical, legal, or safety-sensitive situations.
- Never infer protected traits or relationships not stated in the excerpt.
- Keep the reason neutral, specific, and under 20 words.

Return only JSON matching the supplied schema.`;
}

export type Classifier = (
  text: string,
  keywords?: readonly string[],
  detectionContext?: string,
) => Promise<ClassificationResult>;

export const classifyConversation: Classifier = async (
  text,
  keywords = [],
  detectionContext = "",
) => {
  const triggerKeyword = findTriggerKeyword(text, keywords);
  if (triggerKeyword) {
    return {
      boring: true,
      confidence: 1,
      reason: keywordTriggerReason(triggerKeyword),
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    messages: [
      { role: "system", content: buildSystemPrompt(detectionContext) },
      { role: "user", content: text },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "conversation_classification",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["boring", "confidence", "reason"],
          properties: {
            boring: { type: "boolean" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string", maxLength: 160 },
          },
        },
      },
    },
  });

  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error("The classifier returned no content");
  return classificationSchema.parse(JSON.parse(content));
};
