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
 * before mode one is trusted, and Afrikaans especially. The persona scenarios
 * in personas/ are a harder test than these phrasings and still not that.
 */

/**
 * Stands in for whoever is being asked about. The matcher swaps a recognised
 * person for this token before scoring, so one phrasing covers every name and
 * every way of saying the relationship. See domain/voice/subjects.ts.
 */
export const SUBJECT_SLOT = "xsubjectx";

export const INTENT_IDS = [
  "what-day-is-it",
  "where-am-i",
  "when-is-meal",
  "when-is-visit",
  "what-happens-next",
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
  /**
   * At least one of these has to be in what was heard before any phrasing here
   * is scored at all.
   *
   * Scoring is a bag of words, so an intent whose phrasings differ from a
   * completely different sentence by one noun cannot defend itself: "ek wil
   * toilet toe gaan" was answered with the going home line because it shares
   * four words of five with "ek wil huis toe gaan". The missing word is the
   * entire meaning, and this is where that gets said out loud rather than left
   * to the arithmetic.
   *
   * Use it only where the intent genuinely turns on specific words. Most do
   * not, and a required token list on a question that can be asked many ways
   * is a recall bug waiting to happen.
   */
  requires?: Record<Language, string[]>;
}

export const INTENTS: Intent[] = [
  {
    id: "what-day-is-it",
    /*
     * No clock questions here. "What time is it" once matched this and
     * answered with the day, and the screen deliberately never shows a clock
     * face, so a question about the hour is one we do not answer at all.
     */
    phrasings: {
      en: [
        "what day is it",
        "what day is it today",
        "which day is it",
        "what is today",
        "is it monday today",
        "is it still morning",
        "what date is it",
        "what day are we on",
        "have i lost a day",
      ],
      af: [
        "watter dag is dit",
        "wat is vandag",
        "watter dag is dit vandag",
        "is dit maandag vandag",
        "is dit nog oggend",
        "watter datum is dit",
        "wat is die dag",
        "watter dag is dit nou weer",
      ],
    },
  },
  {
    /*
     * "is this my house" and "is dit my huis" were removed. A bag of words
     * cannot tell a question from the assertion with the same words in a
     * different order, so "dit is my huis", which is a woman insisting she is
     * at home and asking nothing, scored 1.00 and was answered with a facility
     * name and a room number. Contradicting her unprompted is worse than
     * missing the question, and the question survives in the forms below.
     */
    id: "where-am-i",
    phrasings: {
      en: [
        "where am i",
        "where am i now",
        "where is this place",
        "what is this place",
        "where are we",
        "whose house is this",
        "what place is this",
        "am i at home",
        "where do i live",
      ],
      af: [
        "waar is ek",
        "waar is ek nou",
        "waar is hierdie plek",
        "wat is hierdie plek",
        "waar is ons",
        "wie se huis is dit",
        "is ek by die huis",
        "waar bly ek",
      ],
    },
  },
  {
    /*
     * The clock phrasings live here, and they are why this intent needs a
     * required token. Taking "what time is it" out of the day intent moved the
     * defect rather than closing it: it landed on "what time is lunch" at 0.767
     * and the device answered the time with a meal. A question about the hour
     * is one we do not answer at all, and now the only way into this intent is
     * to name a meal or the act of eating.
     */
    id: "when-is-meal",
    requires: {
      en: ["lunch", "breakfast", "supper", "dinner", "tea", "eat", "eaten", "food"],
      af: ["middagete", "ontbyt", "aandete", "tee", "eet", "geeet", "kos"],
    },
    phrasings: {
      en: [
        "when is lunch",
        "when is breakfast",
        "when is supper",
        "when is dinner",
        "when is tea",
        "when do we eat",
        "what time is lunch",
        "what time is supper",
        "what time do we eat",
        "is it time to eat",
        "have i eaten",
        "have i eaten today",
        "when is food coming",
      ],
      af: [
        "wanneer is middagete",
        "wanneer is ontbyt",
        "wanneer is aandete",
        "wanneer eet ons",
        "wanneer is tee",
        "hoe laat is middagete",
        "hoe laat eet ons",
        "is dit tyd om te eet",
        "het ek al geeet",
        "het ek al geeet vandag",
        "wanneer kom kos",
      ],
    },
  },
  {
    id: "when-is-visit",
    phrasings: {
      en: [
        `when is ${SUBJECT_SLOT} coming`,
        `is ${SUBJECT_SLOT} coming today`,
        `when will ${SUBJECT_SLOT} be here`,
        "is anyone coming",
        "who is coming today",
        "when will someone come",
        "is anyone visiting",
        "is anyone coming to see me",
        "is anybody coming today",
      ],
      af: [
        `wanneer kom ${SUBJECT_SLOT}`,
        `kom ${SUBJECT_SLOT} vandag`,
        `wanneer is ${SUBJECT_SLOT} hier`,
        "kom iemand",
        "wie kom vandag",
        "wanneer kom iemand",
        "kom iemand kuier",
        "kom daar iemand kuier",
        "kom iemand my sien",
      ],
    },
    carriesSubject: true,
  },
  {
    /*
     * What is happening next, which is the line already on the screen. Added
     * after a persona test found that "when is the physio coming" matched
     * nothing: the intent set had meals and visits and no way to ask about the
     * appointment sitting between them.
     */
    id: "what-happens-next",
    phrasings: {
      en: [
        "what is happening today",
        "what happens now",
        "what is next",
        "what am i doing today",
        "what is on today",
        "when is the physio",
        "when is the physio coming",
        "when is the doctor coming",
        "when is my appointment",
        "what is happening this afternoon",
      ],
      af: [
        "wat gebeur vandag",
        "wat gebeur nou",
        "wat is volgende",
        "wat doen ons vandag",
        "wat is vandag aan",
        "wanneer is die fisio",
        "wanneer kom die dokter",
        "wanneer is my afspraak",
        "wat gebeur vanmiddag",
      ],
    },
  },
  {
    id: "where-is-person",
    phrasings: {
      en: [
        `where is ${SUBJECT_SLOT}`,
        `where has ${SUBJECT_SLOT} gone`,
        `why is ${SUBJECT_SLOT} not here`,
        `when is ${SUBJECT_SLOT} coming back`,
        `is ${SUBJECT_SLOT} alive`,
        `have you seen ${SUBJECT_SLOT}`,
        `i want ${SUBJECT_SLOT}`,
      ],
      af: [
        `waar is ${SUBJECT_SLOT}`,
        `waarheen is ${SUBJECT_SLOT}`,
        `hoekom is ${SUBJECT_SLOT} nie hier nie`,
        `wanneer kom ${SUBJECT_SLOT} terug`,
        `lewe ${SUBJECT_SLOT} nog`,
        `het jy ${SUBJECT_SLOT} gesien`,
        `ek soek ${SUBJECT_SLOT}`,
      ],
    },
    carriesSubject: true,
  },
  {
    /*
     * Required tokens because every phrasing here is one noun away from an
     * ordinary sentence about going somewhere else. "ek wil toilet toe gaan"
     * scored 0.80 and "wanneer gaan ek dood" scored 0.75, and both were
     * answered "you are staying here, you are safe", which to the woman who
     * needs the toilet reads as a refusal and to the woman asking whether she
     * is dying is not a thing a device may answer at all.
     */
    id: "going-home",
    requires: { en: ["home", "leave"], af: ["huis", "weg"] },
    phrasings: {
      en: [
        "when am i going home",
        "when can i go home",
        "i want to go home",
        "i want to go home now",
        "take me home",
        "why can i not go home",
        "when do i leave",
        "can i go home today",
      ],
      af: [
        "wanneer gaan ek huis toe",
        "wanneer kan ek huis toe gaan",
        "ek wil huis toe gaan",
        "ek wil nou huis toe gaan",
        "vat my huis toe",
        "hoekom kan ek nie huis toe gaan nie",
        "wanneer gaan ek weg",
        "kan ek vandag huis toe gaan",
      ],
    },
  },
  {
    id: "who-are-you",
    phrasings: {
      en: [
        "who are you",
        "who are you then",
        "what are you",
        "who is talking",
        "who said that",
        "what is your name",
      ],
      af: [
        "wie is jy",
        "wie is jy dan",
        "wat is jy",
        "wie praat",
        "wie het dit gese",
        "wat is jou naam",
      ],
    },
  },
];

export function intentById(id: IntentId): Intent {
  const found = INTENTS.find((intent) => intent.id === id);
  if (!found) throw new Error(`No such intent: ${id}`);
  return found;
}
