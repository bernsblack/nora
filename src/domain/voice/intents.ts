import type { Language } from "../types";

/**
 * The narrow intent set for mode one (PROJECT.md section 5). These are the
 * questions people actually repeat, not a general grammar. Everything here is
 * matched on device against a rolling text buffer, answered from the same data
 * the screen renders, and works with no network.
 *
 * The brief calls for roughly twenty phrasings each per language. What is here
 * is a working subset, and the honest gap is that it was written rather than
 * collected. Real phrasings have to come from recordings of real residents
 * before mode one is trusted, and Afrikaans especially.
 */

export const INTENT_IDS = [
  "what-day-is-it",
  "where-am-i",
  "when-is-meal",
  "when-is-visit",
  "where-is-person",
  "going-home",
  "who-are-you",
] as const;
export type IntentId = (typeof INTENT_IDS)[number];

export interface Intent {
  id: IntentId;
  phrasings: Record<Language, string[]>;
  /**
   * True when the intent names somebody, which means the matcher has to pull a
   * subject out of the utterance before an answer can be built.
   */
  carriesSubject?: boolean;
}

export const INTENTS: Intent[] = [
  {
    id: "what-day-is-it",
    phrasings: {
      en: [
        "what day is it",
        "what day is it today",
        "which day is it",
        "what is today",
        "is it monday",
        "what time of day is it",
        "is it morning",
        "what date is it",
        "what day are we on",
      ],
      af: [
        "watter dag is dit",
        "wat is vandag",
        "watter dag is dit vandag",
        "is dit maandag",
        "is dit oggend",
        "watter datum is dit",
        "hoe laat is dit",
        "wat is die dag",
      ],
    },
  },
  {
    id: "where-am-i",
    phrasings: {
      en: [
        "where am i",
        "where is this",
        "what is this place",
        "where are we",
        "whose house is this",
        "what place is this",
        "am i at home",
        "where do i live",
      ],
      af: [
        "waar is ek",
        "waar is dit",
        "wat is hierdie plek",
        "waar is ons",
        "wie se huis is dit",
        "is ek by die huis",
        "waar bly ek",
      ],
    },
  },
  {
    id: "when-is-meal",
    phrasings: {
      en: [
        "when is lunch",
        "when is breakfast",
        "when is supper",
        "when is dinner",
        "when do we eat",
        "when is tea",
        "is it time to eat",
        "have i eaten",
        "when is food",
      ],
      af: [
        "wanneer is middagete",
        "wanneer is ontbyt",
        "wanneer is aandete",
        "wanneer eet ons",
        "wanneer is tee",
        "is dit tyd om te eet",
        "het ek geeet",
        "wanneer kom kos",
      ],
    },
  },
  {
    id: "when-is-visit",
    phrasings: {
      en: [
        "when is anna coming",
        "is anyone coming",
        "who is coming today",
        "when will someone come",
        "is anyone visiting",
        "when are they coming",
        "is anyone coming to see me",
      ],
      af: [
        "wanneer kom anna",
        "kom iemand",
        "wie kom vandag",
        "wanneer kom iemand",
        "kom iemand kuier",
        "wanneer kom hulle",
        "kom iemand my sien",
      ],
      // Names in these phrasings are matched loosely, the subject is pulled out
      // separately by the matcher.
    },
    carriesSubject: true,
  },
  {
    id: "where-is-person",
    phrasings: {
      en: [
        "where is jan",
        "where is my husband",
        "where is my wife",
        "where is my mother",
        "where has he gone",
        "where has she gone",
        "why is he not here",
        "when is he coming back",
        "is he alive",
      ],
      af: [
        "waar is jan",
        "waar is my man",
        "waar is my vrou",
        "waar is my ma",
        "waarheen is hy",
        "waarheen is sy",
        "hoekom is hy nie hier nie",
        "wanneer kom hy terug",
        "lewe hy nog",
      ],
    },
    carriesSubject: true,
  },
  {
    id: "going-home",
    phrasings: {
      en: [
        "when am i going home",
        "when can i go home",
        "i want to go home",
        "take me home",
        "why can i not go home",
        "when do i leave",
      ],
      af: [
        "wanneer gaan ek huis toe",
        "wanneer kan ek huis toe gaan",
        "ek wil huis toe gaan",
        "vat my huis toe",
        "hoekom kan ek nie huis toe gaan nie",
        "wanneer gaan ek weg",
      ],
    },
  },
  {
    id: "who-are-you",
    phrasings: {
      en: ["who are you", "what are you", "who is talking", "who said that", "what is your name"],
      af: ["wie is jy", "wat is jy", "wie praat", "wie het dit gese", "wat is jou naam"],
    },
  },
];

export function intentById(id: IntentId): Intent {
  const found = INTENTS.find((intent) => intent.id === id);
  if (!found) throw new Error(`No such intent: ${id}`);
  return found;
}
