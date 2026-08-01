import { phrases } from "@/i18n/strings";
import {
  resolveText,
  type AnswerPolicy,
  type AnswerPolicyMode,
  type Language,
  type SensitiveTopic,
} from "../types";
import { impliesAlive, mentionsDeath, trimToSpokenLength } from "./wording";

/**
 * What Nora says about the dead, and about anyone else the family has marked as
 * a hard subject (PROJECT.md section 6). This is the highest risk path in the
 * product.
 *
 * Three hard floors hold regardless of any setting:
 *
 *   1. Nora never volunteers a death. Death content requires a direct question
 *      about that subject, asked out loud.
 *   2. Nora never elaborates on one. One short answer, no detail, no follow up.
 *   3. Nora never implies a person is alive when the family chose truthfulness.
 *
 * Every one of those is a branch with a test.
 */

/** Why the engine was asked. Only `asked` intents can reach death content. */
export const SENSITIVE_INTENTS = [
  "where-is-person",
  "when-is-person-coming",
  "is-person-alive",
  "going-home",
] as const;
export type SensitiveIntent = (typeof SENSITIVE_INTENTS)[number];

export interface PolicyRequest {
  intent: SensitiveIntent;
  /** As matched from what was said. Absent for going-home. */
  subjectName?: string;
  /** The language the question came in, which is the language we answer in. */
  language: Language;
  /** Every language the person speaks, for the wording guards. */
  languages: Language[];
  /** False when Nora would be speaking first. Death content requires true. */
  asked: boolean;
  facilityName: string;
}

export interface PolicyAnswer {
  /** What to say out loud. Null means stay silent, which is always allowed. */
  speak: string | null;
  /** What to put on screen. May carry text when speak is null. */
  show: string | null;
  /** Kebab-case rule id, for tests and for instrumenting what actually fires. */
  rule: string;
}

const SILENT: PolicyAnswer = { speak: null, show: null, rule: "silent" };

/**
 * The default when a family has set nothing. Gentle redirection, per PROJECT.md
 * section 6. Never inferred from anything else.
 */
export const DEFAULT_MODE: AnswerPolicyMode = "gentle-redirection";

export function findTopic(
  policy: AnswerPolicy | null,
  subjectName: string | undefined,
): SensitiveTopic | null {
  if (!policy || !subjectName) return null;
  const wanted = subjectName.toLowerCase();
  return (
    policy.topics.find((topic) => topic.subjectName.toLowerCase() === wanted) ?? null
  );
}

export function modeFor(policy: AnswerPolicy | null, topic: SensitiveTopic | null): AnswerPolicyMode {
  return topic?.mode ?? policy?.defaultMode ?? DEFAULT_MODE;
}

/** Truthful wording we fall back to when the family wrote none. Deliberately bare. */
function plainTruth(subjectName: string, language: Language): string {
  return language === "af"
    ? `${subjectName} is oorlede. Ek is jammer. Jy is veilig hier.`
    : `${subjectName} died. I am sorry. You are safe here.`;
}

export function answerSensitive(
  request: PolicyRequest,
  policy: AnswerPolicy | null,
): PolicyAnswer {
  const text = phrases(request.language);

  if (request.intent === "going-home") {
    // Never a promise, never a date, and never a refusal either. Same answer
    // the fortieth time as the first.
    return {
      speak: trimToSpokenLength(text.goingHome(request.facilityName)),
      show: text.goingHome(request.facilityName),
      rule: "going-home",
    };
  }

  const subjectName = request.subjectName;
  if (!subjectName) return SILENT;

  const topic = findTopic(policy, subjectName);

  // Hard floor 1. Nothing sensitive is said unless it was asked for out loud.
  if (!request.asked) return { ...SILENT, rule: "never-volunteer" };

  if (!topic) {
    // Not a configured topic. We know nothing, so we say nothing about them
    // and stay with what is true and present.
    return {
      speak: trimToSpokenLength(text.gentleRedirect(subjectName)),
      show: text.gentleRedirect(subjectName),
      rule: "unknown-subject-redirect",
    };
  }

  const mode = modeFor(policy, topic);
  const familyWording = resolveText(topic.familyWording, request.language, request.languages);

  if (familyWording) {
    const rejected = rejectWording(familyWording, topic, mode, request);
    if (!rejected) {
      return {
        speak: trimToSpokenLength(familyWording),
        show: familyWording,
        rule: `family-wording-${mode}`,
      };
    }
    // Family wording that breaks a floor is dropped, not repaired, and we fall
    // through to a generated answer that we know is safe.
  }

  if (mode === "truthful" && topic.situation === "deceased") {
    // Hard floor 3 is satisfied by construction: this sentence states the death.
    // Hard floor 2 is satisfied by never adding cause, date, or detail.
    return {
      speak: trimToSpokenLength(plainTruth(topic.subjectName, request.language)),
      show: plainTruth(topic.subjectName, request.language),
      rule: "truthful-plain",
    };
  }

  // Validation mode with no family wording would mean inventing a comforting
  // fiction we cannot stand behind, so it degrades to redirection rather than
  // making something up.
  const rule =
    mode === "validation" ? "validation-without-wording-redirect" : "gentle-redirect";
  return {
    speak: trimToSpokenLength(text.gentleRedirect(topic.subjectName)),
    show: text.gentleRedirect(topic.subjectName),
    rule,
  };
}

/**
 * Re-run the write time guards at read time. A family can change the mode after
 * writing wording for it, and the wording that was fine under validation is a
 * floor breach under truthfulness.
 */
function rejectWording(
  wording: string,
  topic: SensitiveTopic,
  mode: AnswerPolicyMode,
  request: PolicyRequest,
): boolean {
  if (mode !== "truthful" && mentionsDeath(wording, request.languages)) return true;
  if (
    mode === "truthful" &&
    topic.situation === "deceased" &&
    impliesAlive(wording, topic.subjectName, request.languages)
  ) {
    return true;
  }
  return false;
}
