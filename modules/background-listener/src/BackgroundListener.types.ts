export type BackgroundListenerOptions = {
  callerId: string;
  callerName: string;
  callerRelationship: string;
  sensitivity: "low" | "medium" | "high";
  triggerDelaySeconds: number;
  apiUrl: string;
  locale: string;
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
  lastError: string | null;
};

export type BackgroundTrigger = {
  callerId: string;
  callerName: string;
  reason: string;
};

export type PendingBackgroundTrigger = Omit<
  BackgroundTrigger,
  "callerName"
> & {
  triggeredAt: number;
};

export type BackgroundListenerEvents = {
  onStatus: (status: BackgroundListenerStatus) => void;
  onTrigger: (trigger: BackgroundTrigger) => void;
};
