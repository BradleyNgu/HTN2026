import type { AlertType } from "@/types";

type TwilioCallType = Exclude<AlertType, "tornado">;

export async function triggerConfiguredPhoneCall(
  callType: TwilioCallType,
  signal?: AbortSignal,
) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("Set EXPO_PUBLIC_API_URL before placing phone calls.");
  }
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callType }),
    signal,
  });
  if (!response.ok) {
    throw new Error("The phone call could not be placed.");
  }
}
