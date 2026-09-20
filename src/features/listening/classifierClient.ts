import { Classification } from "@/types";

type ClassificationResponse = Classification & { windowId: number };

export async function classifyTranscript(
  text: string,
  windowId: number,
  signal?: AbortSignal,
  keywords: readonly string[] = [],
  detectionContext = "",
): Promise<ClassificationResponse> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error(
      "Set EXPO_PUBLIC_API_URL to the classifier server address.",
    );
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      windowId,
      keywords: keywords.filter((keyword) => keyword.trim().length > 0),
      context: detectionContext.trim(),
    }),
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Could not classify this conversation");
  }

  return (await response.json()) as ClassificationResponse;
}
