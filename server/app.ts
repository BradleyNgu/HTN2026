import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  Classifier,
  classifyConversation,
} from "./classifier";
import {
  PhoneCallType,
  TwilioCallError,
  callConfiguredRecipient,
} from "./interruptions";
import { callRequestSchema, classifyRequestSchema } from "./schema";

export type PhoneCaller = (callType: PhoneCallType) => Promise<string>;

export function createApp(
  classifier: Classifier = classifyConversation,
  callRecipient: PhoneCaller = callConfiguredRecipient,
) {
  const app = express();
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin:
        allowedOrigins.length === 0
          ? false
          : (origin, callback) => {
              callback(
                null,
                !origin || allowedOrigins.includes(origin),
              );
            },
    }),
  );
  app.use(express.json({ limit: "8kb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.post(
    "/classify",
    rateLimit({
      windowMs: 60_000,
      limit: 8,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many classification requests" },
    }),
    async (request, response) => {
      const parsed = classifyRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: "Invalid transcript window" });
        return;
      }

      try {
        const result = await classifier(parsed.data.text);
        response.setHeader("Cache-Control", "no-store");
        response.json({ windowId: parsed.data.windowId, ...result });
      } catch (error) {
        const isMissingKey =
          error instanceof Error &&
          error.message === "OPENAI_API_KEY is not configured";
        response
          .status(isMissingKey ? 503 : 502)
          .json({ error: "Classification is temporarily unavailable" });
      }
    },
  );

  app.post(
    "/call",
    rateLimit({
      windowMs: 10 * 60_000,
      limit: 3,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many call requests" },
    }),
    async (request, response) => {
      const parsed = callRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: "Invalid call request" });
        return;
      }

      try {
        await callRecipient(parsed.data.callType);
        response.setHeader("Cache-Control", "no-store");
        response.status(202).json({ ok: true });
      } catch (error) {
        if (error instanceof TwilioCallError) {
          console.error("Twilio rejected call", {
            status: error.status,
            code: error.code,
          });
          response.status(502).json({
            error: "Twilio rejected the phone call",
            code: error.code,
          });
          return;
        }
        if (error instanceof Error && error.message.includes(" is not set.")) {
          console.error("Twilio call configuration is incomplete");
          response.status(503).json({
            error: "Phone call configuration is incomplete",
          });
          return;
        }
        console.error("Phone call failed before completion");
        response
          .status(502)
          .json({ error: "Phone call is temporarily unavailable" });
      }
    },
  );

  return app;
}
