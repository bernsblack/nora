# Errors: matcher precision and answer policy routing

These are incidents in the *previous* task's work, surfaced by the panel run that opened this one. They are logged here because this is the task that closes them.

## A fix moved a defect instead of closing it, and the comment said it was removed

- **What went wrong:** `FINDINGS.md` finding 5 removed clock phrasings from `what-day-is-it` and added "what time is lunch" and "what time is supper" to `when-is-meal`. The second half re-created the defect: "what time is it" scores 0.767 against "what time is lunch" and is spoken aloud as the next meal. The comment above the day intent says a question about the hour is "one we do not answer at all", and `claude/rules/voice.md` records "no clock phrasings" as a load bearing fix. Neither was true by the time it was written.
- **Root cause:** the fix was verified against the utterance that had failed, not against the utterance the finding was about. "what time is supper" was made to work. "what time is it" was never re-run.
- **How it was caught:** adversarial review. Two of four reviewers found it independently, by reading the comment and disbelieving it. No test covers it and none would have.
- **Proposed guide or sensor:** when a `FINDINGS.md` entry is closed, the scenario written for it must include the utterance from the finding's own title, not only the phrasing that was repaired. Cheaper variant: a test asserting no phrasing in the intent set sits within one token of a phrasing belonging to a different intent.
- **Now enforced by:** nothing yet. `trevor-clock` and `marta-clock` catch this instance, not the class.

## The persona scenarios drifted inside the implementation they exist to test

- **What went wrong:** three of the highest risk utterances in the folder sit one word from a form that breaks. `marta-am-i-dying` uses "gaan ek doodgaan" (0.55, silent) while "wanneer gaan ek dood" scores 0.75 and gets the going-home line. `marta-jan-coming-back` keeps its closing "terug" and passes at 1.00; drop that word and the same question routes around the answer policy entirely. All four Jan scenarios reduce, after slot filling, to a phrasing the intent set already ships.
- **Root cause:** the scenarios were written after the matcher, by the same author, in the same sitting as the fixes. The folder's stated value is that it is written from outside the implementation, and by the end of that task it no longer was.
- **How it was caught:** adversarial review, by a reviewer briefed to treat a scenario that fits the implementation as a finding in itself. This is the second appearance of one class of error: the first run's lesson was that the matcher's unit tests used the phrasings the matcher was built from. This is the same lesson one level up, and that is the part worth carrying.
- **Proposed guide or sensor:** no test can catch this, which is the point. The candidate rule is that a scenario for a sensitive utterance ships alongside its nearest neighbour, the same question one word different, and that `claude/rules/testing.md` gains a line saying the persona suite's value decays whenever it is written in the same sitting as the code it tests.
- **Now enforced by:** nothing yet. Candidate for `claude/rules/testing.md` at the closing step.

## A designed route was declared and never wired

- **What went wrong:** `SENSITIVE_INTENTS` declares `when-is-person-coming` and `is-person-alive`. Nothing in the repo has ever constructed either, so "wanneer kom Jan" answers from the schedule with "a quiet day" instead of going through the answer policy.
- **Root cause:** the type was written for the intended design and the producer was never added. Nothing fails when a union member has no producer.
- **How it was caught:** review, and only incidentally. Two reviewers found the orphaned members by grep while investigating the routing bug, so it surfaced because something else was already wrong. On its own it would not have.
- **Proposed guide or sensor:** a test asserting every member of `SENSITIVE_INTENTS` is reachable from some branch of `answerFor`. Cheap, and this is the kind of union where an unreachable member is always a bug rather than a spare.
- **Now enforced by:** nothing yet.

## The obvious fix was wrong, and precision pointed the wrong way

- **What went wrong:** a minimum precision floor was the fix three of four panel reviewers proposed, and it is what this plan's step 2 specified. It was implemented at 0.4, and it broke `matcher.test.ts`'s "hears the question inside a wandering utterance", which is the case the recall-heavy design exists to serve. Reverted.
- **Root cause:** precision is not a weak discriminator here, it is an inverted one. The legitimate wandering question sits at 0.250, the glasses false positive at 0.250, and the lovely-day false positive at 0.500. No threshold separates them, and the number chosen in the plan was picked from the two false positives without checking it against the case that had to keep working.
- **How it was caught:** an existing unit test, immediately, on the first run after the change. This is the sensor working exactly as `claude/rules/testing.md` describes: the test said what the product is supposed to do, and it disagreed with a change that four reviewers and this plan had all endorsed.
- **Proposed guide or sensor:** none needed for the catch, which worked. The transferable lesson is about the plan rather than the code: a threshold in a plan should name the case it must **not** break alongside the cases it must close, and this one named only the latter. Worth a line wherever numbers get proposed.
- **Now enforced by:** `matcher.test.ts`, which already did its job.

## Two more proposed fixes were measured and reverted, and one of them was mine

- **What went wrong:** after the precision floor, two further mechanisms were tried against the real suite. Keeping the copulas out of the stopword lists closes two of the four remaining failures and breaks `halina-fragment-english`, dropping it to 0.67. A shared adjacent pair requirement, proposed as the way to bring word order into a bag of words scorer, changes nothing whatsoever on its own.
- **Root cause:** for the adjacency gate, stopword removal has already collapsed the phrasings to the very pair the false positive contains. `where is <subject>` is `[where, xsubjectx]` and "where Stefan" contains exactly that, adjacent, so the gate it was supposed to fail is one it passes. The mechanism was reasoned about at the level of the written phrasing rather than the tokens the scorer actually sees.
- **How it was caught:** the persona suite, immediately, in both cases. Neither survived a single run.
- **Proposed guide or sensor:** the pattern across all three attempts is that each was reasoned about in terms of the phrasings as written and each behaved differently once tokenised. The cheap habit that would have caught all three in minutes rather than in three implement-and-revert cycles is to print the token arrays first and reason about those. `tokenise` is exported and this is a two line probe.
- **Now enforced by:** nothing, and it probably should not be a rule. It is a working habit rather than a constraint on the code.

## An e2e test passes or fails depending on the time of day it is run

- **What went wrong:** `pnpm run e2e` returned 38 passed, 1 failed. `e2e/room.spec.ts` "location clears the contrast target as rendered" measured 5.74 against a target of 7. The handoff records this suite as 39 green at `97092db`.
- **Root cause:** not the change under test, and not a flake. `resolveLighting` falls back to the hour when no light sensor exists, which is the common path and certainly the path in headless Chromium. `ASSUMED_DARK_START_HOUR` is 20. The green run was recorded at 11:14 and this one ran at 21:29, so the screen was in night mode with ink dimmed to `MIN_INK_DIM`. **The `location` line does not clear AAA at night as rendered**, so the suite is green in the morning and red after eight in the evening, every day.
- **How it was caught:** luck, and then only because the failure looked like it might be mine and was worth chasing. Had this run happened before eight it would not have appeared at all, and had it appeared in the morning it would have looked like a genuine regression from this task.
- **Proposed guide or sensor:** the e2e suite should pin the clock, the way `personas/fixtures.ts` pins `PERSONA_NOW`, so that what it asserts does not depend on when somebody runs it. Separately there is a real defect underneath: `MIN_INK_DIM` carries the comment that it is "the exact point where the night palette's primary ink leaves AAA", and the location line is evidently not primary ink, so the constant was set against one pairing and applied to all of them. `src/design/room-theme.test.ts` claims to check every pairing dimmed and undimmed and passes, so either it does not cover this pairing or its numbers differ from the rendered ones. That is the same shape as the hashed class name incident: green units, wrong rendering.
- **Now enforced by:** nothing yet. **This is not part of this task and should be its own.** Recorded here because this is where it surfaced.

## The panel briefing had to suppress a rule for the run to be worth anything

- **What went wrong:** `claude/rules/answer-policy.md` tells any reviewer to read `personas/FINDINGS.md` before touching the matcher. For a run whose entire question was whether the reviewers find real defects or invent plausible ones, that file is the answer key.
- **Root cause:** not a defect. A genuine tension between a rule written for whoever is doing the work and a run whose purpose is to measure the reviewers themselves.
- **How it was caught:** noticed while composing the panel, declared in every briefing and again in the synthesis.
- **Proposed guide or sensor:** if `/panel` is used for calibration again, the suppression has to be stated in the output, because a reader who does not know the reviewers were working blindfolded will misread the result. Worth a line in `claude/rules/agent-panel.md`.
- **Now enforced by:** nothing yet. Declared by hand this run.
