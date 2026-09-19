import OpenAI from "openai";

import {
  ClassificationResult,
  classificationSchema,
} from "./schema";
import {
  findTriggerKeyword,
  keywordTriggerReason,
} from "../src/shared/triggerKeywords";

const SYSTEM_PROMPT = `You classify whether a casual in-person conversation has become boring enough that a participant might reasonably want a graceful exit.

Mark boring=true when the excerpt includes any of these patterns:
- Someone is pitching, selling, or repeatedly promoting an idea, product, startup, project, business opportunity, or proposal.
- A speaker keeps repeating the same point, explanation, story, claim, or question without adding meaningful information.
- The exchange is repetitive small talk, stalled conversation, perfunctory replies, repeated topics, or a prolonged one-sided monologue.

Treat a clear pitch or repetitive speech as sufficient even if the listener's reaction is not included. A neutral, balanced discussion is not automatically boring.

Safety rules:
- Always return boring=false for distress, conflict, threats, harassment, medical, legal, or safety-sensitive situations.
- Never infer protected traits or relationships not stated in the excerpt.
- Keep the reason neutral, specific, and under 20 words.

Return only JSON matching the supplied schema.`;

export type Classifier = (text: string) => Promise<ClassificationResult>;

export const classifyConversation: Classifier = async (text) => {
  const triggerKeyword = findTriggerKeyword(text);
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
