import type { AnswerPolicy } from "./types";

/**
 * Whether a person has been set up, and what "set up" means here.
 *
 * PROJECT.md section 6: "The family sets the policy per person during setup, as
 * an explicit choice, not a default they discover later." That sentence has
 * three separate requirements in it, and only the first is about a screen.
 *
 * The signal is the absence of an answer policy row, which is why the schema
 * carries "No database default. The family chooses this explicitly at setup" on
 * `answer_policies.default_mode`. A column default would have made this
 * unanswerable: every person would arrive already holding a choice nobody made,
 * and there would be no way left to tell a deliberate gentle-redirection from
 * an untouched one.
 *
 * So this is not a progress tracker and there is no percentage anywhere. It
 * answers one question: has a person decided what this device says about the
 * dead, or has nobody yet.
 */

/*
 * One step, because there is one question. An earlier draft listed a "who"
 * step that nothing implemented, which reads as a two step wizard to the next
 * person who opens this file. Add a step here when a screen exists for it.
 */
export const SETUP_STEPS = ["policy"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/**
 * True once a family member has made the choice themselves.
 *
 * Note what this deliberately does not accept as evidence: a policy whose mode
 * happens to equal the fallback. `domain/answer-policy` falls back to gentle
 * redirection when a record genuinely has none, and that fallback exists so the
 * device is safe before setup rather than to stand in for a decision.
 */
export function setupComplete(
  policy: AnswerPolicy | null | undefined,
): policy is AnswerPolicy {
  return Boolean(policy);
}

/** The step to land on, or null when there is nothing left to do. */
export function nextSetupStep(policy: AnswerPolicy | null | undefined): SetupStep | null {
  return setupComplete(policy) ? null : "policy";
}
