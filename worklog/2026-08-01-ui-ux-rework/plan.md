# Plan: rework both surfaces around what each one is for

**Backfilled on 2026-08-01, after the fact.**

## What this is

An open ended design pass over the room screen and the family app, after the first working version of both. PROJECT.md sections 3, 4 and 7.

Commit `40803b6`.

## Steps

- [x] Room screen: grid so the day line spans both columns and never wraps mid word
- [x] Room screen: derive the answering state rather than storing it, so TypeScript narrows
- [x] Family app: reorder around the decisions rather than around the schema
- [x] Family app: set the answer policy section apart and state the floors in it
- [x] Family app: keep typed input when a save is refused
- [x] Family app: read a `datetime-local` value as the time where the resident lives
- [x] Verify: `pnpm run check`, `pnpm run e2e`, `pnpm run screenshots`

## Current state

- **Done:** all of it.
- **Next:** nothing on this task.
- **Open decisions:** none introduced here.

## Closing step

- [x] Constraints promoted into `claude/rules/room-screen.md` and `claude/rules/testing.md`, later
- [x] Status set in `worklog/INDEX.md`

## The change that mattered

The family app was originally laid out in schema order: person, facility, schedule, photos, policy. It now runs in the order a daughter actually cares about, with the answer policy set apart from the ordinary settings and carrying a plain statement of what the device will never do regardless of the choice.

That section is the one Anna spends a week on. A form that treats it like a notification preference is wrong even when every field works.
