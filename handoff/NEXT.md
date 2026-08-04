# Next session

**Written:** 2026-08-04 11:40 at commit `b8effef`
**State:** clean

No work in progress. Everything is committed and pushed, and all three suites were run at the end of the session and watched go to the states below.

## Where things stand

Two worklogs closed and one opened. [`worklog/2026-08-03-eval-harness/`](../worklog/2026-08-03-eval-harness/plan.md) is **done**: PROJECT.md section 9's Mastra condition was met, revisited, and answered by building the harness here instead. [`worklog/2026-08-03-real-room/`](../worklog/2026-08-03-real-room/plan.md) is **in progress** and is the current milestone, a tablet in a real room. Its phase 1 is finished except for three items blocked on a purchase or an account.

**Test states, watched rather than remembered:**

- `pnpm run check` is 524 passing, 4 failing, 25 skipped. The 4 are the persona scenarios that are red on purpose and the 25 are the Postgres half of the contract suite, which skips without `TEST_DATABASE_URL`.
- `pnpm run e2e` is 62 passing with **none skipped**. The four night contrast `fixme` cases are gone, closed rather than pinned.
- `pnpm run test:db` is 50 passing against a real Postgres. New command, run it after touching `src/data/`.

## Pick up here

**Nothing is half finished, so the honest first move is to ask which of the open decisions Bernard wants to settle.** They are listed in the real-room plan and none of them is an engineering call. The two with the most downstream reach:

1. **How the milestone is measured**, against section 12's refusal to monitor. It shapes what phase 1 still has to build.
2. **Who may change the answer policy.** Anna and Pieter disagree in their own persona files, and today `canAccess` is the only check, so whichever of them edits last wins silently.

If you want something that needs no decision, the useful ones are starting phase 3, which is ethics and a facility and is the long pole in calendar time, or taking the accessibility items below.

## Not done, and asked for

Nothing was asked for and skipped. The three phase 1 items that remain are blocked rather than deferred: a production deploy and kiosk config need a Vercel account and a device, the photo upload path needs a storage vendor, and the answer policy permission needs a product decision.

Worth correcting a scoping error from earlier in the session while it is fresh: **`MediaStore` has zero call sites.** Photos are added by pasting a URL. The work is building an upload path that does not exist, not swapping a mock.

## Unverified

All three suites were run and watched at the end of the session, so those numbers are real.

Two things that are known and not verified:

- **`saveAnswerPolicy` is a non-transactional delete then reinsert.** On a real Postgres that opens a window where a person has a policy and no topics, and two concurrent saves can interleave. Unreachable today because nothing runs with a `DATABASE_URL`. Not fixed because the production driver is Drizzle's neon-http and its transaction behaviour could not be tested here, and shipping an untested change to that path is worse than a recorded gap.
- **The CI change is not verified.** `ci.yml` gains a `database` job with a Postgres service. Its exact steps were rehearsed locally, migrations then the contract suite against a service-shaped Postgres, and 50 passed, but the workflow itself has never run on a runner. First push proves it.

## Found but not yet a rule

**CI has been red on every push** since the four persona scenarios became deliberate, because `ci.yml` runs `pnpm run test`. A permanently red pipeline is a signal nobody reads. Every fix touches the persona suite, which `claude/rules/testing.md` protects, so it was left as a decision rather than an edit.

**Finding 13 in [`personas/FINDINGS.md`](../personas/FINDINGS.md) was written, and then withdrawn in the same session.** The claim was that straight after setup "waar is my man" is answered with the facility name and room number. It is not: the device stays silent, because the utterance scores 0.225 and never reaches the answer policy. The probe that produced the claim skipped `decide`, the stage that turns a weak match into silence. Commit `a8ea776` carries the wrong version in its message; the corrected account is in FINDINGS.md and in the worklog `errors.md`. What survives is smaller and real: the mode a family chooses is inert until they write somebody down, which is a product gap, and both screens now say so.

**Accessibility items the panel raised that predate this work.** Three are now fixed: the room screen's `lang`, pinch zoom being disabled app-wide rather than kiosk-only, and the microphone saying in words whether sound leaves the room rather than signalling it with a dot that is invisible at night. Two are not: focus drops to `<body>` on every form submit because the submit button is disabled while pending, and the setup error is announced but not programmatically associated with the radio group. Both are in `action-form.tsx` and affect every form in the family app.

**A test skipped inside a generated loop reads as one defect per case.** Four `test.fixme` night contrast cases were described as four failures in three separate documents; only one element ever failed. Logged in the real-room `errors.md`, and worth remembering the next time a skip count is quoted as a defect count.

**Four requirements that nothing held are now held**, leaving two in `docs/traceability.md`. No scorekeeping and light before sound as browser tests, no animation beyond the crossfade and no branching on the raw simplicity level as source scans. Each was checked by breaking the thing it guards, because a scan that matches nothing looks exactly like a scan that is broken.

**The falsification habit paid for itself repeatedly, and once it caught me rather than the code.** Disabling room caching, removing the revocation filter, removing the radio branch, and breaking each of the four new guards all went red in the expected place. Then two scenarios written to prove a defect went green, which is how finding 13 turned out to be wrong. A test written for a fix nobody has tried to break is not yet evidence, and neither is a finding nobody has tried to contradict.
