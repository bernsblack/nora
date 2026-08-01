# Plan: <task title>

<!--
The single tracker for this task. A fresh session must be able to resume from
PROJECT.md and this file alone, with no memory of the conversation.
Rewrite "Current state" before every session ends.
-->

## What this is

<!-- Two or three sentences. What is being changed, and which part of PROJECT.md
     asks for it. Link the section. -->

## Steps

- [ ] <step 1>
- [ ] <step 2>
- [ ] Verify: `pnpm run check` passes
- [ ] Verify: `pnpm run e2e` passes, if anything rendered changed
- [ ] Closing step, below

## Current state

<!-- Rewrite this at the end of every working session. -->

- **Done:**
- **Next:**
- **Open decisions:** <!-- An open decision here means this is not done. -->

## Closing step

Promote the durable part out of this folder before marking the task done in `worklog/INDEX.md`.

- [ ] A constraint on how the code may change becomes a rule in `claude/rules/`
- [ ] A product number becomes a constant in `src/config/constants.ts`, with its reason
- [ ] Anything a resident might say becomes a scenario in `personas/scenarios.ts`
- [ ] A PROJECT.md principle with nothing behind it becomes a row in `docs/traceability.md`
- [ ] Incidents in `errors.md` reviewed, and anything recurring turned into one of the above
- [ ] Status set to done in `worklog/INDEX.md`, with a summary worth finding in three months
