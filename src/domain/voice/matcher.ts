import { INTENT_ADDRESSED_THRESHOLD, INTENT_SPEAK_THRESHOLD } from "@/config/constants";
import { LANGUAGES, type Language } from "../types";
import { INTENTS, type IntentId } from "./intents";

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

/** Tokens that carry no discriminating signal. Interrogatives are never here. */
const STOPWORDS: Record<Language, Set<string>> = {
  en: new Set([
    "the", "a", "an", "is", "are", "am", "was", "were", "be", "do", "does", "did",
    "it", "to", "of", "my", "me", "i", "we", "us", "and", "that", "this", "there",
    "please", "just", "now", "so", "well",
  ]),
  af: new Set([
    "die", "n", "is", "was", "ek", "my", "jy", "jou", "dit", "se", "te", "vir",
    "ons", "en", "dat", "hierdie", "daar", "asseblief", "nou", "so", "nie",
  ]),
};

/** Combining diacritical marks, stripped after NFD so accents do not block a match. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Weight of recall against precision. Recall dominates, see the note above. */
const RECALL_WEIGHT = 0.7;
const PRECISION_WEIGHT = 1 - RECALL_WEIGHT;

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
  const recall = overlap / phrase.length;
  const precision = overlap / heard.length;
  return RECALL_WEIGHT * recall + PRECISION_WEIGHT * precision;
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
   * Names the device is allowed to recognise: the people in the answer policy
   * and the people on the photos. Nothing else is treated as a name, because
   * inventing a subject from a misheard word is exactly the failure that ends
   * with a voice saying something about a stranger.
   */
  knownNames: string[];
  /** Languages the person speaks. Both are matched at once, never toggled. */
  languages: Language[];
}

/**
 * Find a subject in the utterance. Exact token match against known names only.
 * Also matches a relationship word, which is how the question usually arrives:
 * people ask for "my husband" far more often than they use a first name.
 */
function findSubject(
  heard: string,
  knownNames: string[],
): string | undefined {
  const tokens = new Set(normalise(heard).split(" "));
  return knownNames.find((name) => tokens.has(normalise(name)));
}

export function matchIntent(heard: string, options: MatchOptions): IntentMatch | null {
  const languages = options.languages.length > 0 ? options.languages : [...LANGUAGES];
  let best: IntentMatch | null = null;

  for (const language of languages) {
    const heardTokens = tokenise(heard, language);
    if (heardTokens.length === 0) continue;

    for (const intent of INTENTS) {
      for (const phrasing of intent.phrasings[language]) {
        const score = similarity(heardTokens, tokenise(phrasing, language));
        if (!best || score > best.score) {
          best = { intent: intent.id, score, language };
        }
      }
    }
  }

  if (!best) return null;

  const intent = INTENTS.find((candidate) => candidate.id === best.intent);
  if (intent?.carriesSubject) {
    const subject = findSubject(heard, options.knownNames);
    if (subject) best.subjectName = subject;
  }
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
