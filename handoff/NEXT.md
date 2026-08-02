# Next session

**Written:** 2026-08-02 11:14 at commit `97092db`
**State:** clean

No work in progress. Continue as normal.

## Pick one of two, both small

**Run `/panel` on the persona diff**, `git diff 40803b6..6326e6c`. Nothing has ever run through the reviewers, so six agent definitions and a panel skill are currently an assertion. That diff is the right first target because its seven defects are already documented in `personas/FINDINGS.md`, so the run shows whether the roster finds real things or invents plausible ones. If it invents, fix the agent definitions before anybody acts on a finding from them.

**Or write the four missing tests.** [`docs/traceability.md`](../docs/traceability.md) ends with six PROJECT.md requirements that nothing enforces. Four are cheap: no scorekeeping, light before sound, no animation beyond the crossfade, and nothing branching on the raw simplicity level outside `src/domain/simplicity.ts`. The other two are a copy review and a deferred product decision, not test gaps.

## Where things stand

Four commits of product, four of harness. PROJECT.md section 11 steps 0 to 5 are built, every external service behind an interface with a mock.

Verified at `97092db`: `pnpm run check` 466 green, `pnpm run e2e` 39 green. The screenshots project is separate and was not run this session; `pnpm run screenshots` adds 7 more.

The harness is complete: rules, six reviewers, `/panel`, `nora-copy`, the worklog with four folders backfilled, `docs/traceability.md`, this handoff, `/goodbye`, and the two hooks. See [`worklog/INDEX.md`](../worklog/INDEX.md), whose rows are long on purpose.

## Found but not yet a rule

**`block-ai-typography` scans the whole bash command, not the commit message.** A commit was refused three times this session and blamed on its message twice. The real cause was an em dash character scan chained into the same command as the commit. Run that scan separately, or escape the pattern as `$'...'`. Logged in `worklog/2026-08-01-agent-harness/errors.md`; it is a property of the environment, so nothing in the repo enforces it.

**Never `git stash -u` to test uncommitted code.** It stashes the thing under test. Same file.

**Git reports a stale upstream** on every command: `Your branch is based on 'origin/main', but the upstream is gone`. Left over from the scaffold, harmless, cleared with `git branch --unset-upstream`.
