import { TRANSCRIPT_BUFFER_MAX_ENTRIES, TRANSCRIPT_BUFFER_MS } from "@/config/constants";

/**
 * The rolling buffer mode one matches against.
 *
 * It holds text, never audio. No audio is written to disk, ever, and no audio
 * is transmitted in mode one (PROJECT.md section 5). The sharper exposure is not
 * the resident, it is the cleaners, nurses, physios and visitors who consented
 * to nothing, and the only answer that survives a care home compliance officer
 * is that no recording exists.
 *
 * Practical consequences, enforced here and checked in privacy.test.ts:
 *
 *   - Nothing in this class touches a filesystem, a network, or storage.
 *   - Entries expire on a timer as well as on read, so a quiet room does not
 *     leave the last thing anybody said sitting in memory.
 *   - clear() genuinely drops the references rather than marking them stale.
 */
export interface TranscriptEntry {
  text: string;
  at: number;
}

export class RollingTranscriptBuffer {
  private entries: TranscriptEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private windowMs: number = TRANSCRIPT_BUFFER_MS,
    private maxEntries: number = TRANSCRIPT_BUFFER_MAX_ENTRIES,
  ) {}

  push(text: string, at: number): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.entries.push({ text: trimmed, at });
    this.expire(at);
  }

  /** Everything still inside the window, oldest first, joined for matching. */
  read(at: number): string {
    this.expire(at);
    return this.entries.map((entry) => entry.text).join(" ");
  }

  size(at: number): number {
    this.expire(at);
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }

  /**
   * Drop everything outside the window. Called on every push and read, and on
   * an interval when started, so silence still empties the buffer.
   */
  private expire(at: number): void {
    const cutoff = at - this.windowMs;
    let firstLive = 0;
    while (firstLive < this.entries.length && this.entries[firstLive].at < cutoff) {
      firstLive += 1;
    }
    if (firstLive > 0) this.entries = this.entries.slice(firstLive);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }
  }

  /** Start the idle expiry timer. Returns a stop function. */
  start(now: () => number = () => Date.now()): () => void {
    if (this.timer) return () => this.stop();
    this.timer = setInterval(() => this.expire(now()), this.windowMs);
    return () => this.stop();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clear();
  }
}
