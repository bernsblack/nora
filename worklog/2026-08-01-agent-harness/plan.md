# Plan: the agent harness

**Backfilled on 2026-08-01, immediately after the fact.**

## What this is

Rules, specialist reviewers and a copy skill, ported from `equip-platform` and rewritten for this product. Then the worklog convention on top of it.

Commits `ffe80d0` and the one this folder lands in.

## Steps

- [x] `scripts/setup-claude.sh`, symlinking `claude/` into `.claude/` from the pnpm `prepare` hook
- [x] `CLAUDE.md`: harness map, commands, the non negotiables, the path to rule table
- [x] Six rules: `answer-policy`, `voice`, `room-screen`, `testing`, `markdown`, `agent-panel`
- [x] Six read only reviewers, plus `claude/agents/README.md` for provenance and tool policy
- [x] `/panel`, sized to the change
- [x] `nora-copy`, with voice, Afrikaans, English and per surface references
- [x] Worklog: `INDEX.md`, `_template/`, `claude/rules/worklog.md`, four folders backfilled
- [x] `docs/traceability.md`: which PROJECT.md requirement is held up by what
- [x] Session handoff: `handoff/NEXT.md`, `claude/rules/handoff.md`, `/goodbye`
- [x] Two hooks: `SessionStart` injects the handoff with a computed staleness verdict, `SessionEnd` leaves a facts-only breadcrumb. Merged into the generated settings file by the setup script
- [x] Verify: `pnpm run check`, 466 green
- [x] Verify: `pnpm run e2e`, 39 green

## Current state

- **Done:** all of it. Rules, six reviewers, `/panel`, `nora-copy`, the worklog with four folders backfilled, the traceability map, the handoff, `/goodbye`, and both hooks. Every staleness path in the start hook was exercised by running it, not by reading it.
- **Next:** run `/panel` on the persona work, `git diff 40803b6..6326e6c`. It exercises sizing, fan out and synthesis against a change whose defects are already documented, which is the only honest way to find out whether the roster works or invents things. Alternatively the four cheap tests in `docs/traceability.md`.
- **Open decisions:** none. One thing deliberately not built: a `Stop` hook to nag about a stale handoff, left out because it fires on every response and a reminder that fires too often is one people learn to ignore. Revisit only if forgetting `/goodbye` proves to be a real problem.

## What is built but unproven

**No reviewer has produced a finding yet.** Six agent definitions, a panel skill that sizes and synthesises, and nothing has run through any of it. Until `/panel` runs once on a diff with known defects, the roster is an assertion.

## Closing step

- [x] The harness is itself the promotion target, so there is nothing further to promote
- [x] Status set in `worklog/INDEX.md`

## Why six reviewers and not eleven

Equip's roster serves a multi app frontend with generated API clients, wizards, tenancy and payments. Frontend Developer, AppSec Reviewer, Product Manager and Feedback Synthesizer have nothing here they would not be inventing.

The design and UX lenses were kept in full, because two of this product's requirements cannot be checked by any test. Nothing in CI can fail a screen for sounding impatient, and the person the device is for cannot report a defect.

## Why no code knowledge graph

Researched and rejected for now. The measured case for one is roughly ten times fewer tokens and 2.1 times fewer tool calls, against answer quality of 83% versus 92% for plain file reading. This repo is 63 TypeScript files and about 9,000 lines, which `rg` and `sg` read exhaustively for very little, so the saving applies to a cost that is already near zero and the quality drop applies to the answers.

Revisit somewhere north of 300 files, or the first time a session is spent finding code rather than changing it. Serena is the place to start, because it uses the language server rather than a second index that can drift.
