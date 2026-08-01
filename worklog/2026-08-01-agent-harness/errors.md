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
