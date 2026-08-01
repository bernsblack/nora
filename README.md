# Nora

A tablet that lives in the room of a person with dementia and always shows the answer to the questions they repeat, and a phone app where a family member keeps it current.

Read `PROJECT.md` first. It is the brief, and it wins over anything written here.

Nora is a working name. Brand strings live in `src/config/brand.ts` and read from environment variables, so nothing user facing hardcodes a product name.

## Running it

```bash
pnpm install
pnpm dev
```

Then:

- `/room?token=dev-room-token` is the room screen, the thing in the room
- `/room?token=dev-room-token&wizard=1` adds a text box where a human types what they heard someone say, so the interaction can be tested before any speech recognition is trusted
- `/app` is the family app

No database is required. With no `DATABASE_URL` the whole thing runs on in memory fixtures for one invented resident, and every edit in the family app is lost when the process restarts. Copy `.env.example` to `.env.local` when that stops being enough.

## What is real and what is a stand in

Everything that touches an external service sits behind an interface with a working mock, so the shape is settled and the vendor is not.

| Behind an interface | Runs today | Where |
| --- | --- | --- |
| Database | In memory fixtures | `src/data/` |
| Speech recognition | A mock that opens no microphone | `src/services/speech.ts` |
| Ambient light | Assumes darkness by the clock | `src/services/ambient-light.ts` |
| Calendar fetch | A bundled `.ics` | `src/services/calendar.ts` |
| Family authentication | One fixed signed in user | `src/services/family-auth.ts` |
| Photo and audio storage | Data URLs in memory | `src/services/media-storage.ts` |
| Mode two conversation | Returns nothing at all | `src/services/conversation.ts` |

The Drizzle schema and Postgres implementation are written and the first migration is generated, but neither has run against a real database. Switching is setting `DATABASE_URL`.

## Layout

```
src/config/       Product decisions as named constants, and brand strings
src/domain/       Everything the product knows how to decide. No React, no IO.
  answer-policy/  What Nora says about the dead. The highest risk path.
  voice/          Mode one: intents, local matching, the rolling buffer
src/design/       The room screen palette and type scale, in TypeScript
src/data/         Repository interface, in memory implementation, Drizzle schema
src/services/     Everything with a vendor behind it
src/app/room/     The room screen
src/app/app/      The family app
e2e/              Playwright, including the contrast and legibility checks
personas/         Five people who would use this, and their questions as tests
claude/           The agent harness: rules, specialist reviewers, copy skill
```

## The harness

`claude/` holds the rules, reviewers and skills that constrain how this codebase gets
changed. It is committed. `.claude/` is generated from it by `scripts/setup-claude.sh`,
which runs from the pnpm `prepare` hook on a fresh clone, and is gitignored. After
pulling a change that adds a rule or an agent, run `pnpm run prepare`.

| Where | What |
| --- | --- |
| `claude/rules/` | Path-triggered rules. `answer-policy`, `voice`, `room-screen`, `testing`, `markdown`, `agent-panel` |
| `claude/agents/` | Six read-only specialist reviewers |
| `claude/skills/panel.md` | `/panel`, which sizes a review to the change and fans the reviewers out |
| `claude/skills/nora-copy/` | Every word a person reads or hears, in both languages |

The reviewers exist because two of this product's requirements cannot be checked by any
test. Nothing in CI can fail a screen for sounding impatient, and the person the device is
for cannot report a defect. Ported from `equip-platform` and rewritten; see
[claude/agents/README.md](claude/agents/README.md).

## Personas

`personas/` holds five people who would use Nora, three residents and two family
members, with the questions they would ask. The residents' questions are not
prose: every one of them runs through the real matcher and the real answer
engine in `personas/personas.test.ts`.

The first run failed seven of thirty nine, and all seven were defects. The worst
of them was that "where is my husband", the sentence PROJECT.md uses as its
example of the hardest question in the product, produced silence, because
subject recognition matched names and not relationships. See
[personas/FINDINGS.md](personas/FINDINGS.md).

Read [personas/README.md](personas/README.md) first.

## Checks

```bash
pnpm run check        # types, lint, unit tests
pnpm run e2e          # browser tests
pnpm run screenshots  # writes screenshots/ for a visual recap
```

Some of the tests are enforcing product constraints rather than code behaviour, and they are the ones to be careful about deleting:

- `src/design/room-theme.test.ts` checks every colour pairing against WCAG with real numbers, dimmed and undimmed, and fails if anything on the room screen becomes blue dominant.
- `e2e/room.spec.ts` checks font size, weight, tracking, contrast and overflow as rendered in a browser at tablet size.
- `src/domain/answer-policy/policy.test.ts` covers all three hard floors on the grief path across every mode.
- `src/domain/voice/privacy.test.ts` scans the mode one source for any API that could capture, store, or transmit audio, and fails if one appears.
- `personas/personas.test.ts` runs what five invented but specific people would say through the whole voice path, and is the only suite written from outside the implementation.

## Two things worth knowing before going further

**The Web Speech API cannot be used in a real room.** `PROJECT.md` lists it as the throwaway prototype choice for speech and separately requires that mode one transmits no audio. Both cannot hold: Chrome and Firefox stream microphone audio to a cloud service. It is therefore off by default and gated behind `NEXT_PUBLIC_ALLOW_CLOUD_ASR`, and it is only for testing with the team's own voices. On device recognition, which the brief already flags as an open question for mode two, turns out to be a mode one problem too.

**Unprompted speech is not built.** Whether a device that answers before it is asked is comforting or unsettling is open, and the brief says to Wizard of Oz it with a human listening first. The capability exists in the simplicity dial and currently does nothing.

## Conventions

From `PROJECT.md` section 10, plus what came up while building:

- No em dashes anywhere, including code comments.
- Magic numbers become named constants in `src/config/constants.ts`, with the reason they exist written next to them.
- Statuses are kebab-case, the same strings in TypeScript and in Postgres enums.
- The room screen's palette and type scale live in TypeScript, not CSS, so tests can check the values that actually render.
- Nothing branches on the raw simplicity level outside `src/domain/simplicity.ts`.
