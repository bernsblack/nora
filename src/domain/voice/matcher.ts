import { INTENT_ADDRESSED_THRESHOLD, INTENT_SPEAK_THRESHOLD } from "@/config/constants";
import { LANGUAGES, type Language } from "../types";
import { INTENTS, SUBJECT_SLOT, type IntentId } from "./intents";
import type { KnownSubject } from "./subjects";

/**
 * On device intent matching for mode one. No model, no network, no state that
 * outlives the utterance. A match statement with a score, which is all the
 * narrow intent set needs and all a device with no connection can run.
 *
 * The scoring is deliberately recall heavy with a precision penalty: people
 * with dementia produce long, wandering utterances with the question buried in
 * them, and requiring a clean sentence would fail the population we are
 * building for.
 */

/**
 * Tokens that carry no discriminating signal.
 *
 * Pronouns are not on this list, and taking them off it was a fix rather than
 * an oversight. In both languages the pronoun is the whole difference between
 * questions: "waar is ek" is where am I, "waar is my man" is where is my
 * husband, and "waar is my handsak" is a question about a handbag that we
 * cannot answer at all. Strip the pronoun and all three collapse into "waar".
 */
const STOPWORDS: Record<Language, Set<string>> = {
  en: new Set([
    "the", "a", "an", "is", "are", "am", "was", "were", "be", "been",
    "do", "does", "did", "to", "of", "and", "that", "this", "there", "it",
    "please", "just", "so", "well", "then", "now",
  ]),
  af: new Set([
    "die", "n", "is", "was", "wees", "te", "vir", "en", "dat", "hierdie",
    "daar", "asseblief", "so", "nie", "nou", "dan", "al",
  ]),
};

/** Combining diacritical marks, stripped after NFD so accents do not block a match. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Weight of recall against precision. Recall dominates, see the note above. */
const RECALL_WEIGHT = 0.7;
const PRECISION_WEIGHT = 1 - RECALL_WEIGHT;

/**
 * How many content tokens a phrasing has to share with what was heard before a
 * match is worth acting on. One word is a coincidence: "wat" appears in half of
 * everything anybody says, and on its own it once matched "who are you" against
 * a woman saying she did not know what was going on.
 */
export const MIN_EVIDENCE_TOKENS = 2;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenise(text: string, language: Language): string[] {
  return normalise(text)
    .split(" ")
    .filter((token) => token.length > 0 && !STOPWORDS[language].has(token));
}

function similarity(heard: string[], phrase: string[]): number {
  if (phrase.length === 0 || heard.length === 0) return 0;
  const heardSet = new Set(heard);
  const overlap = phrase.filter((token) => heardSet.has(token)).length;
  if (overlap === 0) return 0;

  const recall = overlap / phrase.length;
  const precision = overlap / heard.length;
  const score = RECALL_WEIGHT * recall + PRECISION_WEIGHT * precision;

  // Not enough words in common to be confident, however well they lined up.
  const evidence = Math.min(1, overlap / MIN_EVIDENCE_TOKENS);
  return score * evidence;
}

export interface IntentMatch {
  intent: IntentId;
  score: number;
  /** The language the phrasing that matched was written in. */
  language: Language;
  /** Present when the intent carries a subject and one was recognised. */
  subjectName?: string;
}

export interface MatchOptions {
  /**
   * People the device may recognise being asked about, with the other ways they
   * get asked for. Built by domain/voice/subjects.ts from what the family set
   * up, and nothing else counts.
   */
  subjects: KnownSubject[];
  /** Languages the person speaks. Both are matched at once, never toggled. */
  languages: Language[];
}

interface SlotFilled {
  /** The utterance with any recognised subject replaced by the slot token. */
  text: string;
  subjectName?: string;
}

/**
 * Swap a recognised person for a slot token, so "where is Dorothy" and "waar is
 * my man" both reduce to the one phrasing the intent set has to carry. Longest
 * alias first, so "my husband" wins over a bare name that happens to be inside
 * it.
 */
function fillSubjectSlot(heard: string, subjects: KnownSubject[]): SlotFilled {
  const text = normalise(heard);
  const candidates = subjects
    .flatMap((subject) => [
      { key: normalise(subject.name), name: subject.name },
      ...subject.aliases.map((alias) => ({ key: normalise(alias), name: subject.name })),
    ])
    .filter((candidate) => candidate.key.length > 0)
    .sort((a, b) => b.key.length - a.key.length);

  for (const candidate of candidates) {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(candidate.key)}($|\\s)`);
    if (pattern.test(text)) {
      return {
        text: text.replace(pattern, `$1${SUBJECT_SLOT}$2`),
        subjectName: candidate.name,
      };
    }
  }
  return { text };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchIntent(heard: string, options: MatchOptions): IntentMatch | null {
  const languages = options.languages.length > 0 ? options.languages : [...LANGUAGES];
  const filled = fillSubjectSlot(heard, options.subjects);
  let best: IntentMatch | null = null;

  for (const language of languages) {
    const heardTokens = tokenise(filled.text, language);
    if (heardTokens.length === 0) continue;

    for (const intent of INTENTS) {
      for (const phrasing of intent.phrasings[language]) {
        // A phrasing with a slot in it means nothing when no subject was found.
        if (phrasing.includes(SUBJECT_SLOT) && !filled.subjectName) continue;

        const score = similarity(heardTokens, tokenise(phrasing, language));
        if (!best || score > best.score) {
          best = { intent: intent.id, score, language };
        }
      }
    }
  }

  if (!best) return null;

  const intent = INTENTS.find((candidate) => candidate.id === best.intent);
  if (intent?.carriesSubject && filled.subjectName) best.subjectName = filled.subjectName;
  return best;
}

export type MatchDecision = "answer" | "addressed-not-understood" | "ignore";

/**
 * Silence beats a wrong answer (PROJECT.md section 3). Only the top band ever
 * produces speech. The middle band means we believe we were spoken to and did
 * not understand, which is a screen event, not a spoken one.
 */
export function decide(match: IntentMatch | null): MatchDecision {
  if (!match) return "ignore";
  if (match.score >= INTENT_SPEAK_THRESHOLD) return "answer";
  if (match.score >= INTENT_ADDRESSED_THRESHOLD) return "addressed-not-understood";
  return "ignore";
}
