# Plan: personas, and the seven defects they found

**Backfilled on 2026-08-01, after the fact.**

## What this is

Five people who would use Nora, written as markdown, with every resident utterance existing as a runnable scenario. Simulated user testing, and the first suite in the repo written from outside the implementation.

Commit `6326e6c`.

## Steps

- [x] Five personas: three residents across stages, languages and genders, two family members
- [x] `fixtures.ts`: each resident as data the device would actually hold
- [x] `scenarios.ts`: every utterance with what should happen
- [x] `personas.test.ts`: the run, plus hard floor checks across every persona at once
- [x] Fix what the first run found. Seven of thirty nine failed, all real
- [x] `FINDINGS.md`: what each defect was, because a fixed bug with no account of it is indistinguishable from one that was never there
- [x] Verify: `pnpm run check`, `pnpm run e2e`

## Current state

- **Done:** all of it. 466 unit tests green, 46 browser tests green.
- **Next:** nothing on this task. The follow on, running the personas against rendered screens rather than only the voice path, is not built.
- **Open decisions:** whether to add a sixth persona, a night care assistant. She is in the room, she consented to nothing, and she is the compliance exposure PROJECT.md section 5 names. Section 2 says care staff are not users in v1, which makes her a non user who is nonetheless affected. Not resolved.

## Closing step

- [x] Voice path constraints promoted to `claude/rules/voice.md`, later
- [x] Findings with no code fix recorded at the end of `personas/FINDINGS.md`
- [x] Status set in `worklog/INDEX.md`

## The thing to carry forward

Every one of the seven defects was in the matcher. None was in the answer policy.

The dangerous half of the product was well tested because it was written with tests. The matcher had tests too, and they all passed, because they used the phrasings the matcher was built from. It took utterances written from the other direction to find anything.

That is the argument for the folder existing, and the argument for PROJECT.md section 8's instruction to test with real recordings. These utterances were written, not collected. They found seven. Recordings will find the ones nobody thought to write down.
