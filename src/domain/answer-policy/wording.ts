import { MAX_SPOKEN_SENTENCES, MAX_SPOKEN_WORDS } from "@/config/constants";
import type { AnswerPolicyMode, Language, LocalizedText, TopicSituation } from "../types";

/**
 * Guards on text a family member wrote. The engine will use family wording
 * verbatim, which is the point of letting them write it, so these checks are
 * the only thing standing between a well meant sentence and a hard floor being
 * broken in a bedroom (PROJECT.md section 6).
 *
 * Term matching is crude on purpose. It is a guard, not a classifier, and it
 * runs against short sentences a person typed into a form. When it is unsure it
 * should say so and let the family app ask a human to look again.
 */

/** Words that name a death. Present tense and past, both languages. */
const DEATH_TERMS: Record<Language, string[]> = {
  en: [
    "dead",
    "died",
    "dies",
    "dying",
    "death",
    "passed away",
    "passed on",
    "funeral",
    "grave",
    "buried",
    "heaven",
    "no longer with us",
  ],
  af: [
    "dood",
    "gesterf",
    "sterf",
    "oorlede",
    "afgesterwe",
    "begrafnis",
    "graf",
    "begrawe",
    "hemel",
    "nie meer by ons nie",
  ],
};

/**
 * Phrases that imply the subject is alive and will return. Only ever checked
 * against sentences that name the subject, so a sentence about someone else
 * coming to visit does not trip it.
 */
const ALIVE_IMPLYING_TERMS: Record<Language, string[]> = {
  en: [
    "will be back",
    "is coming back",
    "is on his way",
    "is on her way",
    "is at work",
    "is at the shop",
    "is out",
    "will visit",
    "is coming home",
    "is sleeping",
    "is fine",
    "is well",
  ],
  af: [
    "kom terug",
    "sal terug wees",
    "is op pad",
    "is by die werk",
    "is by die winkel",
    "is uit",
    "sal kom kuier",
    "kom huis toe",
    "slaap",
    "is gesond",
    "gaan goed",
  ],
};

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function countWords(text: string): number {
  return normalise(text).split(" ").filter(Boolean).length;
}

/** True when the text names a death in any of the given languages. */
export function mentionsDeath(text: string, languages: Language[]): boolean {
  const haystack = normalise(text);
  return languages.some((language) =>
    DEATH_TERMS[language].some((term) => haystack.includes(term)),
  );
}

/**
 * True when the text implies the subject is alive. Scoped to sentences naming
 * the subject, because "Anna is coming later" says nothing about Jan.
 */
export function impliesAlive(
  text: string,
  subjectName: string,
  languages: Language[],
): boolean {
  const subject = normalise(subjectName);
  return splitSentences(text)
    .filter((sentence) => normalise(sentence).includes(subject))
    .some((sentence) => {
      const haystack = normalise(sentence);
      return languages.some((language) =>
        ALIVE_IMPLYING_TERMS[language].some((term) => haystack.includes(term)),
      );
    });
}

/** Cut to the spoken length limits. Never mid sentence. */
export function trimToSpokenLength(text: string): string {
  const sentences = splitSentences(text).slice(0, MAX_SPOKEN_SENTENCES);
  const kept: string[] = [];
  let words = 0;
  for (const sentence of sentences) {
    const cost = countWords(sentence);
    if (kept.length > 0 && words + cost > MAX_SPOKEN_WORDS) break;
    kept.push(sentence);
    words += cost;
  }
  return kept.join(" ");
}

export interface WordingProblem {
  /** Kebab-case so it can be looked up for a message in the family app. */
  code:
    | "too-long"
    | "mentions-death-under-validation"
    | "mentions-death-under-redirection"
    | "implies-alive-under-truthfulness"
    | "empty";
  language: Language;
}

/**
 * Validate wording at the point the family writes it, so the failure lands in a
 * form they are looking at rather than in a bedroom at 3am. The engine repeats
 * these checks at read time, because a policy can be written before a mode is
 * changed underneath it.
 */
export function validateFamilyWording(
  wording: LocalizedText,
  mode: AnswerPolicyMode,
  situation: TopicSituation,
  subjectName: string,
  languages: Language[],
): WordingProblem[] {
  const problems: WordingProblem[] = [];

  for (const language of languages) {
    const text = wording[language]?.trim();
    if (text === undefined) continue;
    if (text === "") {
      problems.push({ code: "empty", language });
      continue;
    }

    if (
      splitSentences(text).length > MAX_SPOKEN_SENTENCES ||
      countWords(text) > MAX_SPOKEN_WORDS
    ) {
      problems.push({ code: "too-long", language });
    }

    if (mentionsDeath(text, languages) && mode !== "truthful") {
      problems.push({
        code:
          mode === "validation"
            ? "mentions-death-under-validation"
            : "mentions-death-under-redirection",
        language,
      });
    }

    if (
      mode === "truthful" &&
      situation === "deceased" &&
      impliesAlive(text, subjectName, languages)
    ) {
      problems.push({ code: "implies-alive-under-truthfulness", language });
    }
  }

  return problems;
}
