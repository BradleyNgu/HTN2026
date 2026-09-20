import type { AlertType } from "@/types";

type TwilioCallType = Exclude<AlertType, "tornado">;

export async function triggerConfiguredPhoneCall(
  callType: TwilioCallType,
  phoneNumber: string,
  signal?: AbortSignal,
) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("Set EXPO_PUBLIC_API_URL before placing phone calls.");
  }
  if (!phoneNumber) {
    throw new Error("Add your phone number before placing a call.");
  }
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callType, phoneNumber }),
    signal,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      code?: number | null;
    } | null;
    const code = body?.code ? ` (Twilio ${body.code})` : "";
    throw new Error(`${body?.error ?? "The phone call could not be placed"}${code}`);
  }
}
