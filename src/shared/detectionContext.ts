/** Default “when to escape” criteria injected into the classifier prompt. */
export const DEFAULT_DETECTION_CONTEXT = `- Someone is pitching, selling, or repeatedly promoting an idea, product, startup, project, business opportunity, or proposal.
- A speaker keeps repeating the same point, explanation, story, claim, or question without adding meaningful information.
- The exchange is repetitive small talk, stalled conversation, perfunctory replies, repeated topics, or a prolonged one-sided monologue.`;

export const DETECTION_CONTEXT_MAX_LENGTH = 1500;

export function resolveDetectionContext(context?: string | null): string {
  const trimmed = context?.trim() ?? "";
  return trimmed || DEFAULT_DETECTION_CONTEXT;
}
