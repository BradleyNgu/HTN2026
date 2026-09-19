import { z } from "zod";

export const classifyRequestSchema = z.object({
  text: z.string().trim().min(20).max(1500),
  windowId: z.number().int().positive(),
});

export const classificationSchema = z.object({
  boring: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(160),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;
