import type { IntentMatch } from "./matcher";

/**
 * Whether we believe the device was spoken to.
 *
 * This is the input to hard floor 1, "Nora never volunteers a death": the
 * answer policy stays silent about a sensitive subject unless `asked` is true.
 * The floor is fully tested in `src/domain/answer-policy/policy.test.ts` across
 * every mode, and in the running product **it never fires**, because this
 * function has no way to return false.
 *
 * That is stated here, once, rather than left as a bare `true` at each call
 * site, which is how it lived until 2026-08-04. Two literals in two files read
 * as a decision somebody made; a named function with this comment reads as what
 * it is.
 *
 * ## Why there is nothing better to return yet
 *
 * The signals available on a single utterance do not separate the cases.
 *
 * - **Score does not.** "waar is my man" asked by Marta and the same words out
 *   of a television both reduce to the same tokens and both score 1.000. This
 *   was measured while closing the matcher work, and it is the same wall those
 *   four red persona scenarios describe.
 * - **Question form does not.** The population this is built for does not
 *   produce well formed interrogatives. "waar is my man" has no question word
 *   order in either language, and requiring one would fail the people the
 *   product exists for.
 * - **The wizard rig does not**, deliberately. A typed utterance goes through
 *   the recogniser exactly like a heard one, because a rig that took a
 *   different path would stop testing the real one.
 *
 * So this is not a gap that a better implementation of this function closes.
 * It needs a signal that does not exist yet: knowing the device was addressed,
 * which is a microphone and turn taking problem rather than a text one. It is
 * recorded in `personas/FINDINGS.md` under open findings.
 *
 * ## What this means for the floor
 *
 * Floor 1 currently rests on vocabulary overlap rather than on itself. A
 * sentence that reaches the answer policy at all is treated as a question, so
 * the thing that actually stops the device discussing a death with an empty
 * room is that the words have to match closely enough to get here.
 *
 * Do not read the always-true as harmless because nothing has gone wrong yet.
 */
export function wasAddressed(_match: IntentMatch): boolean {
  return true;
}
