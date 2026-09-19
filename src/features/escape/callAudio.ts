import { CallerProfile } from "@/types";

export type ResolvedCallAudio =
  | { kind: "mp3"; uri: string; fileName: string }
  | { kind: "fallback"; script: string };

export function isSupportedMp3(name: string, mimeType?: string) {
  return (
    name.toLowerCase().endsWith(".mp3") ||
    mimeType === "audio/mpeg" ||
    mimeType === "audio/mp3"
  );
}

export function resolveCallAudio(
  caller: CallerProfile,
  fileExists: (caller: CallerProfile) => boolean,
): ResolvedCallAudio {
  if (caller.audio && fileExists(caller)) {
    return {
      kind: "mp3",
      uri: caller.audio.uri,
      fileName: caller.audio.fileName,
    };
  }
  return { kind: "fallback", script: caller.fallbackScript };
}

type CallMediaCleanup = {
  pauseAudio: () => void;
  stopSpeech: () => void;
  cancelVibration: () => void;
  clearRing: () => void;
};

export function cleanupCallMedia(controls: CallMediaCleanup) {
  controls.pauseAudio();
  controls.stopSpeech();
  controls.cancelVibration();
  controls.clearRing();
}
