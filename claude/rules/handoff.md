---
paths:
  - 'handoff/**'
---

# The handoff

`handoff/NEXT.md` is the first thing read at the start of a session and the last thing written at the end of one. It answers exactly one question: **what should the next session do first?**

It is called handoff rather than prompts because a folder called prompts collects reusable prompt templates within a week, and this is not that. There is one live file.

```text
handoff/
  NEXT.md        the live handoff. Always exists, even when there is nothing in flight
  log/           previous handoffs, newest last. History, not read at startup
```

## The two shapes

**Nothing in flight.** The resting state, and the one to leave things in whenever possible:

```markdown
**State:** clean

No work in progress. Continue as normal.
```

That is the whole file, plus the header. A session reading it goes to `worklog/INDEX.md` for what has happened and PROJECT.md section 11 for what is next.

**Work in flight.** Then it says where to pick up, in one concrete action.

## The rules that make it worth reading

**Every handoff records the commit it was written at.** A handoff is a second source of truth about the state of the repo, and a stale one is worse than none: it will confidently send a session to redo finished work. So the header carries the short hash, and the first thing a session does is check `git log` against it.

The hash is `HEAD` at the moment of writing, which means **the commit carrying the handoff is normally one ahead of it**. That offset is expected and is not staleness. Anything beyond one commit means work has landed since, and the handoff should be verified rather than followed.

**"Pick up here" is one concrete action, not a topic.** "Continue the harness work" is not a handoff, it is a category. "Write the four missing tests listed in `docs/traceability.md`, starting with no scorekeeping" is a handoff. If the next action cannot be stated in a sentence somebody could act on cold, the session did not end at a clean point and the handoff should say that instead of pretending.

**Say what is unverified.** If `pnpm run check` was not run, or was run and failed, or something is half edited on disk, that goes in the handoff and it goes near the top. A handoff that implies a green tree when the tree is broken costs the next session more than it saves.

**Say what was asked for and not done.** Anything the user requested that did not get finished belongs here, in their words rather than a paraphrase. It is the one thing nothing else in the repo records.

## Its relationship to the worklog

They are not the same thing and neither replaces the other.

- `worklog/<task>/plan.md` is **per task** and durable. It survives the task and is committed history.
- `handoff/NEXT.md` is **per session** and disposable. It is a pointer, and it is usually a pointer at a plan.

`claude/rules/worklog.md` already requires that `plan.md`'s Current state is rewritten before a session ends. `/goodbye` is what actually does that, so the handoff is the enforcement of an existing rule rather than a second parallel system. When there is an active worklog folder, the handoff should be short and name it, not duplicate it.

## Writing it

Use `/goodbye`. It reads the session, updates the active `plan.md` and `errors.md`, archives the previous handoff into `handoff/log/`, and writes the new one.

Writing `NEXT.md` by hand is fine. Writing it vaguely is not.

## The two hooks, and the one job each has

Registered into `.claude/settings.json` by `scripts/setup-claude.sh` from `claude/hooks/`. Both need `jq` and both fail open without it.

**`session-start.sh`** injects this file into the session before the first prompt, with the staleness verdict already computed. It exists because reading the handoff was previously a request in the instructions file competing with everything else in there, and because comparing a hash to `HEAD` and remembering that one commit ahead is expected is arithmetic rather than judgement. It reports fresh, stale with a count, an unresolvable commit, or a missing one, and appends the uncommitted file count.

**`session-end.sh`** writes a breadcrumb to `handoff/log/` when a session ends with work that was never handed off, and writes **nothing** when the tree is clean and up to date, so an ordinary `/clear` leaves no residue.

**The breadcrumb is not a handoff and the file it writes says so.** `SessionEnd` cannot inject context and has no decision control, so by the time it runs the model is out of the loop and nothing can be asked of it. It records facts: timestamp, `HEAD`, commits past the last handoff, and the dirty file list. It cannot say what was being attempted or what should happen next, which is the entire value of a real handoff.

That distinction is worth defending. A file that looks like a handoff and contains no judgement is exactly what teaches people to stop trusting the ones that do.

`SessionEnd` hooks share a 1.5 second budget and are not guaranteed to run on a crash, so that script is a couple of git calls and nothing else. It is a backstop for the ungraceful exit, never a substitute for `/goodbye`.

There is deliberately no `Stop` hook. It could nag when the handoff has gone stale, but it fires every time a response finishes, and a reminder that fires too often is one people learn to ignore. Add it only if forgetting `/goodbye` turns out to be a real problem rather than a predicted one.
