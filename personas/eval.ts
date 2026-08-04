import { MAX_SPOKEN_SENTENCES } from "@/config/constants";
import { mentionsDeath } from "@/domain/answer-policy/wording";
import type { Language } from "@/domain/types";
import { answerFor } from "@/domain/voice/answers";
import type { IntentId } from "@/domain/voice/intents";
import { wasAddressed } from "@/domain/voice/addressing";
import { decide, matchIntent, type IntentMatch } from "@/domain/voice/matcher";
import { knownSubjects, type KnownSubject } from "@/domain/voice/subjects";
import { PERSONA_NOW, personaContext, personaContextBeforeSetup } from "./fixtures";
import { SCENARIOS, type Scenario } from "./scenarios";

/**
 * The eval harness.
 *
 * personas.test.ts asserts scenario by scenario and is the right shape for a
 * deterministic matcher. This file is the shape the same 46 scenarios need if
 * whatever decides the intent stops being deterministic: every scenario run n
 * times, aggregated into rates, with the hard floors counted rather than rated.
 *
 * Why counted rather than rated. A general eval framework averages its scorers
 * and you assert on the mean. Averaging is exactly wrong for the three floors:
 * naming a death in one run out of two hundred is not a score of 0.995, it is a
 * failure, and a number that reads as 0.995 invites somebody to set a threshold
 * under it. Floor violations here are a list. The list is empty or it is not.
 *
 * The order of the metrics is the order claude/rules/voice.md sets. Abstention
 * is measured first because silence beats a wrong answer, and accuracy second.
 */

type Awaitable<T> = T | Promise<T>;

/** Everything the classifier is allowed to see. One utterance, no history. */
export interface Heard {
  said: string;
  subjects: KnownSubject[];
  languages: Language[];
}

/**
 * What a classifier returns. An intent, who was named, and which language to
 * answer in, because answerFor speaks in the language the phrasing matched.
 *
 * Deliberately not a sentence. The matcher may become a model, the answer
 * policy may not, so nothing downstream of here is ever generated text.
 */
export interface Classification {
  intent: IntentId;
  language: Language;
  subjectName?: string;
  /** 0 to 1, for reporting only. Abstention is the classifier's own call. */
  confidence: number;
}

/**
 * The seam. Today this is the token overlap matcher. If it is ever replaced by
 * a model, the model implements this and nothing else in the harness moves.
 *
 * Returning null is an abstention, and abstaining is always allowed.
 */
export interface Classifier {
  id: string;
  classify(heard: Heard): Awaitable<Classification | null>;
}

/** The current matcher, as the baseline anything else has to beat. */
export const matcherClassifier: Classifier = {
  id: "matcher",
  classify({ said, subjects, languages }) {
    const match = matchIntent(said, { subjects, languages });
    if (!match || decide(match) !== "answer") return null;
    return {
      intent: match.intent,
      language: match.language,
      subjectName: match.subjectName,
      confidence: match.score,
    };
  },
};

export type Verdict =
  /** Did the right thing: answered what should be answered, stayed quiet otherwise. */
  | "correct"
  /** Spoke when it should have stayed quiet. The failure that is not small. */
  | "false-speech"
  /** Stayed quiet when it should have answered. Fails small. */
  | "missed"
  /** Answered, but landed on the wrong intent. */
  | "wrong-intent";

export type FloorId =
  | "named-a-death"
  | "spoke-too-long"
  | "spoke-polish"
  | "said-forbidden-phrase";

export interface FloorViolation {
  scenario: string;
  floor: FloorId;
  /** Which repeat produced it. A floor broken on run 7 of 10 is still broken. */
  run: number;
  said: string;
  spoke: string;
  rule: string;
}

/** One execution of one scenario. */
interface Sample {
  spoke: string | null;
  intent: IntentId | null;
  confidence: number;
  rule: string | null;
  verdict: Verdict;
}

export interface ScenarioResult {
  id: string;
  persona: string;
  said: string;
  expect: Scenario["expect"];
  expectedIntent?: IntentId;
  /** How many of the n runs produced each verdict. */
  verdicts: Record<Verdict, number>;
  /** The verdict the majority of runs produced. */
  dominant: Verdict;
  /** False when the runs disagreed with each other. Its own kind of defect. */
  stable: boolean;
  samples: Sample[];
}

export interface Scorecard {
  classifier: string;
  runs: number;
  scenarios: number;
  /**
   * Of the runs that should have stayed quiet, the share that spoke. The
   * headline number, and the first thing to measure on any replacement.
   */
  falseSpeechRate: number;
  /** Of the runs that should have answered, the share that stayed quiet. */
  missRate: number;
  /** Of the runs that answered and declare an expected intent, the share correct. */
  intentAccuracy: number;
  /** Every run that did the right thing, over every run. */
  overallCorrect: number;
  /** Counted, never rated. Empty or the build is wrong. */
  floorViolations: FloorViolation[];
  /** Scenario ids whose repeats disagreed with each other. */
  unstable: string[];
  /** Known red scenarios that are still red. Expected, and not a regression. */
  stillRed: string[];
  /** Known red scenarios that now pass. What a replacement is trying to buy. */
  nowGreen: string[];
  /** Anything else failing. Always a regression. */
  regressions: string[];
  results: ScenarioResult[];
}

/**
 * The four scenarios that fail on purpose against the current matcher.
 *
 * They are the acceptance criteria for whatever replaces it, recorded in
 * claude/rules/voice.md and personas/FINDINGS.md. Listing them here means the
 * scorecard can tell an expected failure apart from a regression, which is the
 * difference between a red build that is fine and one that is not.
 */
export const KNOWN_RED = [
  "marta-handbag-sentence",
  "trevor-glasses",
  "trevor-lovely-day",
  "halina-fragment-husband",
] as const;

function sentenceCount(text: string): number {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
}

function floorsBrokenBy(
  scenario: Scenario,
  spoke: string,
  rule: string,
  run: number,
  languages: Language[],
): FloorViolation[] {
  const broken: FloorViolation[] = [];
  const record = (floor: FloorId) =>
    broken.push({ scenario: scenario.id, floor, run, said: scenario.said, spoke, rule });

  if (mentionsDeath(spoke, languages)) record("named-a-death");
  if (sentenceCount(spoke) > MAX_SPOKEN_SENTENCES) record("spoke-too-long");
  // Halina has lost the language the device speaks. Answering her at all is a
  // voice with no source, for a woman who already hears them.
  if (scenario.id.endsWith("-polish")) record("spoke-polish");
  for (const forbidden of scenario.mustNotSay ?? []) {
    if (spoke.toLowerCase().includes(forbidden.toLowerCase())) record("said-forbidden-phrase");
  }
  return broken;
}

function verdictFor(scenario: Scenario, spoke: string | null, intent: IntentId | null): Verdict {
  if (scenario.expect === "silence") return spoke === null ? "correct" : "false-speech";
  if (spoke === null) return "missed";
  if (scenario.intent && intent !== scenario.intent) return "wrong-intent";
  return "correct";
}

function dominantVerdict(verdicts: Record<Verdict, number>): Verdict {
  const order: Verdict[] = ["false-speech", "wrong-intent", "missed", "correct"];
  let best: Verdict = "correct";
  let seen = -1;
  for (const verdict of order) {
    if (verdicts[verdict] > seen) {
      seen = verdicts[verdict];
      best = verdict;
    }
  }
  return best;
}

export interface EvaluateOptions {
  /**
   * How many times to run each scenario. One is right for a deterministic
   * classifier. A model needs enough repeats for a rate to mean anything, and
   * disagreement between repeats is reported as instability.
   */
  runs?: number;
  /** Defaults to every scenario. */
  scenarios?: Scenario[];
}

export async function evaluate(
  classifier: Classifier,
  options: EvaluateOptions = {},
): Promise<Scorecard> {
  const runs = options.runs ?? 1;
  const scenarios = options.scenarios ?? SCENARIOS;

  const results: ScenarioResult[] = [];
  const floorViolations: FloorViolation[] = [];

  for (const scenario of scenarios) {
    const { data, policy } = scenario.beforeSetup
      ? personaContextBeforeSetup(scenario.persona)
      : personaContext(scenario.persona);
    const languages = data.person.languages;
    const subjects = knownSubjects(data, policy);

    const verdicts: Record<Verdict, number> = {
      correct: 0,
      "false-speech": 0,
      missed: 0,
      "wrong-intent": 0,
    };
    const samples: Sample[] = [];

    for (let run = 0; run < runs; run++) {
      const classification = await classifier.classify({ said: scenario.said, subjects, languages });

      let spoke: string | null = null;
      let rule: string | null = null;
      if (classification) {
        // The answer policy is the constant here, never the variable. What is
        // measured is what the device would say, which is downstream of the
        // floors, not what the classifier scored.
        const match: IntentMatch = {
          intent: classification.intent,
          score: classification.confidence,
          language: classification.language,
          subjectName: classification.subjectName,
        };
        const answer = answerFor(match, {
          data,
          policy,
          now: PERSONA_NOW,
          asked: wasAddressed(match),
        });
        spoke = answer.speak;
        rule = answer.rule;
      }

      if (spoke !== null) {
        floorViolations.push(
          ...floorsBrokenBy(scenario, spoke, rule ?? "unknown", run, languages),
        );
      }

      const verdict = verdictFor(scenario, spoke, classification?.intent ?? null);
      verdicts[verdict] += 1;
      samples.push({
        spoke,
        intent: classification?.intent ?? null,
        confidence: classification?.confidence ?? 0,
        rule,
        verdict,
      });
    }

    const stable = Object.values(verdicts).some((count) => count === runs);
    results.push({
      id: scenario.id,
      persona: scenario.persona,
      said: scenario.said,
      expect: scenario.expect,
      expectedIntent: scenario.intent,
      verdicts,
      dominant: dominantVerdict(verdicts),
      stable,
      samples,
    });
  }

  const silenceRuns = results.filter((result) => result.expect === "silence").length * runs;
  const answerRuns = results.filter((result) => result.expect === "answer").length * runs;

  const falseSpeech = results.reduce((total, result) => total + result.verdicts["false-speech"], 0);
  const missed = results.reduce((total, result) => total + result.verdicts.missed, 0);
  const correct = results.reduce((total, result) => total + result.verdicts.correct, 0);

  const intentJudged = results
    .filter((result) => result.expect === "answer" && result.expectedIntent)
    .reduce(
      (total, result) => total + result.verdicts.correct + result.verdicts["wrong-intent"],
      0,
    );
  const intentCorrect = results
    .filter((result) => result.expect === "answer" && result.expectedIntent)
    .reduce((total, result) => total + result.verdicts.correct, 0);

  const known = new Set<string>(KNOWN_RED);
  const failing = results.filter((result) => result.dominant !== "correct");
  const passing = results.filter((result) => result.dominant === "correct");

  return {
    classifier: classifier.id,
    runs,
    scenarios: results.length,
    falseSpeechRate: silenceRuns === 0 ? 0 : falseSpeech / silenceRuns,
    missRate: answerRuns === 0 ? 0 : missed / answerRuns,
    intentAccuracy: intentJudged === 0 ? 1 : intentCorrect / intentJudged,
    overallCorrect: correct / (results.length * runs),
    floorViolations,
    unstable: results.filter((result) => !result.stable).map((result) => result.id),
    stillRed: failing.filter((result) => known.has(result.id)).map((result) => result.id),
    nowGreen: passing.filter((result) => known.has(result.id)).map((result) => result.id),
    regressions: failing.filter((result) => !known.has(result.id)).map((result) => result.id),
    results: [...results],
  };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** The readable scorecard, for `pnpm run eval`. */
export function formatScorecard(card: Scorecard): string {
  const lines: string[] = [];

  lines.push(`Classifier: ${card.classifier}`);
  lines.push(`${card.scenarios} scenarios, ${card.runs} run(s) each`);
  lines.push("");
  lines.push("Abstention, measured first because silence beats a wrong answer");
  lines.push(`  spoke when it should not have   ${percent(card.falseSpeechRate)}`);
  lines.push(`  stayed quiet when it should not ${percent(card.missRate)}`);
  lines.push("");
  lines.push("Accuracy, measured second");
  lines.push(`  right intent when it answered   ${percent(card.intentAccuracy)}`);
  lines.push(`  right thing overall             ${percent(card.overallCorrect)}`);
  lines.push("");
  lines.push(`Hard floors: ${card.floorViolations.length} violation(s). Counted, never rated.`);
  for (const violation of card.floorViolations) {
    lines.push(`  ${violation.floor}  ${violation.scenario}  via ${violation.rule}`);
    lines.push(`    heard: ${violation.said}`);
    lines.push(`    said:  ${violation.spoke}`);
  }

  lines.push("");
  lines.push(`Red on purpose, still red: ${card.stillRed.length}/${KNOWN_RED.length}`);
  for (const id of card.stillRed) lines.push(`  ${id}`);
  if (card.nowGreen.length > 0) {
    lines.push(`Red on purpose, now passing: ${card.nowGreen.length}`);
    for (const id of card.nowGreen) lines.push(`  ${id}`);
  }

  lines.push("");
  lines.push(`Regressions: ${card.regressions.length}`);
  for (const id of card.regressions) {
    const result = card.results.find((candidate) => candidate.id === id);
    lines.push(`  ${id}  ${result?.dominant}  "${result?.said}"`);
  }

  if (card.unstable.length > 0) {
    lines.push("");
    lines.push(`Unstable across runs: ${card.unstable.length}`);
    for (const id of card.unstable) lines.push(`  ${id}`);
  }

  return lines.join("\n");
}
