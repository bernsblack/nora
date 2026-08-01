import type { Language } from "@/domain/types";

/**
 * Mode two, the invoked cloud backed path (PROJECT.md section 5). Interface
 * only. Nothing calls it, nothing is wired to it, and it stays that way until
 * the open question in section 5 has an answer: whether the invoked path sends
 * audio or sends text transcribed on device.
 *
 * The interface takes text, not audio, which is not a neutral choice. It is the
 * defensible one, and putting it in the type makes choosing the other option a
 * visible decision rather than a default that happens because audio was easier
 * to plumb.
 */

export interface ConversationTurn {
  /** What was said, as text. Never audio. */
  said: string;
  language: Language;
}

export interface ConversationContext {
  voiceName: string;
  preferredName: string;
  /** What is on the screen right now, so the reply cannot contradict it. */
  dayAndPartOfDay: string;
  location: string | null;
  nextThing: string | null;
  /**
   * Subjects the family has marked sensitive, with the resolved wording the
   * policy engine would have used. The conversation layer must not be free to
   * improvise on these.
   */
  sensitiveSubjects: { name: string; permittedAnswer: string }[];
}

export interface ConversationEngine {
  reply(turn: ConversationTurn, context: ConversationContext): Promise<string | null>;
}

/**
 * Returns nothing. Silence beats a wrong answer, so the placeholder for an
 * unimplemented conversation engine is silence rather than a cheerful stub that
 * would look like it works.
 */
export class SilentConversationEngine implements ConversationEngine {
  async reply(): Promise<string | null> {
    return null;
  }
}

/** Scripted replies for tests. */
export class MockConversationEngine implements ConversationEngine {
  constructor(private replies: string[] = []) {}
  private index = 0;

  async reply(): Promise<string | null> {
    const next = this.replies[this.index];
    this.index += 1;
    return next ?? null;
  }
}

export function getConversationEngine(): ConversationEngine {
  return new SilentConversationEngine();
}
