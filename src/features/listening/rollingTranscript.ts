export type TranscriptWindow = {
  id: number;
  text: string;
  wordCount: number;
};

export type RollingTranscriptOptions = {
  windowSize?: number;
  stride?: number;
  maxWords?: number;
};

export class RollingTranscriptBuffer {
  private words: string[] = [];
  private wordsAtLastWindow = 0;
  private sequence = 0;
  private readonly windowSize: number;
  private readonly stride: number;
  private readonly maxWords: number;

  constructor(options: RollingTranscriptOptions = {}) {
    this.windowSize = options.windowSize ?? 10;
    this.stride = options.stride ?? 10;
    this.maxWords = options.maxWords ?? 120;
  }

  add(text: string): TranscriptWindow | null {
    const incoming = text
      .trim()
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    if (incoming.length === 0) return null;

    this.words.push(...incoming);
    if (this.words.length > this.maxWords) {
      const removed = this.words.length - this.maxWords;
      this.words.splice(0, removed);
      this.wordsAtLastWindow = Math.max(0, this.wordsAtLastWindow - removed);
    }

    const hasInitialWindow = this.words.length >= this.windowSize;
    const hasAdvanced =
      this.words.length - this.wordsAtLastWindow >= this.stride;

    if (!hasInitialWindow || !hasAdvanced) return null;

    this.wordsAtLastWindow = this.words.length;
    this.sequence += 1;
    const windowWords = this.words.slice(-this.windowSize);

    return {
      id: this.sequence,
      text: windowWords.join(" "),
      wordCount: windowWords.length,
    };
  }

  getRecentText(maxWords = 24) {
    return this.words.slice(-maxWords).join(" ");
  }

  clear() {
    this.words = [];
    this.wordsAtLastWindow = 0;
    this.sequence = 0;
  }
}
