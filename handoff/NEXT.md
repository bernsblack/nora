# Next session

**Written:** 2026-08-03 08:24 at commit `c12ecfd`
**State:** in progress

## Read this before you run the tests

**`pnpm run check` is 468 passing and 4 failing, and that is correct.** `pnpm run e2e` is 39 passing and 4 skipped, also correct.

The four failures are persona scenarios that are red on purpose: `marta-handbag-sentence`, `trevor-glasses`, `trevor-lovely-day` and `halina-fragment-husband`. **Do not try to fix them by tuning the matcher.** Three mechanisms were implemented against the real suite and reverted yesterday, and they are written up in `claude/rules/voice.md` so you do not repeat them in the same order. The short version: every mechanism that protects Halina's dead husband costs Halina's day fragment, because both are a short fragment partially matching a short phrasing, and no bag of words scorer reads them differently.

They are the acceptance criteria for whatever replaces the matcher. `docs/traceability.md` marks the requirement they cover as **failing** rather than enforced, which is the honest status.

The 4 skipped e2e tests are `fixme` cases holding a real defect: the room screen does not clear AAA at night as rendered, and fixing it is a product decision about `MIN_INK_DIM`.

## Pick up here

**Nothing can proceed far without a decision from Bernard**, so the honest first move is to ask rather than to start.

The one piece of work that needs no decision, if you want to be useful immediately: **revisit Mastra for the eval harness.** PROJECT.md section 9 rejected it on the explicit condition "revisit when we need an eval harness, which we will", and that condition is now met. It is wanted whatever happens to Whisper, and it is what would make replacing the matcher measurable rather than a leap. See [`worklog/2026-08-02-on-device-speech/plan.md`](../worklog/2026-08-02-on-device-speech/plan.md).

## Where it stands

Two sessions of work, five commits. The first `/panel` run reviewed the persona commit with four specialists and returned 27 findings; three blockers are closed, the calibration result was that the roster found real defects and invented none, and every score they hand-computed verified to three decimals against the live matcher.

[`worklog/2026-08-02-matcher-precision/`](../worklog/2026-08-02-matcher-precision/) is **done**. [`worklog/2026-08-02-on-device-speech/`](../worklog/2026-08-02-on-device-speech/) is **planned and blocked**. It began as a review of an external Whisper and Piper spec and now also owns what does the matching, because the two turned out to be one question.

## Waiting on Bernard

1. **Native versus PWA.** The external speech spec assumes native throughout; PROJECT.md section 9 defers native until the interaction is validated, and it is not validated. Nothing on the speech half moves until this is settled.
2. **Whether replacing the matcher with a model is worth its cost.** It buys the four red scenarios and a matcher not made of stopword lists. It costs a deterministic test suite, a second on-device model, and a new failure class where the thing deciding what was asked can be confidently wrong.

The boundary on that second one is already decided and is in `claude/rules/voice.md`: **the matcher may become a model, the answer policy may not.** Classification is not generation. Nothing about the three floors moves into a prompt.

## Unverified

Both suites were run at the end of this session and watched go to the states above, so those numbers are real rather than remembered.

One thing I could not verify: the e2e contrast failure that prompted the lighting pin was almost certainly pre-existing, but I never got a clean before-and-after. The worktree hit pnpm's dependency check and the `git checkout` route was correctly blocked as destructive. The causal argument is from reading `resolveLighting` and the clock, not from a measurement.

No evidence at all yet on how a small on-device model handles Afrikaans intent classification for elderly dysarthric speech. Do not let that get asserted, which is the mistake the speech spec was criticised for.

## Found but not yet a rule

**`.claude/` holds copies, not symlinks.** CLAUDE.md and `handoff.md` both say symlinked. `scripts/setup-claude.sh` uses `ln -s ... 2>/dev/null || true`, which swallows the failure. It matters because the documented workflow is "change a rule in `claude/`, never in `.claude/`", and with copies that edit does not reach the running agent until `pnpm run prepare` runs again. **So you can edit a rule, believe it is live, and work from the old one for the rest of the session.** Logged in `worklog/2026-08-02-on-device-speech/errors.md`.

**`privacy.test.ts` only covers TypeScript.** Three documents describe it as making the privacy floors true at code level. It is a source scan over `src/domain/voice/`, so any native or WASM audio path is invisible to it. Same file.

**Reason about token arrays, not phrasings as written.** All three failed matcher fixes were reasoned about at the level of the written phrasing and behaved differently once tokenised. `tokenise` is exported and a two line probe would have caught all three in minutes.

The environment notes from the previous handoff still hold: run an em dash scan separately from a `git commit`, never `git stash -u` to test uncommitted code, and `git branch --unset-upstream` clears the stale upstream warning.
