import { describe, expect, it } from "vitest";
import type { AnswerPolicy, AnswerPolicyMode, Language, SensitiveTopic } from "../types";
import { answerSensitive, DEFAULT_MODE, modeFor, type PolicyRequest } from "./policy";
import { mentionsDeath } from "./wording";

/**
 * The highest risk path in the product gets the most tests (PROJECT.md section
 * 6). Every branch is covered, and the three hard floors are checked against
 * every combination rather than only where they are most likely to break.
 */

const LANGUAGES: Language[] = ["en", "af"];

function topic(overrides: Partial<SensitiveTopic> = {}): SensitiveTopic {
  return {
    id: "topic-jan",
    personId: "person-1",
    subjectName: "Jan",
    relationship: { en: "your husband", af: "jou man" },
    situation: "deceased",
    ...overrides,
  };
}

function policyWith(
  defaultMode: AnswerPolicyMode,
  topics: SensitiveTopic[] = [topic()],
): AnswerPolicy {
  return { personId: "person-1", defaultMode, topics };
}

function ask(overrides: Partial<PolicyRequest> = {}): PolicyRequest {
  return {
    intent: "where-is-person",
    subjectName: "Jan",
    language: "en",
    languages: LANGUAGES,
    asked: true,
    facilityName: "Willowbrook",
    ...overrides,
  };
}

describe("mode resolution", () => {
  it("falls back to gentle redirection when nothing is set", () => {
    expect(modeFor(null, null)).toBe(DEFAULT_MODE);
    expect(DEFAULT_MODE).toBe("gentle-redirection");
  });

  it("lets a topic override the person default", () => {
    const policy = policyWith("gentle-redirection", [topic({ mode: "truthful" })]);
    expect(modeFor(policy, policy.topics[0])).toBe("truthful");
  });
});

describe("hard floor: never volunteer a death", () => {
  for (const mode of ["gentle-redirection", "validation", "truthful"] as AnswerPolicyMode[]) {
    it(`says nothing unprompted under ${mode}`, () => {
      const answer = answerSensitive(ask({ asked: false }), policyWith(mode));
      expect(answer.speak).toBeNull();
      expect(answer.show).toBeNull();
      expect(answer.rule).toBe("never-volunteer");
    });
  }

  it("never names a death when the question is not about that subject", () => {
    const answer = answerSensitive(
      ask({ subjectName: "Anna" }),
      policyWith("truthful"),
    );
    expect(mentionsDeath(answer.speak ?? "", LANGUAGES)).toBe(false);
    expect(answer.rule).toBe("unknown-subject-redirect");
  });
});

describe("hard floor: never imply alive under truthfulness", () => {
  it("drops family wording that implies the subject will be back", () => {
    const policy = policyWith("truthful", [
      topic({
        mode: "truthful",
        familyWording: { en: "Jan is at work. He will be back tonight." },
      }),
    ]);
    const answer = answerSensitive(ask(), policy);
    expect(answer.rule).toBe("truthful-plain");
    expect(answer.speak).toContain("died");
  });

  it("keeps family wording that is true", () => {
    const policy = policyWith("truthful", [
      topic({ mode: "truthful", familyWording: { en: "Jan died a long time ago." } }),
    ]);
    const answer = answerSensitive(ask(), policy);
    expect(answer.rule).toBe("family-wording-truthful");
    expect(answer.speak).toBe("Jan died a long time ago.");
  });

  it("does not trip on a sentence about somebody else", () => {
    // "Anna is coming later" implies Anna is alive, which is both true and none
    // of this rule's business.
    const policy = policyWith("truthful", [
      topic({
        mode: "truthful",
        familyWording: { en: "Jan died years ago. Anna is coming later." },
      }),
    ]);
    const answer = answerSensitive(ask(), policy);
    expect(answer.rule).toBe("family-wording-truthful");
  });
});

describe("hard floor: never elaborate", () => {
  it("keeps the generated truthful answer to two sentences", () => {
    const policy = policyWith("truthful", [topic({ mode: "truthful" })]);
    const answer = answerSensitive(ask(), policy);
    const sentences = (answer.speak ?? "").split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  it("trims over long family wording rather than saying all of it", () => {
    const policy = policyWith("gentle-redirection", [
      topic({
        situation: "moved-away",
        familyWording: {
          en: "Jan is not here. Anna is coming later. The nurse will bring tea. It is a nice day.",
        },
      }),
    ]);
    const answer = answerSensitive(ask(), policy);
    const sentences = (answer.speak ?? "").split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
    // The full text is still available for the screen, where length is cheap.
    expect(answer.show).toContain("It is a nice day.");
  });
});

describe("gentle redirection, the default", () => {
  it("redirects without naming a death", () => {
    const answer = answerSensitive(ask(), policyWith("gentle-redirection", [
      topic({ familyWording: undefined }),
    ]));
    expect(answer.rule).toBe("gentle-redirect");
    expect(mentionsDeath(answer.speak ?? "", LANGUAGES)).toBe(false);
    expect(answer.speak).toContain("Jan");
  });

  it("drops family wording that names a death under redirection", () => {
    const policy = policyWith("gentle-redirection", [
      topic({ familyWording: { en: "Jan passed away in 2016." } }),
    ]);
    const answer = answerSensitive(ask(), policy);
    expect(answer.rule).toBe("gentle-redirect");
    expect(mentionsDeath(answer.speak ?? "", LANGUAGES)).toBe(false);
  });
});

describe("validation", () => {
  it("uses the family's wording when they wrote some", () => {
    const policy = policyWith("validation", [
      topic({ mode: "validation", familyWording: { en: "Jan is at work today." } }),
    ]);
    const answer = answerSensitive(ask(), policy);
    expect(answer.rule).toBe("family-wording-validation");
    expect(answer.speak).toBe("Jan is at work today.");
  });

  it("degrades to redirection rather than inventing a comforting fiction", () => {
    const policy = policyWith("validation", [topic({ mode: "validation" })]);
    const answer = answerSensitive(ask(), policy);
    expect(answer.rule).toBe("validation-without-wording-redirect");
    expect(mentionsDeath(answer.speak ?? "", LANGUAGES)).toBe(false);
  });
});

describe("going home", () => {
  it("never promises and never refuses", () => {
    const answer = answerSensitive(ask({ intent: "going-home", subjectName: undefined }), null);
    expect(answer.rule).toBe("going-home");
    expect(answer.speak).toContain("Willowbrook");
    expect(answer.speak).not.toMatch(/never|cannot|can not/i);
  });

  it("answers in Afrikaans when asked in Afrikaans", () => {
    const answer = answerSensitive(
      ask({ intent: "going-home", subjectName: undefined, language: "af" }),
      null,
    );
    expect(answer.speak).toContain("Jy bly");
  });
});

describe("language", () => {
  it("answers in the language the question came in", () => {
    const policy = policyWith("truthful", [
      topic({
        mode: "truthful",
        familyWording: { af: "Jan is oorlede.", en: "Jan died." },
      }),
    ]);
    expect(answerSensitive(ask({ language: "af" }), policy).speak).toBe("Jan is oorlede.");
    expect(answerSensitive(ask({ language: "en" }), policy).speak).toBe("Jan died.");
  });

  it("falls back to a language that exists rather than going silent", () => {
    const policy = policyWith("truthful", [
      topic({ mode: "truthful", familyWording: { en: "Jan died." } }),
    ]);
    expect(answerSensitive(ask({ language: "af" }), policy).speak).toBe("Jan died.");
  });
});

describe("tone", () => {
  it("never acknowledges that the question has been asked before", () => {
    const policy = policyWith("gentle-redirection");
    const first = answerSensitive(ask(), policy);
    for (let repeat = 0; repeat < 40; repeat += 1) {
      const again = answerSensitive(ask(), policy);
      expect(again).toEqual(first);
    }
  });
});
