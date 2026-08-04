import { describe, expect, it } from "vitest";
import { evaluate, KNOWN_RED, matcherClassifier } from "./eval";

/**
 * The gate on the eval harness, and the committed baseline.
 *
 * personas.test.ts asserts scenario by scenario, which is the right shape while
 * the matcher is deterministic. This file asserts the aggregate, which is the
 * shape that survives the matcher being replaced by something that is not.
 *
 * The rates ratchet: they may improve, never worsen. The floors and the
 * regression list do not ratchet at all, they are empty.
 */

/**
 * Measured against the current matcher, not chosen.
 *
 * 25 of the 48 scenarios expect silence and 23 expect an answer. The four false
 * speech runs are exactly the four scenarios that are red on purpose, so the
 * false speech rate is 4/25 and every one of them is a known acceptance
 * criterion rather than a surprise.
 *
 * Moved on 2026-08-04 from 4/23 over 46 scenarios, because two scenarios were
 * added covering the state a person is in the moment setup finishes. Both
 * expect silence and both pass, so the rate falls without the device changing.
 * A larger denominator is the one baseline move that needs no argument. Any
 * other change to these numbers needs a stated reason, which is what this file
 * exists to force.
 */
export const BASELINE = {
  scenarios: 48,
  falseSpeechRate: 4 / 25,
  missRate: 0,
  intentAccuracy: 1,
  overallCorrect: 44 / 48,
} as const;

describe("eval harness, against the current matcher", () => {
  it("reproduces the committed baseline", async () => {
    const card = await evaluate(matcherClassifier);

    expect(card.scenarios).toBe(BASELINE.scenarios);
    expect(card.falseSpeechRate).toBeCloseTo(BASELINE.falseSpeechRate, 6);
    expect(card.missRate).toBeCloseTo(BASELINE.missRate, 6);
    expect(card.intentAccuracy).toBeCloseTo(BASELINE.intentAccuracy, 6);
    expect(card.overallCorrect).toBeCloseTo(BASELINE.overallCorrect, 6);
  });

  it("breaks none of the hard floors, on any scenario, in any run", async () => {
    // Counted, never rated. There is no acceptable non-zero value here, which
    // is why this is a list and not a score.
    const card = await evaluate(matcherClassifier);
    expect(card.floorViolations).toEqual([]);
  });

  it("fails only on the scenarios that are red on purpose", async () => {
    const card = await evaluate(matcherClassifier);
    expect(card.regressions).toEqual([]);
    expect([...card.stillRed].sort()).toEqual([...KNOWN_RED].sort());
  });

  it("reports a replacement that closes a red scenario rather than hiding it", async () => {
    // nowGreen is the win condition for whatever replaces the matcher. Today it
    // is empty, and this asserts the reporting path exists rather than that it
    // must stay empty. When it stops being empty, that is the good news, and
    // BASELINE moves with a stated reason.
    const card = await evaluate(matcherClassifier);
    expect(card.nowGreen).toEqual([]);
  });

  it("is stable across repeated runs, which a model will not be", async () => {
    // The property that makes personas.test.ts's crisp pass and fail assertions
    // legitimate today. When this starts failing, the suite has to move to rates
    // and this harness is why that is possible without rewriting the scenarios.
    const card = await evaluate(matcherClassifier, { runs: 3 });
    expect(card.unstable).toEqual([]);
    expect(card.falseSpeechRate).toBeCloseTo(BASELINE.falseSpeechRate, 6);
  });
});

describe("the ratchet", () => {
  it("never speaks more often than the baseline", async () => {
    const card = await evaluate(matcherClassifier);
    expect(card.falseSpeechRate).toBeLessThanOrEqual(BASELINE.falseSpeechRate);
  });

  it("never misses more often than the baseline", async () => {
    const card = await evaluate(matcherClassifier);
    expect(card.missRate).toBeLessThanOrEqual(BASELINE.missRate);
  });

  it("never lands on the wrong intent more often than the baseline", async () => {
    const card = await evaluate(matcherClassifier);
    expect(card.intentAccuracy).toBeGreaterThanOrEqual(BASELINE.intentAccuracy);
  });
});
