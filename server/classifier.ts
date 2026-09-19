import OpenAI from "openai";

import {
  ClassificationResult,
  classificationSchema,
} from "./schema";

const SYSTEM_PROMPT = `You classify whether a casual in-person conversation has become boring enough that a participant might reasonably want a graceful exit.

Mark boring=true only when the excerpt shows clear low engagement: repetitive small talk, stalled exchanges, perfunctory replies, repeated topics, or a prolonged one-sided monologue. A neutral excerpt is not automatically boring.

Safety rules:
- Always return boring=false for distress, conflict, threats, harassment, medical, legal, or safety-sensitive situations.
- Never infer protected traits or relationships not stated in the excerpt.
- Keep the reason neutral, specific, and under 20 words.
- suggestedPreset may be partner, boss, family, custom, or null.

Return only JSON matching the supplied schema.`;

export type Classifier = (text: string) => Promise<ClassificationResult>;

export const classifyConversation: Classifier = async (text) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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
          required: [
            "boring",
            "confidence",
            "reason",
            "suggestedPreset",
          ],
          properties: {
            boring: { type: "boolean" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string", maxLength: 160 },
            suggestedPreset: {
              anyOf: [
                {
                  type: "string",
                  enum: ["partner", "boss", "family", "custom"],
                },
                { type: "null" },
              ],
            },
          },
        },
      },
    },
  });

  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error("The classifier returned no content");
  return classificationSchema.parse(JSON.parse(content));
};
