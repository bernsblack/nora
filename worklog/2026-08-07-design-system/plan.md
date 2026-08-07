# Plan: shadcn and Tailwind across both surfaces, and responsive on all three form factors

## What this is

Two things asked for together on 2026-08-07:

1. Port both surfaces to Tailwind and a shadcn based component library.
2. Make both work properly on desktop, phone and iPad.

They belong in one task because the second is mostly a consequence of the first. A component library that is not responsive is not worth adopting, and retrofitting breakpoints onto hand written CSS Modules is the more expensive half of the same work.

## The concern, stated once

The recommendation given before this was asked for was narrower: adopt shadcn on the family app only, incrementally, starting with the next new surface rather than as a retrofit, and leave the room screen alone. This plan is the wider thing that was asked for, and the concern is recorded here rather than argued again.

**The room screen is the part to be careful with, and not for taste reasons.** It is five static elements with no interactive components, so shadcn has nothing to offer it. What it does have is a set of numbers that are product decisions under test: a 40px type floor, AAA contrast computed against real values in both palettes at the dim floor, one animation, and a palette that is warm on purpose because the ageing lens desaturates blues. Tailwind can express all of that. Nothing about the port requires those to change, and nothing about it should be allowed to.

So the room screen half of this is a **translation with a fixed acceptance test**, not a redesign. If a number moves, the port is wrong.

`app.module.css` already opens by saying the room screen's constraints do not apply to the family app and that applying them would produce something that looks like it is for a patient. The two surfaces are already two design systems. This task keeps them two, sharing tokens rather than sharing rules.

## What must not break

This is the most useful section in the file. These are the tests that make the port checkable rather than a matter of opinion, and every one of them is currently green.

| Guard | What it holds |
| --- | --- |
| `src/design/room-theme.test.ts` | Every colour pairing against WCAG, dimmed and undimmed, and fails if the palette drifts blue dominant |
| `src/design/room-motion.test.ts` | Scans the room stylesheet: every animation timed from the crossfade variable, no literal duration, a reduced motion block exists |
| `e2e/room.spec.ts` | Size, weight, tracking, contrast and overflow **as rendered**, in daylight and at night |
| `e2e/room.offline.spec.ts` | The room screen after a reload with no network, including the photograph |
| `e2e/family.spec.ts`, `e2e/family.setup.spec.ts` | The family app's flows, including that no answer policy option arrives pre-selected |
| `personas/personas.test.ts`, `personas/eval.test.ts` | Unaffected by styling, and the thing to watch in case a refactor reaches further than intended |

**`room-motion.test.ts` needs attention early.** It scans `room.module.css` by path. If the room screen's styles move into Tailwind classes, that scan reads an empty or absent file and passes while asserting nothing, which is the exact "green units, wrong rendering" shape this repo has been bitten by twice. Either the scan moves to the compiled output, or the room screen keeps its stylesheet and Tailwind is scoped away from it. **Decide this before writing any room screen markup**, not after.

## Phase 1: foundation, no visual change

Tailwind v4 reads design tokens from CSS through `@theme` rather than a JS config file, which suits this repo: the room palette is already emitted as custom properties by `roomThemeCss`, so those become the token source rather than a second copy.

- Install Tailwind v4 and initialise shadcn against Next 16 and React 19.
- Map the existing palettes to tokens. The family app's ten variables in `.shell` and the room screen's from `src/design/room-theme.ts`. **Delete shadcn's default theme.** It ships neutral zinc and this product is warm deliberately.
- Scope the content globs so the room screen is covered only if phase 3 decides it should be.
- Verify: `pnpm run check` and `pnpm run e2e` unchanged, with no markup touched yet. A foundation phase that changes a pixel has changed something nobody reviewed.

## Phase 2: the family app

Where the value is. 39 inputs, 7 selects, 4 disclosures and 2 textareas today, and person creation, photo upload and auth screens are all still to come.

- Take the primitives: Label, Input, Select, RadioGroup, Textarea, Button, Card, Dialog.
- **Do not take shadcn's `<Form>`.** It assumes react-hook-form. This repo uses server actions with `useActionState`, and `ActionForm` exists for a reason written in its own comment: React clears an uncontrolled form when its action resolves, which is right after a save and wrong after a refusal, because the answer policy form is where somebody writes a sentence they have thought hard about. Keep `ActionForm` and put the primitives inside it.
- Port section by section, most-used first, and **leave the answer policy section until last**. It is the highest stakes UI in the product and the one with the most behaviour attached.
- Two open accessibility defects close here as a side effect: the error not associated with the field group is what shadcn's Label and FormMessage wiring solves. **Focus dropping to `<body>` on submit does not close by itself**, because it comes from `ActionForm` disabling the button while pending. Fix it by hand in this phase.

## Phase 3: the room screen

The careful one, and the one to consider not doing.

- Decide first whether Tailwind owns this surface at all. The honest options are: leave `room.module.css` as it is and scope Tailwind away, or port it and move `room-motion.test.ts` to scan the built CSS. The first is less work and loses nothing, because there are no components here to gain.
- If porting: `src/design/room-theme.ts` stays the single source. Tailwind references the custom properties it emits; the values do not move into a Tailwind config.
- The type scale is a `clamp()` per element with a min at or above `ROOM_MIN_TEXT_PX`. Tailwind arbitrary values can express it, and the minimums stay in `constants.ts`.
- Verify after every step against the browser tests, not by eye. The reason `e2e/room.spec.ts` measures computed styles is that a hashed class name once collapsed every font size to 16px and every contrast ratio to 1:1 while every unit test passed.

## Phase 4: responsive, on all three

The family app is phone first today and has no desktop layout at all. The room screen is designed for a 10 inch tablet in landscape and has one portrait media query, commented "Portrait tablet, or a phone sized preview".

**Family app.** Three real targets: 390px phone, iPad in both orientations, and desktop. The content is a single long scroll of sections, so this is mostly about giving it a maximum width and a two column layout above a breakpoint rather than about restructuring. Its user is standing in a corridor on a phone, so the phone stays the primary case and the wider layouts are the accommodation, not the reverse.

**Room screen.** This needs a decision rather than a breakpoint, and it is the open question below. A 10 inch tablet in landscape is the designed device. A phone at 390px cannot show five elements at a 40px floor, so a phone is either not a supported room device, or the floor is wrong, and those are very different answers.

- Resolve the manifest contradiction. `manifest.webmanifest/route.ts` sets `orientation: "landscape"` while `room.module.css` carries a portrait layout somebody wrote and maintains. WCAG 1.3.4 allows an orientation lock only where a single orientation is essential, and the CSS is evidence that it is not. The two have to agree.
- Add Playwright projects per form factor rather than testing one viewport and hoping. The size, contrast and overflow loops should run at each, since "keeps every line inside the screen" is exactly what breaks on a new viewport.
- Screenshots at every form factor, so the visual recap shows what a reviewer would otherwise have to take on trust.

## Steps

- [ ] Decide whether Tailwind owns the room screen at all, and what happens to `room-motion.test.ts` if it does. **Blocks phase 3**
- [ ] Decide whether a phone is a supported room device or only a preview. **Blocks the room screen half of phase 4**
- [ ] Phase 1: Tailwind v4 and shadcn installed, tokens mapped from the existing palettes, default theme deleted, no markup changed
- [ ] Verify: `pnpm run check` and `pnpm run e2e` green and visually identical
- [ ] Phase 2: family app primitives, keeping `ActionForm`, answer policy section last
- [ ] Fix focus loss on submit in `ActionForm`, which no library closes for us
- [ ] Phase 3: the room screen, or a recorded decision not to
- [ ] Phase 4: family app at 390px, iPad both orientations, and desktop
- [ ] Phase 4: room screen per the device decision, and the manifest orientation contradiction resolved
- [ ] Playwright projects per form factor, with the size, contrast and overflow loops running at each
- [ ] Screenshots at every form factor
- [ ] Verify: `pnpm run check`, `pnpm run e2e`, and `pnpm run test:db` if anything under `src/data/` moved
- [ ] `/panel` before calling this done. It is Large and it touches the room screen's rendered output
- [ ] Closing step, below

## Current state

- **Done:** nothing. This plan was written on 2026-08-07 when the work was asked for.
- **Next:** the two decisions at the top of the steps, then phase 1. Phase 1 is safe and reversible and changes no pixels, so it is a good first commit whatever the decisions turn out to be.
- **Open decisions:**
  - **Does Tailwind own the room screen?** Porting it gains no components and costs the motion scan. Leaving it costs a mild inconsistency between two surfaces the codebase already treats as separate.
  - **Is a phone a supported room device, or only a preview?** At `ROOM_MIN_TEXT_PX` of 40 a 390px screen cannot carry five elements, so this decides whether phase 4 is a layout problem or a product one.
  - **Does the family app get a genuine desktop layout**, or a maximum width and generous whitespace? Its user is on a phone in a corridor, and building a dashboard for a person who is never at a desk is how this surface stops being what it is.
  - **Tailwind v4 or v3.** v4 is assumed above, on the strength of the CSS token model matching what this repo already does. Confirm at install that shadcn's Next 16 path is as smooth as its docs claim.

## Closing step

Promote the durable part out of this folder before marking the task done in `worklog/INDEX.md`.

- [ ] A constraint on how the code may change becomes a rule in `claude/rules/`. `room-screen.md` needs whatever the room screen decision turns out to be, and the "do not take shadcn's Form" trap belongs somewhere a future session will hit it
- [ ] A product number becomes a constant in `src/config/constants.ts`, with its reason. Breakpoints are product decisions here, not taste: the iPad number is a device and the phone number is a person standing in a corridor
- [ ] Anything a resident might say becomes a scenario in `personas/scenarios.ts`
- [ ] A PROJECT.md principle with nothing behind it becomes a row in `docs/traceability.md`
- [ ] Incidents in `errors.md` reviewed, and anything recurring turned into one of the above
- [ ] Status set to done in `worklog/INDEX.md`, with a summary worth finding in three months
