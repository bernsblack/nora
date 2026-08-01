# Errors: scaffold and steps 0 through 5

Backfilled. These all happened.

## The room screen rendered at 16px with 1:1 contrast, and every test passed

- **What went wrong:** `roomThemeCss` emitted its custom properties under a `.room` selector. CSS Modules hashes class names at build time, so the rule matched nothing. In the browser every font size fell back to 16px and every colour to the defaults, which is a contrast ratio of roughly 1:1 on the intended surface. The unit tests were green throughout, because they assert the values the function returns, not the values that reach a pixel.
- **Root cause:** a stylesheet generated in TypeScript has no way to know that the class name it is targeting will be rewritten by the bundler. Nothing connected the two.
- **How it was caught:** a browser. Specifically, taking a screenshot and looking at it. Not a test.
- **Proposed guide or sensor:** the theme hangs off an attribute selector, which the bundler does not touch, and a test asserts the emitted CSS starts with it.
- **Now enforced by:** `ROOM_THEME_SELECTOR` is `[data-room]`, `room-theme.test.ts` has "hangs off the attribute selector, not a hashed class name", and `e2e/room.spec.ts` checks size, weight, tracking and contrast **as rendered**. The reason is written into `claude/rules/room-screen.md`, because the fix looks like a style preference and is not.

This is the most instructive failure in the project so far. Every legibility and contrast requirement in PROJECT.md section 4 was violated at once, in the most visible way possible, with a fully green suite.

## Dimming the screen destroyed the contrast ratio

- **What went wrong:** the obvious way to dim for night is a `brightness()` filter over the screen. Applying it to text and background together drives the contrast ratio toward 1. The night palette measured 14.69:1 undimmed and 2.47:1 at a dim factor of 0.35, which is below the AA floor and far below the AAA target.
- **Root cause:** contrast is a ratio between two luminances. Scaling both ends leaves the ratio unchanged only in the limit; in practice it collapses, because the relative luminance formula is not linear.
- **How it was caught:** a test written while adding dimming, which computed the dimmed ratio rather than assuming it.
- **Proposed guide or sensor:** dim only the ink channels, never the surface, and floor the dim at the exact point where the palette leaves AAA.
- **Now enforced by:** `MIN_INK_DIM = 0.7`, with the derivation in its comment; `room-theme.test.ts` asserts primary ink clears AAA both undimmed and at the dim floor; `claude/rules/room-screen.md` states it.

## The reset endpoint appeared to do nothing

- **What went wrong:** browser tests share in memory state, so each one posts to `/api/test-reset` first. The reset ran, reported success, and the page under test kept the old data.
- **Root cause:** route handlers and server components are bundled into separate module registries in Next 16. A module level cache therefore gives each of them its own instance, so the route handler was faithfully resetting a repository that the page never read.
- **How it was caught:** a confusing test failure, chased for a while on the assumption that the reset logic was wrong.
- **Proposed guide or sensor:** the cache lives on `globalThis` under a `Symbol.for` key so both registries reach the same object.
- **Now enforced by:** `src/data/index.ts`, and a note in `claude/rules/code-reviewer` scope: `claude/rules/testing.md` records the trap, and `claude/agents/code-reviewer.md` is told to look for new caching near this seam.

## A test that could not fail

- **What went wrong:** the timezone tests used Amsterdam and Johannesburg to prove that two zones resolve differently. Both are UTC+2 in August, so the assertions passed no matter what the code did.
- **Root cause:** picking fixtures for narrative reasons (the family is in Europe, the resident is in South Africa) rather than for the property under test.
- **How it was caught:** luck. Noticed while reading the test, not by any failure.
- **Proposed guide or sensor:** a timezone test uses zones that differ at the instant being tested, and says so.
- **Now enforced by:** the tests use `Europe/London`. Nothing structurally prevents the same mistake elsewhere.

## An iCal rule expanded from the wrong anchor, then got truncated

- **What went wrong:** a daily rule anchored at 2024-01-01 produced nothing for 2026, because expansion stopped at a 500 occurrence cap before reaching the requested window.
- **Root cause:** two things at once. Expansion has to start at the rule's own `DTSTART` rather than at the window, because the anchor decides which fortnight an `INTERVAL=2` rule falls on. Starting there means crossing every occurrence in between, which a small cap truncates.
- **How it was caught:** a test, which is why the cap was found rather than shipped.
- **Proposed guide or sensor:** raise the cap enough that a multi year daily rule reaches the present, and write the anchor reasoning next to it.
- **Now enforced by:** `MAX_OCCURRENCES = 6_000` with the explanation in `src/services/calendar.ts`, plus "honours an interval, so a fortnightly event is not weekly" in `calendar.test.ts`.

## Smaller ones, recorded because they cost real time

- **`ICAL.TimezoneService.register(id, zone)` has the arguments the other way round.** The signature is `register(timezone, name?)`. Caught by a test. No sensor; the library is just like that.
- **Playwright's `testMatch: /room\..*\.spec\.ts/` never matched `room.spec.ts`**, because the pattern requires something between the two dots. Caught by noticing a project ran zero tests. A suite that runs nothing should be an error, not a pass.
- **A stale background `next start` on port 3000** made a whole browser run fail in a way that looked like a product bug. Now: kill the port before every run. Recorded in `claude/rules/testing.md`.
- **Screenshots captured elements mid crossfade**, which reads as a missing element. Fixed with `screenshot({ animations: "disabled" })`. Also in `claude/rules/testing.md`.
- **`react-hooks/set-state-in-effect`** fired twice, both times because state was being stored that should have been derived. The lint rule was right both times.
