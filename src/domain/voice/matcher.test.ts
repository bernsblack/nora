import { describe, expect, it } from "vitest";
import { INTENT_ADDRESSED_THRESHOLD, INTENT_SPEAK_THRESHOLD } from "@/config/constants";
import type { Language } from "../types";
import { INTENTS } from "./intents";
import { decide, matchIntent, tokenise } from "./matcher";

const LANGUAGES: Language[] = ["af", "en"];
const KNOWN_NAMES = ["Jan", "Anna", "Hannie"];

function match(heard: string) {
  return matchIntent(heard, { knownNames: KNOWN_NAMES, languages: LANGUAGES });
}

describe("every shipped phrasing matches its own intent", () => {
  // If a phrasing does not clear the speak threshold against itself, it is
  // dead weight in the intent set and will never fire in a room either.
  for (const intent of INTENTS) {
    for (const language of LANGUAGES) {
      for (const phrasing of intent.phrasings[language]) {
        it(`${intent.id} (${language}): "${phrasing}"`, () => {
          const result = match(phrasing);
          expect(result?.intent).toBe(intent.id);
          expect(result?.score).toBeGreaterThanOrEqual(INTENT_SPEAK_THRESHOLD);
        });
      }
    }
  }
});

describe("the questions people actually repeat", () => {
  it("hears the question inside a wandering utterance", () => {
    const result = match("oh I am sorry to bother you but what day is it today");
    expect(result?.intent).toBe("what-day-is-it");
    expect(decide(result)).toBe("answer");
  });

  it("hears Afrikaans and English without a toggle", () => {
    expect(match("waar is ek")?.intent).toBe("where-am-i");
    expect(match("where am i")?.intent).toBe("where-am-i");
  });

  it("picks up a subject only when it is a name we were given", () => {
    expect(match("where is jan")?.subjectName).toBe("Jan");
    expect(match("where is gertruida")?.subjectName).toBeUndefined();
  });
});

describe("silence beats a wrong answer", () => {
  it("ignores speech that is not addressed to the device", () => {
    const overheard = [
      "I put the washing in the cupboard",
      "sit hom daar neer asseblief",
      "the weather has been terrible this week",
    ];
    for (const line of overheard) {
      expect(decide(match(line)), line).toBe("ignore");
    }
  });

  it("treats a partial match as addressed rather than answering it", () => {
    const result = match("home");
    expect(result).not.toBeNull();
    if (decide(result) === "answer") {
      throw new Error(`"home" alone scored ${result?.score}, which is too confident`);
    }
  });

  it("keeps the two thresholds ordered", () => {
    expect(INTENT_SPEAK_THRESHOLD).toBeGreaterThan(INTENT_ADDRESSED_THRESHOLD);
  });

  it("ignores an empty room", () => {
    expect(match("")).toBeNull();
    expect(decide(null)).toBe("ignore");
  });
});

describe("tokenising", () => {
  it("keeps interrogatives, which carry the whole signal", () => {
    expect(tokenise("what day is it", "en")).toContain("what");
    expect(tokenise("waar is ek", "af")).toContain("waar");
  });

  it("strips punctuation and accents, and drops stopwords", () => {
    // "dié" normalises to "die", which is an Afrikaans stopword and goes.
    expect(tokenise("Waar is dié plek?", "af")).toEqual(["waar", "plek"]);
  });
});
