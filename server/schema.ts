import { z } from "zod";

export const classifyRequestSchema = z.object({
  text: z.string().trim().min(20).max(1500),
  windowId: z.number().int().positive(),
  keywords: z.array(z.string().trim().max(80)).max(40).optional().default([]),
});

export const classificationSchema = z.object({
  boring: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(160),
});

export const phoneCallTypeSchema = z.enum(["mom", "boss", "girlfriend"]);

export const callRequestSchema = z.object({
  callType: phoneCallTypeSchema,
}).strict();

export type ClassificationResult = z.infer<typeof classificationSchema>;
