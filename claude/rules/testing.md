---
paths:
  - '**/*.test.ts'
  - '**/*.spec.ts'
  - 'e2e/**'
  - 'personas/**'
---

# Testing

## Tests describe intended behaviour

An existing test says what the product is supposed to do. Never delete a test, or the code it covers, to make something pass. If a test asserts that the device stays silent, that an error is returned rather than thrown, or that a rule id has a particular string, that is the design.

Before concluding something is broken, check whether a test asserts it. If one does, treat the behaviour as deliberate.

## The tests that are product constraints

These are not checking code behaviour. They are the only place several requirements in PROJECT.md exist as something a machine can fail. Deleting or weakening one needs a stated reason in the commit message.

| File | What it holds |
| --- | --- |
| `src/design/room-theme.test.ts` | Every colour pairing against WCAG with real numbers, dimmed and undimmed, and fails if the room screen drifts blue dominant |
| `e2e/room.spec.ts` | Font size, weight, tracking, contrast and overflow as actually rendered at tablet size |
| `src/domain/answer-policy/policy.test.ts` | All three grief floors across every mode |
| `src/domain/voice/privacy.test.ts` | A source scan for any API that could capture, store or transmit audio |
| `personas/personas.test.ts` | What five specific people say, through the whole voice path |

## The persona suite is allowed to fail

It is the only suite in the repo written from outside the implementation. Everything in `src/` passes partly by construction, because the same author wrote the test and the thing it tests. The persona scenarios were written from the other direction and found seven defects on their first run, every one of them real.

So: **when a persona scenario fails, the device is wrong.** Write the finding in `personas/FINDINGS.md` and fix the device. Editing the scenario until it passes destroys the only property that makes the suite worth having.

New scenarios are welcome and should be awkward on purpose. The utterances are written rather than collected, which is a stated limitation, not a solved problem.

## New domain code ships with its test

Anything in `src/domain/` is pure and has no excuse. Cover the branches, not the happy path: every guard, early return, `??` and thrown error is a branch, and branches are where this codebase has actually been wrong.

## Browser tests, and the traps this repo has already hit

Playwright here runs `fullyParallel: false` and `workers: 1` against shared in-memory state, reset via `POST /api/test-reset` in `beforeEach`. That route 404s when `DATABASE_URL` is set.

Four things have cost real time and will again:

- **`getByRole("button", { name: "Save" })` matches by substring.** Screenshot tests silently captured the wrong form for a while because a different form's "Save this choice" came first in the DOM. Use `{ name: "...", exact: true }`, and assert the save landed before continuing.
- **Screenshots catch elements mid-crossfade.** Pass `{ animations: "disabled" }` or the element looks missing.
- **`getByRole("alert")` matches Next's route announcer.** Use the `data-testid`.
- **Route handlers and server components get separate module registries.** The repository cache lives on `globalThis` under a `Symbol.for` key precisely so `/api/test-reset` and the page share one instance. A module-level cache gives them one each and the reset appears not to work.

Kill anything on port 3000 before a run. A stale `next start` makes a whole suite fail in a confusing way.

## Before saying it is done

```bash
pnpm run check   # typecheck, lint, unit tests
pnpm run e2e     # browser tests
```

Both. A green `pnpm run check` says nothing about what renders.
