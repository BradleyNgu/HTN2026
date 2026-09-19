import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(),
  consumePendingTrigger: vi.fn(),
  addListener: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android", Version: 35 },
  PermissionsAndroid: {
    PERMISSIONS: {
      RECORD_AUDIO: "android.permission.RECORD_AUDIO",
      POST_NOTIFICATIONS: "android.permission.POST_NOTIFICATIONS",
    },
    RESULTS: { GRANTED: "granted" },
    requestMultiple: vi.fn(),
  },
}));

vi.mock("../modules/background-listener", () => ({
  default: native,
}));

import {
  observeBackgroundStatus,
  startBackgroundListening,
  type BackgroundListenerStatus,
} from "../src/features/background/backgroundListener";

const listeningStatus: BackgroundListenerStatus = {
  active: true,
  phase: "listening" as const,
  startedAt: 100,
  wordsHeard: 12,
  recentText: "the latest recognized words",
  lastError: null,
};

describe("background listener bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.getStatus.mockReturnValue(listeningStatus);
    native.start.mockReturnValue(listeningStatus);
  });

  it("forwards complete startup options to native Android", () => {
    const options = {
      callerId: "caller-1",
      callerName: "Jamie",
      callerRelationship: "Audio call",
      sensitivity: "medium" as const,
      triggerDelaySeconds: 2,
      apiUrl: "https://example.test",
      locale: "en-US",
      callType: "mom" as const,
    };
    expect(startBackgroundListening(options)).toEqual(listeningStatus);
    expect(native.start).toHaveBeenCalledWith(options);
  });

  it("synchronizes immediately and applies native status events", () => {
    const listener = vi.fn();
    let eventListener: ((status: BackgroundListenerStatus) => void) | undefined;
    native.addListener.mockImplementation(
      (_event: string, callback: (status: BackgroundListenerStatus) => void) => {
        eventListener = callback;
        return { remove: vi.fn() };
      },
    );

    observeBackgroundStatus(listener);
    expect(listener).toHaveBeenCalledWith(listeningStatus);

    const reconnecting = {
      ...listeningStatus,
      phase: "reconnecting" as const,
      lastError: "Speech recognizer error 7",
    };
    eventListener?.(reconnecting);
    expect(listener).toHaveBeenLastCalledWith(reconnecting);
  });
});
