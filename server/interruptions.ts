import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

export const ENV_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".env",
);

let loadedPath: string | null = null;

/**
 * Copy `KEY=value` pairs from `envPath` into the process environment.
 *
 * Values already present in the environment win, so real environment
 * variables keep overriding the local file.
 */
export function loadEnv(envPath: string = ENV_PATH): void {
  if (loadedPath === envPath) return;
  loadDotenv({ path: envPath, override: false });
  loadedPath = envPath;
}

/** Return the environment variable `name`, or explain how to set it. */
export function requireEnv(name: string): string {
  loadEnv();
  const value = process.env[name]?.trim() ?? "";
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to ${ENV_PATH} (see .env.example).`,
    );
  }
  return value;
}

export const PhoneCallType = {
  MOM: "mom",
  BOSS: "boss",
  GIRLFRIEND: "girlfriend",
} as const;

export type PhoneCallType = (typeof PhoneCallType)[keyof typeof PhoneCallType];

export class TwilioCallError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | null,
    message: string,
  ) {
    super(message);
    this.name = "TwilioCallError";
  }
}

export const AUDIO_FILENAMES: Record<PhoneCallType, string> = {
  [PhoneCallType.MOM]: "mom.mp3",
  [PhoneCallType.BOSS]: "boss.mp3",
  [PhoneCallType.GIRLFRIEND]: "girlfriend.mp3",
};

/** Twilio-owned numbers that place the outbound call (From), by alert type. */
export const CALLER_FROM_ENV_NAMES: Record<PhoneCallType, string> = {
  [PhoneCallType.MOM]: "TWILIO_RECIPIENT_MOM",
  [PhoneCallType.BOSS]: "TWILIO_RECIPIENT_BOSS",
  [PhoneCallType.GIRLFRIEND]: "TWILIO_RECIPIENT_GIRLFRIEND",
};

export const GITHUB_AUDIO_BASE_URL =
  "https://raw.githubusercontent.com/BradleyNgu/HTN2026/interruptions/audio";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function validateE164(phoneNumber: string, parameterName: string): void {
  if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
    throw new RangeError(
      `${parameterName} must be in E.164 format, e.g. '+14155552671'.`,
    );
  }
}

/**
 * Place a call from `fromNumber` to `toNumber` and play audio for `phoneCallType`.
 *
 * Resolves to the Twilio call SID. Twilio fetches the selected MP3 from GitHub.
 */
export async function phoneCall(
  phoneCallType: PhoneCallType,
  toNumber: string,
  fromNumber: string,
): Promise<string> {
  if (!Object.values(PhoneCallType).includes(phoneCallType)) {
    throw new TypeError("phoneCallType must be a PhoneCallType value.");
  }
  validateE164(toNumber, "toNumber");
  validateE164(fromNumber, "fromNumber");
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");

  const audioUrl = `${GITHUB_AUDIO_BASE_URL}/${AUDIO_FILENAMES[phoneCallType]}`;
  const payload = new URLSearchParams({
    To: toNumber,
    From: fromNumber,
    Twiml: `<Response><Play>${escapeXml(audioUrl)}</Play></Response>`,
  });
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64",
  );

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    let code: number | null = null;
    let message = "Twilio rejected the call request";
    try {
      const parsed = JSON.parse(details) as { code?: number; message?: string };
      code = typeof parsed.code === "number" ? parsed.code : null;
      if (typeof parsed.message === "string") message = parsed.message;
    } catch {
      // Keep the safe fallback rather than returning an unstructured body.
    }
    throw new TwilioCallError(response.status, code, message);
  }

  const body = (await response.json()) as { sid: string };
  return body.sid;
}

export async function callConfiguredRecipient(
  phoneCallType: PhoneCallType,
  toNumber: string,
): Promise<string> {
  // Mom/Boss/Girlfriend numbers place the call; `toNumber` is who rings.
  const fromNumber = requireEnv(CALLER_FROM_ENV_NAMES[phoneCallType]);
  return phoneCall(phoneCallType, toNumber, fromNumber);
}
