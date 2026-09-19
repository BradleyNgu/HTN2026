import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useRef, useState } from "react";

type Options = {
  onWords: (text: string) => void;
};

function newWords(previous: string, next: string) {
  const oldWords = previous.trim().split(/\s+/).filter(Boolean);
  const nextWords = next.trim().split(/\s+/).filter(Boolean);
  let shared = 0;

  while (
    shared < oldWords.length &&
    shared < nextWords.length &&
    oldWords[shared].toLowerCase() === nextWords[shared].toLowerCase()
  ) {
    shared += 1;
  }

  if (shared === oldWords.length) {
    return nextWords.slice(shared).join(" ");
  }

  // A much shorter transcript is normally a new utterance, not a correction.
  if (nextWords.length < oldWords.length / 2) {
    return nextWords.join(" ");
  }

  return "";
}

export function useSpeechTranscription({ onWords }: Options) {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previousTranscript = useRef("");
  const wantsRecognition = useRef(false);
  const usesOnlineFallback = useRef(false);

  const beginNativeRecognition = useCallback(() => {
    previousTranscript.current = "";
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: !usesOnlineFallback.current,
      addsPunctuation: true,
      recordingOptions: { persist: false },
      volumeChangeEventOptions: { enabled: true, intervalMillis: 400 },
    });
  }, []);

  useSpeechRecognitionEvent("start", () => {
    setIsRecognizing(true);
    setError(null);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim() ?? "";
    if (!transcript) return;

    const delta = newWords(previousTranscript.current, transcript);
    if (delta) onWords(delta);
    previousTranscript.current = transcript;
    setPartialTranscript(transcript);
  });

  useSpeechRecognitionEvent("error", (event) => {
    const expectedSilence =
      event.error === "no-speech" || event.error === "speech-timeout";
    const offlineUnavailable =
      event.error === "language-not-supported" ||
      event.error === "service-not-allowed";

    if (
      offlineUnavailable &&
      !usesOnlineFallback.current &&
      wantsRecognition.current
    ) {
      usesOnlineFallback.current = true;
      setError("Offline recognition unavailable; switching to online speech recognition.");
      ExpoSpeechRecognitionModule.abort();
      return;
    }

    if (
      event.error === "not-allowed" ||
      event.error === "language-not-supported" ||
      event.error === "service-not-allowed"
    ) {
      wantsRecognition.current = false;
    }

    if (!expectedSilence && event.error !== "aborted") {
      setError(event.message || `Speech recognition error: ${event.error}`);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setIsRecognizing(false);
    previousTranscript.current = "";
    if (wantsRecognition.current) {
      setTimeout(() => {
        if (wantsRecognition.current) beginNativeRecognition();
      }, 350);
    }
  });

  const start = useCallback(async () => {
    setError(null);
    usesOnlineFallback.current =
      !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError(
        "Microphone and speech recognition access are required for a live session.",
      );
      return false;
    }

    wantsRecognition.current = true;
    beginNativeRecognition();
    return true;
  }, [beginNativeRecognition]);

  const stop = useCallback(() => {
    wantsRecognition.current = false;
    setPartialTranscript("");
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const abort = useCallback(() => {
    wantsRecognition.current = false;
    setPartialTranscript("");
    ExpoSpeechRecognitionModule.abort();
  }, []);

  return {
    isRecognizing,
    partialTranscript,
    error,
    start,
    stop,
    abort,
  };
}
