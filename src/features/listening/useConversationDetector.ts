import { useCallback, useEffect, useRef, useState } from "react";

import {
  findTriggerKeyword,
  keywordTriggerReason,
} from "@/shared/triggerKeywords";
import { Classification, Sensitivity } from "@/types";
import { classifyTranscript } from "./classifierClient";
import {
  DetectorMachine,
  DetectorSnapshot,
} from "./detectorMachine";
import { RollingTranscriptBuffer } from "./rollingTranscript";
import { useSpeechTranscription } from "./useSpeechTranscription";

type Options = {
  sensitivity: Sensitivity;
  keywords?: readonly string[];
  detectionContext?: string;
  onTrigger: (reason: string) => void;
};

export function useConversationDetector({
  sensitivity,
  keywords = [],
  detectionContext = "",
  onTrigger,
}: Options) {
  const buffer = useRef(new RollingTranscriptBuffer());
  const machine = useRef(new DetectorMachine(sensitivity));
  const controllers = useRef(new Map<number, AbortController>());
  const abortSpeech = useRef<() => void>(() => undefined);
  const triggerCallback = useRef(onTrigger);
  const keywordsRef = useRef(keywords);
  const detectionContextRef = useRef(detectionContext);
  const [snapshot, setSnapshot] = useState<DetectorSnapshot>(
    machine.current.snapshot(),
  );
  const [recentText, setRecentText] = useState("");
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    triggerCallback.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    keywordsRef.current = keywords;
  }, [keywords]);

  useEffect(() => {
    detectionContextRef.current = detectionContext;
  }, [detectionContext]);

  const cancelRequests = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
  }, []);

  const triggerImmediately = useCallback(
    (reason: string) => {
      abortSpeech.current();
      cancelRequests();
      buffer.current.clear();
      setRecentText("");
      setSnapshot(machine.current.triggerManually());
      triggerCallback.current(reason);
    },
    [cancelRequests],
  );

  const handleClassification = useCallback(
    (windowId: number, result: Classification) => {
      const outcome = machine.current.apply(windowId, result);
      setSnapshot(outcome.snapshot);
      if (outcome.triggered) {
        abortSpeech.current();
        cancelRequests();
        buffer.current.clear();
        setRecentText("");
        triggerCallback.current(result.reason);
      }
    },
    [cancelRequests],
  );

  const evaluate = useCallback(
    async (windowId: number, text: string) => {
      const controller = new AbortController();
      controllers.current.set(windowId, controller);
      setSnapshot(machine.current.evaluating());
      setNetworkError(null);

      try {
        const result = await classifyTranscript(
          text,
          windowId,
          controller.signal,
          keywordsRef.current,
          detectionContextRef.current,
        );
        handleClassification(result.windowId, result);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setNetworkError(error.message);
          setSnapshot(machine.current.fail());
        }
      } finally {
        controllers.current.delete(windowId);
      }
    },
    [handleClassification],
  );

  const handleWords = useCallback(
    (text: string) => {
      const nextWindow = buffer.current.add(text);
      const recent = buffer.current.getRecentText();
      setRecentText(recent);
      const triggerKeyword = findTriggerKeyword(recent, keywordsRef.current);
      if (triggerKeyword) {
        triggerImmediately(keywordTriggerReason(triggerKeyword));
        return;
      }
      if (nextWindow) {
        void evaluate(nextWindow.id, nextWindow.text);
      }
    },
    [evaluate, triggerImmediately],
  );

  const speech = useSpeechTranscription({ onWords: handleWords });
  abortSpeech.current = speech.abort;

  const start = useCallback(async () => {
    cancelRequests();
    buffer.current.clear();
    setRecentText("");
    setNetworkError(null);
    setSnapshot(machine.current.start());
    const started = await speech.start();
    if (!started) setSnapshot(machine.current.stop());
    return started;
  }, [cancelRequests, speech]);

  const stop = useCallback(() => {
    cancelRequests();
    speech.abort();
    buffer.current.clear();
    setRecentText("");
    setSnapshot(machine.current.stop());
  }, [cancelRequests, speech]);

  const triggerManually = useCallback(() => {
    triggerImmediately("Manual escape requested");
  }, [triggerImmediately]);

  useEffect(
    () => () => {
      cancelRequests();
      abortSpeech.current();
      buffer.current.clear();
    },
    [cancelRequests],
  );

  return {
    ...snapshot,
    recentText,
    isRecognizing: speech.isRecognizing,
    partialTranscript: speech.partialTranscript,
    error: speech.error ?? networkError,
    start,
    stop,
    triggerManually,
  };
}
