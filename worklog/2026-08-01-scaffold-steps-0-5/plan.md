# Plan: scaffold and steps 0 through 5

**Backfilled on 2026-08-01, after the fact.** The work was done before this folder existed, so the steps below are reconstructed from the commit and the session. `errors.md` beside it is the part worth reading, and it is accurate: those incidents happened.

## What this is

Everything in PROJECT.md section 11, steps 0 to 5, in one pass, under an instruction to prototype autonomously and put every external service behind an interface with a working mock.

Commit `f116ad3`.

## Steps

- [x] Step 0. Scaffold: Next.js 16, TypeScript, Drizzle, Neon, Playwright, CI
- [x] Step 1. The room screen, static, with the typography and contrast constraints from section 4
- [x] Step 2. Schema and the family app, room screen reading from a repository
- [x] Step 3. Calendar import, iCal, read only
- [x] Step 4. Voice, mode one, local intent matching with scripted answers
- [x] Step 5. The answer policy engine, with tests on every branch
- [x] Verify: `pnpm run check`
- [x] Verify: `pnpm run e2e`

## Current state

- **Done:** all six steps. Every external service sits behind an interface with a mock: database, speech, ambient light, calendar fetch, family auth, media storage, mode two conversation.
- **Next:** nothing on this task. Superseded by the UI and UX rework.
- **Open decisions:** two, both carried from PROJECT.md section 14 rather than introduced here. Audio versus on device text for the invoked path is unanswered, which is why mode two is not built. Whether an unprompted device is comforting or unsettling is unanswered, which is why `speakUnprompted` exists in the simplicity dial and does nothing.

## Closing step

- [x] Constraints promoted to rules: `claude/rules/room-screen.md`, `voice.md`, `answer-policy.md`, `testing.md`. Done later, in the harness task
- [x] Product numbers in `src/config/constants.ts`, each with the reason it holds that value
- [x] Status set in `worklog/INDEX.md`

## Note on the Web Speech API

PROJECT.md lists it as the throwaway prototype choice for speech, and separately requires that mode one transmits no audio. Both cannot hold: Chrome and Firefox stream microphone audio to a cloud service. It is therefore off by default behind `NEXT_PUBLIC_ALLOW_CLOUD_ASR`, and the default recogniser opens no microphone at all.

This is the first real contradiction found inside the brief. On device recognition is flagged in section 5 as an open question for mode two. It is a mode one problem too.
