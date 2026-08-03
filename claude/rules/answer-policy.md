---
paths:
  - 'src/domain/answer-policy/**'
  - 'src/app/app/actions.ts'
  - 'personas/**'
---

# The answer policy

PROJECT.md section 6. This is the highest-risk code path in the product and the brief says so explicitly. It decides what a person who cannot evaluate the answer believes about whether their husband is alive.

## The three hard floors

These hold regardless of the mode the family chose. They are not defaults and they are not configurable.

1. **Nora never volunteers a death.** If the subject was not asked about, the answer is silence.
2. **Nora never elaborates on one.** The family's wording is the whole answer, trimmed to length, with nothing added.
3. **Nora never implies a person is alive when the family has chosen truthfulness.**

Every one of these has a test in `src/domain/answer-policy/policy.test.ts` covering all three modes. A change that makes one of those tests inconvenient has broken the product, not the test.

## The order of checks is load bearing

`answerSensitive` checks in this order, and the order is the safety property:

1. Going home, which is its own answer and not a grief path.
2. **No subject identified, return silent.** Before anything else. An unidentified subject cannot be reasoned about safely.
3. **Not asked, return silent** with rule `never-volunteer`. Floor 1.
4. Unknown subject, redirect without naming anything.
5. Family wording, re-validated at read time.
6. Truthful plain.
7. Validation, which degrades to redirection rather than inventing a fiction.

Moving a check earlier can only widen what gets spoken. Adding one at the top needs a stated reason.

## Validate at write time and again at read time

`validateFamilyWording` runs in the family app so a family member finds out at the keyboard rather than in a bedroom at three in the morning. `rejectWording` runs again when the answer is assembled, because the mode can change after the wording was saved and stored text is not trustworthy just because it passed once.

Both are required. Removing either is a regression even though nothing goes red.

## Setup is where the choice is made, and absence is the signal

`src/domain/setup.ts` treats **the absence of an answer policy row** as "nobody has decided yet", which is why `answer_policies.default_mode` deliberately has no column default. Give that column a default and the question becomes unanswerable: every person arrives already holding a choice nobody made, and a deliberate `gentle-redirection` becomes indistinguishable from an untouched one.

`/app/[personId]` redirects to `/app/[personId]/setup` while that row is missing, and the setup form uses **radios with none checked rather than a select**, because a select always has a value and therefore cannot express "not answered yet". The server refuses a submission carrying no mode as well, so the guarantee does not live in an HTML attribute.

The engine's fallback to gentle redirection exists so the device is safe before setup. It is not a stand-in for a decision, and nothing may treat it as evidence that one was made.

## Defaults and modes

- Default when nothing is set is `gentle-redirection`, never correction. PROJECT.md is explicit that the family sets this as a deliberate choice at setup and does not discover it later.
- `validation` degrades to redirection when it cannot produce something true. It never fabricates a scene.
- Mode values and rule ids are kebab-case, the same strings in TypeScript, in the Postgres enum, and in the `data-rule` attribute the browser tests read.

## Rule ids are a contract

Every answer carries a rule id. Tests assert on them, `data-rule` exposes them in the DOM, and they are how anybody later explains why the device said what it said. Renaming one is a breaking change to the tests and to the family app's eventual explain view. Add a new id rather than repurposing an existing one.

## The personas are not adjustable

`personas/scenarios.ts` says what should happen when a specific invented person says a specific thing. When a scenario fails, the device is wrong. Write the finding in `personas/FINDINGS.md` and fix the device.

Softening a scenario until it passes is the one edit that is never acceptable here. The suite is the only one in the repo written from outside the implementation, and its whole value is that it can disagree with the code.

## Before calling a change here done

```bash
pnpm exec vitest run src/domain/answer-policy personas
```

Both, green, every time. And read `personas/FINDINGS.md` before adding a floor: the first persona run found seven defects and none of them were in this file, which is worth knowing before you go looking here for the next one.
