# Errors: rework both surfaces around what each one is for

Backfilled. These all happened.

## The screenshot tests had been saving the wrong form

- **What went wrong:** several screenshots were taken after clicking `getByRole("button", { name: "Save" }).first()`. Playwright matches accessible names by **substring**, and after the section reorder the answer policy's "Save this choice" came first in the DOM. So the tests had been submitting the policy form while claiming to exercise the details form. A screenshot presented earlier as the simplicity dial at minimal was not showing minimal at all.
- **Root cause:** two compounding defaults. Substring matching on names, and `.first()` papering over the ambiguity it creates instead of failing on it.
- **How it was caught:** luck. Looking closely at a screenshot for an unrelated reason and noticing the state was wrong.
- **Proposed guide or sensor:** `{ name, exact: true }` on every button locator, distinct verb phrases so no two buttons on a page share a name, and an assertion that the save actually landed before continuing.
- **Now enforced by:** the tests use exact names and assert the result. `claude/rules/testing.md` records it as the first of the browser traps, and `claude/skills/nora-copy/reference/patterns.md` makes distinct button names a correctness property rather than only a clarity one.

The wrong screenshot had already been shown to a human as evidence. That is the failure mode worth remembering: a green suite producing confident, wrong evidence.

## Refusing a form threw away what the family member had written

- **What went wrong:** the answer policy form validates wording at write time and refuses anything that breaks a floor. React clears an uncontrolled form once its action resolves. So a refusal returned the explanation and an empty form, discarding wording the person may have spent a long time on.
- **Root cause:** the framework behaviour is right for the success case and exactly wrong for the failure case, and nothing distinguishes them by default.
- **How it was caught:** trying the flow by hand in a browser. No test covered it, because the test asserted the error message appeared.
- **Proposed guide or sensor:** capture the submitted `FormData` in a client wrapper and restore the field values when the action returns an error.
- **Now enforced by:** `src/app/app/action-form.tsx`, and `e2e/family.spec.ts` "refuses wording that breaks a floor, in words, without losing the page", which asserts the typed value is still there.

Worth stating in product terms rather than technical ones. This is the one place in the product where we tell a family member no about something they wrote carefully, and it was also the place that punished them for it.

## `getByRole("alert")` matched Next's route announcer

- **What went wrong:** a locator for the validation problems list matched `__next-route-announcer__` as well, so the assertion was ambiguous.
- **Root cause:** the framework injects an element with that role on every page.
- **How it was caught:** a strict mode violation from Playwright.
- **Proposed guide or sensor:** use a `data-testid` for anything the tests need to find precisely, and keep roles for what they are for.
- **Now enforced by:** `data-testid="problems"`. Recorded in `claude/rules/testing.md`.

## The family app screenshot was white below the fold

- **What went wrong:** a full page screenshot showed the top of the page and blank space under it.
- **Root cause:** `html, body { height: 100%; overflow-x: hidden }` made the body its own scroll container, so the full page capture had nothing below the viewport to capture.
- **How it was caught:** looking at the screenshot.
- **Proposed guide or sensor:** `min-height` rather than `height`, and no `overflow-x` on the body.
- **Now enforced by:** nothing structural. A screenshot that is mostly blank is easy to miss, and there is no assertion that would catch it.

## The day line wrapped mid word

- **What went wrong:** moving the day into a column broke "Saterdagoggend" across two lines mid word.
- **Root cause:** Afrikaans compounds the day and part of day into a single long word, so a column that is comfortable for "Saturday morning" is not comfortable for the Afrikaans form of the same thing.
- **How it was caught:** a screenshot, in the other language.
- **Proposed guide or sensor:** the day line spans both grid columns. More generally: check both languages before believing a layout works.
- **Now enforced by:** `grid-template-areas: "day day" / "lines photo"`, and `e2e/room.spec.ts` "keeps every line inside the screen". The broader lesson, that content length is the stress on this layout, is the argument for running the legibility checks against every persona's data rather than one fixture. Not built yet.
