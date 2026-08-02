---
description:
  End the session cleanly. Updates the active worklog plan and errors files,
  then writes handoff/NEXT.md so the next session knows exactly where to pick
  up. Run this before stopping work, especially before a context reset.
argument-hint: "[a note about where things stand, optional]"
---

# /goodbye

You are ending a working session. The goal is that a session starting tomorrow with no memory of this conversation loses nothing that mattered.

The governing rules are [`claude/rules/handoff.md`](../rules/handoff.md) and [`claude/rules/worklog.md`](../rules/worklog.md). Read the first one; this skill executes it.

`$ARGUMENTS`, if given, is the user's own note about where things stand. Treat it as the most authoritative statement of intent in this whole process and carry it into the handoff close to verbatim.

## 1. Establish the real state, do not recall it

```bash
git status --short
git log --oneline -5
git diff --stat
```

Then answer honestly, from the commands and not from memory:

- Is the tree clean? What is uncommitted, and is it deliberate or half-finished?
- Was `pnpm run check` run since the last change, and did it pass? If you do not know, run it. **Do not write a handoff that implies green when you have not seen green.**
- Is anything on disk in a state that would confuse somebody, a stray scratch file, a commented-out block, a test skipped to get past something?

## 2. Update the worklog, if there is one

If a `worklog/<task>/` folder is active:

- Rewrite **Current state** in `plan.md`: done, next, open decisions. This is required by `claude/rules/worklog.md` before any session ends, and this is the moment it happens.
- Add anything to `errors.md` that went wrong this session and is not in there yet. Incidents get logged when they happen; this is the backstop, not the intended path.
- If the task actually finished, run the closing step and set the status in `worklog/INDEX.md`, with a summary worth finding in three months.

If there is no worklog folder and the session did non-trivial work, that is itself worth noting. Either create one now or say in the handoff why the work did not warrant it.

## 3. Archive the previous handoff

Move the existing `handoff/NEXT.md` to `handoff/log/YYYY-MM-DD-HHMM.md`, using its own **Written** timestamp for the filename rather than the current time, so the log reads as a sequence of session endings.

## 4. Write handoff/NEXT.md

Header always:

```markdown
# Next session

**Written:** <YYYY-MM-DD HH:MM> at commit `<short hash>`
**State:** clean | in progress | broken
```

The commit hash is not decoration. It is how the next session detects that this file is stale, so get it from `git log`, not from memory.

**If nothing is in flight**, that is the whole file plus two lines:

```markdown
No work in progress. Continue as normal.

<one sentence on the most obvious next thing, if there is one, with a link>
```

Prefer this. A clean stop is worth more than a detailed handoff about a messy one.

**If something is in flight**, add only the sections that have content:

```markdown
## Pick up here

<One concrete action. Something a session could act on cold, without this
conversation. If you cannot write it as one action, say so plainly and say
what has to be decided first.>

## Where it stands

<Two or three sentences. Link the worklog folder rather than repeating it.>

## Not done, and asked for

<Anything the user requested that did not happen, in their words. This is the
only place in the repo that records it.>

## Unverified

<Anything not run, not checked, or known broken. Omit this section only when
check and e2e are both green and you watched them go green.>

## Found but not yet a rule

<Traps or surprises from this session that have not been promoted into
claude/rules/, personas/scenarios.ts, or a constant. These decay fastest.>
```

Keep it short. A handoff nobody finishes reading is a handoff that failed.

## 5. Report and offer to commit

Tell the user, in a few lines: what state the tree is in, what the handoff says to do next, and anything you had to leave unresolved.

Then offer to commit. Do not commit without being asked. If the tree is otherwise clean, suggest a single commit scoped `handoff:`. If there are other changes, suggest folding the handoff into whatever commit they were going to make anyway, so the repo does not fill with handoff-only commits.

## The one thing not to do

Do not write a handoff that is more optimistic than the session was. If the work stalled, if something is broken, if you were unsure whether an approach was right, the handoff says that. The value of this file is entirely in whether it can be trusted, and a single reassuring handoff that turns out to be wrong destroys that for every one after it.
