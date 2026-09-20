export type BackgroundListenerOptions = {
  callerId: string;
  callerName: string;
  callerRelationship: string;
  sensitivity: "low" | "medium" | "high";
  triggerDelaySeconds: number;
  apiUrl: string;
  locale: string;
  callType: "mom" | "boss" | "girlfriend" | null;
  /** E.164 number that should receive the escape call. */
  phoneNumber: string;
  /** Free-text criteria forwarded to the classifier prompt. */
  detectionContext?: string;
  keywords?: string[];
};

export type BackgroundListenerStatus = {
  active: boolean;
  phase:
    | "idle"
    | "starting"
    | "listening"
    | "evaluating"
    | "reconnecting"
    | "triggered"
    | "error";
  startedAt: number;
  wordsHeard: number;
  recentText: string;
  lastError: string | null;
};

export type BackgroundTrigger = {
  callerId: string;
  callerName: string;
  reason: string;
};

export type BackgroundListenerEvents = {
  onStatus: (status: BackgroundListenerStatus) => void;
  onTrigger: (trigger: BackgroundTrigger) => void;
};
