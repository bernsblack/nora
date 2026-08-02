# Plan: matcher precision and answer policy routing

## What this is

The `/panel` run on 2026-08-02 reviewed the persona commit (`git diff 40803b6..6326e6c`) with four specialist reviewers and returned twenty-seven findings, six of them blockers. This task closes the blockers.

All of them are in the voice layer, [PROJECT.md section 5](../../PROJECT.md), three breach "silence beats a wrong answer" in section 3, and two reach the answer policy floors in section 6. The account is in [`personas/FINDINGS.md`](../../personas/FINDINGS.md), findings 8 to 12. The short version: the scorer speaks on two shared tokens regardless of where they sit in the utterance, and `when-is-visit` answers about the dead without ever calling the answer policy.

Ten new scenarios are already written and nine of them fail. **A red persona suite is the correct state for this task** until step 2 lands. `claude/rules/testing.md` is explicit that a failing scenario means the device is wrong, not the scenario.

## Steps

- [x] Write the verified blockers as persona scenarios and let them fail
- [x] Record findings 8 to 12, plus the two open architectural findings, in `personas/FINDINGS.md`
- [x] ~~**Step 2, the precision floor.**~~ **Tried and reverted.** Precision is an inverted discriminator here: the wandering question that has to keep working sits at 0.250, one false positive sits at 0.250 and the other at 0.500. No threshold separates them, and the change broke `matcher.test.ts`. See `errors.md` and `FINDINGS.md` finding 8
- [x] **Step 2b, required tokens.** `Intent.requires` added, checked in `matchIntent` before any phrasing of that intent is scored. Closes finding 11 and, with 2c, finding 9
- [x] **Step 2c, the clock.** Resolved by 2b rather than by moving phrasings. `when-is-meal` requires a meal or eating word, so "what time is lunch" still answers and "what time is it" is not scored against it at all
- [x] **Step 3, visit routing.** Done, and narrower than planned: the schedule is checked first, and only an *empty* result falls through to `findTopic` and `answerSensitive`. Closes finding 10 without disturbing real visits
- [x] **Step 4, tokenising. Attempted, measured, reverted.** Two mechanisms tried against the real suite. Keeping the copulas closes `marta-handbag-sentence` and `trevor-glasses` and breaks `halina-fragment-english` at 0.67. An adjacency gate on its own changes nothing, because stopword removal has already collapsed each phrasing to the pair the false positive contains. Details in `errors.md` and `FINDINGS.md` finding 8. **The remaining four are blocked on the decision below, and it is now measured rather than predicted**
- [ ] Re-verify every score quoted in `FINDINGS.md` findings 8 to 12 against the changed matcher, and correct any that moved
- [ ] Verify: `pnpm run check` passes, persona suite green
- [ ] Verify: `pnpm run e2e`. Not expected to be affected, this task is domain only. **Note the unrelated pre-existing failure in `errors.md`: the contrast test is time-of-day dependent and red after 20:00**
- [ ] Closing step, below

## Current state

- **Done:** Steps 1, 2b, 2c and 3. `pnpm run check` is at **468 passing, 4 failing**, and all four failures are one root cause. Findings 9, 10 and 11 are closed, plus `marta-asserting-home` by deleting two phrasings. Step 2 as written was tried and reverted, and why is the most useful thing this task has produced so far.
  - `Intent.requires` is the new mechanism, in `intents.ts` and checked in `matchIntent`. `when-is-meal` requires a meal or eating word, `going-home` requires a destination word. Verified: "what time is lunch" and "ek wil huis toe gaan" still answer at 1.00; "what time is it" (0.25), "hoe laat is dit" (0.17), "ek wil toilet toe gaan" (0.20) and "wanneer gaan ek dood" (0.21) are all ignored.
  - `answers.ts` routes an empty visit schedule through `findTopic` and `answerSensitive`. Verified: "wanneer kom Jan" now gives Marta's family wording, "wanneer kom Anna" still gives "Anna kom om 3".
- **Next:** nothing, until the decision below is taken. Three mechanisms have now been measured and the conclusion is that no fourth one is waiting to be found within a bag of words scorer.
- **Open decisions:**
  - **The remaining four failures are one question, and it has now been demonstrated three ways.** Every mechanism that protects Halina's husband costs Halina's day fragment, because "where Stefan" and "day, what day" are the same shape: a short fragment partially matching a short phrasing. An intent-scoped threshold does **not** help, which was this plan's earlier suggestion and is wrong: "where Stefan" and "where is Stefan" tokenise identically to `["where","stefan"]` and both score 1.000, so no threshold can separate them.
  - The three real options. **A**: leave it, four false positives live, one of them on the grief path. **B**: take the copula change, close two, and accept that the product does nothing for Halina at all. **C**: score something other than a bag of words, which is the only route that closes all four, and is a real piece of work rather than a constant. **Not decided, and C should not be started without agreeing it is worth the cost.**
  - **Should the grief path demand more confidence than the day question does?** This one needs a human and must not be picked by default. Finding 12, Halina's "where Stefan", scores 1.000 on full recall *and* full precision, so no precision floor touches it: two words genuinely are a complete match against `where is <subject>`. Closing it means a higher speak threshold for `where-is-person` and `going-home` than for `what-day-is-it`, on the grounds that those two decide what a woman believes about whether her husband is alive and the day question does not. The cost is real and falls on the person least able to absorb it: Halina's fragments then get silence, and she already has almost no route into the product.
  - Where the clock phrasings live, step 2c. Removing them outright is the more principled option and it loses "what time is lunch", which people genuinely ask.
  - The two open findings at the end of `FINDINGS.md`, the television speaking a phrasing verbatim and `asked` being hardcoded true, are **out of scope here**. Both need the device to know it was addressed, which is a larger piece of work and probably its own task.

## Closing step

Promote the durable part out of this folder before marking the task done in `worklog/INDEX.md`.

- [ ] A constraint on how the code may change becomes a rule in `claude/rules/`. `voice.md`'s "what the matcher learned the hard way" list needs amending: two entries on it are now false
- [ ] A product number becomes a constant in `src/config/constants.ts`, with its reason. `MIN_PRECISION`, plus whatever the grief-path threshold decision produces
- [x] Anything a resident might say becomes a scenario in `personas/scenarios.ts`
- [ ] A PROJECT.md principle with nothing behind it becomes a row in `docs/traceability.md`
- [ ] Incidents in `errors.md` reviewed, and anything recurring turned into one of the above
- [ ] Status set to done in `worklog/INDEX.md`, with a summary worth finding in three months
