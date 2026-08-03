import { describe, expect, it } from "vitest";
import { nextSetupStep, setupComplete } from "./setup";
import type { AnswerPolicy } from "./types";

const policy = (defaultMode: AnswerPolicy["defaultMode"]): AnswerPolicy => ({
  personId: "person-marta",
  defaultMode,
  topics: [],
});

describe("whether a person has been set up", () => {
  it("is not set up when nobody has chosen a policy", () => {
    expect(setupComplete(null)).toBe(false);
    expect(setupComplete(undefined)).toBe(false);
    expect(nextSetupStep(null)).toBe("policy");
  });

  it("is set up once a choice exists", () => {
    expect(setupComplete(policy("validation"))).toBe(true);
    expect(nextSetupStep(policy("validation"))).toBeNull();
  });

  it("counts a chosen gentle redirection as a real choice", () => {
    // The mode that equals the engine's fallback. A family that thought about
    // it and chose this has decided, and must not be asked again.
    expect(setupComplete(policy("gentle-redirection"))).toBe(true);
    expect(nextSetupStep(policy("gentle-redirection"))).toBeNull();
  });

  it("does not treat the fallback mode as evidence on its own", () => {
    // The distinction the whole thing rests on. Without a stored record there
    // is no choice, even though the engine would behave identically today:
    // domain/answer-policy falls back to gentle redirection so the device is
    // safe before setup, not so it can stand in for a decision.
    expect(setupComplete(null)).toBe(false);
  });
});
