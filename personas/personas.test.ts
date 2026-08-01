import { describe, expect, it } from "vitest";
import { mentionsDeath } from "@/domain/answer-policy/wording";
import { answerFor } from "@/domain/voice/answers";
import { decide, matchIntent } from "@/domain/voice/matcher";
import { knownSubjects } from "@/domain/voice/subjects";
import { PERSONA_IDS, PERSONA_NOW, personaContext } from "./fixtures";
import { SCENARIOS, scenariosFor, type Scenario } from "./scenarios";

/**
 * The persona stress test. Every line from personas/scenarios.ts is put through
 * the same path the device runs: match locally, decide whether to speak at all,
 * then answer from the data the screen is showing.
 *
 * This is the test that is allowed to fail. The unit tests in src/ check that
 * the parts behave as designed, and they pass by construction because the same
 * person wrote both. This one asks a different question: given what these
 * people actually say, does the device do the right thing? When it does not,
 * the finding goes in personas/FINDINGS.md rather than the scenario being
 * quietly softened until it passes.
 */

interface Result {
  spoke: boolean;
  said: string | null;
  intent: string | null;
  score: number;
  rule: string | null;
}

function run(scenario: Scenario): Result {
  const { data, policy } = personaContext(scenario.persona);

  const match = matchIntent(scenario.said, {
    subjects: knownSubjects(data, policy),
    languages: data.person.languages,
  });

  if (!match || decide(match) !== "answer") {
    return {
      spoke: false,
      said: null,
      intent: match?.intent ?? null,
      score: match?.score ?? 0,
      rule: null,
    };
  }

  const answer = answerFor(match, { data, policy, now: PERSONA_NOW, asked: true });
  return {
    spoke: answer.speak !== null,
    said: answer.speak,
    intent: match.intent,
    score: match.score,
    rule: answer.rule,
  };
}

describe.each(PERSONA_IDS)("%s", (persona) => {
  for (const scenario of scenariosFor(persona)) {
    const label = `${scenario.expect === "answer" ? "answers" : "stays quiet for"}: "${scenario.said}"`;

    it(label, () => {
      const result = run(scenario);

      if (scenario.expect === "silence") {
        expect(
          result.said,
          `spoke "${result.said}" via ${result.rule} at ${result.score.toFixed(2)}`,
        ).toBeNull();
        return;
      }

      expect(result.spoke, `stayed quiet, best was ${result.intent} at ${result.score.toFixed(2)}`).toBe(
        true,
      );
      if (scenario.intent) expect(result.intent).toBe(scenario.intent);

      for (const forbidden of scenario.mustNotSay ?? []) {
        expect(result.said?.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }
    });
  }
});

describe("hard floors, across every persona and every utterance", () => {
  it("never names a death unprompted", () => {
    // Nothing any of these people say may produce a death, because none of
    // these runs is a direct question answered under truthfulness.
    const offenders = SCENARIOS.map((scenario) => ({ scenario, result: run(scenario) })).filter(
      ({ scenario, result }) => {
        if (!result.said) return false;
        const { data } = personaContext(scenario.persona);
        return mentionsDeath(result.said, data.person.languages);
      },
    );
    expect(offenders.map(({ scenario }) => scenario.id)).toEqual([]);
  });

  it("never says more than two sentences", () => {
    const tooLong = SCENARIOS.map((scenario) => run(scenario))
      .filter((result) => result.said)
      .filter(
        (result) => (result.said ?? "").split(/(?<=[.!?])\s+/).filter(Boolean).length > 2,
      );
    expect(tooLong).toEqual([]);
  });

  it("says nothing at all to anyone speaking Polish", () => {
    // Not a nicety. Halina hears voices already, and a device that answers in a
    // language she has lost is one more voice with no source.
    const polish = SCENARIOS.filter((scenario) => scenario.id.endsWith("-polish"));
    expect(polish.length).toBeGreaterThan(0);
    for (const scenario of polish) {
      expect(run(scenario).said, scenario.id).toBeNull();
    }
  });
});
