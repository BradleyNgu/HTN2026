import { describe, expect, it, vi } from "vitest";

import {
  cleanupCallMedia,
  isSupportedMp3,
  resolveCallAudio,
} from "../src/features/escape/callAudio";
import { CallerProfile } from "../src/types";

const caller: CallerProfile = {
  id: "caller-1",
  name: "Jamie",
  relationship: "WhatsApp audio",
  initials: "J",
  fallbackScript: "Please step outside.",
  audio: {
    uri: "file:///documents/caller-audio/jamie.mp3",
    fileName: "jamie.mp3",
  },
  createdAt: 1,
};

describe("caller audio", () => {
  it("accepts MP3 names and MIME types", () => {
    expect(isSupportedMp3("voice.MP3")).toBe(true);
    expect(isSupportedMp3("voice", "audio/mpeg")).toBe(true);
    expect(isSupportedMp3("voice.wav", "audio/wav")).toBe(false);
  });

  it("uses the managed MP3 when the file exists", () => {
    expect(resolveCallAudio(caller, () => true)).toEqual({
      kind: "mp3",
      uri: caller.audio?.uri,
      fileName: "jamie.mp3",
    });
  });

  it("falls back safely when the managed file is missing", () => {
    expect(resolveCallAudio(caller, () => false)).toEqual({
      kind: "fallback",
      script: caller.fallbackScript,
    });
  });

  it("stops every media channel during call cleanup", () => {
    const controls = {
      pauseAudio: vi.fn(),
      stopSpeech: vi.fn(),
      cancelVibration: vi.fn(),
      clearRing: vi.fn(),
    };
    cleanupCallMedia(controls);
    Object.values(controls).forEach((control) =>
      expect(control).toHaveBeenCalledOnce(),
    );
  });
});
