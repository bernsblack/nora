# Errors: the agent harness

## The setup script's own documentation was wrong

- **What went wrong:** the script, `CLAUDE.md` and `README.md` all said the symlinks are created by the pnpm `prepare` hook "on every install". They are not. pnpm skips lifecycle scripts when an install is a complete no op, so pulling a change that adds a rule and running `pnpm install` leaves the new rule unlinked.
- **Root cause:** the claim was copied from the source repo's wording and assumed rather than tested.
- **How it was caught:** testing it. Deleting the symlinks and running `pnpm install` twice, then reproducing the behaviour in a scratch project to confirm it was pnpm and not something local.
- **Proposed guide or sensor:** state the real behaviour, including the manual path.
- **Now enforced by:** the corrected comment in `scripts/setup-claude.sh`, and both docs now say to run `pnpm run prepare` after pulling a harness change.

Small, but exactly the kind of thing this file is for. A documented mechanism that does not fire is worse than no mechanism, because nobody checks it again.

## `.claude/scan-cache.json` had been committed

- **What went wrong:** local machine state, a tool's cache, was tracked from the first commit.
- **Root cause:** `.gitignore` had no entry for `.claude/`, and the initial `git add` swept it in.
- **How it was caught:** `git status` showing it as modified while adding the harness.
- **Proposed guide or sensor:** `/.claude/` in `.gitignore`, and the file untracked with `git rm --cached` so it stays on disk.
- **Now enforced by:** `.gitignore`.

## An assertion about test coverage that turned out to be false

- **What went wrong:** while arguing for the traceability map, "never impatient" was offered as an example of a PROJECT.md principle that nothing enforces. It is enforced, in two places: `policy.test.ts` "never acknowledges that the question has been asked before", and `e2e/room.voice.spec.ts` "sounds the same on the fortieth ask as the first".
- **Root cause:** asserting a coverage gap from memory instead of reading the test titles. The claim was rhetorically convenient, which is precisely when to check it.
- **How it was caught:** building the traceability map, which meant actually enumerating every test.
- **Proposed guide or sensor:** the map itself. Any future claim about what is or is not covered gets checked against it rather than recalled.
- **Now enforced by:** `docs/traceability.md`.

The real gaps turned out to be different ones: never quiz, no scorekeeping, light before sound, and the crossfade-only motion constraint. All four are now rows in the map with nothing behind them, which is more useful than the wrong example was.

## A commit was blocked three times and the diagnosis was wrong twice

- **What went wrong:** `git commit` was refused by a `block-ai-typography` hook whose message says the commit text contains banned characters or an AI attribution. First guess: the literal string in the message naming the root instructions file was reading as an AI reference. Reworded, blocked again. Second guess: the lowercase form of the same word in the paths of the settings file and the setup script. Reworded again, blocked again.
- **Root cause:** the message was never the problem. The hook runs on `PreToolUse` and scans **the whole bash command string**, and the em dash verification scan was being chained into the same command as the commit. The scan for banned characters contained the banned characters.
- **How it was caught:** empirically, after the third block, by committing with a trivial message. It was also refused, and afterwards nothing was staged, which showed the entire command had never run rather than the commit having been rejected.
- **Proposed guide or sensor:** run the character scan as its own command, or escape the pattern as an ANSI-C quoted string.
- **Now enforced by:** nothing. It is a property of the environment rather than the repo.

Two lessons, and the second is the one that generalises. An error message that names the likely cause can send you the wrong way repeatedly, and each rewording produced a *plausible* theory that was never tested. The cheap experiment, commit with a one word message, would have isolated it on the first attempt and was not run until the third.

## A test destroyed the thing it was testing

- **What went wrong:** verifying that the `SessionEnd` hook stays silent on a clean tree meant producing a clean tree, so `git stash -u` was used. That stashed the untracked hook directory along with everything else, and the next line invoked a script that no longer existed.
- **Root cause:** stashing to create the condition under test, when the thing under test was itself uncommitted.
- **How it was caught:** exit code 127 on the very next command. Recovered with `git stash pop`.
- **Proposed guide or sensor:** commit first, then test the clean-tree path. Never stash to set up a test of uncommitted code.
- **Now enforced by:** nothing.

## Two defects in the hooks, both found by running them

- **What went wrong:** the staleness verdict rendered "There are 1 uncommitted changes", and the handoff was two commits stale by the time the hooks landed.
- **Root cause:** no pluralisation branch, and the handoff was written before two more commits landed on top of it.
- **How it was caught:** running the hook and reading its output. Neither is visible from reading the source, and the second is the mechanism correctly reporting on its own author.
- **Proposed guide or sensor:** none needed beyond the standard already in `claude/agents/reality-checker.md`: if it is not shown, it is not real.
- **Now enforced by:** fixed in `claude/hooks/session-start.sh`. The four staleness paths were then each exercised by hand.
