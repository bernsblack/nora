import { describe, expect, it } from "vitest";
import { MAX_SPOKEN_SENTENCES, MAX_SPOKEN_WORDS } from "@/config/constants";
import type { Language } from "../types";
import {
  countWords,
  impliesAlive,
  mentionsDeath,
  splitSentences,
  trimToSpokenLength,
  validateFamilyWording,
} from "./wording";

const LANGUAGES: Language[] = ["en", "af"];

describe("mentionsDeath", () => {
  it("catches the plain words in both languages", () => {
    expect(mentionsDeath("Jan passed away in 2016.", LANGUAGES)).toBe(true);
    expect(mentionsDeath("Jan is oorlede.", LANGUAGES)).toBe(true);
    expect(mentionsDeath("Jan het gesterf.", LANGUAGES)).toBe(true);
  });

  it("leaves ordinary sentences alone", () => {
    expect(mentionsDeath("Jan is not here right now.", LANGUAGES)).toBe(false);
    expect(mentionsDeath("Anna kom later kuier.", LANGUAGES)).toBe(false);
  });
});

describe("impliesAlive", () => {
  it("catches a promise that the subject will be back", () => {
    expect(impliesAlive("Jan will be back tonight.", "Jan", LANGUAGES)).toBe(true);
    expect(impliesAlive("Jan kom terug vanaand.", "Jan", LANGUAGES)).toBe(true);
  });

  it("ignores a sentence about somebody else", () => {
    // The whole reason the check is scoped to sentences naming the subject.
    expect(impliesAlive("Jan died years ago. Anna will visit later.", "Jan", LANGUAGES)).toBe(
      false,
    );
    expect(impliesAlive("Jan is oorlede. Anna kom terug more.", "Jan", LANGUAGES)).toBe(false);
  });
});

describe("trimToSpokenLength", () => {
  it("keeps at most the sentence limit", () => {
    const long = "One. Two. Three. Four.";
    expect(splitSentences(trimToSpokenLength(long)).length).toBeLessThanOrEqual(
      MAX_SPOKEN_SENTENCES,
    );
  });

  it("never cuts mid sentence", () => {
    const trimmed = trimToSpokenLength("Jan is not here right now. You are safe here.");
    expect(trimmed.endsWith(".")).toBe(true);
  });

  it("always keeps at least one sentence, even a long one", () => {
    const rambling = `Jan ${"is somewhere else ".repeat(20)}today.`;
    const trimmed = trimToSpokenLength(rambling);
    expect(trimmed.length).toBeGreaterThan(0);
    expect(countWords(trimmed)).toBeGreaterThan(MAX_SPOKEN_WORDS);
  });
});

describe("validateFamilyWording", () => {
  it("accepts short, consistent wording", () => {
    const problems = validateFamilyWording(
      { en: "Jan is not here right now. Anna is coming later." },
      "gentle-redirection",
      "deceased",
      "Jan",
      LANGUAGES,
    );
    expect(problems).toEqual([]);
  });

  it("rejects a death under redirection", () => {
    const problems = validateFamilyWording(
      { en: "Jan passed away." },
      "gentle-redirection",
      "deceased",
      "Jan",
      LANGUAGES,
    );
    expect(problems.map((problem) => problem.code)).toContain(
      "mentions-death-under-redirection",
    );
  });

  it("rejects a death under validation", () => {
    const problems = validateFamilyWording(
      { en: "Jan died a long time ago." },
      "validation",
      "deceased",
      "Jan",
      LANGUAGES,
    );
    expect(problems.map((problem) => problem.code)).toContain(
      "mentions-death-under-validation",
    );
  });

  it("rejects wording that implies life under truthfulness", () => {
    const problems = validateFamilyWording(
      { en: "Jan is at work." },
      "truthful",
      "deceased",
      "Jan",
      LANGUAGES,
    );
    expect(problems.map((problem) => problem.code)).toContain(
      "implies-alive-under-truthfulness",
    );
  });

  it("allows a living subject to be described as living", () => {
    // The alive check exists to protect truthfulness about a death. Someone who
    // has moved away really is at home somewhere.
    const problems = validateFamilyWording(
      { en: "Hannie is at her own home now." },
      "truthful",
      "moved-away",
      "Hannie",
      LANGUAGES,
    );
    expect(problems).toEqual([]);
  });

  it("rejects wording too long to say", () => {
    const problems = validateFamilyWording(
      { en: "One. Two. Three." },
      "gentle-redirection",
      "deceased",
      "Jan",
      LANGUAGES,
    );
    expect(problems.map((problem) => problem.code)).toContain("too-long");
  });

  it("rejects an empty string but not an absent language", () => {
    expect(
      validateFamilyWording({ en: "   " }, "gentle-redirection", "deceased", "Jan", LANGUAGES)
        .map((problem) => problem.code),
    ).toContain("empty");

    expect(
      validateFamilyWording(
        { en: "Jan is not here." },
        "gentle-redirection",
        "deceased",
        "Jan",
        LANGUAGES,
      ),
    ).toEqual([]);
  });
});
