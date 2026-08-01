---
paths:
  - 'worklog/**'
---

# Worklog

Most of this code is agent written, and agents lose context between sessions. This one has already been compacted mid task more than once. Work in progress state therefore lives in versioned files rather than in a conversation.

Every non trivial task gets a folder:

```text
worklog/
  INDEX.md                       one row per task, newest at the top
  _template/                     copy this
  2026-08-01-short-slug/
    plan.md                      the tracker. A fresh session resumes from this alone
    errors.md                    incidents, written for a future harness pass
```

Trivial work skips this: a typo, a one line change, a doc tweak. When unsure, create one.

## There is no prd.md

Equip's version of this has three files. Ours has two, because `PROJECT.md` is the product brief, section 11 already sequences the work, and section 14 already carries the open questions. A per task product document for a project that has one would be ceremony, and a convention that gets skipped by the third task is worse than no convention.

If a task needs product framing that PROJECT.md does not give it, that is a sign the brief is wrong or the task is out of scope. Say so rather than writing a local PRD around it.

## plan.md

Checkboxed steps, plus a **Current state** section rewritten before every session ends: done, next, open decisions.

The bar is specific: **a fresh session must be able to resume from `PROJECT.md` and this file alone.** Write it for somebody with no memory of the conversation, because that is exactly who reads it.

An open decision listed here means the task is not done, whatever the checkboxes say.

## errors.md

**Written for a future harness pass, not for debugging.** The entry is not there to help you fix the thing, you already fixed it. It is there so the same class of mistake becomes impossible rather than becoming familiar.

Log every incident as it happens: a wrong assumption, a check that passed while the thing was broken, rework caused by a missing rule, a comment that turned out to be false. One entry per incident.

**How it was caught** is the field that carries the most information. If the answer is luck, that is the strongest possible argument for a sensor, and it is also the field people quietly round up to "review". Write luck when it was luck.

## The ratchet

The point of all this is that an incident becomes a constraint. When a task closes, the durable part leaves the folder:

| What was learned | Where it goes |
| --- | --- |
| A constraint on how the code may be changed | a rule in `claude/rules/` |
| A product number and the reason it holds that value | `src/config/constants.ts`, with the reason beside it |
| Something a resident might say that went wrong | a scenario in `personas/scenarios.ts` and a note in `personas/FINDINGS.md` |
| A principle in PROJECT.md that nothing enforces | a row in `docs/traceability.md`, and ideally a test |

Worklog folders are episodic. Nothing durable may end its life inside one.

There are no ADRs here on purpose. `src/config/constants.ts` already records product decisions next to the numbers they produced, which is an ADR that cannot drift from the value it explains, and `claude/rules/` holds the rest.

## INDEX.md

One row per task: date, folder, status, summary. Status is `planned`, `in-progress`, `done`, or `abandoned`. Newest at the top.

**Let the summary run long.** The obvious convention is a one line summary and it is the wrong one. This file is the only artifact that survives every compaction, so a row that actually says what was decided and why is worth more than a tidy table. Write the row you would want to find in three months with no memory of the work.

There is no `merge=union` git driver on this file, because there is one developer on one branch. Add one the day that changes.
