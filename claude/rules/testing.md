---
paths:
  - '**/*.test.ts'
  - '**/*.spec.ts'
  - 'e2e/**'
  - 'personas/**'
---

# Testing

## Tests describe intended behaviour

An existing test says what the product is supposed to do. Never delete a test, or the code it covers, to make something pass. If a test asserts that the device stays silent, that an error is returned rather than thrown, or that a rule id has a particular string, that is the design.

Before concluding something is broken, check whether a test asserts it. If one does, treat the behaviour as deliberate.

## The tests that are product constraints

These are not checking code behaviour. They are the only place several requirements in PROJECT.md exist as something a machine can fail. Deleting or weakening one needs a stated reason in the commit message.

| File | What it holds |
| --- | --- |
| `src/design/room-theme.test.ts` | Every colour pairing against WCAG with real numbers, dimmed and undimmed, and fails if the room screen drifts blue dominant |
| `e2e/room.spec.ts` | Font size, weight, tracking, contrast and overflow as actually rendered at tablet size |
| `src/domain/answer-policy/policy.test.ts` | All three grief floors across every mode |
| `src/domain/voice/privacy.test.ts` | A source scan for any API that could capture, store or transmit audio |
| `personas/personas.test.ts` | What five specific people say, through the whole voice path |
| `personas/eval.test.ts` | The same scenarios as rates rather than assertions, with the false speech rate ratcheted and the hard floors counted |

## The persona suite is allowed to fail

It is the only suite in the repo written from outside the implementation. Everything in `src/` passes partly by construction, because the same author wrote the test and the thing it tests. The persona scenarios were written from the other direction and found seven defects on their first run, every one of them real.

So: **when a persona scenario fails, the device is wrong.** Write the finding in `personas/FINDINGS.md` and fix the device. Editing the scenario until it passes destroys the only property that makes the suite worth having.

New scenarios are welcome and should be awkward on purpose. The utterances are written rather than collected, which is a stated limitation, not a solved problem.

**Four scenarios are red on purpose and are not a broken build.** `marta-handbag-sentence`, `trevor-glasses`, `trevor-lovely-day` and `halina-fragment-husband`. They describe what bag of words matching cannot do, three attempts at fixing them are recorded in `claude/rules/voice.md`, and they are the acceptance criteria for whatever replaces the matcher. A green persona suite is not currently the goal.

### The suite decays if it is written beside the code

The first persona run found that the matcher's own unit tests passed because they used the phrasings the matcher was built from. The panel run a day later found the persona scenarios had started doing the same thing: `marta-am-i-dying` used the one phrasing of the dying question that stayed quiet, and the form one word away was spoken aloud. All four Jan scenarios reduced, after slot filling, to a phrasing the intent set already shipped.

The folder's whole value is being written from outside the implementation, and it stops being outside the moment it is written in the same sitting as the fix. So: **a scenario for a sensitive utterance ships with its nearest neighbour**, the same question one word different. If only one of the two is written, it is probably the one that passes.

## The eval harness, and floors that are never averaged

`personas/eval.ts` runs the same scenarios as rates instead of assertions, because the crisp pass and fail shape of `personas.test.ts` only works while the thing deciding the intent is deterministic. `pnpm run eval` prints the scorecard, `personas/eval.test.ts` is the gate, and `BASELINE` in it was measured rather than chosen.

Everything upstream of the answer policy sits behind the `Classifier` interface: an utterance goes in, an intent, a subject and a language come out, or an abstention does. The current matcher is one implementation. If a model ever becomes the second, nothing else in the harness changes, which is the point of the seam.

Three properties hold and each exists for a reason:

- **The answer policy is the constant, never the variable.** Every classification is run through the real `answerFor`, so what gets measured is what the device would say. The floors live downstream of the classification and measuring the classifier's score instead would miss them entirely.
- **Abstention is measured before accuracy.** False speech has its own metric and its own ratchet. It is not folded into an accuracy number where four scenarios that speak to an empty room can be offset by forty that answer correctly.
- **Hard floor violations are counted and never rated.** Naming a death in one run out of two hundred is not a score of 0.995, it is a failure. `floorViolations` is a list, and a list is empty or it is not. Any future reporting that turns it into a mean has broken the product, not the harness.

The rates ratchet in one direction: they may improve, never worsen. `regressions` and `floorViolations` do not ratchet at all, they are empty. A scenario in `KNOWN_RED` that starts passing is reported as `nowGreen`, which is the win condition for a replacement rather than a failure.

### Mastra, and the condition that was pointed at the wrong layer

PROJECT.md section 9 deferred Mastra with "revisit when we need an eval harness, which we will, because tone and the grief policy need regression tests". It was revisited on 2026-08-03 and the answer was to build the harness here instead. The full evaluation is in [`worklog/2026-08-03-eval-harness/plan.md`](../../worklog/2026-08-03-eval-harness/plan.md).

The short version: `runEvals`, the part that runs a dataset in CI, targets a Mastra Agent or Workflow, and the thing under test here is a pure function. More to the point, the matcher may become a model but the answer policy may not, so nothing this product classifies ever produces generated prose, and an LLM judge has nothing to grade. What is left is a confusion matrix, an abstention rate and a set of floors.

**Mode two is where the condition actually lands.** Open conversation and reminiscence is generated prose where tone is the product, and that is the first thing here an LLM judge could grade at volume. Do not re-open the question for mode one.

## New domain code ships with its test

Anything in `src/domain/` is pure and has no excuse. Cover the branches, not the happy path: every guard, early return, `??` and thrown error is a branch, and branches are where this codebase has actually been wrong.

## Browser tests, and the traps this repo has already hit

Playwright here runs `fullyParallel: false` and `workers: 1` against shared in-memory state, reset via `POST /api/test-reset` in `beforeEach`. That route 404s when `DATABASE_URL` is set.

Four things have cost real time and will again:

- **`getByRole("button", { name: "Save" })` matches by substring.** Screenshot tests silently captured the wrong form for a while because a different form's "Save this choice" came first in the DOM. Use `{ name: "...", exact: true }`, and assert the save landed before continuing.
- **Screenshots catch elements mid-crossfade.** Pass `{ animations: "disabled" }` or the element looks missing.
- **`getByRole("alert")` matches Next's route announcer.** Use the `data-testid`.
- **Route handlers and server components get separate module registries.** The repository cache lives on `globalThis` under a `Symbol.for` key precisely so `/api/test-reset` and the page share one instance. A module-level cache gives them one each and the reset appears not to work.

Kill anything on port 3000 before a run. A stale `next start` makes a whole suite fail in a confusing way.

## The database is not covered by `pnpm run check`

`src/data/repository.contract.test.ts` runs one suite against both `InMemoryRepository` and `DrizzleRepository` and requires the same answers from each. Everything else in this repo is tested against the in memory one, so without it the Postgres implementation could drift arbitrarily far with nothing going red. It had never executed at all until 2026-08-03: 436 lines, 28 methods, 10 tables.

**Its Postgres half skips itself without `TEST_DATABASE_URL`**, which means a green `pnpm run check` on a laptop with no database says nothing about any of that code. Run `pnpm run test:db` after touching anything in `src/data/`. It starts a throwaway container, applies every migration in order, and runs the suite.

The container is dropped and recreated every run on purpose, so a schema change cannot be hidden by a database that still has the old one.

Two things that suite is for, beyond the obvious:

- **The two implementations agreeing.** A behaviour asserted only against the in memory repository is a behaviour the real database is free to get wrong.
- **The migration path.** It applies `drizzle/*.sql` rather than pushing the schema from TypeScript, so a migration that does not reproduce the schema fails here rather than in a care home.

## Before saying it is done

```bash
pnpm run check    # typecheck, lint, unit tests
pnpm run e2e      # browser tests
pnpm run test:db  # only if src/data/ changed
```

A green `pnpm run check` says nothing about what renders, and nothing about the database.
