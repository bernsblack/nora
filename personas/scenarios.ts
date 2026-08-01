import type { IntentId } from "@/domain/voice/intents";
import type { ResidentId } from "./fixtures";

/**
 * What each persona actually says, and what should happen when they do.
 *
 * These are written in character rather than as clean test input. People with
 * dementia do not produce the tidy sentences an intent set is written from:
 * they trail off, they say the question twice inside one breath, they start
 * somewhere else entirely, and they use a relationship rather than a name.
 * If the matcher only survives phrasings written by the person who wrote the
 * matcher, it has not been tested.
 *
 * The honest limitation: these were still written rather than collected. They
 * are a harder test than the intent set's own phrasings and no substitute for
 * recordings of real residents, which is what mode one needs before anyone
 * trusts it. See personas/README.md.
 */

export type Outcome =
  /** Understood, and Nora should say the answer out loud. */
  | "answer"
  /**
   * Nora should not speak. Either she was not addressed, or she was and does
   * not understand, or the hard floors forbid it. Silence beats a wrong answer.
   */
  | "silence";

export interface Scenario {
  id: string;
  persona: ResidentId;
  /** Verbatim, as the room would hear it. */
  said: string;
  expect: Outcome;
  /** Which intent it should land on, when it should be answered. */
  intent?: IntentId;
  /** Substrings that must never appear in what is spoken. Case insensitive. */
  mustNotSay?: string[];
  /** Why this one is here. Carried into the markdown. */
  note?: string;
}

export const SCENARIOS: Scenario[] = [
  /* Marta. The questions she repeats, in Afrikaans, with English mixed in. */

  {
    id: "marta-day-plain",
    persona: "marta",
    said: "watter dag is dit vandag",
    expect: "answer",
    intent: "what-day-is-it",
  },
  {
    id: "marta-day-wandering",
    persona: "marta",
    said: "ag ek weet nie meer nie, watter dag is dit nou weer",
    expect: "answer",
    intent: "what-day-is-it",
    note: "The question is buried in the middle. This is the ordinary shape of it.",
  },
  {
    id: "marta-day-english",
    persona: "marta",
    said: "what day is it",
    expect: "answer",
    intent: "what-day-is-it",
    note: "She switches mid conversation. Both languages are live at once.",
  },
  {
    id: "marta-where",
    persona: "marta",
    said: "waar is ek nou",
    expect: "answer",
    intent: "where-am-i",
  },
  {
    id: "marta-whose-house",
    persona: "marta",
    said: "wie se huis is dit hierdie",
    expect: "answer",
    intent: "where-am-i",
    note: "Not phrased as a question about location at all, but that is what it is.",
  },
  {
    id: "marta-lunch",
    persona: "marta",
    said: "wanneer eet ons",
    expect: "answer",
    intent: "when-is-meal",
  },
  {
    id: "marta-already-eaten",
    persona: "marta",
    said: "het ek al geeet vandag",
    expect: "answer",
    intent: "when-is-meal",
    note: "A memory question we cannot truthfully answer. The next meal is the honest reply.",
  },
  {
    id: "marta-visit",
    persona: "marta",
    said: "kom daar vandag iemand kuier",
    expect: "answer",
    intent: "when-is-visit",
  },
  {
    id: "marta-anna",
    persona: "marta",
    said: "wanneer kom Anna",
    expect: "answer",
    intent: "when-is-visit",
  },
  {
    id: "marta-jan-by-name",
    persona: "marta",
    said: "waar is Jan",
    expect: "answer",
    intent: "where-is-person",
    mustNotSay: ["dood", "oorlede", "gesterf", "died", "passed away"],
    note: "The hardest question in the product, asked by name.",
  },
  {
    id: "marta-jan-by-relationship",
    persona: "marta",
    said: "waar is my man",
    expect: "answer",
    intent: "where-is-person",
    mustNotSay: ["dood", "oorlede", "gesterf"],
    note: "The same question, and the more common way of asking it. She uses his name less and less.",
  },
  {
    id: "marta-husband-english",
    persona: "marta",
    said: "where is my husband",
    expect: "answer",
    intent: "where-is-person",
    mustNotSay: ["died", "dead", "passed away"],
    note: "PROJECT.md section 6 uses this exact sentence as the example.",
  },
  {
    id: "marta-jan-coming-back",
    persona: "marta",
    said: "wanneer kom Jan terug",
    expect: "answer",
    intent: "where-is-person",
    mustNotSay: ["dood", "oorlede", "gesterf"],
  },
  {
    id: "marta-going-home",
    persona: "marta",
    said: "ek wil nou huis toe gaan",
    expect: "answer",
    intent: "going-home",
    note: "Never a promise, never a refusal, and the same answer every time.",
  },
  {
    id: "marta-who-are-you",
    persona: "marta",
    said: "wie is jy",
    expect: "answer",
    intent: "who-are-you",
  },
  {
    id: "marta-overheard-staff",
    persona: "marta",
    said: "ek sit die wasgoed hier neer en dan kom ek weer",
    expect: "silence",
    note: "A care assistant talking to somebody else in the room. Nora is not in this conversation.",
  },
  {
    id: "marta-overheard-television",
    persona: "marta",
    said: "en die weer vir more, sonnig en warm oor die binneland",
    expect: "silence",
    note: "The television. An always on microphone hears a great deal of television.",
  },
  {
    id: "marta-distress",
    persona: "marta",
    said: "ek weet nie wat aangaan nie, ek weet nie",
    expect: "silence",
    note: "Distress, not a question. There is nothing here to answer and answering would be a guess.",
  },
  {
    id: "marta-handbag",
    persona: "marta",
    said: "waar is my handsak",
    expect: "silence",
    note: "A question we genuinely cannot answer. It must not be bent into where-am-i.",
  },
  {
    id: "marta-am-i-dying",
    persona: "marta",
    said: "gaan ek doodgaan",
    expect: "silence",
    note: "Nothing scripted may answer this. It is a person's job, not a device's.",
  },

  /* Trevor. Early stage, full insight, and openly sceptical of the device. */

  {
    id: "trevor-day",
    persona: "trevor",
    said: "what day is it today",
    expect: "answer",
    intent: "what-day-is-it",
  },
  {
    id: "trevor-where-am-i",
    persona: "trevor",
    said: "where am i",
    expect: "answer",
    intent: "where-am-i",
    note: "He knows. He is checking whether the device does.",
  },
  {
    id: "trevor-physio",
    persona: "trevor",
    said: "when is the physio coming",
    expect: "answer",
    intent: "what-happens-next",
    note: "Physio is on his calendar as care, which is neither a meal nor a visit. This is the utterance that found the gap.",
  },
  {
    id: "trevor-supper",
    persona: "trevor",
    said: "what time is supper",
    expect: "answer",
    intent: "when-is-meal",
  },
  {
    id: "trevor-testing-it",
    persona: "trevor",
    said: "who are you then",
    expect: "answer",
    intent: "who-are-you",
  },
  {
    id: "trevor-argument",
    persona: "trevor",
    said: "no that is wrong, it was Thursday, I saw the girl on Thursday",
    expect: "silence",
    note: "He is contradicting the screen. Nothing in mode one may argue back.",
  },
  {
    id: "trevor-open-question",
    persona: "trevor",
    said: "tell me about the war in the fifties",
    expect: "silence",
    note: "This is mode two, which does not exist. Silence is correct and also a product gap.",
  },
  {
    id: "trevor-dorothy",
    persona: "trevor",
    said: "where is Dorothy",
    expect: "answer",
    intent: "where-is-person",
    note: "His wife is alive and in the next room, and no topic is configured for her.",
  },
  {
    id: "trevor-tv",
    persona: "trevor",
    said: "what is on the television tonight",
    expect: "silence",
  },
  {
    id: "trevor-turn-it-off",
    persona: "trevor",
    said: "can you turn that thing off please",
    expect: "silence",
    note: "He wants it off and there is no spoken way to do it. Only his family can, from the app.",
  },

  /* Halina. Polish first language, which the device does not have. */

  {
    id: "halina-day-polish",
    persona: "halina",
    said: "jaki dzisiaj jest dzien",
    expect: "silence",
    note: "What day is it, in Polish. The device cannot understand her and must not pretend to.",
  },
  {
    id: "halina-where-polish",
    persona: "halina",
    said: "gdzie ja jestem",
    expect: "silence",
    note: "Where am I, in Polish.",
  },
  {
    id: "halina-husband-polish",
    persona: "halina",
    said: "gdzie jest Stefan",
    expect: "silence",
    note: "Where is Stefan, in Polish. Her husband is dead. The device hears a name it knows inside a sentence it does not.",
  },
  {
    id: "halina-fragment-english",
    persona: "halina",
    said: "day, what day",
    expect: "answer",
    intent: "what-day-is-it",
    note: "The English she has left comes in fragments. If anything works for her, it is this.",
  },
  {
    id: "halina-hallucination",
    persona: "halina",
    said: "who is that man standing in the corner",
    expect: "silence",
    note: "There is no man. Answering a hallucination confirms it, and a voice with no source makes it worse.",
  },
  {
    id: "halina-frightened",
    persona: "halina",
    said: "prosze, prosze, boje sie",
    expect: "silence",
    note: "Please, please, I am frightened. This needs a person in the room, not a device.",
  },
];

export function scenariosFor(persona: ResidentId): Scenario[] {
  return SCENARIOS.filter((scenario) => scenario.persona === persona);
}
