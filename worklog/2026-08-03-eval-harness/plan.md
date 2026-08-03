# Plan: the eval harness, and the answer to the Mastra question

## What this is

[PROJECT.md section 9](../../PROJECT.md) rejected Mastra on an explicit condition: "Revisit when we need an eval harness, which we will, because tone and the grief policy need regression tests." [`worklog/2026-08-02-on-device-speech/`](../2026-08-02-on-device-speech/) established that the condition is met, because the matcher is now a candidate for replacement by a model and `personas/` is an eval harness that grew by hand.

This task revisits it, and builds what the answer turns out to be.

Two decisions were taken by Bernard on 2026-08-03 and they scope everything here:

- **The room device stays a PWA. Native is parked**, not rejected, until the interaction is validated. `worklog/2026-08-02-on-device-speech/` stays blocked on that, and its remaining steps are measurement rather than integration.
- **Build the eval harness before deciding whether to replace the matcher.** The swap is not committed to either way. The harness is what makes it a measurement instead of a leap.

## The finding: adopt the idea, not the framework

Mastra was checked against what this repo needs rather than against its feature list. `@mastra/core` is at 1.55.0. The relevant facts, each verified rather than remembered:

- `createScorer` is importable from `@mastra/core/evals` and its `.run()` works on a plain input and output pair, with no Agent or Workflow instance. A scorer whose steps are all functions never calls a judge and makes no network call. So the scorer abstraction is genuinely usable standalone.
- `runEvals`, the part that runs a scorer over a dataset in CI and is the piece this task actually wants, takes a `target` that is an Agent or a Workflow. The thing under test here is `matchIntent`, a pure function. Using `runEvals` means making the matcher a Mastra agent, which is the framework adoption section 9 declined.
- `@mastra/core` carries 31 direct dependencies, including three parallel copies of the AI SDK provider utils, `@modelcontextprotocol/sdk`, `execa`, `ws`, `croner` and `posthog-node`. This repo has nine production dependencies in total.
- The built-in scorers cover correctness, faithfulness to retrieved context, tone and safety. Every one of those is a judgement about generated prose.

That last point is the one that decides it, and it is a consequence of a boundary this project already drew. `claude/rules/voice.md`: **the matcher may become a model, the answer policy may not.** The spoken text stays scripted. So a model here emits an intent id, a subject and a language, and never a sentence. There is no prose to judge, which means there is nothing for an LLM judge to do, which is the entire value proposition of an eval framework.

What is left to measure is a classification problem: a confusion matrix, an abstention rate, and a set of floors. All of it is deterministic, none of it needs a model, and it is roughly 200 lines against `vitest`, which is already here.

**One shape mismatch is worth stating on its own,** because a framework would quietly get it wrong. `runEvals` returns average scores per scorer and you assert against the aggregate. The three hard floors cannot be averaged. "Named a death in 1 run out of 200" is not a score of 0.995, it is a failure, and a harness whose natural output is a mean invites exactly that reading. The harness built here counts floor violations and never rates them.

### The revisit condition, restated

Section 9's condition was the right instinct pointed at the wrong layer. "Tone and the grief policy need regression tests" is true, and neither will ever be model output under the boundary above, so neither will ever need a model-graded eval.

**Mode two is where the condition actually lands.** PROJECT.md section 5's invoked path is open conversation and reminiscence, which is generated prose, where tone is the product and an LLM judge is the only thing that can grade it at volume. That is also the first place a real workflow exists. Mode two comes after everything in section 11 and after the audio versus text question is answered, so this stays deferred, now with a condition that names the layer.

## What the harness is

`personas/eval.ts`, with `personas/eval.test.ts` as the gate and `pnpm run eval` as the report. The existing `personas/personas.test.ts` is untouched: it stays the crisp pass and fail suite for as long as the matcher is deterministic.

The design points, each of which exists for a reason:

- **A `Classifier` seam.** Everything upstream of the answer policy is behind one interface: utterance in, an intent, a subject, a language and a confidence out, or an abstention. `matchIntent` plus `decide` is the first implementation. A model would be the second, and nothing else in the harness changes.
- **The answer policy is the constant, not the variable.** Each classification is run through the real `answerFor`. The harness measures what the device would say, not what the classifier scored, because the floors live downstream of the classification.
- **Abstention is measured first and accuracy second**, which is the order `claude/rules/voice.md` sets. False speech gets its own metric and its own threshold rather than being folded into accuracy.
- **Repeat runs.** `runs: n` executes every scenario n times. Against a deterministic matcher this is identity. Against a model it is the only way to see a rate, and disagreement between runs on the same utterance is reported as instability, which is its own defect for this product.
- **The four red scenarios are declared, not discovered.** They are the acceptance criteria for a replacement, so the scorecard names them and reports them separately from an unexpected regression.
- **A committed baseline.** Today's numbers, asserted. The matcher may not regress against it and a replacement has something to beat.

## Steps

- [x] Check Mastra against what this repo needs, on current facts rather than memory
- [x] Record the finding and the restated revisit condition
- [x] Build `personas/eval.ts`: the `Classifier` seam, the metrics, the floor counting, repeat runs
- [x] Wrap the current matcher as the baseline classifier
- [x] Build `personas/eval.test.ts` and pin the baseline
- [x] Add `pnpm run eval` for the readable scorecard
- [x] Verify: `pnpm run check` passes, still with the four persona scenarios red on purpose
- [x] Promote the finding into `claude/rules/testing.md`, per the closing step
- [x] Closing step, below

## The baseline

Measured 2026-08-03 against the current matcher, and committed as `BASELINE` in `personas/eval.test.ts`.

```text
46 scenarios, 1 run each

Abstention, measured first
  spoke when it should not have    17.4%   (4 of 23)
  stayed quiet when it should not   0.0%   (0 of 23)

Accuracy, measured second
  right intent when it answered   100.0%
  right thing overall              91.3%   (42 of 46)

Hard floors: 0 violations
Red on purpose, still red: 4/4
Regressions: 0
```

The four false positives are exactly `KNOWN_RED`, which is the result to want: the harness independently rediscovered the four scenarios the previous session closed on, and found nothing else.

## Current state

- **Done:** all of it. The Mastra question is answered, the harness is built, the baseline is committed, and `pnpm run check` is 476 passing and 4 failing, where the 4 are the persona scenarios that are red on purpose.
- **Next:** nothing in this task. It is closed. The measurement it enables is step "measure a small model on intent classification" in [`../2026-08-02-on-device-speech/plan.md`](../2026-08-02-on-device-speech/plan.md), which needs a candidate model and a corpus.
- **Open decisions:**
  - Whether to replace the matcher with a model at all. Still open, deliberately. This task exists to make that decision measurable and does not pre-empt it.
  - The maximum false speech rate a replacement must clear. Deliberately not set. Today's matcher is at 4/23 and all four are known acceptance criteria, and picking a target before a candidate exists would be inventing a product number rather than deriving one. It belongs in `src/config/constants.ts` with its reason when there is evidence for it.

## Closing step

Promote the durable part out of this folder before marking the task done in `worklog/INDEX.md`.

- [x] A constraint on how the code may change becomes a rule in `claude/rules/`. `testing.md` now carries the eval harness, the counted-never-averaged property, and the restated Mastra condition naming mode two. `pnpm run prepare` was run, because `.claude/` holds copies rather than symlinks and an unsynced rule is not live
- [x] A product number becomes a constant in `src/config/constants.ts`, with its reason. **None to add.** The baseline is a measurement rather than a product decision, so it lives in the test. The one genuine product number here, the false speech rate a replacement must clear, is listed as an open decision rather than invented
- [x] Anything a resident might say becomes a scenario in `personas/scenarios.ts`. **None to add.** This task added no utterances, it changed how the existing ones are counted
- [x] A PROJECT.md principle with nothing behind it becomes a row in `docs/traceability.md`. "Silence beats a wrong answer" now names `eval.test.ts` and its ratchet. It stays **failing**, which is still the honest status
- [x] Incidents in `errors.md` reviewed. One logged, about the persona count in the README having drifted from 40 to 46 unnoticed
- [x] Status set to done in `worklog/INDEX.md`, with a summary worth finding in three months
